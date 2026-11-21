# Weather App: Backend Design (Step 3)

> **Implementation note (Vercel).** The app is deployed on GitHub + Vercel, so the API is built as
> **Next.js route handlers** (`src/app/api/v1/*`) instead of the standalone Fastify server sketched below.
> Everything else in this document (endpoints, normalized payload, rules, failure handling) still applies, with these differences:
> - **Cache:** Next's data cache (`fetch(..., { next: { revalidate } })`) plus CDN headers (`s-maxage`, `stale-while-revalidate`) replace the in-process LRU. Serverless instances are stateless, so there is no in-memory cache and no per-day call counter.
> - **Stale-on-error:** done in the browser. The last good payload is kept in `localStorage` and shown with a "saved data from HH:MM" banner when a refresh fails or the device is offline.
> - **Radar:** only the frame list goes through the API (`/api/v1/radar/frames`). Tiles load straight from RainViewer in the browser, so the 100 requests/IP/minute limit applies per visitor, not to the Vercel deployment.
> - **Not built yet:** alerts and Web Push (section 8). Plan: Vercel Cron + a KV store (Upstash Redis via the Vercel Marketplace) + Web Push with VAPID keys.
> - **Saved places:** `localStorage` only, no accounts.

Scope follows `DESIGN.md`: v1 = current, hourly, 7-day, detail cards, search, saved places. v1.1 = radar, alerts.

## 1. Approach in one paragraph
A thin TypeScript API sits between the browser and the weather providers. It hides provider details, merges forecast and air quality into one normalized payload, caches aggressively to stay inside free-tier limits, and serves stale data when an upstream fails. The browser never talks to Open-Meteo or RainViewer directly.

```
Browser (PWA) ──► API (Fastify, TS) ──► Open-Meteo: forecast, air-quality, geocoding
                    │  cache (LRU → Redis later)  └► RainViewer: radar frames + tiles (v1.1)
                    └► DB (v1.1 only): alert rules, push subscriptions
```

## 2. Provider facts that shape the design (checked Nov 2026)
| Provider | Constraint | Design consequence |
|---|---|---|
| Open-Meteo (free) | Non-commercial only; under 10,000 calls/day, 5,000/hour, 600/min; CC BY 4.0 attribution; no uptime guarantee | Cache + call budget guard; show attribution in footer; self-host or paid plan if the app ever becomes commercial |
| Open-Meteo `minutely_15` | Only a few regions (Central Europe, North America HRRR) | The "rain in 12 min" hero line cannot come from 15-minute data for India. Derive "rain starts around HH:MM" from hourly probability instead |
| RainViewer (free) | Personal/educational use; since 1 Jan 2026 max zoom 7, one colour scheme, no nowcast, 100 requests/IP/min; past 2 h in 10-min steps; credit required | Proxy and cache tiles; clamp zoom to 7; no radar forecast frames; attribution on map. Coverage for India must be checked before promising radar there |

Fallbacks if RainViewer is too coarse or does not cover India: self-hosted LibreWXR (RainViewer-v2-compatible) or a paid tile API.

## 3. Stack
- Node 22, TypeScript, Fastify, Zod (validate both inbound params and upstream responses), pino logging, Vitest + MSW for tests.
- Cache: in-process LRU first; same interface backed by Redis when deployed to more than one instance.
- DB (v1.1 only): SQLite for local, Postgres when hosted; Drizzle ORM.
- Frontend (separate app): Next.js PWA, as in the existing `.gitignore`.
- Saved places in v1 live in `localStorage`, so there are no accounts and no DB. Accounts only if you want sync across devices.

## 4. API (v1)
All responses JSON, metric units. The client converts °C/°F locally, so toggling units never refetches.

| Method and path | Purpose | Upstream | Cache TTL |
|---|---|---|---|
| `GET /api/v1/geocode?q=&count=5` | City search and autocomplete | Open-Meteo geocoding | 24 h |
| `GET /api/v1/weather?lat=&lon=` | Normalized forecast + air quality + plan summary | forecast + air-quality (2 calls) | 10 min |
| `GET /api/v1/radar/frames` (v1.1) | Frame list for the scrubber | RainViewer `weather-maps.json` | 2 min |
| `GET /api/v1/radar/tiles/{frame}/{z}/{x}/{y}.png` (v1.1) | Tile proxy, z clamped to 7 | RainViewer | 10 min |
| `POST /api/v1/alerts`, `DELETE /api/v1/alerts/:id`, `POST /api/v1/push/subscribe` (v1.1) | Alert rules and Web Push | none | none |
| `GET /healthz`, `GET /metrics` | Liveness, counters | none | none |

Coordinates are rounded to 2 decimals (about 1 km) before building the cache key, so nearby requests share an entry.

### Upstream queries (Open-Meteo)
- Forecast: `timezone=auto&forecast_days=7&wind_speed_unit=kmh`
  - `current`: temperature_2m, apparent_temperature, relative_humidity_2m, is_day, weather_code, wind_speed_10m, wind_direction_10m, pressure_msl
  - `hourly`: temperature_2m, precipitation_probability, weather_code, is_day, uv_index, visibility, dew_point_2m
  - `daily`: weather_code, temperature_2m_max, temperature_2m_min, precipitation_probability_max, sunrise, sunset, uv_index_max
- Air quality: `current=us_aqi,pm2_5,pm10` and `hourly=us_aqi`.
- If the air-quality call fails, return the forecast with `airQuality: null`. Never fail the whole response for one tile.

