import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { updateReviewItemDetails } from '@/lib/v34/wave2-store';
import { UpdateReviewItemInputSchema } from '@/lib/v34/wave8-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-review-item-patch', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateReviewItemInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id, itemId } = await context.params;
  const item = await updateReviewItemDetails({
    reviewId: id,
    itemId,
    body: parsed.data.body,
    resolved: parsed.data.resolved,
    supabase: auth.actor.supabase,
  });
  if (!item) {
    return NextResponse.json({ error: 'Review item not found.' }, { status: 404 });
  }
  return NextResponse.json({ item });
}
