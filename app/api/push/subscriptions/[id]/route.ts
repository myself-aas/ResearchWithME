import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { revokePushSubscription } from '@/lib/v34/wave7-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-push-sub-delete', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const ok = await revokePushSubscription({
    userId: auth.actor.id,
    subscriptionId: id,
    supabase: auth.actor.supabase,
  });
  if (!ok) {
    return NextResponse.json({ error: 'Push subscription not found.' }, { status: 404 });
  }
  return NextResponse.json({ revoked: true, id });
}
