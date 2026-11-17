import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { updateAssistantTask } from '@/lib/v34/wave3-store';
import { UpdateAssistantTaskInputSchema } from '@/lib/v34/wave8-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-assistant-tasks-patch', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateAssistantTaskInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const task = await updateAssistantTask({
    userId: auth.actor.id,
    taskId: id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!task) {
    return NextResponse.json({ error: 'Assistant task not found.' }, { status: 404 });
  }
  return NextResponse.json({ task });
}
