# Weather

A weather web app for desktop and mobile: current conditions, hourly and 7-day forecasts, air quality, detail cards, radar, city search and saved places. Built with Next.js for GitHub and Vercel. It installs as a PWA and shows the last saved forecast when offline.

- Design spec: [`docs/DESIGN.md`](docs/DESIGN.md) · Backend design: [`docs/BACKEND.md`](docs/BACKEND.md) · Static prototype: [`prototype/index.html`](prototype/index.html)

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit + route tests (upstream APIs are mocked)
npm run build && npm run typecheck
```
Node 20 or newer (`.nvmrc` pins 22). No API keys and no environment variables are needed.

## Deploy: GitHub + Vercel
1. Push this folder to a GitHub repository.
2. In Vercel choose **Add New > Project**, import the repository. Next.js is detected automatically; keep the defaults.
3. Deploy. There is nothing to configure. Every push to `main` redeploys, and pull requests get preview URLs.

The GitHub Action in `.github/workflows/ci.yml` runs tests, build and typecheck on every push and pull request.

## How it works
```
Browser (PWA)  ->  /api/v1/*  (Next.js route handlers on Vercel)  ->  Open-Meteo, RainViewer
   localStorage: places, units, theme, last good forecast
```
| Endpoint | Purpose | CDN cache |
|---|---|---|
| `GET /api/v1/weather?lat=&lon=` | Forecast + air quality, normalized, with a plan-your-day summary | 10 min |
| `GET /api/v1/geocode?q=` | City search | 24 h |
| `GET /api/v1/radar/frames` | Recent radar frame list | 2 min |

- Coordinates are rounded to 2 decimals so nearby requests share one cache entry.
- Upstream responses are validated with Zod. If the forecast provider fails, the API returns `502` and the app keeps showing the last saved forecast with a banner. If only air quality fails, the forecast still renders.
- Temperatures stay in °C on the wire; the °C/°F toggle converts in the browser.

```
src/app/api/v1/      route handlers
src/lib/             Open-Meteo client, schemas, normalizer, summary rules, WMO codes, formatting
src/components/      UI (hero, hourly, 7-day, details, search, saved places, radar)
src/hooks/           local storage state, weather loading and refresh
tests/               Vitest: logic and route tests with mocked upstreams
public/              manifest icon and service worker
```

## Provider terms and limits
- **Open-Meteo** (forecast, air quality, search): free for non-commercial use only, under 10,000 calls a day, with attribution (shown in the footer). If this becomes commercial, move to a paid plan or self-host.
- **RainViewer** (radar): personal and educational use. The free tier caps tile zoom at 7, offers one colour scheme and no radar forecast, and limits each IP to 100 requests a minute. The radar loads one frame at a time and does not auto-play for that reason. Radar coverage varies by region, so check it for your locations.
- **Map tiles:** CARTO basemap over OpenStreetMap data, shown with attribution. Both have usage terms for heavy traffic.

## Not built yet
- Alerts and push notifications (plan in `docs/BACKEND.md`, section 8).
- Accounts and cross-device sync of saved places.
- Radar animation (blocked by the free-tier request limit).
