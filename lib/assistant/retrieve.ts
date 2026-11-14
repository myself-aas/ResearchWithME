import type { BlogPost } from '@/lib/blog-data';
import type { AssistantArticle, AssistantCitation } from './types';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'about', 'what', 'does', 'how', 'why', 'from', 'into', 'that', 'this',
  'are', 'was', 'were', 'has', 'have', 'had', 'its', 'their', 'they', 'than', 'then', 'when', 'where',
  'which', 'while', 'does', 'did', 'can', 'could', 'should', 'would', 'you', 'your', 'our', 'per',
]);

const MIN_SCORE = 3;

/** Term-overlap ranking over the catalogue. A post must score at least 3 to count as a match. */
export function rankArticles(query: string, posts: BlogPost[], max = 3): BlogPost[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9.+-]+/)
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term))
    .slice(0, 12);

  if (terms.length === 0) return [];

  return posts
    .map((post) => {
      const title = post.title.toLowerCase();
      const summary = post.summary.toLowerCase();
      const category = post.category.toLowerCase();
      const tags = post.tags.join(' ').toLowerCase();
      const artifact = `${post.reviewedArtifact?.identifier ?? ''} ${post.reviewedArtifact?.title ?? ''}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 4;
        if (tags.includes(term)) score += 3;
        if (artifact.includes(term)) score += 3;
        if (summary.includes(term)) score += 2;
        if (category.includes(term)) score += 1;
      }
      return { post, score };
    })
    .filter((entry) => entry.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((entry) => entry.post);
}

export function toAssistantArticle(post: BlogPost): AssistantArticle {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    author: post.author.name,
    category: post.category,
    summary: post.summary,
    keyTakeaways: [...post.keyTakeaways],
    artifact: post.reviewedArtifact ? `${post.reviewedArtifact.identifier} (${post.reviewedArtifact.meta})` : null,
  };
}

export function toCitation(article: AssistantArticle, siteUrl: string): AssistantCitation {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    author: article.author,
    category: article.category,
    url: new URL(`/post/${encodeURIComponent(article.slug)}`, siteUrl).toString(),
  };
}
