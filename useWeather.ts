"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Place, WeatherResponse } from "@/lib/types";

export type WeatherState = {
  data: WeatherResponse | null;
  status: "idle" | "loading" | "ready" | "error";
  /** True when the data on screen came from the local cache rather than a fresh response. */
  stale: boolean;
  /** When the data on screen was last fetched (ISO). */
  savedAt: string | null;
  offline: boolean;
};

const REFRESH_MS = 10 * 60 * 1000;
const cacheKey = (p: Place) => `wx.cache.${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;

function readCache(p: Place): { savedAt: string; data: WeatherResponse } | null {
  try {
    const raw = localStorage.getItem(cacheKey(p));
    return raw ? (JSON.parse(raw) as { savedAt: string; data: WeatherResponse }) : null;
  } catch {
    return null;
  }
}

export function useWeather(place: Place | null) {
  const [state, setState] = useState<WeatherState>({
    data: null, status: "idle", stale: false, savedAt: null, offline: false,
  });
  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!place) return;
    const id = ++reqId.current;
    setState((s) => ({ ...s, status: "loading", offline: typeof navigator !== "undefined" && !navigator.onLine }));
    try {
      const res = await fetch(`/api/v1/weather?lat=${place.lat}&lon=${place.lon}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as WeatherResponse;
      if (id !== reqId.current) return;
      const savedAt = new Date().toISOString();
      try {
        localStorage.setItem(cacheKey(place), JSON.stringify({ savedAt, data }));
      } catch {
        /* ignore */
      }
      setState({ data, status: "ready", stale: false, savedAt, offline: false });
    } catch {
      if (id !== reqId.current) return;
      // Keep showing the last good data, flagged as stale.
      setState((s) => ({
        ...s,
        status: "error",
        stale: s.data != null,
        offline: typeof navigator !== "undefined" && !navigator.onLine,
      }));
    }
  }, [place]);

  // Switching place: show cached data immediately (marked stale), then refresh.
  useEffect(() => {
    if (!place) {
      setState({ data: null, status: "idle", stale: false, savedAt: null, offline: false });
      return;
    }
    const cached = readCache(place);
    setState({
      data: cached?.data ?? null,
      status: "loading",
      stale: cached != null,
      savedAt: cached?.savedAt ?? null,
      offline: false,
    });
    void load();
  }, [place, load]);

  // Auto-refresh every 10 minutes, on return to the tab, and when the connection comes back.
  useEffect(() => {
    if (!place) return;
    const timer = setInterval(() => void load(), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const last = state.savedAt ? Date.parse(state.savedAt) : 0;
      if (Date.now() - last > REFRESH_MS) void load();
    };
    const onOnline = () => void load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [place, load, state.savedAt]);

  return { ...state, reload: load };
}
