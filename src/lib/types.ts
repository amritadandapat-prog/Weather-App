export type ConditionKey = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export type Condition = { key: ConditionKey; label: string; isDay: boolean };

export type Place = {
  id: string;
  name: string;
  region?: string;
  country?: string;
  lat: number;
  lon: number;
};

export type HourlyPoint = {
  time: string; // local time at the place, e.g. 2026-11-21T19:00
  tempC: number;
  precipProb: number;
  uv: number | null;
  visibilityKm: number | null;
  isDay: boolean;
  condition: Condition;
};

export type DailyPoint = {
  date: string; // local date, e.g. 2026-11-21
  minC: number;
  maxC: number;
  precipProbMax: number;
  sunrise: string;
  sunset: string;
  uvMax: number | null;
  condition: Condition;
};

export type AirQuality = {
  usAqi: number;
  category: string;
  note: string;
  pm25: number | null;
  pm10: number | null;
};

export type Summary = {
  headline: string;
  rainNow: boolean;
  rainStarts?: string;
  rainPeakProb?: number;
  bestWindow?: { from: string; to: string };
};

export type WeatherResponse = {
  location: { lat: number; lon: number; timezone: string };
  current: {
    time: string;
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    windKmh: number;
    windDirDeg: number;
    pressureHpa: number;
    uv: number | null;
    visibilityKm: number | null;
    dewPointC: number | null;
    sunrise: string;
    sunset: string;
    isDay: boolean;
    condition: Condition;
  };
  hourly: HourlyPoint[]; // next 48 hours starting at the current hour
  daily: DailyPoint[]; // 7 days starting today
  airQuality: AirQuality | null;
  summary: Summary;
  meta: { provider: "open-meteo"; fetchedAt: string; attribution: string };
};

export type GeocodeResult = {
  id: string;
  name: string;
  region?: string;
  country?: string;
  lat: number;
  lon: number;
};

export type RadarFrame = { time: number; path: string };
export type RadarFrames = { host: string; generated: number; frames: RadarFrame[] };

export type Unit = "C" | "F";
export type ThemeMode = "auto" | "day" | "night";
