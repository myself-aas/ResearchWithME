import type { BlogPost } from '@/lib/blog-data';

export type AuthorWorkSummaryData = {
  totalWorks: number;
  reviewedArtifactCount: number;
  byCategory: Array<{ category: string; count: number }>;
  latestWorks: Array<Pick<BlogPost, 'slug' | 'title' | 'category' | 'publishedAt' | 'dateISO'>>;
};

function publishedTimestamp(post: BlogPost): number {
  const timestamp = Date.parse(post.dateISO ?? post.publishedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function summarizeAuthorWork(articles: readonly BlogPost[]): AuthorWorkSummaryData {
  const categoryCounts = new Map<string, number>();
  for (const article of articles) {
    categoryCounts.set(article.category, (categoryCounts.get(article.category) ?? 0) + 1);
  }

  const byCategory = [...categoryCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  const latestWorks = [...articles]
    .sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a))
    .slice(0, 3)
    .map(({ slug, title, category, publishedAt, dateISO }) => ({
      slug,
      title,
      category,
      publishedAt,
      dateISO,
    }));

  return {
    totalWorks: articles.length,
    reviewedArtifactCount: articles.filter((article) => Boolean(article.reviewedArtifact)).length,
    byCategory,
    latestWorks,
  };
}
