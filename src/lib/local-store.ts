import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed store. Server render and hydration use the default value;
 * React then switches to the saved value, so there's no hydration mismatch.
 */
export function createLocalStore<T>(key: string, fallback: T, normalize: (raw: unknown) => T = (v) => v as T) {
  const listeners = new Set<() => void>();
  let cache: T | undefined;

  function read(): T {
    if (cache !== undefined) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw ? normalize(JSON.parse(raw)) : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  }

  function set(next: T | ((prev: T) => T)) {
    const value = typeof next === "function" ? (next as (p: T) => T)(read()) : next;
    cache = value;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked — keep in memory */
    }
    listeners.forEach((l) => l());
  }

  function subscribe(l: () => void) {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = undefined;
        l();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, read, () => fallback);
  }

  return { get: read, set, subscribe, useValue };
}
