/**
 * Mixed Research Network Feed (`lib/v34/feed.ts`).
 *
 * Combines structured v3.4 Contributions with published ResearchWithME
 * editorial articles (`getArticleCatalogue()`) into a unified discovery feed
 * without breaking any existing `/blog/*` URLs.
 */
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { CONTRIBUTION_TYPE_CATALOG, type ContributionType } from './contracts';
import { listContributions, listSources, type SourceRecord } from './store';
import { withSupabaseReadTimeout } from './supabase-sync';

export interface FeedItem {
  id: string;
  kind: 'contribution' | 'article';
  contributionType: ContributionType | 'editorial-article';
  typeLabel: string;
  title: string;
  summary: string;
  href: string;
  authorName: string;
  authorHandle: string;
  publishedAt: string;
  topics: string[];
  tags: string[];
  sourceTitle: string | null;
  sourceHref: string | null;
  sourceIntegrity: 'active' | 'corrected' | 'expression-of-concern' | 'retracted' | 'withdrawn';
  reviewState: string;
  evidenceCount: number;
  recognition: {
    helpfulReviews: number;
    referenced: number;
    saved: number;
  };
}

export async function getUnifiedResearchFeed(filters?: {
  type?: ContributionType | 'editorial-article' | 'all';
  topic?: string;
  query?: string;
  sourceIntegrity?: string;
}): Promise<{ items: FeedItem[]; availableTopics: string[] }> {
  const [contributions, sources, articles] = await Promise.all([
    Promise.resolve(listContributions()),
    listSources(),
    withSupabaseReadTimeout(() => getArticleCatalogue(), []),
  ]);

  const sourceById = new Map<string, SourceRecord>(sources.map((s) => [s.id, s]));
  const items: FeedItem[] = [];

  for (const contrib of contributions) {
    const source = contrib.primarySourceId ? sourceById.get(contrib.primarySourceId) : null;
    items.push({
      id: contrib.id,
      kind: 'contribution',
      contributionType: contrib.contributionType,
      typeLabel: CONTRIBUTION_TYPE_CATALOG[contrib.contributionType].label,
      title: contrib.title,
      summary: contrib.summary,
      href: `/contribution/${contrib.slug}`,
      authorName: contrib.authorName,
      authorHandle: contrib.authorHandle,
      publishedAt: contrib.publishedAt ?? contrib.updatedAt,
      topics: contrib.topics,
      tags: contrib.tags,
      sourceTitle: source?.title ?? null,
      sourceHref: source ? `/source/${source.id}` : null,
      sourceIntegrity: source?.integrityStatus ?? contrib.trustAssessment.sourceIntegrity,
      reviewState: contrib.trustAssessment.review,
      evidenceCount: contrib.evidenceIds.length,
      recognition: {
        helpfulReviews: contrib.recognition.helpfulReviews,
        referenced: contrib.recognition.referenced,
        saved: contrib.recognition.saved,
      },
    });
  }

  for (const article of articles) {
    items.push({
      id: `article-${article.slug}`,
      kind: 'article',
      contributionType: 'editorial-article',
      typeLabel: 'Editorial Review',
      title: article.title,
      summary: article.summary,
      href: `/post/${article.slug}`,
      authorName: article.author.name,
      authorHandle: article.author.id || 'myself-aas',
      publishedAt: article.dateISO ?? article.publishedAt,
      topics: [article.category],
      tags: article.tags,
      sourceTitle: article.reviewedArtifact?.title ?? null,
      sourceHref: article.reviewedArtifact?.url ?? null,
      sourceIntegrity: 'active',
      reviewState: 'editorially-reviewed',
      evidenceCount: article.keyTakeaways?.length ?? 0,
      recognition: {
        helpfulReviews: 0,
        referenced: 0,
        saved: 0,
      },
    });
  }

  const topicSet = new Set<string>();
  for (const item of items) {
    for (const t of item.topics) {
      if (t.trim()) topicSet.add(t.trim());
    }
  }

  const filtered = items
    .filter((item) => {
      if (filters?.type && filters.type !== 'all' && item.contributionType !== filters.type) {
        return false;
      }
      if (
        filters?.topic &&
        filters.topic !== 'all' &&
        !item.topics.some((t) => t.toLowerCase() === filters.topic!.toLowerCase())
      ) {
        return false;
      }
      if (filters?.sourceIntegrity && filters.sourceIntegrity !== 'all' && item.sourceIntegrity !== filters.sourceIntegrity) {
        return false;
      }
      if (filters?.query?.trim()) {
        const q = filters.query.trim().toLowerCase();
        const hay = `${item.title} ${item.summary} ${item.authorName} ${item.topics.join(' ')} ${item.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return {
    items: filtered,
    availableTopics: [...topicSet].sort((a, b) => a.localeCompare(b)),
  };
}
