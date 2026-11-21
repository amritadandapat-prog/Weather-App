import type { ZodType } from "zod";
import { airQualitySchema, forecastSchema, geocodeSchema, radarSchema } from "./schemas";
import type { GeocodeResult, RadarFrames } from "./types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const RADAR_URL = "https://api.rainviewer.com/public/weather-maps.json";

export class UpstreamError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** Fetch JSON with a timeout, one retry, Zod validation, and Next's data cache (revalidate seconds). */
async function getJson<T>(url: string, revalidate: number, schema: ZodType<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
        next: { revalidate },
      });
      if (!res.ok) throw new UpstreamError(`Upstream responded ${res.status}`, res.status);
      return schema.parse(await res.json());
    } catch (e) {
      last = e;
      if (e instanceof UpstreamError && e.status && e.status >= 400 && e.status < 500) break;
    }
  }
  throw last instanceof Error ? last : new UpstreamError("Upstream request failed");
}

export const FORECAST_TTL = 600;

export function fetchForecast(lat: number, lon: number) {
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: "auto",
    forecast_days: "7",
    wind_speed_unit: "kmh",
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl",
    hourly: "temperature_2m,precipitation_probability,weather_code,is_day,uv_index,visibility,dew_point_2m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
  });
  return getJson(`${FORECAST_URL}?${q}`, FORECAST_TTL, forecastSchema);
}

export function fetchAirQuality(lat: number, lon: number) {
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: "auto",
    current: "us_aqi,pm2_5,pm10",
  });
  return getJson(`${AIR_URL}?${q}`, FORECAST_TTL, airQualitySchema);
}

export async function geocode(query: string, count = 6): Promise<GeocodeResult[]> {
  const q = new URLSearchParams({ name: query, count: String(count), language: "en", format: "json" });
  const data = await getJson(`${GEO_URL}?${q}`, 86400, geocodeSchema);
  return (data.results ?? []).map((r) => ({
    id: String(r.id),
    name: r.name,
    region: r.admin1,
    country: r.country,
    lat: r.latitude,
    lon: r.longitude,
  }));
}

export async function fetchRadarFrames(): Promise<RadarFrames> {
  const data = await getJson(RADAR_URL, 120, radarSchema);
  return { host: data.host, generated: data.generated, frames: data.radar.past };
}
