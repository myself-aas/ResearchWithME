import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import {
  linkClaimEvidence,
  persistClaimEvidenceToSupabase,
  removeClaimEvidenceLink,
} from '@/lib/v34/store';
import { LinkClaimEvidenceInputSchema } from '@/lib/v34/wave5-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-claim-evidence-link', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, LinkClaimEvidenceInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  return runWithIdempotency(
    request,
    {
      scope: `POST:/api/claims/${id}/evidence`,
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
    },
    async () => {
      const result = linkClaimEvidence({
        claimId: id,
        evidenceId: parsed.data.evidenceId,
        relationship: parsed.data.relationship,
        assertionMethod: parsed.data.assertionMethod,
        confidence: parsed.data.confidence,
        rationale: parsed.data.rationale,
        assertedBy: auth.actor.id,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: 404 });
      }
      await persistClaimEvidenceToSupabase(auth.actor.supabase, result.link);
      return NextResponse.json({ link: result.link }, { status: 201 });
    },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-claim-evidence-unlink', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const url = new URL(request.url);
  const evidenceId = url.searchParams.get('evidenceId')?.trim();
  const relationship = url.searchParams.get('relationship')?.trim() as
    | 'SUPPORTS'
    | 'CONTRADICTS'
    | 'QUALIFIES'
    | undefined;

  if (!evidenceId) {
    return NextResponse.json({ error: 'Query parameter evidenceId is required.' }, { status: 400 });
  }

  const removed = removeClaimEvidenceLink(id, evidenceId, relationship);
  if (!removed) {
    return NextResponse.json({ error: 'Claim-evidence link not found.' }, { status: 404 });
  }
  return NextResponse.json({ removed: true, claimId: id, evidenceId });
}
