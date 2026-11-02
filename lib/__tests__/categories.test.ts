import { describe, expect, it } from 'vitest';
import { CATEGORIES, categoryToSlug, slugToCategory } from '@/lib/blog-data';

describe('Category slug and mapping', () => {
  it('converts each category into a clean URL slug', () => {
    expect(categoryToSlug('Data & Policy')).toBe('data-policy');
    expect(categoryToSlug('STEM & Tech')).toBe('stem-tech');
    expect(categoryToSlug('Research Reviews')).toBe('research-reviews');
    expect(categoryToSlug('GitHub Repo Teardowns')).toBe('github-repo-teardowns');
    expect(categoryToSlug('Health & Medicine')).toBe('health-medicine');
    expect(categoryToSlug('Sociology & Culture')).toBe('sociology-culture');
  });

  it('maps clean URL slugs back to canonical BlogCategory', () => {
    expect(slugToCategory('data-policy')).toBe('Data & Policy');
    expect(slugToCategory('stem-tech')).toBe('STEM & Tech');
    expect(slugToCategory('research-reviews')).toBe('Research Reviews');
    expect(slugToCategory('github-repo-teardowns')).toBe('GitHub Repo Teardowns');
    expect(slugToCategory('health-medicine')).toBe('Health & Medicine');
    expect(slugToCategory('sociology-culture')).toBe('Sociology & Culture');
  });

  it('handles legacy encoded query parameters and aliases', () => {
    expect(slugToCategory('Data & Policy')).toBe('Data & Policy');
    expect(slugToCategory('Data%20%26%20Policy')).toBe('Data & Policy');
    expect(slugToCategory('data-and-policy')).toBe('Data & Policy');
    expect(slugToCategory('stem-and-tech')).toBe('STEM & Tech');
    expect(slugToCategory('health-and-medicine')).toBe('Health & Medicine');
  });

  it('returns undefined for unknown categories', () => {
    expect(slugToCategory('unknown-field')).toBeUndefined();
    expect(slugToCategory('')).toBeUndefined();
    expect(slugToCategory(undefined)).toBeUndefined();
  });

  it('covers all official categories roundtrip', () => {
    for (const category of CATEGORIES) {
      const slug = categoryToSlug(category);
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(slugToCategory(slug)).toBe(category);
    }
  });
});

