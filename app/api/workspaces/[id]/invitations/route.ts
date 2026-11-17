import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import {
  createWorkspaceInvitation,
  listWorkspaceInvitations,
} from '@/lib/v34/wave5-store';
import { CreateWorkspaceInvitationInputSchema } from '@/lib/v34/wave6-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const invitations = listWorkspaceInvitations(id);
  return NextResponse.json({ workspaceId: id, invitations, total: invitations.length });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-workspace-invite', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateWorkspaceInvitationInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  return runWithIdempotency(
    request,
    {
      scope: `POST:/api/workspaces/${id}/invitations`,
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
    },
    async () => {
      const result = await createWorkspaceInvitation({
        workspaceId: id,
        invitedEmail: parsed.data.email,
        role: parsed.data.role,
        actorId: auth.actor.id,
        supabase: auth.actor.supabase,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.message, code: result.code },
          { status: result.status },
        );
      }
      return NextResponse.json({ invitation: result.invitation }, { status: 201 });
    },
  );
}
