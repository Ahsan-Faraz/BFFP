"use client";

import { useSyncExternalStore } from "react";

// Tiny localStorage store. Reads are wrapped in try/catch because storage can
// throw (private mode, blocked site data). Server render always sees `null`,
// so components hydrate cleanly and pick up saved values right after.

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the UI still works, it just won't persist
  }
  listeners.forEach((l) => l());
}

export function useStoredString(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readStorage(key),
    () => null,
  );
}

export const LAST_READ_KEY = "lastRead";
export type LastRead = { topic: string; id: string; title: string };

export function parseLastRead(raw: string | null): LastRead | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastRead;
  } catch {
    return null;
  }
}
