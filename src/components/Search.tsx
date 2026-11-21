"use client";
import { Search as SearchIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { GeocodeResult } from "@/lib/types";

type Status = "idle" | "loading" | "empty" | "error";

export function Search({ onPick }: { onPick: (r: GeocodeResult) => void }) {
  const listId = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/geocode?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        if (!res.ok) throw new Error("bad response");
        const json = (await res.json()) as { results: GeocodeResult[] };
        setResults(json.results);
        setStatus(json.results.length ? "idle" : "empty");
        setActive(-1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  function pick(r: GeocodeResult) {
    onPick(r);
    setQ("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      const r = results[active] ?? (results.length === 1 ? results[0] : undefined);
      if (r) {
        e.preventDefault();
        pick(r);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && q.trim().length >= 2;

  return (
    <div className="search-wrap">
      <div className="search" role="search">
        <SearchIcon size={18} aria-hidden />
        <input
          type="search"
          value={q}
          placeholder="Search city"
          aria-label="Search city"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />
      </div>
      {showList && (
        <ul id={listId} role="listbox" className="suggest card-solid">
          {status === "loading" && <li className="suggest-note">Searching…</li>}
          {status === "empty" && <li className="suggest-note">No places found.</li>}
          {status === "error" && <li className="suggest-note">Search is unavailable. Try again.</li>}
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(r);
              }}
            >
              <strong>{r.name}</strong>
              <span>{[r.region, r.country].filter(Boolean).join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
