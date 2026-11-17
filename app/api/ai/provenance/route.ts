import { NextResponse } from 'next/server';
import { listAiProvenance, reviewAiProvenance } from '@/lib/v34/ai-governance';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { ReviewAiProvenanceInputSchema } from '@/lib/v34/wave6-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetId = url.searchParams.get('targetId')?.trim() || undefined;
  const status = url.searchParams.get('status')?.trim() || undefined;
  const records = listAiProvenance({ targetId, status });
  return NextResponse.json({ records, total: records.length });
}

export async function PATCH(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-ai-provenance-review', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, ReviewAiProvenanceInputSchema);
  if (!parsed.ok) return parsed.response;

  const record = await reviewAiProvenance({
    id: parsed.data.id,
    decision: parsed.data.decision,
    reviewNotes: parsed.data.reviewNotes,
    actorId: auth.actor.id,
    supabase: auth.actor.supabase,
  });

  if (!record) {
    return NextResponse.json({ error: 'AI provenance record not found.' }, { status: 404 });
  }
  return NextResponse.json({ record });
}
