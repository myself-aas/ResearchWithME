import type { CmsStore } from '@/lib/cms/types';
import type { CmsPost } from '@/lib/cms/types';
import { cmsPostToArticle } from '@/lib/cms/mapping';
import { DEFAULT_LEGACY_SEEDS } from '@/lib/legacy/seeds';
import type { LegacySeeds, LegacyStore } from '@/lib/legacy/types';
import type { BlogPost } from '@/lib/blog-data';
import type { RequestContext } from './context';
import { isPublicConfigValid } from './context';
import { createSupabaseServerClient } from './auth';
import { CmsUnavailableError } from '@/lib/cms/errors';
import {
  rejectAuthorResolution,
  resolveProfileRow,
  type ProfileRow,
  type PublishableAuthor,
} from '@/lib/cms/publishable-author';

/**
 * Read-only public stores for deployments without durable storage (previews,
 * misconfigured production fail-closed reads). They serve only the checked-in
 * public data — never draft content, never private records — and reject every
 * write with the same failure shape as the durable stores, so callers can
 * answer 503/409 instead of reporting a false success.
 */

function readonlyStore(): Error {
  return new Error('This deployment is read-only: durable storage is not configured.');
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createReadOnlyCmsStore(): CmsStore {
  const unavailable = () => Promise.reject(readonlyStore());
  return {
    // No editor pick: read-only stores exist for public reads only.
    kind: 'local',
    listPosts: () => Promise.resolve([]),
    getPost: () => Promise.resolve(null),
    getPostBySlug: () => Promise.resolve(null),
    createPost: unavailable,
    updatePost: unavailable,
    deletePost: unavailable,
    incrementLikes: unavailable,
    listComments: () => Promise.resolve([]),
    listCommentsForPost: () => Promise.resolve([]),
    listCommentCounts: () => Promise.resolve({}),
    getComment: () => Promise.resolve(null),
    createComment: unavailable,
    deleteComment: unavailable,
  };
}

export function createReadOnlyLegacyStore(seeds: LegacySeeds): LegacyStore {
  const articles = clone(seeds.articles);
  const comments = clone(seeds.comments);
  return {
    kind: 'local',
    getArticles: () => Promise.resolve(clone(articles)),
    findArticle: (key: string): Promise<BlogPost | undefined> =>
      Promise.resolve(articles.find((article) => article.slug === key || article.id === key)),
    incrementLikes: () => Promise.reject(readonlyStore()),
    getComments: (postId?: string) =>
      Promise.resolve(clone(postId ? comments.filter((comment) => comment.postId === postId) : comments)),
    addComment: () => Promise.reject(readonlyStore()),
  };
}

// ---------------------------------------------------------------------------
// Request-scoped public catalogue (Pages equivalent of lib/cms/catalogue.ts,
// which is not importable here: it is bound to the Node public stores and to
// node:fs). Published CMS rows lead, then the durable legacy corpus, then the
// bundled seeds as a last-ditch fallback. CMS/legacy failures degrade — a
// storage outage must not blank the site.
// ---------------------------------------------------------------------------

async function publicCmsFeed(ctx: RequestContext): Promise<{
  posts: CmsPost[];
  commentCounts: Record<string, number>;
}> {
  try {
    const store = await ctx.services.publicCms(ctx);
    const [posts, commentCounts] = await Promise.all([
      store.listPosts().then((all) => all.filter((post) => post.status === 'published')),
      store.listCommentCounts(),
    ]);
    return { posts, commentCounts };
  } catch (error) {
    console.error('Could not load the public CMS feed:', error);
    return { posts: [], commentCounts: {} };
  }
}

export async function getPublicArticleCatalogue(ctx: RequestContext): Promise<BlogPost[]> {
  const { posts, commentCounts } = await publicCmsFeed(ctx);
  const merged = new Map<string, BlogPost>();

  for (const post of posts) {
    const article = cmsPostToArticle(post);
    article.commentsCount = commentCounts[post.id] ?? 0;
    merged.set(article.slug, article);
  }

  let legacyArticles: BlogPost[] = DEFAULT_LEGACY_SEEDS.articles;
  try {
    // Store implementations already overlay durable counters onto the seed
    // corpus, so these articles carry the freshest likes/commentsCount.
    const legacy = await ctx.services.legacy(ctx);
    legacyArticles = await legacy.getArticles();
  } catch (error) {
    console.error('Could not load the legacy interaction corpus:', error);
  }

  for (const article of [...DEFAULT_LEGACY_SEEDS.articles, ...legacyArticles]) {
    if (article?.slug && !merged.has(article.slug)) merged.set(article.slug, article);
  }

  return [...merged.values()];
}

// ---------------------------------------------------------------------------
// Editor-studio adapters (Task 8A) — the request-scoped equivalents of
// lib/cms/store.ts's getEditorCmsStore and lib/cms/authors.ts's
// resolvePublishableAuthor. Next's wrappers are untouched for Task 16.
// ---------------------------------------------------------------------------

/**
 * Pages equivalent of lib/cms/store.ts's getEditorCmsStore.
 *
 * An unconfigured Pages deployment has no durable studio storage and fails
 * closed; the Node-local demo keeps the local archive. (In practice the
 * editor gate has already rejected such requests with a 503 before any store
 * is built.)
 */
export async function getEditorCmsStore(ctx: RequestContext): Promise<CmsStore> {
  if (!isPublicConfigValid(ctx.config) && ctx.runtime !== 'node-local') {
    throw new CmsUnavailableError('Durable storage is not configured for this deployment.');
  }
  return ctx.services.editorCms(ctx);
}

/**
 * Pages equivalent of lib/cms/authors.ts's resolvePublishableAuthor.
 *
 * The byline stored on a post is server-derived: the profile must exist and
 * be published, and the stored name is the profile's display_name — never
 * whatever the request claimed. Without a configured deployment there is no
 * profiles table to check, so the byline passes through (local demo parity).
 * A profile we cannot check fails closed.
 */
export async function resolvePublishableAuthor(
  ctx: RequestContext,
  authorId: string,
): Promise<PublishableAuthor> {
  if (!isPublicConfigValid(ctx.config)) {
    return { userId: '', slug: authorId, displayName: authorId };
  }

  const session = ctx.services.sessionClient(ctx);
  const client = session ?? createSupabaseServerClient(ctx);
  const { data, error } = await client
    .from('profiles')
    .select('user_id, slug, display_name, published')
    .eq('slug', authorId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new CmsUnavailableError('Author profiles could not be checked. Try again in a moment.');
  }

  const resolution = resolveProfileRow(authorId, data ?? null);
  if (!resolution.ok) rejectAuthorResolution(authorId, resolution);
  return resolution.author;
}
