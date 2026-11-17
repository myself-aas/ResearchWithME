import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { updateProjectMilestone } from '@/lib/v34/wave2-store';
import { UpdateProjectMilestoneInputSchema } from '@/lib/v34/wave8-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; milestoneId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-proj-milestone-patch', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateProjectMilestoneInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id, milestoneId } = await context.params;
  const updated = await updateProjectMilestone({
    projectId: id,
    milestoneId,
    status: parsed.data.status ?? 'IN_PROGRESS',
    supabase: auth.actor.supabase,
  });
  if (!updated) {
    return NextResponse.json({ error: 'Project milestone not found.' }, { status: 404 });
  }
  return NextResponse.json({ milestone: updated });
}
