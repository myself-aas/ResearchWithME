import { describe, expect, it } from 'vitest';
import {
  PROFILE_LIMITS,
  normalizeGithub,
  normalizeOrcid,
  normalizeProfileSlug,
  suggestProfileSlug,
  validateProfileDraft,
  type ProfileDraft,
} from '@/lib/profile/validation';

const draft = (overrides: Partial<ProfileDraft> = {}): ProfileDraft => ({
  slug: 'ashif-ahmed-shuvo',
  displayName: 'Ashif Ahmed Shuvo',
  role: 'Editor-in-Chief',
  domain: 'Public health',
  institution: 'ResearchWithMe',
  bio: 'I review evidence on public-health interventions.',
  orcid: '0000-0002-1825-0097',
  github: 'octocat',
  website: 'https://example.org',
  scholar: 'https://scholar.google.com/citations?user=abc',
  published: true,
  ...overrides,
});

describe('profile validation', () => {
  it('normalizes a display name into a valid slug', () => {
    expect(normalizeProfileSlug('  Ashif  Ahmed — Shuvo ')).toBe('ashif-ahmed-shuvo');
    expect(normalizeProfileSlug('Müller & Søn')).toBe('muller-son');
    expect(normalizeProfileSlug('---')).toBe('');
  });

  it('suggests a slug from the name, then the email local part', () => {
    expect(suggestProfileSlug({ displayName: 'Ashif Ahmed Shuvo', email: 'x@y.z' })).toBe(
      'ashif-ahmed-shuvo',
    );
    expect(suggestProfileSlug({ displayName: '!', email: 'a.shuv@example.org' })).toBe('a-shuv');
    expect(suggestProfileSlug({ displayName: '!', email: '@example.org' })).toBe('');
  });

  it('accepts ORCID as a bare iD, an http(s) URL, or blank', () => {
    expect(normalizeOrcid('0000-0002-1825-0097')).toBe('0000-0002-1825-0097');
    expect(normalizeOrcid('https://orcid.org/0000-0002-1825-009X')).toBe('0000-0002-1825-009X');
    expect(normalizeOrcid('   ')).toBe('');
    expect(normalizeOrcid('1234')).toBeNull();
  });

  it('accepts a GitHub handle, @handle, or profile URL', () => {
    expect(normalizeGithub('octocat')).toBe('octocat');
    expect(normalizeGithub('@octo-cat')).toBe('octo-cat');
    expect(normalizeGithub('https://github.com/octocat/')).toBe('octocat');
    expect(normalizeGithub('')).toBe('');
    expect(normalizeGithub('octo cat')).toBeNull();
    expect(normalizeGithub('https://example.org/octocat')).toBeNull();
  });

  it('returns normalized column values for a valid draft', () => {
    const result = validateProfileDraft(
      draft({
        displayName: '  Ashif Ahmed Shuvo ',
        orcid: 'https://orcid.org/0000-0002-1825-0097',
        github: '@octocat',
        website: 'https://example.org/',
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      slug: 'ashif-ahmed-shuvo',
      display_name: 'Ashif Ahmed Shuvo',
      orcid: '0000-0002-1825-0097',
      github: 'octocat',
      website: 'https://example.org',
      published: true,
    });
  });

  it('rejects a slug that is not already normalized', () => {
    const result = validateProfileDraft(draft({ slug: 'Ashif Ahmed' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.slug).toContain('ashif-ahmed');
  });

  it('rejects an invalid ORCID and a non-URL website', () => {
    const result = validateProfileDraft(draft({ orcid: '0000-0002-1825', website: 'example.org' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.orcid).toBeTruthy();
    expect(result.errors.website).toBeTruthy();
  });

  it('enforces the database length limits', () => {
    const result = validateProfileDraft(
      draft({ bio: 'x'.repeat(PROFILE_LIMITS.bio + 1), institution: 'y'.repeat(201) }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.bio).toContain('2000');
    expect(result.errors.institution).toContain('200');
  });

  it('requires a display name', () => {
    const result = validateProfileDraft(draft({ displayName: 'A' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.displayName).toBeTruthy();
  });
});
