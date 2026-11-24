import { describe, expect, it } from 'vitest';
import { frontmatterSchema } from '@/lib/content/schema';

const valid = {
  title: 'A post',
  description: 'A description that is comfortably long enough to pass the minimum.',
  date: '2026-11-01',
};

describe('frontmatterSchema', () => {
  it('applies defaults', () => {
    const parsed = frontmatterSchema.parse(valid);
    expect(parsed.tags).toEqual([]);
    expect(parsed.featured).toBe(false);
    expect(parsed.draft).toBe(false);
    expect(parsed.toc).toBe(true);
  });

  it('normalises YAML dates and ISO strings to YYYY-MM-DD', () => {
    expect(frontmatterSchema.parse({ ...valid, date: new Date('2026-03-09T00:00:00Z') }).date).toBe('2026-03-09');
    expect(frontmatterSchema.parse({ ...valid, date: '2026-03-09T14:32:00Z' }).date).toBe('2026-03-09');
  });

  it('rejects an impossible date', () => {
    const result = frontmatterSchema.safeParse({ ...valid, date: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('lowercases and trims tags', () => {
    const parsed = frontmatterSchema.parse({ ...valid, tags: ['  MDX ', 'Methodology'] });
    expect(parsed.tags).toEqual(['mdx', 'methodology']);
  });

  it('enforces description bounds', () => {
    expect(frontmatterSchema.safeParse({ ...valid, description: 'too short' }).success).toBe(false);
    expect(frontmatterSchema.safeParse({ ...valid, description: 'x'.repeat(281) }).success).toBe(false);
  });

  it('enforces the slug pattern', () => {
    expect(frontmatterSchema.safeParse({ ...valid, slug: 'Fine-Slug' }).success).toBe(false);
    expect(frontmatterSchema.safeParse({ ...valid, slug: 'fine-slug' }).success).toBe(true);
  });

  it('requires canonical to be an absolute URL', () => {
    expect(frontmatterSchema.safeParse({ ...valid, canonical: '/local' }).success).toBe(false);
    expect(frontmatterSchema.safeParse({ ...valid, canonical: 'https://example.com/x' }).success).toBe(true);
  });

  it('rejects unknown keys', () => {
    const result = frontmatterSchema.safeParse({ ...valid, tgas: ['typo'] });
    expect(result.success).toBe(false);
  });
});
