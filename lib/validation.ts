export const LIMITS = {
  title: 180,
  name: 120,
  email: 254,
  handle: 64,
  orcid: 19,
  url: 2048,
  summary: 1200,
  body: 200_000,
  comment: 4_000,
  tags: 240,
  identifier: 120,
} as const;

export type ValidationResult = { ok: true; value: string } | { ok: false; error: string };

export function cleanText(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function slugify(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 96);
}

export function isValidEmail(value: string) {
  const email = value.trim();
  if (email.length === 0 || email.length > LIMITS.email) return false;
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email);
}

export function normalizeOrcid(value: string) {
  const digits = value.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (digits.length !== 16) return null;
  return digits.replace(/(.{4})(.{4})(.{4})(.{4})/, '$1-$2-$3-$4');
}

export function orcidChecksumIsValid(orcid: string) {
  const digits = orcid.replace(/-/g, '');
  if (!/^\d{15}[\dX]$/.test(digits)) return false;
  let total = 0;
  for (let index = 0; index < 15; index += 1) {
    total = (total + Number(digits[index])) * 2;
  }
  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const expected = result === 10 ? 'X' : String(result);
  return expected === digits[15];
}

export function normalizeGithubHandle(value: string) {
  const handle = value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/^@/, '').split('/')[0];
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(handle)) return null;
  return handle;
}

export function isInstitutionalEmail(value: string) {
  if (!isValidEmail(value)) return false;
  const domain = value.split('@')[1]?.toLowerCase() ?? '';
  return domain.endsWith('.edu') || domain.endsWith('.ac.uk') || domain.endsWith('.edu.au') || domain.includes('.edu.') || domain.endsWith('.ac.jp');
}

export function safeExternalUrl(value: string) {
  if (typeof value !== 'string' || value.length === 0 || value.length > LIMITS.url) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function validateRequiredText(value: unknown, label: string, max: number): ValidationResult {
  const cleaned = cleanText(value, max);
  if (!cleaned) return { ok: false, error: `${label} is required.` };
  return { ok: true, value: cleaned };
}

export function validateEmail(value: unknown, label = 'Email address'): ValidationResult {
  const cleaned = cleanText(value, LIMITS.email);
  if (!cleaned) return { ok: false, error: `${label} is required.` };
  if (!isValidEmail(cleaned)) {
    return { ok: false, error: `Enter a complete ${label.toLowerCase()}, including an @ and a domain.` };
  }
  return { ok: true, value: cleaned };
}

export function parseTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((tag) => cleanText(tag, 48))
      .filter((tag): tag is string => Boolean(tag))
      .slice(0, 8);
  }
  return cleanText(value, LIMITS.tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}
