import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { transitionGoalLifecycle } from '@/lib/v34/wave5-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-goal-pause', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const result = await transitionGoalLifecycle({
    userId: auth.actor.id,
    goalId: id,
    action: 'pause',
    supabase: auth.actor.supabase,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
  }
  return NextResponse.json({ goal: result.goal });
}
