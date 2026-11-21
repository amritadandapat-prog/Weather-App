import type { Condition, ConditionKey } from "./types";

// WMO weather interpretation codes, as returned by Open-Meteo `weather_code`.
const TABLE: Record<number, [ConditionKey, string]> = {
  0: ["clear", "Clear sky"],
  1: ["clear", "Mainly clear"],
  2: ["partly", "Partly cloudy"],
  3: ["cloudy", "Overcast"],
  45: ["fog", "Fog"],
  48: ["fog", "Rime fog"],
  51: ["drizzle", "Light drizzle"],
  53: ["drizzle", "Drizzle"],
  55: ["drizzle", "Heavy drizzle"],
  56: ["drizzle", "Freezing drizzle"],
  57: ["drizzle", "Heavy freezing drizzle"],
  61: ["rain", "Light rain"],
  63: ["rain", "Rain"],
  65: ["rain", "Heavy rain"],
  66: ["rain", "Freezing rain"],
  67: ["rain", "Heavy freezing rain"],
  71: ["snow", "Light snow"],
  73: ["snow", "Snow"],
  75: ["snow", "Heavy snow"],
  77: ["snow", "Snow grains"],
  80: ["rain", "Light showers"],
  81: ["rain", "Showers"],
  82: ["rain", "Violent showers"],
  85: ["snow", "Snow showers"],
  86: ["snow", "Heavy snow showers"],
  95: ["storm", "Thunderstorm"],
  96: ["storm", "Thunderstorm with hail"],
  99: ["storm", "Severe thunderstorm with hail"],
};

export function mapWmo(code: number | null | undefined, isDay: boolean): Condition {
  const hit = code == null ? undefined : TABLE[code];
  if (!hit) return { key: "cloudy", label: "Unknown", isDay };
  const [key, label] = hit;
  return { key, label: code === 0 && !isDay ? "Clear night" : label, isDay };
}

export const WET_KEYS: ConditionKey[] = ["drizzle", "rain", "storm", "snow"];
