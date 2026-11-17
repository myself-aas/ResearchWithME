import { NextResponse } from 'next/server';
import { CONTRIBUTION_TYPES, type ContributionType } from '@/lib/v34/contracts';
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

  const feed = await getUnifiedResearchFeed({ type, topic, query, sourceIntegrity });
  return NextResponse.json({
    items: feed.items,
    availableTopics: feed.availableTopics,
    total: feed.items.length,
  });
}
