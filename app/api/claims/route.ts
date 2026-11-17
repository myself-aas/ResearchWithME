import { NextResponse } from 'next/server';
import { CreateClaimInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { parsePaginationParams } from '@/lib/v34/pagination';
import { listClaimsPage } from '@/lib/v34/sql-list-readers';
import { createClaim, persistClaimToSupabase } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-claims-read', 120, 60_000);
  if (limited) return limited;

  const page = await listClaimsPage(parsePaginationParams(request.url));
  return NextResponse.json({
    claims: page.items,
    cursor: page.cursor,
    limit: page.limit,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    total: page.total,
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-claims-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateClaimInputSchema);
  if (!parsed.ok) return parsed.response;

  const claim = createClaim({
    ...parsed.data,
    createdBy: auth.actor.id,
  });

  await persistClaimToSupabase(auth.actor.supabase, claim);
  return NextResponse.json({ claim }, { status: 201 });
}
