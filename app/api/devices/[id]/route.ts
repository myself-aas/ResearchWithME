import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { revokeUserDevice } from '@/lib/v34/wave7-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-devices-revoke', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const result = await revokeUserDevice({
    userId: auth.actor.id,
    deviceId: id,
    supabase: auth.actor.supabase,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({
    revoked: true,
    device: result.device,
    revokedPushSubscriptions: result.revokedSubscriptions,
  });
}
