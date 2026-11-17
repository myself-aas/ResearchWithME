import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateDecisionInputSchema } from '@/lib/v34/wave2-contracts';
import { recordReviewDecision } from '@/lib/v34/wave2-store';

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
}
