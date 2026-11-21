import { describe, expect, it } from "vitest";
import { addHours, compass, dayLabel, formatTemp, hourLabel, timeLabel } from "@/lib/format";
import { aqiBand, uvBand } from "@/lib/insights";
import { mapWmo } from "@/lib/wmo";
import { normalize, normalizeAirQuality } from "@/lib/normalize";
import { summarize } from "@/lib/summary";
import { forecastSchema } from "@/lib/schemas";
import { makeForecast } from "./fixtures";

describe("wmo mapping", () => {
  it("maps clear, rain, storm and unknown codes", () => {
    expect(mapWmo(0, true)).toMatchObject({ key: "clear", label: "Clear sky" });
    expect(mapWmo(0, false).label).toBe("Clear night");
    expect(mapWmo(63, true).key).toBe("rain");
    expect(mapWmo(81, true).key).toBe("rain");
    expect(mapWmo(95, true).key).toBe("storm");
    expect(mapWmo(999, true).label).toBe("Unknown");
    expect(mapWmo(null, true).key).toBe("cloudy");
  });
});

describe("format helpers", () => {
  it("formats local hour and time labels without timezone shifts", () => {
    expect(hourLabel("2026-11-21T00:00")).toBe("12 am");
    expect(hourLabel("2026-11-21T12:00")).toBe("12 pm");
    expect(hourLabel("2026-11-21T19:00")).toBe("7 pm");
    expect(timeLabel("2026-11-21T06:47")).toBe("6:47 am");
  });
  it("adds hours across midnight", () => {
    expect(addHours("2026-11-21T23:00", 1)).toBe("2026-11-22T00:00");
  });
  it("labels days", () => {
    expect(dayLabel("2026-11-21", "2026-11-21T19:45")).toBe("Today");
    expect(dayLabel("2026-11-22", "2026-11-21T19:45")).toBe("Sun");
  });
  it("converts temperature and compass", () => {
    expect(formatTemp(0, "F")).toBe("32°");
    expect(formatTemp(26.6, "C")).toBe("27°");
    expect(compass(292)).toBe("WNW");
    expect(compass(0)).toBe("N");
    expect(compass(359)).toBe("N");
  });
});

describe("insight bands", () => {
  it("bands US AQI", () => {
    expect(aqiBand(42).category).toBe("Good");
    expect(aqiBand(87).category).toBe("Moderate");
    expect(aqiBand(120).category).toBe("Unhealthy for sensitive groups");
    expect(aqiBand(400).category).toBe("Hazardous");
  });
  it("bands UV", () => {
    expect(uvBand(2).label).toBe("Low");
    expect(uvBand(8).label).toBe("Very high");
  });
});

describe("normalize", () => {
  it("validates against the upstream schema", () => {
    expect(forecastSchema.safeParse(makeForecast()).success).toBe(true);
  });
  it("starts hourly at the current hour and returns 48 hours and 7 days", () => {
    const out = normalize(makeForecast(), null, new Date("2026-11-21T14:15:00Z"));
    expect(out.hourly[0]!.time).toBe("2026-11-21T19:00");
    expect(out.hourly).toHaveLength(48);
    expect(out.daily).toHaveLength(7);
    expect(out.current.condition.label).toBe("Clear night");
    expect(out.current.windKmh).toBe(14);
    expect(out.current.pressureHpa).toBe(1012);
    expect(out.current.sunrise).toBe("2026-11-21T06:47");
    expect(out.airQuality).toBeNull();
    expect(out.meta.attribution).toContain("Open-Meteo");
  });
  it("normalizes air quality and tolerates missing data", () => {
    expect(normalizeAirQuality({ current: { us_aqi: 87.4, pm2_5: 30, pm10: 55 } })).toMatchObject({
      usAqi: 87,
      category: "Moderate",
    });
    expect(normalizeAirQuality({ current: { us_aqi: null } })).toBeNull();
    expect(normalizeAirQuality(null)).toBeNull();
  });
});

describe("summary rules", () => {
  it("reports no rain and finds a dry daytime window", () => {
    const out = normalize(makeForecast(), null);
    expect(out.summary.headline).toBe("No rain expected in the next 24 hours");
    expect(out.summary.bestWindow).toBeDefined();
    expect(out.summary.bestWindow!.from).toBe("2026-11-22T07:00");
  });
  it("finds when rain starts and its peak", () => {
    // index 0 is 2026-11-21T00:00, so 2026-11-22T16:00 is index 40; hours 40-42 are wet.
    const out = normalize(makeForecast({ rainHours: [40, 41, 42] }), null);
    expect(out.summary.rainStarts).toBe("2026-11-22T16:00");
    expect(out.summary.rainPeakProb).toBe(70);
    expect(out.summary.headline).toBe("Rain likely from 4 pm, peaking at 70%");
  });
  it("handles rain already falling", () => {
    const f = makeForecast({ currentCode: 63, rainHours: [19, 20, 21] });
    const out = normalize(f, null);
    expect(out.summary.rainNow).toBe(true);
    expect(out.summary.headline).toMatch(/^Raining now, easing around 10 pm$/);
  });
  it("summarize tolerates an empty hourly list", () => {
    expect(summarize([], { key: "clear", label: "Clear", isDay: true }).headline).toBe(
      "No rain expected in the next 24 hours",
    );
  });
});
