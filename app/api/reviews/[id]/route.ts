import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { getFormalReview, updateFormalReview } from '@/lib/v34/wave2-store';
import { UpdateReviewInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const review = getFormalReview(id);
  if (!review) {
    return NextResponse.json({ error: 'Formal review not found.' }, { status: 404 });
  }
  return NextResponse.json({ review });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-review-update', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateReviewInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = await updateFormalReview({
    reviewId: id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({ review: result.review });
}
