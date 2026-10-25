export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const WORDS_PER_MINUTE = 220;

export function readingTimeFromText(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function formatReadingTime(minutes: number) {
  return minutes <= 1 ? '1 min read' : `${minutes} min read`;
}

export function formatDate(value: Date | string | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '';
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(date);
}

export function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function truncate(value: string, max = 160) {
  const text = value.trim();
  if (text.length <= max) return text;
  const clipped = text.slice(0, Math.max(0, max - 1));
  const boundary = clipped.lastIndexOf(' ');
  return `${(boundary > max * 0.6 ? clipped.slice(0, boundary) : clipped).trimEnd()}…`;
}

export function safeInitials(name: string | undefined, fallback = 'RW') {
  if (!name) return fallback;
  const initials = name
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return initials || fallback;
}
