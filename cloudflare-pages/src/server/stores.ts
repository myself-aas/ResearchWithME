import type { CmsStore } from '@/lib/cms/types';
import type { CmsPost } from '@/lib/cms/types';
import { cmsPostToArticle } from '@/lib/cms/mapping';
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

export function createReadOnlyCmsStore(): CmsStore {
  const unavailable = () => Promise.reject(readonlyStore());
  return {
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

// ---------------------------------------------------------------------------
// Request-scoped public catalogue (Pages equivalent of lib/cms/catalogue.ts).
// Published CMS posts only; nothing else. CMS failures degrade to an empty list
// — a storage outage must not blank the site, but neither should it fabricate
// content.
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

  return [...merged.values()];
}

// ---------------------------------------------------------------------------
// Editor-studio adapters.
// ---------------------------------------------------------------------------

export async function getEditorCmsStore(ctx: RequestContext): Promise<CmsStore> {
  if (!isPublicConfigValid(ctx.config) && ctx.runtime !== 'node-local') {
    throw new CmsUnavailableError('Durable storage is not configured for this deployment.');
  }
  return ctx.services.editorCms(ctx);
}

/**
 * Pages equivalent of lib/cms/authors.ts's resolvePublishableAuthor.
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
