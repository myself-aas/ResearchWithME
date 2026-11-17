import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { reviewAiProvenance } from '@/lib/v34/ai-governance';
import { emitDomainEvent, recordAuditEvent } from '@/lib/v34/outbox';
import { DecideAiProvenanceInputSchema } from '@/lib/v34/wave8-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-ai-approve', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, DecideAiProvenanceInputSchema);
  if (!parsed.ok) return parsed.response;

  const updated = await reviewAiProvenance({
    id: parsed.data.provenanceId,
    decision: 'APPROVED',
    actorId: auth.actor.id,
    reviewNotes: parsed.data.notes ?? 'Human-approved via /api/ai/approve.',
    supabase: auth.actor.supabase,
  });
  if (!updated) {
    return NextResponse.json({ error: 'AI provenance record not found.' }, { status: 404 });
  }

  await emitDomainEvent(
    { type: 'AiProvenanceDecided', provenanceId: updated.id, decision: 'APPROVED', actorId: auth.actor.id },
    { actorId: auth.actor.id, supabase: auth.actor.supabase },
  );
  await recordAuditEvent({
    actorId: auth.actor.id,
    action: 'ai_provenance_approved',
    targetType: 'ai_provenance',
    targetId: updated.id,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json({ provenance: updated });
}
