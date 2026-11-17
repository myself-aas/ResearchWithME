import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { getProjectByIdOrSlug } from '@/lib/v34/wave2-store';
import { CreateProjectTaskInputSchema } from '@/lib/v34/wave8-contracts';
import { createProjectTask, listProjectTasks } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const project = await getProjectByIdOrSlug(id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }
  const tasks = listProjectTasks(project.id);
  return NextResponse.json({ tasks, total: tasks.length });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-proj-task-create', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateProjectTaskInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const project = await getProjectByIdOrSlug(id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  const task = await createProjectTask({
    projectId: project.id,
    title: parsed.data.title,
    description: parsed.data.description,
    assigneeId: parsed.data.assigneeId,
    creatorId: auth.actor.id,
    priority: parsed.data.priority,
    dueDate: parsed.data.dueDate,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json({ task }, { status: 201 });
}
