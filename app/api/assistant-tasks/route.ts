import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateAssistantTaskInputSchema } from '@/lib/v34/wave3-contracts';
import { createAssistantTask, listAssistantTasks } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const tasks = listAssistantTasks(auth.actor.id);
  return NextResponse.json({ tasks, total: tasks.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-assistant-tasks-write', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateAssistantTaskInputSchema);
  if (!parsed.ok) return parsed.response;

  const task = await createAssistantTask({
    userId: auth.actor.id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });

  return NextResponse.json({ task }, { status: 201 });
}
