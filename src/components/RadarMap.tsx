"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RadarFrames } from "@/lib/types";

// RainViewer's free tier caps tile zoom at 7 and limits each IP to 100 requests per minute.
// We load one frame at a time (512 px tiles) and do not auto-play, to stay well inside that limit.
const RADAR_TILE = "/512/{z}/{x}/{y}/2/1_1.png";
const MAX_RADAR_ZOOM = 8; // Leaflet zoom with 512 px tiles and zoomOffset -1 maps to tile zoom 7

export default function RadarMap({ lat, lon, dark }: { lat: number; lon: number; dark: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.TileLayer | null>(null);
  const radar = useRef<L.TileLayer | null>(null);
  const marker = useRef<L.CircleMarker | null>(null);
  const [frames, setFrames] = useState<RadarFrames | null>(null);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/v1/radar/frames", { signal: ctl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<RadarFrames>) : Promise.reject(new Error("radar"))))
      .then((f) => {
        setFrames(f);
        setIdx(Math.max(0, f.frames.length - 1));
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setFailed(true);
      });
    return () => ctl.abort();
  }, []);

  // Create the map once.
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { center: [lat, lon], zoom: 6, minZoom: 3, maxZoom: 10, zoomControl: true, attributionControl: true });
    map.current = m;
    marker.current = L.circleMarker([lat, lon], { radius: 6, weight: 3, color: "#fff", fillColor: "#e67e22", fillOpacity: 1 }).addTo(m);
    return () => {
      m.remove();
      map.current = null;
      base.current = null;
      radar.current = null;
      marker.current = null;
    };
  }, []);

  // Recenter when the place changes.
  useEffect(() => {
    map.current?.setView([lat, lon], map.current.getZoom());
    marker.current?.setLatLng([lat, lon]);
  }, [lat, lon]);

  // Base map follows the theme.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    base.current?.remove();
    base.current = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`, {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(m);
    base.current.bringToBack();
  }, [dark]);

  // Show one radar frame at a time; debounce so dragging the slider does not spam tiles.
  useEffect(() => {
    const m = map.current;
    const frame = frames?.frames[idx];
    if (!m || !frames || !frame) return;
    const t = setTimeout(() => {
      radar.current?.remove();
      radar.current = L.tileLayer(`${frames.host}${frame.path}${RADAR_TILE}`, {
        tileSize: 512,
        zoomOffset: -1,
        maxNativeZoom: MAX_RADAR_ZOOM,
        maxZoom: 10,
        opacity: 0.75,
        attribution: 'Radar by <a href="https://www.rainviewer.com/">RainViewer</a>',
      }).addTo(m);
    }, 250);
    return () => clearTimeout(t);
  }, [frames, idx]);

  const total = frames?.frames.length ?? 0;
  const frame = frames?.frames[idx];
  const label = frame
    ? new Date(frame.time * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <div className="radar">
      <div ref={el} className="radar-map" role="img" aria-label="Radar map of recent rainfall around the selected place" />
      {failed && <p className="n">Radar is unavailable right now.</p>}
      {total > 0 && (
        <div className="radar-ctl">
          <button type="button" className="btn icon" aria-label="Earlier radar frame" disabled={idx <= 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
            <ChevronLeft size={18} aria-hidden />
          </button>
          <input
            type="range"
            min={0}
            max={total - 1}
            value={idx}
            aria-label="Radar time"
            aria-valuetext={label}
            onChange={(e) => setIdx(Number(e.target.value))}
          />
          <button type="button" className="btn icon" aria-label="Later radar frame" disabled={idx >= total - 1} onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}>
            <ChevronRight size={18} aria-hidden />
          </button>
          <span className="radar-time">{idx === total - 1 ? `Latest · ${label}` : label}</span>
        </div>
      )}
    </div>
  );
}
