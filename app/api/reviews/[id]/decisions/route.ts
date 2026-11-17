import { NextResponse } from 'next/server';
import {
  enforceRateLimit,
  handleV34Error,
  parseJsonBody,
  requireAuthorized,
  requireContributor,
} from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { CreateDecisionInputSchema } from '@/lib/v34/wave2-contracts';
import { getFormalReview, recordReviewDecision } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-review-decisions-write', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateDecisionInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const review = getFormalReview(id);
  const authz = requireAuthorized(auth.actor, 'review:decide', {
    kind: 'review',
    id,
    ownerId: review?.reviewerId ?? null,
    isAssignedReviewer: Boolean(review && review.reviewerId === auth.actor.id),
    classification: 'PUBLIC',
  });
  if (!authz.ok) return authz.response;

  return runWithIdempotency(
    request,
    {
      scope: `POST:/api/reviews/${id}/decisions`,
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
      supabase: auth.actor.supabase,
    },
    async () => {
      try {
        const result = await recordReviewDecision({
          reviewId: id,
          ...parsed.data,
          actorId: auth.actor.id,
          actorName: auth.actor.name,
          supabase: auth.actor.supabase,
        });

        if (!result.ok) {
          return NextResponse.json({ error: result.message }, { status: result.status });
        }
        return NextResponse.json({ decision: result.decision, review: result.review }, { status: 201 });
      } catch (err) {
        return handleV34Error(err);
      }
    },
  );
}
