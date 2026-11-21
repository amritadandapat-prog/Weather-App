import type { Unit } from "./types";

// Open-Meteo returns local times without an offset ("2026-11-21T19:00") when timezone=auto.
// We treat them as plain wall-clock strings so the UI always shows the place's own time.
const RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/;

export function parseLocal(s: string) {
  const m = RE.exec(s);
  if (!m) return null;
  return { y: +m[1]!, mo: +m[2]!, d: +m[3]!, h: +(m[4] ?? 0), mi: +(m[5] ?? 0) };
}

function ampm(h: number) {
  const hr = h % 12 === 0 ? 12 : h % 12;
  return { hr, suffix: h < 12 ? "am" : "pm" };
}

export function hourLabel(s: string): string {
  const p = parseLocal(s);
  if (!p) return s;
  const { hr, suffix } = ampm(p.h);
  return `${hr} ${suffix}`;
}

export function timeLabel(s: string): string {
  const p = parseLocal(s);
  if (!p) return s;
  const { hr, suffix } = ampm(p.h);
  return `${hr}:${String(p.mi).padStart(2, "0")} ${suffix}`;
}

export function addHours(s: string, n: number): string {
  const p = parseLocal(s);
  if (!p) return s;
  const t = new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h + n, p.mi));
  const z = (v: number) => String(v).padStart(2, "0");
  return `${t.getUTCFullYear()}-${z(t.getUTCMonth() + 1)}-${z(t.getUTCDate())}T${z(t.getUTCHours())}:${z(t.getUTCMinutes())}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayLabel(date: string, today: string): string {
  if (date.slice(0, 10) === today.slice(0, 10)) return "Today";
  const p = parseLocal(date);
  if (!p) return date;
  return DAYS[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()] ?? date;
}

export const cToF = (c: number) => (c * 9) / 5 + 32;

export function formatTemp(c: number, unit: Unit): string {
  return `${Math.round(unit === "F" ? cToF(c) : c)}°`;
}

const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export function compass(deg: number): string {
  return POINTS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]!;
}
