import { describe, expect, it } from 'vitest';
import {
  cleanText,
  isInstitutionalEmail,
  isValidEmail,
  normalizeGithubHandle,
  normalizeOrcid,
  orcidChecksumIsValid,
  parseTags,
  safeExternalUrl,
  slugify,
} from '@/lib/validation';

describe('slugify', () => {
  it('normalizes accented and punctuated titles', () => {
    expect(slugify('  Inside vLLM & PagedAttention: Why Memory Fragmentation  ')).toBe(
      'inside-vllm-pagedattention-why-memory-fragmentation',
    );
  });

  it('strips diacritics and caps length', () => {
    expect(slugify('Café Étude')).toBe('cafe-etude');
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(96);
  });

  it('returns an empty string when there is nothing usable', () => {
    expect(slugify('——')).toBe('');
  });
});

describe('cleanText', () => {
  it('drops control characters and trims', () => {
    expect(cleanText('  hello\u0000 world  ', 40)).toBe('hello world');
  });

  it('truncates to the limit', () => {
    expect(cleanText('abcdefghij', 4)).toBe('abcd');
  });

  it('returns an empty string for non-strings', () => {
    expect(cleanText(42, 10)).toBe('');
    expect(cleanText(null, 10)).toBe('');
  });
});

describe('email validation', () => {
  it('accepts ordinary academic addresses', () => {
    expect(isValidEmail('researcher@university.edu')).toBe(true);
    expect(isValidEmail('a.b+tag@lab.ac.uk')).toBe(true);
  });

  it('rejects incomplete addresses', () => {
    expect(isValidEmail('researcher@university')).toBe(false);
    expect(isValidEmail('researcher@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('recognises academic domains', () => {
    expect(isInstitutionalEmail('name@jhu.edu')).toBe(true);
    expect(isInstitutionalEmail('name@ox.ac.uk')).toBe(true);
    expect(isInstitutionalEmail('name@gmail.com')).toBe(false);
  });
});

describe('ORCID', () => {
  it('normalizes grouped digits', () => {
    expect(normalizeOrcid('0000 0002 1825 0097')).toBe('0000-0002-1825-0097');
  });

  it('rejects wrong lengths', () => {
    expect(normalizeOrcid('0000-0002')).toBeNull();
  });

  it('validates the checksum', () => {
    expect(orcidChecksumIsValid('0000-0002-1825-0097')).toBe(true);
    expect(orcidChecksumIsValid('0000-0002-1825-0098')).toBe(false);
  });
});

describe('GitHub handles', () => {
  it('accepts a handle or profile URL', () => {
    expect(normalizeGithubHandle('@mayalin-sys')).toBe('mayalin-sys');
    expect(normalizeGithubHandle('https://github.com/mayalin-sys')).toBe('mayalin-sys');
  });

  it('rejects invalid handles', () => {
    expect(normalizeGithubHandle('bad--handle')).toBeNull();
    expect(normalizeGithubHandle('')).toBeNull();
  });
});

describe('safeExternalUrl', () => {
  it('accepts http and https', () => {
    expect(safeExternalUrl('https://example.org/paper')).toBe('https://example.org/paper');
  });

  it('rejects other protocols and malformed values', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('not a url')).toBeNull();
  });
});

describe('parseTags', () => {
  it('deduplicates and trims while enforcing a cap', () => {
    const tags = parseTags(' systems, gpu , , systems, inference, one, two, three, four, five, six, seven');
    expect(tags[0]).toBe('systems');
    expect(tags.length).toBeLessThanOrEqual(8);
  });

  it('accepts arrays', () => {
    expect(parseTags(['alpha', 3, 'beta'])).toEqual(['alpha', 'beta']);
  });
});
