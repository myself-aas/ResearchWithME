import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireAuthorized, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import {
  getContributionById,
  linkClaimToContribution,
  persistContributionToSupabase,
  unlinkClaimFromContribution,
} from '@/lib/v34/store';
import { ContributionLinkClaimInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-contrib-claim-link', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = getContributionById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Contribution not found.' }, { status: 404 });
  }
  const authz = requireAuthorized(auth.actor, 'contribution:write', {
    kind: 'contribution',
    id: existing.id,
    ownerId: existing.authorId,
    classification: 'PUBLIC',
  });
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, ContributionLinkClaimInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    {
      scope: `POST:/api/contributions/${id}/claims`,
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
      supabase: auth.actor.supabase,
    },
    async () => {
      const result = linkClaimToContribution(id, parsed.data.claimId);
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: result.status });
      }
      await persistContributionToSupabase(auth.actor.supabase, result.contribution);
      return NextResponse.json(
        { contribution: result.contribution, claimId: parsed.data.claimId },
        { status: 201 },
      );
    },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-contrib-claim-unlink', 30, 60_000);
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
  const claimId = url.searchParams.get('claimId')?.trim();
  if (!claimId) {
    return NextResponse.json({ error: 'claimId query parameter is required.' }, { status: 400 });
  }

  const result = unlinkClaimFromContribution(id, claimId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  await persistContributionToSupabase(auth.actor.supabase, result.contribution);
  return NextResponse.json({
    contribution: result.contribution,
    unlinkedClaimId: claimId,
    canonicalClaimPreserved: result.canonicalPreserved,
  });
}
