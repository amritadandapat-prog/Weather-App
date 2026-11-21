"use client";
import { useCallback, useEffect, useState } from "react";

/** useState persisted in localStorage. `ready` flips true after the stored value has been read. */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore corrupt or blocked storage */
    }
    setReady(true);
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(v));
        } catch {
          /* storage full or blocked */
        }
        return v;
      });
    },
    [key],
  );

  return [value, set, ready] as const;
}
