import type { Condition, HourlyPoint, Summary } from "./types";
import { addHours, hourLabel } from "./format";
import { WET_KEYS } from "./wmo";

export const RAIN_THRESHOLD = 50; // % chance that counts as "rain likely"
const DRY_THRESHOLD = 20; // % chance that counts as dry
const HOT_C = 36; // hotter than this is not a "best window"

/** Rule-based plan-your-day summary over the next 24 hours. No model involved. */
export function summarize(hourly: HourlyPoint[], now: Condition): Summary {
  const win = hourly.slice(0, 24);
  const rainNow = WET_KEYS.includes(now.key) && now.key !== "snow";

  let rainStarts: string | undefined;
  let rainPeakProb: number | undefined;
  let easesAt: string | undefined;

  if (rainNow) {
    const end = win.findIndex((h, i) => i > 0 && h.precipProb < 30);
    if (end > 0) easesAt = win[end]!.time;
  } else {
    const start = win.findIndex((h) => h.precipProb >= RAIN_THRESHOLD);
    if (start >= 0) {
      rainStarts = win[start]!.time;
      let peak = 0;
      for (let i = start; i < win.length && win[i]!.precipProb >= 30; i++) {
        peak = Math.max(peak, win[i]!.precipProb);
      }
      rainPeakProb = peak;
    }
  }

  // Longest run of dry, daylight, not-too-hot hours (at least 2 hours).
  let best: { from: string; to: string; len: number } | undefined;
  let runStart = -1;
  for (let i = 0; i <= win.length; i++) {
    const h = win[i];
    const ok = h && h.isDay && h.precipProb < DRY_THRESHOLD && h.tempC < HOT_C;
    if (ok && runStart < 0) runStart = i;
    if (!ok && runStart >= 0) {
      const len = i - runStart;
      if (len >= 2 && (!best || len > best.len)) {
        best = { from: win[runStart]!.time, to: addHours(win[i - 1]!.time, 1), len };
      }
      runStart = -1;
    }
  }

  let headline: string;
  if (rainNow) headline = easesAt ? `Raining now, easing around ${hourLabel(easesAt)}` : "Raining now";
  else if (rainStarts) headline = `Rain likely from ${hourLabel(rainStarts)}, peaking at ${rainPeakProb}%`;
  else headline = "No rain expected in the next 24 hours";

  return {
    headline,
    rainNow,
    rainStarts,
    rainPeakProb,
    bestWindow: best ? { from: best.from, to: best.to } : undefined,
  };
}
