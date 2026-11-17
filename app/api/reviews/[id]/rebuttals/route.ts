import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateRebuttalInputSchema } from '@/lib/v34/wave2-contracts';
import { addReviewRebuttal } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-review-rebuttals-write', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateRebuttalInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = await addReviewRebuttal({
    reviewId: id,
    ...parsed.data,
    actorId: auth.actor.id,
    actorName: auth.actor.name,
    supabase: auth.actor.supabase,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({ rebuttal: result.rebuttal }, { status: 201 });
}
