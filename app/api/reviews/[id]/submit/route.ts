import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { submitFormalReview } from '@/lib/v34/wave2-store';
import { SubmitReviewVerdictInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-review-submit', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, SubmitReviewVerdictInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  return runWithIdempotency(
    request,
    { scope: `POST:/api/reviews/${id}/submit`, actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      const result = await submitFormalReview({
        reviewId: id,
        recommendation: parsed.data.recommendation,
        summary: parsed.data.summary,
        actorId: auth.actor.id,
        actorName: auth.actor.name,
        supabase: auth.actor.supabase,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: result.status });
      }
      return NextResponse.json({ review: result.review });
    },
  );
}
