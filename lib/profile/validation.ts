/**
 * Profile form rules (single source of truth for the browser form and tests).
 *
 * These mirror the CHECK constraints on `public.profiles`
 * (`supabase/migrations/20261108000400_author_profiles.sql`) and the
 * `normalize_profile_slug` trigger, so a typo is caught before a round trip
 * instead of surfacing as a raw Postgres error.
 */

export const PROFILE_LIMITS = {
  slug: 80,
  displayName: 120,
  bio: 2000,
  role: 120,
  domain: 160,
  institution: 200,
  orcid: 40,
  github: 80,
  website: 500,
  scholar: 500,
} as const;

export interface ProfileDraft {
  slug: string;
  displayName: string;
  role: string;
  domain: string;
  institution: string;
  bio: string;
  orcid: string;
  github: string;
  website: string;
  scholar: string;
  published: boolean;
}

export interface NormalizedProfile {
  slug: string;
  display_name: string;
  role: string;
  domain: string;
  institution: string;
  bio: string;
  orcid: string;
  github: string;
  website: string;
  scholar: string;
  published: boolean;
}

export type ProfileErrors = Partial<Record<keyof ProfileDraft | 'form', string>>;

export type ProfileValidation =
  | { ok: true; value: NormalizedProfile }
  | { ok: false; errors: ProfileErrors };

// Letters NFKD does not decompose into ASCII. Without this an author called
// Søren ends up with /author/sren.
const LATIN_FOLDING: Record<string, string> = {
  ø: 'o',
  Ø: 'o',
  æ: 'ae',
  Æ: 'ae',
  ß: 'ss',
  ł: 'l',
  Ł: 'l',
  đ: 'd',
  Đ: 'd',
  ð: 'd',
  þ: 'th',
  Þ: 'th',
  œ: 'oe',
  Œ: 'oe',
};

/** Lowercase, dash-separated, URL-safe. Mirrors `normalize_profile_slug`. */
export function normalizeProfileSlug(input: string): string {
  return input
    .replace(/[øØæÆßłŁđĐðþÞœŒ]/g, (letter) => LATIN_FOLDING[letter] ?? letter)
    .normalize('NFKD')
    // Strip the combining marks NFKD splits off so "ü" becomes "u", not "u-".
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, PROFILE_LIMITS.slug)
    .replace(/-+$/g, '');
}

/** Suggests a slug from a display name, falling back to the email local part. */
export function suggestProfileSlug(input: { displayName?: string; email?: string }): string {
  const fromName = normalizeProfileSlug(input.displayName ?? '');
  if (fromName.length >= 2) return fromName;
  const local = (input.email ?? '').split('@')[0] ?? '';
  const fromEmail = normalizeProfileSlug(local);
  return fromEmail.length >= 2 ? fromEmail : '';
}

const ORCID_ID = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i;

/** Accepts `0000-0002-1825-0097`, an orcid.org URL, or an empty string. */
export function normalizeOrcid(input: string): string | null {
  const value = input.trim();
  if (!value) return '';
  const stripped = value
    .replace(/^https?:\/\/(www\.)?orcid\.org\//i, '')
    .replace(/\/+$/, '')
    .trim();
  return ORCID_ID.test(stripped) ? stripped.toUpperCase() : null;
}

/** Accepts `octocat`, `@octocat`, or a github.com URL; returns the handle. */
export function normalizeGithub(input: string): string | null {
  const value = input.trim();
  if (!value) return '';
  const stripped = value
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '')
    .trim();
  return /^[a-z\d](?:[a-z\d-]{0,38})$/i.test(stripped) ? stripped : null;
}

/**
 * The profile editor stores a bare handle (`octocat`), while seeded authors may
 * carry a full URL. Rendering a bare handle as `href` makes a relative link to a
 * page on this site, so every render site goes through this helper.
 */
export function githubProfileUrl(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://github.com/${trimmed.replace(/^@/, '')}`;
}

function normalizeUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function lengthError(label: string, value: string, max: number): string | undefined {
  return value.length > max ? `${label} must be ${max} characters or fewer.` : undefined;
}

/**
 * Validates and normalizes a profile draft. Slug is required — the form
 * pre-fills a suggestion, and the database enforces uniqueness.
 */
export function validateProfileDraft(draft: ProfileDraft): ProfileValidation {
  const errors: ProfileErrors = {};

  const displayName = draft.displayName.trim();
  if (displayName.length < 2) errors.displayName = 'Enter the name readers should see.';
  else if (displayName.length > PROFILE_LIMITS.displayName) {
    errors.displayName = `Name must be ${PROFILE_LIMITS.displayName} characters or fewer.`;
  }

  const slug = normalizeProfileSlug(draft.slug);
  if (slug.length < 2) errors.slug = 'Choose a profile URL with at least two letters or numbers.';
  else if (slug !== draft.slug.trim().toLowerCase()) {
    errors.slug = `Use lowercase letters, numbers, and single dashes — try “${slug}”.`;
  }

  const role = draft.role.trim();
  const domain = draft.domain.trim();
  const institution = draft.institution.trim();
  const bio = draft.bio.trim();
  const website = normalizeUrl(draft.website);
  const scholar = normalizeUrl(draft.scholar);
  const orcid = normalizeOrcid(draft.orcid);
  const github = normalizeGithub(draft.github);

  const limits: Array<[keyof ProfileErrors, string, string, number]> = [
    ['role', 'Role', role, PROFILE_LIMITS.role],
    ['domain', 'Field', domain, PROFILE_LIMITS.domain],
    ['institution', 'Institution', institution, PROFILE_LIMITS.institution],
    ['bio', 'Bio', bio, PROFILE_LIMITS.bio],
  ];
  for (const [field, label, value, max] of limits) {
    const error = lengthError(label, value, max);
    if (error) errors[field] = error;
  }

  if (website === null) errors.website = 'Enter a full https:// address, or leave it blank.';
  if (scholar === null) errors.scholar = 'Enter a full https:// address, or leave it blank.';
  if (orcid === null) errors.orcid = 'Use the 16-digit ORCID iD, e.g. 0000-0002-1825-0097.';
  if (github === null) errors.github = 'Use a GitHub handle (letters, numbers, dashes), or leave it blank.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      slug,
      display_name: displayName,
      role,
      domain,
      institution,
      bio,
      orcid: orcid ?? '',
      github: github ?? '',
      website: website ?? '',
      scholar: scholar ?? '',
      published: draft.published,
    },
  };
}
