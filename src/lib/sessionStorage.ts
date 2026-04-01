"use client";

const isBrowser = typeof window !== "undefined";

function safeParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function loadSessionStorage<T>(
  key: string,
  fallback: T,
  parse?: (value: unknown) => T,
): T {
  if (!isBrowser) return fallback;
  const parsed = safeParse(window.sessionStorage.getItem(key));
  if (parsed == null) return fallback;
  if (!parse) return parsed as T;
  return parse(parsed);
}

export function saveSessionStorage(key: string, value: unknown): void {
  if (!isBrowser) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
}
