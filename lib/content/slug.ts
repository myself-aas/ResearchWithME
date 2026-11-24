/**
 * URL slugs for tags and headings (pure, client-safe).
 * Mirrors GitHub's slugger closely enough that `rehype-slug` and the
 * table-of-contents links agree.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function tagToSlug(tag: string): string {
  return slugify(tag);
}
