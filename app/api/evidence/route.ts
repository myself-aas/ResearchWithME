import { NextResponse } from 'next/server';
import { CreateEvidenceInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { createEvidence, listEvidence, persistEvidenceToSupabase } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sourceId = new URL(request.url).searchParams.get('sourceId') ?? undefined;
  const evidence = listEvidence(sourceId);
  return NextResponse.json({ evidence, total: evidence.length });
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
