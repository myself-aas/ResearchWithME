import { BlogCategory, CATEGORIES } from './blog-data';

export const CATEGORY_SLUGS: Record<BlogCategory, string> = {
  'Research Reviews': 'research-reviews',
  'GitHub Repo Teardowns': 'github-repo-teardowns',
  'STEM & Tech': 'stem-tech',
  'Health & Medicine': 'health-medicine',
  'Sociology & Culture': 'sociology-culture',
  'Data & Policy': 'data-policy',
};

export const SLUG_TO_CATEGORY: Record<string, BlogCategory> = {
  'research-reviews': 'Research Reviews',
  'github-repo-teardowns': 'GitHub Repo Teardowns',
  'stem-tech': 'STEM & Tech',
  'health-medicine': 'Health & Medicine',
  'sociology-culture': 'Sociology & Culture',
  'data-policy': 'Data & Policy',
};

/** Convert a display category name into a clean, human-readable URL slug */
export function categoryToSlug(category: string): string {
  if (category in CATEGORY_SLUGS) {
    return CATEGORY_SLUGS[category as BlogCategory];
  }
  return category
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Convert a slug or legacy encoded query value into the canonical BlogCategory */
export function slugToCategory(slugOrName: string | undefined): BlogCategory | undefined {
  if (!slugOrName) return undefined;
  const decoded = decodeURIComponent(slugOrName).trim();
  const exact = CATEGORIES.find((c) => c.toLowerCase() === decoded.toLowerCase());
  if (exact) return exact;

  const normalized = decoded
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (SLUG_TO_CATEGORY[normalized]) return SLUG_TO_CATEGORY[normalized];

  const withoutAnd = normalized.replace(/-and-/g, '-');
  if (SLUG_TO_CATEGORY[withoutAnd]) return SLUG_TO_CATEGORY[withoutAnd];

  return undefined;
}

