import 'server-only';

/**
 * The MDX content loader.
 *
 * Posts live as `.mdx` files in `content/posts/` inside this repository — the
 * same git history that ships the code ships the writing. Every read parses
 * the file system directly, validates frontmatter with Zod, and returns typed
 * records; there is no database, no API key, and no runtime write path.
 *
 * Server-only: import `PostMeta` / formatting helpers from the sibling
 * modules in client components.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import matter from 'gray-matter';
import { frontmatterSchema } from './schema';
import { tagToSlug } from './slug';
import type { ArchiveYear, Post, PostMeta, SearchDoc, TagSummary } from './types';

/** Directory scanned for posts, relative to the project root. */
export const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

const WORDS_PER_MINUTE = 225;
const MDX_EXTENSIONS = new Set(['.mdx', '.md']);

export interface LoadOptions {
  /** Override the content directory (used by tests). */
  dir?: string;
  /** Include posts marked `draft: true`. Defaults to true outside production. */
  includeDrafts?: boolean;
}

/** Reduce an MDX body to plain text for reading time and search. */
export function toPlainText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/^import\s.+$/gm, ' ')
    .replace(/^export\s.+$/gm, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function estimateReadingTime(plainText: string): { minutes: number; words: number } {
  const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  return { words, minutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)) };
}

function formatIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.map(String).join('.') || 'frontmatter';
      return `  - ${field}: ${issue.message}`;
    })
    .join('\n');
}

function readPost(filePath: string, includeDrafts: boolean): Post | null {
  const fileName = path.basename(filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const result = frontmatterSchema.safeParse(parsed.data);

  if (!result.success) {
    throw new Error(
      `Invalid frontmatter in content/posts/${fileName}:\n${formatIssues(result.error)}`,
    );
  }

  const frontmatter = result.data;
  if (frontmatter.draft && !includeDrafts) return null;

  const fileSlug = fileName.replace(/\.(mdx?|md)$/i, '');
  const slug = frontmatter.slug ?? fileSlug;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      `Invalid slug "${slug}" in content/posts/${fileName}: use lowercase letters, numbers, and hyphens.`,
    );
  }

  if (frontmatter.cover && !frontmatter.coverAlt) {
    throw new Error(
      `content/posts/${fileName} sets a cover image but no coverAlt. Alt text is required for every cover.`,
    );
  }

  const plainText = toPlainText(parsed.content);
  const { minutes, words } = estimateReadingTime(plainText);
  const tags = [...new Set(frontmatter.tags)].sort();

  return {
    slug,
    title: frontmatter.title,
    description: frontmatter.description,
    date: frontmatter.date,
    updated: frontmatter.updated,
    tags,
    series: frontmatter.series,
    cover: frontmatter.cover,
    coverAlt: frontmatter.coverAlt,
    coverStyle: frontmatter.coverStyle,
    featured: frontmatter.featured,
    draft: frontmatter.draft,
    canonical: frontmatter.canonical,
    toc: frontmatter.toc,
    faq: frontmatter.faq,
    readingTimeMinutes: minutes,
    wordCount: words,
    href: `/blog/${slug}`,
    body: parsed.content.trim(),
  };
}

/**
 * Read and validate every post in a directory.
 *
 * A missing `content/posts/` directory is not an error — a freshly cloned blog
 * with nothing published should build an honest empty index. A malformed file
 * is an error: silently dropping it would hide the typo until someone noticed
 * a post had vanished.
 */
export function loadPosts({ dir = POSTS_DIR, includeDrafts }: LoadOptions = {}): Post[] {
  const withDrafts = includeDrafts ?? process.env.NODE_ENV !== 'production';
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && MDX_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort();

  const posts: Post[] = [];
  const slugs = new Map<string, string>();

  for (const fileName of files) {
    const post = readPost(path.join(dir, fileName), withDrafts);
    if (!post) continue;

    const existing = slugs.get(post.slug);
    if (existing) {
      throw new Error(
        `Duplicate slug "${post.slug}" in content/posts/${existing} and content/posts/${fileName}.`,
      );
    }
    slugs.set(post.slug, fileName);
    posts.push(post);
  }

  return posts.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)));
}

function toMeta({ body: _body, ...meta }: Post): PostMeta {
  return meta;
}

/** Every published post, newest first. Memoised per request by React. */
export const getAllPosts = cache((): Post[] => loadPosts());

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
