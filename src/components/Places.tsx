"use client";
import { X } from "lucide-react";
import { formatTemp } from "@/lib/format";
import type { Place, Unit } from "@/lib/types";

type Props = {
  places: Place[];
  selectedId: string | null;
  temps: Record<string, number>;
  unit: Unit;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  className: string;
  heading?: string;
};

export function Places({ places, selectedId, temps, unit, onSelect, onRemove, className, heading }: Props) {
  if (places.length === 0) return null;
  return (
    <nav className={className} aria-label="Saved locations">
      {heading && <h2>{heading}</h2>}
      <ul>
        {places.map((p) => {
          const t = temps[p.id];
          const selected = p.id === selectedId;
          return (
            <li key={p.id} className={selected ? "chip selected" : "chip"}>
              <button type="button" className="chip-main" aria-current={selected ? "true" : undefined} onClick={() => onSelect(p.id)}>
                <span>{p.name}</span>
                <span className="chip-temp">{t == null ? "" : formatTemp(t, unit)}</span>
              </button>
              <button type="button" className="chip-x" aria-label={`Remove ${p.name}`} onClick={() => onRemove(p.id)}>
                <X size={14} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
