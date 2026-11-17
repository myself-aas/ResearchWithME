import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import {
  getContributionById,
  persistContributionToSupabase,
  submitContributionForReview,
} from '@/lib/v34/store';
import { createFormalReview, getFormalReview } from '@/lib/v34/wave2-store';
import { SubmitContributionReviewInputSchema } from '@/lib/v34/wave6-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-contrib-submit-review', 15, 60_000);
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

  let body: { mode: 'SIGNED' | 'ANONYMOUS'; note: string } = { mode: 'ANONYMOUS', note: '' };
  const raw = await request.text();
  if (raw.trim()) {
    const parsed = await parseJsonBody(
      new Request(request.url, { method: 'POST', body: raw, headers: request.headers }),
      SubmitContributionReviewInputSchema,
    );
    if (!parsed.ok) return parsed.response;
    body = parsed.data;
  }

  return runWithIdempotency(
    request,
    { scope: `POST:/api/contributions/${id}/submit-review`, actorId: auth.actor.id, payloadHashInput: body },
    async () => {
      const result = submitContributionForReview(id);
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: result.status });
      }
      await persistContributionToSupabase(auth.actor.supabase, result.contribution);

      const reviewRes = await createFormalReview({
        contributionId: result.contribution.id,
        scope: `v${result.contribution.version} formal review`,
        anonymous: body.mode === 'ANONYMOUS',
        actorId: auth.actor.id,
        actorHandle: auth.actor.handle,
        actorName: auth.actor.name,
        initialItem: body.note
          ? { itemType: 'review', body: body.note, scope: 'submission-note' }
          : undefined,
        supabase: auth.actor.supabase,
      });

      const redactedReview = reviewRes.ok
        ? (getFormalReview(reviewRes.review.id) ?? reviewRes.review)
        : null;

      return NextResponse.json(
        {
          contribution: result.contribution,
          versionSnapshot: result.versionSnapshot,
          review: redactedReview,
        },
        { status: 201 },
      );
    },
  );
}
