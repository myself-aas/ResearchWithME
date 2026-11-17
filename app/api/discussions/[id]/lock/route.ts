import { NextResponse } from 'next/server';
import {
  enforceRateLimit,
  handleV34Error,
  parseJsonBody,
  requireAuthorized,
  requireContributor,
} from '@/lib/v34/http';
import { LockDiscussionInputSchema } from '@/lib/v34/wave3-contracts';
import { getDiscussionById, setDiscussionLock } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-discussions-lock', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, LockDiscussionInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const existing = getDiscussionById(id);
  const authz = requireAuthorized(auth.actor, 'discussion:moderate', {
    kind: 'discussion',
    id,
    ownerId: existing?.createdBy,
  });
  if (!authz.ok) return authz.response;

  try {
    const discussion = await setDiscussionLock({
      discussionId: id,
      locked: parsed.data.locked,
      reason: parsed.data.reason,
      actorId: auth.actor.id,
      supabase: auth.actor.supabase,
    });
    if (!discussion) {
      return NextResponse.json({ error: 'Discussion thread not found.' }, { status: 404 });
    }
    return NextResponse.json({ discussion });
  } catch (err) {
    return handleV34Error(err);
  }
}
