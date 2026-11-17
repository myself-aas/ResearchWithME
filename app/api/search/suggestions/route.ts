import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/v34/http';
import { getSearchSuggestions } from '@/lib/v34/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-search-suggestions', 60, 60_000);
  if (limited) return limited;

  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';
  const limitRaw = Number(url.searchParams.get('limit') ?? '8');
  const limit = Number.isFinite(limitRaw) ? Math.min(20, Math.max(1, Math.trunc(limitRaw))) : 8;

  const suggestions = await getSearchSuggestions(q, limit);
  return NextResponse.json({ query: q, suggestions, total: suggestions.length });
}
