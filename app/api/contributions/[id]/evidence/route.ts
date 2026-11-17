import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import {
  getContributionById,
  linkEvidenceToContribution,
  persistContributionToSupabase,
  unlinkEvidenceFromContribution,
} from '@/lib/v34/store';
import { ContributionLinkEvidenceInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-contrib-evidence-link', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = getContributionById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Contribution not found.' }, { status: 404 });
  }
  if (existing.authorId && existing.authorId !== auth.actor.id && !auth.actor.isEditor) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const parsed = await parseJsonBody(request, ContributionLinkEvidenceInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    { scope: `POST:/api/contributions/${id}/evidence`, actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      const result = linkEvidenceToContribution(id, parsed.data.evidenceId);
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: result.status });
      }
      await persistContributionToSupabase(auth.actor.supabase, result.contribution);
      return NextResponse.json(
        { contribution: result.contribution, evidenceId: parsed.data.evidenceId },
        { status: 201 },
      );
    },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-contrib-evidence-unlink', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = getContributionById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Contribution not found.' }, { status: 404 });
  }
  if (existing.authorId && existing.authorId !== auth.actor.id && !auth.actor.isEditor) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const evidenceId = url.searchParams.get('evidenceId')?.trim();
  if (!evidenceId) {
    return NextResponse.json({ error: 'evidenceId query parameter is required.' }, { status: 400 });
  }

  const result = unlinkEvidenceFromContribution(id, evidenceId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  await persistContributionToSupabase(auth.actor.supabase, result.contribution);
  return NextResponse.json({
    contribution: result.contribution,
    unlinkedEvidenceId: evidenceId,
    canonicalEvidencePreserved: result.canonicalPreserved,
  });
}
