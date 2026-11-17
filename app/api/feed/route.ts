import { NextResponse } from 'next/server';
import { recordAnalyticsEvent } from '@/lib/v34/analytics';
import { CONTRIBUTION_TYPES, type ContributionType } from '@/lib/v34/contracts';
import { assignExperimentVariant } from '@/lib/v34/experiments';
import { getAllV34FeatureFlags } from '@/lib/v34/feature-flags';
import { getUnifiedResearchFeed } from '@/lib/v34/feed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawType = url.searchParams.get('type') ?? 'all';
  const type =
    rawType === 'all' ||
    rawType === 'editorial-article' ||
    (CONTRIBUTION_TYPES as readonly string[]).includes(rawType)
      ? (rawType as ContributionType | 'editorial-article' | 'all')
      : 'all';
  const topic = url.searchParams.get('topic') ?? undefined;
  const query = url.searchParams.get('q') ?? undefined;
  const sourceIntegrity = url.searchParams.get('integrity') ?? undefined;

  const subjectKey =
    request.headers.get('x-experiment-subject')?.trim() ||
    url.searchParams.get('bucketKey')?.trim() ||
    'public-feed-visitor';

  const feed = await getUnifiedResearchFeed({ type, topic, query, sourceIntegrity });
  const feedExperiment = assignExperimentVariant('exp-feed-contribution-cta-v1', subjectKey);

  recordAnalyticsEvent({
    event: 'feed_viewed',
    subjectBucket: subjectKey,
    experimentId: feedExperiment?.experimentId,
    experimentVariant: feedExperiment?.variant,
    classification: 'PUBLIC',
    properties: {
      surface: 'feed',
      resultCount: feed.items.length,
      filterCount: [type !== 'all', Boolean(topic), Boolean(query), Boolean(sourceIntegrity)].filter(Boolean).length,
    },
  });

  return NextResponse.json({
    items: feed.items,
    availableTopics: feed.availableTopics,
    total: feed.items.length,
    experiments: feedExperiment ? [feedExperiment] : [],
    featureFlags: getAllV34FeatureFlags(),
  });
}
