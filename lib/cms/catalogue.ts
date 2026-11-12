import 'server-only';

import { unstable_cache } from 'next/cache';
import type { BlogPost } from '@/lib/blog-data';
import { DEFAULT_LEGACY_SEEDS } from '@/lib/legacy/seeds';
import { getPublicLegacyStore } from '@/lib/legacy/store';
import type { LegacyStore } from '@/lib/legacy/types';
import { cmsPostToArticle } from './mapping';
import { getCmsCommentCounts, getPublishedCmsPosts } from './read';
import type { CmsStore } from './types';

/**
 * The single public catalogue: published CMS rows lead, then the durable
 * legacy interaction corpus (seed articles with durable counters), then the
 * bundled seed posts as a last-ditch fallback. Duplicate slugs resolve in
 * favour of the CMS so a published edit is never shadowed by a stale build
 * artefact.
 *
 * `legacy`/`cms` may be injected by tests; production callers use the public
 * stores. Legacy failures degrade to the bundled seed posts — a storage
 * outage must not blank the site — while CMS failures already degrade
 * inside read.ts.
 *
 * Server-only and intentionally uncached here; callers that render a page wrap
 * it in React's `cache` so metadata and the page body share one read.
 */
export async function getArticleCatalogue(
  legacy: LegacyStore = getPublicLegacyStore(),
  cms?: CmsStore,
): Promise<BlogPost[]> {
  const [posts, commentCounts] = await Promise.all([getPublishedCmsPosts(cms), getCmsCommentCounts(cms)]);
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
    legacyArticles = await legacy.getArticles();
  } catch (error) {
    console.error('Could not load the legacy interaction corpus:', error);
  }

  for (const article of [...DEFAULT_LEGACY_SEEDS.articles, ...legacyArticles]) {
    if (article?.slug && !merged.has(article.slug)) merged.set(article.slug, article);
  }

  return [...merged.values()];
}

/**
 * The catalogue as feed cards need it: metadata only, bodies stripped (the
 * same shape `GET /api/articles` returns without `?full=1`). Server pages pass
 * this to `HomeFeed` as `initialPosts`, so the feed is in the server HTML —
 * crawlers and readers without JavaScript see the journal, and nobody sees a
 * flash of the "no manuscripts" empty state while the client fetch runs.
 */
export async function getFeedArticles(
  legacy: LegacyStore = getPublicLegacyStore(),
  cms?: CmsStore,
): Promise<BlogPost[]> {
  const articles = await getArticleCatalogue(legacy, cms);
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
