import { NextResponse } from 'next/server';
import { checkClaimEntailment } from '@/lib/v34/ai-governance';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CheckEntailmentInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-ai-entailment', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CheckEntailmentInputSchema);
  if (!parsed.ok) return parsed.response;

  const result = await checkClaimEntailment({
    actorId: auth.actor.id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.blocker.message, code: result.blocker.code, blocker: result.blocker },
      { status: result.status },
    );
  }

  return NextResponse.json(result);
}
