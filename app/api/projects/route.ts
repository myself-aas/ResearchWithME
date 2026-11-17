import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateProjectInputSchema, PROJECT_STAGES, type ProjectStage } from '@/lib/v34/wave2-contracts';
import { createProject, listProjects } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId') ?? undefined;
  const rawStage = url.searchParams.get('stage') ?? 'all';
  const stage =
    rawStage === 'all' || (PROJECT_STAGES as readonly string[]).includes(rawStage)
      ? (rawStage as ProjectStage | 'all')
      : 'all';

  const projects = await listProjects({ workspaceId, stage });
  return NextResponse.json({ projects, total: projects.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-projects-write', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateProjectInputSchema);
  if (!parsed.ok) return parsed.response;

  const result = await createProject({
    ...parsed.data,
    ownerId: auth.actor.id,
    ownerHandle: auth.actor.handle,
    ownerName: auth.actor.name,
    supabase: auth.actor.supabase,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ project: result.project }, { status: 201 });
}