### Normalized payload (shared Zod schema, used by API and web)
```ts
type WeatherResponse = {
  location: { lat: number; lon: number; name?: string; timezone: string };
  current: { time: string; tempC: number; feelsLikeC: number; humidity: number;
             windKmh: number; windDirDeg: number; pressureHpa: number; isDay: boolean;
             condition: Condition };            // see section 5
  hourly: Array<{ time: string; tempC: number; precipProb: number;
                  uv: number | null; visibilityKm: number | null; condition: Condition }>; // next 48 h
  daily: Array<{ date: string; minC: number; maxC: number; precipProbMax: number;
                 sunrise: string; sunset: string; uvMax: number; condition: Condition }>; // 7 days
  airQuality: { usAqi: number; category: string; pm25: number; pm10: number } | null;
  summary: { headline: string; bestWindow?: { from: string; to: string };
             rainStarts?: string; rainPeakProb?: number };   // plan-your-day text inputs
  meta: { provider: "open-meteo"; fetchedAt: string; stale: boolean;
          attribution: string };
};
```

## 5. Domain logic (all server-side, rule-based, no LLM)
- **Condition mapping.** Open-Meteo returns WMO weather codes. Map to a small enum that drives both the icon and the hero theme in `DESIGN.md`: clear (0), partly cloudy (1–3), fog (45, 48), drizzle (51–57), rain (61–67, 80–82), snow (71–77, 85–86), storm (95–99). Combine with `is_day` for day/night variants.
- **Plan summary.** Scan the next 24 h hourly series: first hour with `precipProb >= 50` is `rainStarts`; the longest run of hours with `precipProb < 20` and tempC below a heat threshold is `bestWindow`; the headline is composed from those. Thresholds live in config.
- **AQI category.** US AQI bands: 0–50 Good, 51–100 Moderate, 101–150 Unhealthy for sensitive groups, and so on.
- **Local time.** Always use the location's timezone from the response, never the server's.

## 6. Caching, budget, and failure modes
1. Request → cache hit and fresh: return it.
2. Fresh miss → call upstream with a 5 s timeout and one retry → validate with Zod → store → return.
3. Upstream failure or schema mismatch → return the last cached payload with `meta.stale = true` and its `fetchedAt`. The UI shows the "cached data with timestamp" state from `DESIGN.md`. With no cache, return 502 with a retryable error body.
4. In-flight de-duplication: concurrent requests for the same key share one upstream call.
5. Budget guard: count upstream calls per UTC day. At 9,000 (90% of the free limit) serve only cache/stale and log a warning. One refresh costs 2 calls, so 10-minute refresh keeps roughly 34 always-hot locations inside the limit; personal use will be far below that.
6. Response headers: `Cache-Control: public, max-age=300, stale-while-revalidate=600` so the browser and any CDN absorb repeat loads.

## 7. Security and hygiene
- No provider keys exist for v1, so nothing secret reaches the browser. Future keys go in `.env` (already git-ignored).
- Validate `lat` (−90..90), `lon` (−180..180), `q` (length 2–80); reject otherwise.
- CORS allow-list for the web origin; per-IP rate limit (start at 60 requests/min).
- Send a descriptive `User-Agent` upstream. Do not log full query strings with user locations beyond what debugging needs; keep logs short-lived.
- Web Push (v1.1) uses VAPID keys; email alerts use a transactional provider. Store only endpoint and rule data.

## 8. Alerts (v1.1)
- Rule types: rain probability above X in the next N hours, heat index above X, AQI above X.
- A scheduler runs hourly, groups rules by rounded location so each location costs one upstream refresh, evaluates rules against the cached payload, and sends Web Push or email.
- Dedupe: one notification per rule per event window; cool-down 6 h.
- Alerts need a stable user identity. Decide between anonymous device tokens and real accounts before building.

## 9. Repo layout and phases
```
weather-app/
  apps/api/src/{server.ts, routes/, providers/{openmeteo,rainviewer}.ts,
                domain/{normalize,summary,wmo}.ts, cache/, config.ts}
  apps/web/            # Next.js PWA (UI from DESIGN.md / design canvas)
  packages/shared/     # Zod schemas and types
  docs/                # DESIGN.md, BACKEND.md
  prototype/           # existing static prototype
```
- **B1 (v1 core):** API skeleton, geocode, weather endpoint, cache, stale-on-error, tests with recorded fixtures. Wire the prototype to the live endpoint.
- **B2 (radar):** frames and tile proxy, zoom clamp, attribution, India coverage check.
- **B3 (alerts):** DB, rules API, scheduler, Web Push.

## 10. Test plan
- Contract tests: recorded Open-Meteo and RainViewer fixtures (MSW) must parse with the Zod schemas; a schema change upstream fails CI instead of the UI.
- Unit tests: WMO mapping, summary rules (dry window, rain start), AQI bands, rounding and cache keys, timezone handling around midnight.
- Failure tests: upstream timeout, 429, malformed JSON, air-quality-only failure.
- Smoke test against live APIs for Mumbai, Jamshedpur and one high-latitude city, run manually, not in CI.

## 11. Open questions
1. Hosting target: local Docker only, or a hosted service (Fly, Railway, Render, Vercel plus API host)?
2. Saved places: local-only for v1, or accounts and sync?
3. Visual source of truth: the existing warm-yellow glass prototype (`DESIGN.md`) or the dark "Atmos" design canvas?
4. Is this strictly non-commercial? Open-Meteo's free tier and RainViewer's free API both depend on it.
5. Is radar over India a hard requirement? It decides whether RainViewer is enough.
