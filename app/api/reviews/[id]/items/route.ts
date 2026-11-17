import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateReviewItemInputSchema, UpdateReviewItemInputSchema } from '@/lib/v34/wave2-contracts';
import { addReviewItem, updateReviewItemStatus } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-review-items-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateReviewItemInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const item = await addReviewItem({
    reviewId: id,
    ...parsed.data,
    actorId: auth.actor.id,
    actorName: auth.actor.name,
    supabase: auth.actor.supabase,
  });
  if (!item) {
    return NextResponse.json({ error: 'Formal review not found.' }, { status: 404 });
  }
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-review-items-patch', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateReviewItemInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const item = await updateReviewItemStatus({
    reviewId: id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!item) {
    return NextResponse.json({ error: 'Review or review item not found.' }, { status: 404 });
  }
  return NextResponse.json({ item });
}
