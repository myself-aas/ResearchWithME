import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { RecordGoalProgressInputSchema } from '@/lib/v34/wave5-contracts';
import {
  getGoalById,
  listGoalProgressEvents,
  recordGoalProgressEvent,
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
  return NextResponse.json({ goal, events, total: events.length });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-goal-progress', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, RecordGoalProgressInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  return runWithIdempotency(
    request,
    {
      scope: `POST:/api/goals/${id}/progress`,
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
    },
    async () => {
      const result = await recordGoalProgressEvent({
        userId: auth.actor.id,
        goalId: id,
        ...parsed.data,
        supabase: auth.actor.supabase,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.message, code: result.code },
          { status: result.status },
        );
      }
      return NextResponse.json({ event: result.event, goal: result.goal }, { status: 201 });
    },
  );
}
