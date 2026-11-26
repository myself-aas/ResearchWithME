/** Build-time filesystem loader. Production queries consume the bundled snapshot. */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { frontmatterSchema } from './schema';
import type { Post } from './types';

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
