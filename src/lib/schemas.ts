import { z } from "zod";

// Upstream responses are validated so a provider change fails loudly here instead of in the UI.
const nums = z.array(z.number().nullable());

export const forecastSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    is_day: z.number(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
    wind_direction_10m: z.number(),
    pressure_msl: z.number(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: nums,
    precipitation_probability: nums,
    weather_code: nums,
    is_day: nums,
    uv_index: nums,
    visibility: nums,
    dew_point_2m: nums,
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: nums,
    temperature_2m_max: nums,
    temperature_2m_min: nums,
    precipitation_probability_max: nums,
    sunrise: z.array(z.string()),
    sunset: z.array(z.string()),
    uv_index_max: nums,
  }),
});
export type ForecastRaw = z.infer<typeof forecastSchema>;

export const airQualitySchema = z.object({
  current: z
    .object({
      us_aqi: z.number().nullable().optional(),
      pm2_5: z.number().nullable().optional(),
      pm10: z.number().nullable().optional(),
    })
    .optional(),
});
export type AirQualityRaw = z.infer<typeof airQualitySchema>;

export const geocodeSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

export const radarSchema = z.object({
  generated: z.number(),
  host: z.string(),
  radar: z.object({
    past: z.array(z.object({ time: z.number(), path: z.string() })),
  }),
});
