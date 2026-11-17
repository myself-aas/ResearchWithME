import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { CreateReviewInputSchema } from '@/lib/v34/wave2-contracts';
import { createFormalReview, listFormalReviews } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const contributionId = new URL(request.url).searchParams.get('contributionId') ?? undefined;
  const reviews = listFormalReviews(contributionId);
  return NextResponse.json({ reviews, total: reviews.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-reviews-write', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateReviewInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    { scope: 'v34-reviews-create', actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      const result = await createFormalReview({
        ...parsed.data,
        actorId: auth.actor.id,
        actorHandle: auth.actor.handle,
        actorName: auth.actor.name,
        supabase: auth.actor.supabase,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: result.status });
      }
      return NextResponse.json({ review: result.review }, { status: 201 });
    },
  );
}
