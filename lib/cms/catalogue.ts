import 'server-only';

import { unstable_cache } from 'next/cache';
import type { BlogPost } from '@/lib/blog-data';
import { cmsPostToArticle } from './mapping';
import { getCmsCommentCounts, getPublishedCmsPosts } from './read';
import type { CmsStore } from './types';

/**
 * The single public catalogue: published CMS posts, nothing else. When no
 * post is published the catalogue is honestly empty and the pages show their
 * empty states.
 *
 * `cms` may be injected by tests; production callers use the public store.
 * CMS failures already degrade to an empty list inside read.ts.
 *
 * Server-only and intentionally uncached here; callers that render a page wrap
 * it in React's `cache` so metadata and the page body share one read.
 */
export async function getArticleCatalogue(cms?: CmsStore): Promise<BlogPost[]> {
  const [posts, commentCounts] = await Promise.all([getPublishedCmsPosts(cms), getCmsCommentCounts(cms)]);
  const bySlug = new Map<string, BlogPost>();

  for (const post of posts) {
    const article = cmsPostToArticle(post);
    article.commentsCount = commentCounts[post.id] ?? 0;
    bySlug.set(article.slug, article);
  }

  return [...bySlug.values()];
}

/**
 * The catalogue as feed cards need it: metadata only, bodies stripped (the
 * same shape `GET /api/articles` returns without `?full=1`). Server pages pass
 * this to `HomeFeed` as `initialPosts`, so the feed is in the server HTML —
 * crawlers and readers without JavaScript see the journal, and nobody sees a
 * flash of the empty state while the client fetch runs.
 */
export async function getFeedArticles(cms?: CmsStore): Promise<BlogPost[]> {
  const articles = await getArticleCatalogue(cms);
  return articles.map(({ bodyMarkdown: _bodyMarkdown, ...article }) => ({ ...article, content: [] }));
}

/** Cache tag for every cached catalogue read; `revalidateArticle()` invalidates it. */
export const CATALOGUE_TAG = 'catalogue';

/**
 * `getFeedArticles()` through the incremental cache (KV on Workers), for the
 * server pages that render the feed. Without it, every request to `/` or
 * `/cite` waited on Supabase before sending a byte (TTFB ~600-900 ms locally).
 * 30 s matches the article pages' ISR window; a studio publish invalidates the
 * tag immediately, and the client refresh after hydration updates counters.
 */
/**
 * The full catalogue (with bodies) through the incremental cache, for the
 * article reader and its OG image. `/post/[slug]` must stay dynamically
 * rendered — under ISR an unknown slug is served as a cached 200 instead of a
 * real 404 (verified 2026-11-12) — so caching the data read is what keeps
 * TTFB low. Same 30 s window and tag as the feed.
 */
export const getCachedArticleCatalogue = unstable_cache(() => getArticleCatalogue(), ['article-catalogue'], {
  revalidate: 30,
  tags: [CATALOGUE_TAG],
});

export const getCachedFeedArticles = unstable_cache(() => getFeedArticles(), ['feed-articles'], {
  revalidate: 30,
  tags: [CATALOGUE_TAG],
});
