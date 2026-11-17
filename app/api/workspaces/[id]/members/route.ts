import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { AddWorkspaceMemberInputSchema } from '@/lib/v34/wave2-contracts';
import { addWorkspaceMember, listWorkspaceMembers } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const members = listWorkspaceMembers(id);
  return NextResponse.json({ members, total: members.length });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-workspace-members-write', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, AddWorkspaceMemberInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = await addWorkspaceMember({
    workspaceId: id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({ member: result.member }, { status: 201 });
}
