import type { Condition, ThemeMode } from "./types";

export type ThemeKey =
  | "clear-day" | "clear-night" | "cloudy-day" | "cloudy-night"
  | "rain" | "storm" | "snow" | "fog";

/** Background theme follows the weather and day/night. Mode can force day or night variants. */
export function themeFor(c: Condition | null | undefined, mode: ThemeMode): ThemeKey {
  const day = mode === "auto" ? (c?.isDay ?? true) : mode === "day";
  switch (c?.key) {
    case "rain":
    case "drizzle": return "rain";
    case "storm": return "storm";
    case "snow": return "snow";
    case "fog": return "fog";
    case "cloudy": return day ? "cloudy-day" : "cloudy-night";
    default: return day ? "clear-day" : "clear-night";
  }
}
