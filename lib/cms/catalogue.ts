import 'server-only';

import { INITIAL_BLOG_POSTS, type BlogPost } from '@/lib/blog-data';
import { getArticles } from '@/lib/db';
import { cmsPostToArticle } from './mapping';
import { getCmsCommentCounts, getPublishedCmsPosts } from './read';

/**
 * The single public catalogue: published CMS rows lead, then locally persisted
 * articles, then the bundled seed posts. Duplicate slugs resolve in favour of
 * the CMS so a published edit is never shadowed by a stale build artefact.
 *
 * Server-only and intentionally uncached here; callers that render a page wrap
 * it in React's `cache` so metadata and the page body share one read.
 */
export async function getArticleCatalogue(): Promise<BlogPost[]> {
  const [posts, commentCounts] = await Promise.all([getPublishedCmsPosts(), getCmsCommentCounts()]);
  const merged = new Map<string, BlogPost>();

  for (const post of posts) {
    const article = cmsPostToArticle(post);
    article.commentsCount = commentCounts[post.id] ?? 0;
    merged.set(article.slug, article);
  }

  for (const article of [...INITIAL_BLOG_POSTS, ...getArticles()]) {
    if (article?.slug && !merged.has(article.slug)) merged.set(article.slug, article);
  }

  return [...merged.values()];
}
