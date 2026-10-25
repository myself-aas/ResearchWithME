import { AUTHORS, CATEGORIES, type ArticleFormat, type BlogCategory } from '@/lib/blog-data';
import { formatReadingTime, readingTimeFromText } from '@/lib/format';
import { isSupabaseConfigured, SUPABASE_URL } from '@/lib/supabase/config';
import { cleanText, parseTags, safeExternalUrl, slugify } from '@/lib/validation';
import type { CmsCommentInput, CmsPostInput, CmsStatus, FieldErrors } from './types';

export const CMS_LIMITS = {
  title: 180,
  subtitle: 400,
  summary: 1200,
  content: 200_000,
  takeaway: 300,
  takeaways: 8,
  authorName: 120,
  comment: 4_000,
  commentAuthor: 120,
  commentRole: 80,
} as const;

export const ARTICLE_FORMATS: ArticleFormat[] = [
  'Paper Review',
  'Repo Teardown',
  'Deep-Dive Essay',
  'Field Notes',
  'Case Study',
];

const DEFAULT_AUTHOR_ID = 'marcus-vance';

export function isCmsStatus(value: unknown): value is CmsStatus {
  return value === 'draft' || value === 'published';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeCoverImage(value: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return { ok: true, value: null };

  if (/^\/images\/[a-z0-9][a-z0-9._-]*$/i.test(raw) && !raw.includes('..')) {
    return { ok: true, value: raw };
  }

  // Covers are rendered with next/image, so remote sources must be on the
  // configured Supabase storage origin. Body images are unrestricted (they use
  // a plain <img>), but a cover cannot point at an unconfigured host.
  const external = safeExternalUrl(raw);
  if (external && isSupabaseConfigured) {
    try {
      const candidate = new URL(external);
      const configured = new URL(SUPABASE_URL);
      if (
        candidate.origin === configured.origin &&
        candidate.pathname.startsWith('/storage/v1/object/public/blog-images/')
      ) {
        return { ok: true, value: external };
      }
    } catch {
      // Fall through to the message below.
    }
  }

  return {
    ok: false,
    error: 'Upload a cover to the media library or choose a bundled editorial image.',
  };
}

function normalizeTakeaways(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, CMS_LIMITS.takeaway))
    .filter(Boolean)
    .slice(0, CMS_LIMITS.takeaways);
}

export type PostNormalizationResult =
  | { ok: true; value: CmsPostInput }
  | { ok: false; message: string; fieldErrors: FieldErrors };

/**
 * Validates and normalises a create/update payload. The editor always sends a
 * complete document; partial status toggles are merged with the stored post by
 * the route before reaching this function.
 */
export function normalizePostInput(input: unknown): PostNormalizationResult {
  const raw = asRecord(input);
  const fieldErrors: FieldErrors = {};

  const rawContent = typeof raw.content === 'string' ? raw.content : '';
  if (rawContent.length > CMS_LIMITS.content) {
    return {
      ok: false,
      message: `Articles are limited to ${CMS_LIMITS.content} characters.`,
      fieldErrors: { content: 'This article is too long to save.' },
    };
  }

  const title = cleanText(raw.title, CMS_LIMITS.title);
  const content = cleanText(raw.content, CMS_LIMITS.content);
  const summary = cleanText(raw.summary, CMS_LIMITS.summary);
  const status: CmsStatus = isCmsStatus(raw.status) ? raw.status : 'draft';

  if (title.length < 8) {
    fieldErrors.title = 'Add a working title of at least 8 characters.';
  }

  const slugSource = cleanText(raw.slug, 96) || title;
  const slug = slugify(slugSource);
  if (!slug) {
    fieldErrors.slug = 'The title needs at least one letter or number to build a URL.';
  }

  const authorId = cleanText(raw.authorId, 80) || DEFAULT_AUTHOR_ID;
  const author = AUTHORS[authorId];
  if (!author) {
    fieldErrors.authorId = 'Choose one of the verified author profiles.';
  }

  const category = CATEGORIES.includes(raw.category as BlogCategory)
    ? (raw.category as BlogCategory)
    : 'Research Reviews';
  const format = ARTICLE_FORMATS.includes(raw.format as ArticleFormat)
    ? (raw.format as ArticleFormat)
    : 'Paper Review';

  const cover = normalizeCoverImage(raw.coverImage);
  if (!cover.ok) fieldErrors.coverImage = cover.error;
  const coverValue = cover.ok ? cover.value : null;

  const keyTakeaways = normalizeTakeaways(raw.keyTakeaways);

  if (status === 'published') {
    if (content.length < 200) {
      fieldErrors.content = 'A published article needs at least 200 characters of body copy.';
    }
    if (summary.length < 40) {
      fieldErrors.summary = 'Write a summary of at least 40 characters. It appears in the journal feed.';
    }
    if (keyTakeaways.length === 0) {
      fieldErrors.keyTakeaways = 'Add at least one key takeaway before publishing.';
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: 'Some fields need attention before this can be saved.',
      fieldErrors,
    };
  }

  const resolvedAuthor = author ?? AUTHORS[DEFAULT_AUTHOR_ID];
  const readTime = formatReadingTime(readingTimeFromText(content));

  return {
    ok: true,
    value: {
      title,
      slug,
      content,
      status,
      subtitle: cleanText(raw.subtitle, CMS_LIMITS.subtitle) || summary.slice(0, 140),
      summary,
      category,
      format,
      authorId: resolvedAuthor.id,
      authorName: resolvedAuthor.name,
      coverImage: coverValue,
      tags: parseTags(raw.tags),
      keyTakeaways,
      readTime,
      featured: raw.featured === true,
    },
  };
}

export type CommentNormalizationResult =
  | { ok: true; value: CmsCommentInput }
  | { ok: false; message: string; fieldErrors: FieldErrors };

export function normalizeCommentInput(input: unknown): CommentNormalizationResult {
  const raw = asRecord(input);
  const fieldErrors: FieldErrors = {};

  const authorName = cleanText(raw.authorName, CMS_LIMITS.commentAuthor);
  const authorRole = cleanText(raw.authorRole, CMS_LIMITS.commentRole) || 'Reader';
  const content = cleanText(raw.content ?? raw.text, CMS_LIMITS.comment);

  if (authorName.length < 2) {
    fieldErrors.authorName = 'Add the name that should appear with the comment.';
  }
  if (content.length < 2) {
    fieldErrors.content = 'Write at least a short sentence.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'The comment is not ready to publish.', fieldErrors };
  }

  return { ok: true, value: { authorName, authorRole, content } };
}

/** Post ids in the public reader are namespaced to avoid colliding with seed ids. */
export function toPublicPostId(id: string) {
  return `cms-${id}`;
}

export function fromPublicPostId(publicId: string): string | null {
  if (!publicId.startsWith('cms-')) return null;
  const id = publicId.slice(4);
  return /^\d{1,19}$/.test(id) ? id : null;
}
