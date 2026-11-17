import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { listProjects } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-dash-projects', 60, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? undefined;
  const projects = (await listProjects()).filter((p) =>
    !status ? true : p.stage.toLowerCase() === status.toLowerCase(),
  );
  return NextResponse.json({ projects, total: projects.length, nextCursor: null });
}
