import type { AirQualityRaw, ForecastRaw } from "./schemas";
import type { AirQuality, DailyPoint, HourlyPoint, WeatherResponse } from "./types";
import { aqiBand } from "./insights";
import { summarize } from "./summary";
import { mapWmo } from "./wmo";

const num = (v: number | null | undefined, fallback: number) => (v == null ? fallback : v);

export function normalizeAirQuality(raw: AirQualityRaw | null): AirQuality | null {
  const c = raw?.current;
  if (!c || c.us_aqi == null) return null;
  const { category, note } = aqiBand(c.us_aqi);
  return { usAqi: Math.round(c.us_aqi), category, note, pm25: c.pm2_5 ?? null, pm10: c.pm10 ?? null };
}

export function normalize(f: ForecastRaw, aq: AirQualityRaw | null, now = new Date()): WeatherResponse {
  const h = f.hourly;
  const nowHour = `${f.current.time.slice(0, 13)}:00`;
  let start = h.time.findIndex((t) => t >= nowHour);
  if (start < 0) start = 0;

  const hourly: HourlyPoint[] = [];
  let lastTemp = f.current.temperature_2m;
  for (let i = start; i < Math.min(h.time.length, start + 48); i++) {
    const isDay = h.is_day[i] === 1;
    lastTemp = num(h.temperature_2m[i], lastTemp);
    hourly.push({
      time: h.time[i]!,
      tempC: lastTemp,
      precipProb: num(h.precipitation_probability[i], 0),
      uv: h.uv_index[i] ?? null,
      visibilityKm: h.visibility[i] == null ? null : Math.round((h.visibility[i]! / 1000) * 10) / 10,
      isDay,
      condition: mapWmo(h.weather_code[i], isDay),
    });
  }

  const d = f.daily;
  const daily: DailyPoint[] = d.time.slice(0, 7).map((date, i) => ({
    date,
    minC: num(d.temperature_2m_min[i], 0),
    maxC: num(d.temperature_2m_max[i], 0),
    precipProbMax: num(d.precipitation_probability_max[i], 0),
    sunrise: d.sunrise[i] ?? "",
    sunset: d.sunset[i] ?? "",
    uvMax: d.uv_index_max[i] ?? null,
    condition: mapWmo(d.weather_code[i], true),
  }));

  const isDay = f.current.is_day === 1;
  const condition = mapWmo(f.current.weather_code, isDay);
  const hourNow = hourly[0];
  const dewRaw = h.dew_point_2m[start];

  return {
    location: { lat: f.latitude, lon: f.longitude, timezone: f.timezone },
    current: {
      time: f.current.time,
      tempC: f.current.temperature_2m,
      feelsLikeC: f.current.apparent_temperature,
      humidity: Math.round(f.current.relative_humidity_2m),
      windKmh: Math.round(f.current.wind_speed_10m),
      windDirDeg: f.current.wind_direction_10m,
      pressureHpa: Math.round(f.current.pressure_msl),
      uv: hourNow?.uv ?? null,
      visibilityKm: hourNow?.visibilityKm ?? null,
      dewPointC: dewRaw ?? null,
      sunrise: daily[0]?.sunrise ?? "",
      sunset: daily[0]?.sunset ?? "",
      isDay,
      condition,
    },
    hourly,
    daily,
    airQuality: normalizeAirQuality(aq),
    summary: summarize(hourly, condition),
    meta: {
      provider: "open-meteo",
      fetchedAt: now.toISOString(),
      attribution: "Weather data by Open-Meteo.com (CC BY 4.0)",
    },
  };
}
