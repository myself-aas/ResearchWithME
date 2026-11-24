/**
 * Pure formatting helpers for dates and reading time. Safe in client
 * components and in tests.
 */

const DAY = 24 * 60 * 60 * 1000;

const longDate = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const shortDate = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** `2026-11-20` → `November 20, 2026` (UTC, so it never drifts by timezone). */
export function formatDate(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? iso : longDate.format(date);
}

/** `2026-11-20` → `Nov 20, 2026`. */
export function formatDateShort(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? iso : shortDate.format(date);
}

/** `2026-11-20` → `2026`. */
export function formatYear(iso: string): string {
  return iso.slice(0, 4);
}

/** ISO date for `<time dateTime>`; the loader already stores YYYY-MM-DD. */
export function toDateTime(iso: string): string {
  return `${iso.slice(0, 10)}T00:00:00.000Z`;
}

/** `1` → `1 min read`. */
export function readingTimeLabel(minutes: number): string {
  return `${Math.max(1, Math.round(minutes))} min read`;
}

/** Whole days between two ISO dates, used for "updated" hints. */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00.000Z`).getTime();
  const to = new Date(`${toIso.slice(0, 10)}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / DAY);
}
