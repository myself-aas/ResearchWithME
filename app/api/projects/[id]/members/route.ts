import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { AddProjectMemberInputSchema } from '@/lib/v34/wave2-contracts';
import { addProjectMember } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-project-members-write', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, AddProjectMemberInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = await addProjectMember({
    projectId: id,
    userId: parsed.data.userId,
    role: parsed.data.role,
    supabase: auth.actor.supabase,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json({ member: result.member }, { status: 201 });
}
