import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateMilestoneInputSchema, UpdateMilestoneInputSchema } from '@/lib/v34/wave2-contracts';
import { addProjectMilestone, updateProjectMilestone } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-project-milestones-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateMilestoneInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const milestone = await addProjectMilestone({
    projectId: id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!milestone) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }
  return NextResponse.json({ milestone }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-project-milestones-patch', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateMilestoneInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const milestone = await updateProjectMilestone({
    projectId: id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!milestone) {
    return NextResponse.json({ error: 'Project or milestone not found.' }, { status: 404 });
  }
  return NextResponse.json({ milestone });
}
