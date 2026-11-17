import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/v34/http';
import { executeUnifiedSearch } from '@/lib/v34/search';
import { SEARCH_ENTITY_TYPES, type SearchEntityType } from '@/lib/v34/wave6-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TYPE_SET = new Set<string>(SEARCH_ENTITY_TYPES);

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-search-query', 60, 60_000);
  if (limited) return limited;

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const typeParam = url.searchParams.get('type')?.trim();
  const integrity = url.searchParams.get('integrity')?.trim() || undefined;
  const topic = url.searchParams.get('topic')?.trim() || undefined;
  const limitRaw = Number(url.searchParams.get('limit') ?? '40');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 100) : 40;

  let types: SearchEntityType[] | undefined;
  if (typeParam && typeParam !== 'all') {
    const requested = typeParam
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is SearchEntityType => VALID_TYPE_SET.has(s));
    if (requested.length > 0) types = requested;
  }

  const result = await executeUnifiedSearch({
    query: q,
    types,
    integrity,
    topic,
    limit,
  });

  return NextResponse.json(result);
}
