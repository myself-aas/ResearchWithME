import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { getProjectByIdOrSlug } from '@/lib/v34/wave2-store';
import { UpdateProjectTaskInputSchema } from '@/lib/v34/wave8-contracts';
import { updateProjectTask } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; taskId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-proj-task-patch', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateProjectTaskInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id, taskId } = await context.params;
  const project = await getProjectByIdOrSlug(id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  const task = await updateProjectTask({
    projectId: project.id,
    taskId,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!task) {
    return NextResponse.json({ error: 'Project task not found.' }, { status: 404 });
  }
  return NextResponse.json({ task });
}
