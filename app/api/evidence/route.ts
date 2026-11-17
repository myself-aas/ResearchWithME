import { NextResponse } from 'next/server';
import { CreateEvidenceInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { parsePaginationParams } from '@/lib/v34/pagination';
import { listEvidencePage } from '@/lib/v34/sql-list-readers';
import { createEvidence, persistEvidenceToSupabase } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-evidence-read', 120, 60_000);
  if (limited) return limited;

  const url = new URL(request.url);
  const sourceId = url.searchParams.get('sourceId') ?? undefined;
  const page = await listEvidencePage(parsePaginationParams(url), sourceId);
  return NextResponse.json({
    evidence: page.items,
    cursor: page.cursor,
    limit: page.limit,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    total: page.total,
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-evidence-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateEvidenceInputSchema);
  if (!parsed.ok) return parsed.response;

  const result = createEvidence({
    ...parsed.data,
    createdBy: auth.actor.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  await persistEvidenceToSupabase(auth.actor.supabase, result.evidence);
  return NextResponse.json({ evidence: result.evidence }, { status: 201 });
}
