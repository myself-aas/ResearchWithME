'use client';

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readLocalString(key: string, fallback = '') {
  if (typeof window === 'undefined') return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function writeLocalString(key: string, value: string) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocal(key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be blocked by privacy settings; the UI keeps its in-memory state.
  }
}

export function readStringArray(key: string, allowed?: Set<string>) {
  const value = readLocal<unknown>(key, []);
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .filter((item) => (allowed ? allowed.has(item) : true))
    .slice(0, 500);
}
