import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { UpdateGoalInputSchema } from '@/lib/v34/wave5-contracts';
import {
  getGoalById,
  listGoalProgressEvents,
  updateGoalDetails,
} from '@/lib/v34/wave5-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const goal = getGoalById(auth.actor.id, id);
  if (!goal) {
    return NextResponse.json({ error: 'Research goal not found.' }, { status: 404 });
  }
  const events = listGoalProgressEvents(id);
  return NextResponse.json({ goal, events, totalEvents: events.length });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-goal-update', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateGoalInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const goal = await updateGoalDetails({
    userId: auth.actor.id,
    goalId: id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!goal) {
    return NextResponse.json({ error: 'Research goal not found.' }, { status: 404 });
  }
  return NextResponse.json({ goal });
}
