import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { LockDiscussionInputSchema } from '@/lib/v34/wave3-contracts';
import { setDiscussionLock } from '@/lib/v34/wave3-store';

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
}
