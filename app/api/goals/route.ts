import { NextResponse } from 'next/server';
import { CreateResearchGoalInputSchema, UpdateResearchGoalInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import {
  createResearchGoal,
  listResearchGoals,
  persistResearchGoalToSupabase,
  updateResearchGoal,
} from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const goals = listResearchGoals(auth.actor.id);
  return NextResponse.json({ goals, total: goals.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-goals-write', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateResearchGoalInputSchema);
  if (!parsed.ok) return parsed.response;

  const goal = createResearchGoal(auth.actor.id, parsed.data);
  await persistResearchGoalToSupabase(auth.actor.supabase, goal);
  return NextResponse.json({ goal }, { status: 201 });
}

export async function PATCH(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-goals-patch', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateResearchGoalInputSchema);
  if (!parsed.ok) return parsed.response;

  const goal = updateResearchGoal(auth.actor.id, parsed.data);
  if (!goal) {
    return NextResponse.json({ error: 'Goal not found.' }, { status: 404 });
  }
  await persistResearchGoalToSupabase(auth.actor.supabase, goal);
  return NextResponse.json({ goal });
}
