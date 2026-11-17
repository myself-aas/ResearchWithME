import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody } from '@/lib/v34/http';
import { expandSearchQuery } from '@/lib/v34/search';
import { SearchExpandInputSchema } from '@/lib/v34/wave6-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-search-expand', 40, 60_000);
  if (limited) return limited;

  const parsed = await parseJsonBody(request, SearchExpandInputSchema);
  if (!parsed.ok) return parsed.response;

  const expansion = expandSearchQuery(parsed.data.query, parsed.data.excludeTerms);
  return NextResponse.json(expansion);
}
