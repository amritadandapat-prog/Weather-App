"use client";
import { LocateFixed, RefreshCw, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStoredState } from "@/hooks/useStoredState";
import { useWeather } from "@/hooks/useWeather";
import { STARTER_PLACES } from "@/lib/defaults";
import { formatTemp } from "@/lib/format";
import { themeFor, type ThemeKey } from "@/lib/theme";
import type { GeocodeResult, Place, ThemeMode, Unit } from "@/lib/types";
import { Places } from "./Places";
import { RadarCard } from "./RadarCard";
import { Search } from "./Search";
import { Daily, Details, Hero, Hourly, Skeleton } from "./Sections";

const DARK_THEMES: ThemeKey[] = ["clear-night", "cloudy-night", "rain", "storm"];
const MAX_PLACES = 10;
const NEXT_MODE: Record<ThemeMode, ThemeMode> = { auto: "day", day: "night", night: "auto" };

export function WeatherApp() {
  const [places, setPlaces, placesReady] = useStoredState<Place[]>("wx.places", []);
  const [selectedId, setSelectedId] = useStoredState<string | null>("wx.selected", null);
  const [unit, setUnit] = useStoredState<Unit>("wx.unit", "C");
  const [mode, setMode] = useStoredState<ThemeMode>("wx.mode", "auto");
  const [temps, setTemps] = useStoredState<Record<string, number>>("wx.temps", {});
  const [geoError, setGeoError] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const place = useMemo(() => places.find((p) => p.id === selectedId) ?? places[0] ?? null, [places, selectedId]);
  const weather = useWeather(place);
  const { data } = weather;

  const themeKey = themeFor(data?.current.condition, mode);
  useEffect(() => {
    document.documentElement.dataset.theme = themeKey;
  }, [themeKey]);

  // Remember the latest temperature per place for the saved-locations list.
  useEffect(() => {
    if (place && data && !weather.stale) setTemps((t) => ({ ...t, [place.id]: data.current.tempC }));
  }, [place, data, weather.stale, setTemps]);

  // Compact header on small screens once the hero scrolls out of view.
  useEffect(() => {
    const node = heroRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setCompact(entry ? !entry.isIntersecting : false));
    io.observe(node);
    return () => io.disconnect();
  }, [data]);

  const addPlace = useCallback(
    (p: Place) => {
      setPlaces((prev) => {
        if (prev.some((x) => x.id === p.id)) return prev.map((x) => (x.id === p.id ? p : x));
        return [...prev, p].slice(-MAX_PLACES);
      });
      setSelectedId(p.id);
      setGeoError(null);
    },
    [setPlaces, setSelectedId],
  );

  const removePlace = useCallback(
    (id: string) => {
      setPlaces((prev) => prev.filter((p) => p.id !== id));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [setPlaces, setSelectedId],
  );

  const onPick = (r: GeocodeResult) => addPlace({ id: r.id, name: r.name, region: r.region, country: r.country, lat: r.lat, lon: r.lon });

  function locate() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Location is not available in this browser. Search for a city instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => addPlace({ id: "my-location", name: "My location", lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) =>
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Search for a city instead."
            : "Could not get your location. Search for a city instead.",
        ),
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  const placeLine = place ? [place.name, place.region].filter(Boolean).join(", ") : "";
  const savedTime = weather.savedAt
    ? new Date(weather.savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;
  const showEmpty = placesReady && places.length === 0;
  const loadingFirst = !placesReady || (place != null && !data && weather.status !== "error");

  return (
    <div className="shell">
      <Places
        className="rail"
        heading="Saved locations"
        places={places}
        selectedId={place?.id ?? null}
        temps={temps}
        unit={unit}
        onSelect={setSelectedId}
        onRemove={removePlace}
      />
      <main>
        {data && place && (
          <div className={compact ? "compact on" : "compact"} aria-hidden>
            <strong>{place.name}</strong>
            <span>
              {formatTemp(data.current.tempC, unit)} · {data.current.condition.label}
            </span>
          </div>
        )}

        <div className="topbar">
          <Search onPick={onPick} />
          <button type="button" className="btn" aria-label={`Units: degrees ${unit === "C" ? "Celsius" : "Fahrenheit"}. Switch units`} onClick={() => setUnit(unit === "C" ? "F" : "C")}>
            °{unit}
          </button>
          <button type="button" className="btn" aria-label={`Theme: ${mode}. Change theme`} onClick={() => setMode(NEXT_MODE[mode])}>
            {mode === "auto" ? "Auto" : mode === "day" ? "Day" : "Night"}
          </button>
        </div>

        <Places
          className="chips"
          places={places}
          selectedId={place?.id ?? null}
          temps={temps}
          unit={unit}
          onSelect={setSelectedId}
          onRemove={removePlace}
        />

        {(weather.status === "error" || weather.offline) && place && (
          <div className="banner" role="status">
            <WifiOff size={18} aria-hidden />
            <span>
              {weather.offline ? "You are offline." : "Could not refresh."}{" "}
              {data && savedTime ? `Showing saved data from ${savedTime}.` : "No saved data yet."}
            </span>
            <button type="button" className="btn" onClick={() => void weather.reload()}>
              <RefreshCw size={14} aria-hidden /> Retry
            </button>
          </div>
        )}

        {showEmpty && (
          <section className="card empty" aria-label="Get started">
            <h1 className="city">Welcome</h1>
            <p>Add a place to see the weather.</p>
            <button type="button" className="btn primary" onClick={locate}>
              <LocateFixed size={16} aria-hidden /> Use my location
            </button>
            {geoError && <p role="alert" className="n">{geoError}</p>}
            <p className="n">Or pick one:</p>
            <div className="starter">
              {STARTER_PLACES.map((p) => (
                <button type="button" className="btn" key={p.id} onClick={() => addPlace(p)}>
                  {p.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {loadingFirst && !showEmpty && <Skeleton />}

        {data && place && (
          <>
            <div ref={heroRef} className="hero-c">
              <Hero name={placeLine} data={data} unit={unit} />
            </div>
            <Hourly data={data} unit={unit} />
            <Daily data={data} unit={unit} />
            <Details data={data} unit={unit} />
            <RadarCard lat={place.lat} lon={place.lon} dark={DARK_THEMES.includes(themeKey)} />
          </>
        )}

        {!showEmpty && weather.status === "error" && !data && place && (
          <section className="card empty" role="alert">
            <p>Could not load the weather for {place.name}.</p>
            <button type="button" className="btn primary" onClick={() => void weather.reload()}>
              <RefreshCw size={16} aria-hidden /> Try again
            </button>
          </section>
        )}

        <footer className="foot">
          {savedTime && <span>Updated {savedTime}. </span>}
          Weather data by <a href="https://open-meteo.com/">Open-Meteo.com</a> (CC BY 4.0). Radar by{" "}
          <a href="https://www.rainviewer.com/">RainViewer</a>. Map &copy; OpenStreetMap contributors &copy; CARTO.
        </footer>
      </main>
    </div>
  );
}
