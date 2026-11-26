import 'server-only';

/**
 * The MDX content loader.
 *
 * Posts live as `.mdx` files in `content/posts/` inside this repository — the
 * same git history that ships the code ships the writing. Authoring/build-time
 * reads validate frontmatter with Zod. Production queries use the resulting
 * typed build snapshot because Workers do
 * not expose the build machine's filesystem. No database or runtime writes.
 *
 * Server-only: import `PostMeta` / formatting helpers from the sibling
 * modules in client components.
 */
import { cache } from 'react';
import { loadPosts, toPlainText } from './load';
import { tagToSlug } from './slug';
import { publishedPosts as snapshot } from './snapshot.generated';
import type { ArchiveYear, Post, PostMeta, SearchDoc, TagSummary } from './types';
export { loadPosts, toPlainText, estimateReadingTime, POSTS_DIR } from './load';
export type { LoadOptions } from './load';

function toMeta({ body: _body, ...meta }: Post): PostMeta {
  return meta;
}

/** Every published post, newest first. Memoised per request by React. */
export const getAllPosts = cache((): Post[] => process.env.NODE_ENV === 'production' ? snapshot : loadPosts());

export const getAllPostMeta = cache((): PostMeta[] => getAllPosts().map(toMeta));

export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}

export function getPostMetaBySlug(slug: string): PostMeta | undefined {
  return getAllPostMeta().find((post) => post.slug === slug);
}

export function getFeaturedPost(): PostMeta | undefined {
  const posts = getAllPostMeta();
  return posts.find((post) => post.featured) ?? posts[0];
}

export function getPostSlugs(): string[] {
  return getAllPosts().map((post) => post.slug);
}

export { tagToSlug };

export function getAllTags(): TagSummary[] {
  const counts = new Map<string, number>();
  for (const post of getAllPostMeta()) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, slug: tagToSlug(tag), count }))
    .sort((a, b) => (b.count === a.count ? a.tag.localeCompare(b.tag) : b.count - a.count));
}

export function getTagBySlug(slug: string): TagSummary | undefined {
  return getAllTags().find((tag) => tag.slug === slug);
}

export function getPostsByTag(tag: string): PostMeta[] {
  const needle = tag.toLowerCase();
  return getAllPostMeta().filter((post) => post.tags.includes(needle));
}

/** Related posts: shared tags first, then the same series, then recency. */
export function getRelatedPosts(slug: string, limit = 3): PostMeta[] {
  const posts = getAllPostMeta();
  const current = posts.find((post) => post.slug === slug);
  if (!current) return [];

  const scored = posts
    .filter((post) => post.slug !== slug)
    .map((post) => {
      const sharedTags = post.tags.filter((tag) => current.tags.includes(tag)).length;
      const sameSeries = Boolean(current.series && post.series === current.series);
      return { post, score: sharedTags * 2 + (sameSeries ? 3 : 0) };
    })
    .sort((a, b) =>
      b.score === a.score ? b.post.date.localeCompare(a.post.date) : b.score - a.score,
    );

  const related = scored.filter((entry) => entry.score > 0).map((entry) => entry.post);
  const filler = scored.map((entry) => entry.post).filter((post) => !related.includes(post));
  return [...related, ...filler].slice(0, limit);
}

/** Neighbours in the newest-first reading order. */
export function getAdjacentPosts(slug: string): { newer?: PostMeta; older?: PostMeta } {
  const posts = getAllPostMeta();
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) return {};
  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}

/** Posts grouped by year for the archive page. */
export function getArchive(): ArchiveYear[] {
  const byYear = new Map<string, PostMeta[]>();
  for (const post of getAllPostMeta()) {
    const year = post.date.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), post]);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, posts]) => ({ year, posts }));
}

export interface SiteStats {
  posts: number;
  tags: number;
  words: number;
}

export function getSiteStats(): SiteStats {
  const posts = getAllPostMeta();
  return {
    posts: posts.length,
    tags: getAllTags().length,
    words: posts.reduce((total, post) => total + post.wordCount, 0),
  };
}

/** Documents for the client-side search palette. */
export function getSearchIndex(): SearchDoc[] {
  return getAllPosts().map((post) => ({
    slug: post.slug,
    href: post.href,
    title: post.title,
    description: post.description,
    tags: post.tags,
    date: post.date,
    readingTimeMinutes: post.readingTimeMinutes,
    text: toPlainText(post.body).slice(0, 8000),
  }));
}
