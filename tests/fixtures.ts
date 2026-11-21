import type { ForecastRaw } from "@/lib/schemas";

/** Synthetic Open-Meteo forecast: 7 days, current time 2026-11-21T19:45 (local). */
export function makeForecast(opts: { rainHours?: number[]; currentCode?: number } = {}): ForecastRaw {
  const rain = new Set(opts.rainHours ?? []);
  const times: string[] = [];
  const z = (n: number) => String(n).padStart(2, "0");
  for (let d = 21; d < 28; d++) for (let h = 0; h < 24; h++) times.push(`2026-11-${z(d)}T${z(h)}:00`);
  const hourOf = (i: number) => i % 24;
  return {
    latitude: 19.07,
    longitude: 72.88,
    timezone: "Asia/Kolkata",
    current: {
      time: "2026-11-21T19:45",
      temperature_2m: 27.4,
      apparent_temperature: 30.1,
      relative_humidity_2m: 68,
      is_day: 0,
      weather_code: opts.currentCode ?? 0,
      wind_speed_10m: 13.6,
      wind_direction_10m: 292,
      pressure_msl: 1012.2,
    },
    hourly: {
      time: times,
      temperature_2m: times.map((_, i) => 24 + Math.round(8 * Math.sin(((hourOf(i) - 8) / 24) * Math.PI * 2 * 0.5 + 0.2))),
      precipitation_probability: times.map((_, i) => (rain.has(i) ? 70 : 0)),
      weather_code: times.map((_, i) => (rain.has(i) ? 63 : 1)),
      is_day: times.map((_, i) => (hourOf(i) >= 7 && hourOf(i) < 18 ? 1 : 0)),
      uv_index: times.map((_, i) => (hourOf(i) >= 7 && hourOf(i) < 18 ? 6 : 0)),
      visibility: times.map(() => 9000),
      dew_point_2m: times.map(() => 21),
    },
    daily: {
      time: Array.from({ length: 7 }, (_, i) => `2026-11-${z(21 + i)}`),
      weather_code: [1, 1, 2, 63, 63, 3, 0],
      temperature_2m_max: [34, 34, 33, 32, 31, 32, 33],
      temperature_2m_min: [25, 25, 24, 24, 24, 23, 23],
      precipitation_probability_max: [20, 10, 20, 60, 70, 30, 10],
      sunrise: Array.from({ length: 7 }, (_, i) => `2026-11-${z(21 + i)}T06:47`),
      sunset: Array.from({ length: 7 }, (_, i) => `2026-11-${z(21 + i)}T17:59`),
      uv_index_max: [8, 8, 8, 5, 4, 7, 8],
    },
  };
}
