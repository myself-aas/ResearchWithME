import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { revokeUserDevice, updateUserDevice } from '@/lib/v34/wave7-store';
import { UpdateDeviceInputSchema } from '@/lib/v34/wave8-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-devices-patch', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateDeviceInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const updated = await updateUserDevice({
    userId: auth.actor.id,
    deviceId: id,
    label: parsed.data.deviceName,
    supabase: auth.actor.supabase,
  });
  if (!updated) {
    return NextResponse.json({ error: 'Registered device not found.' }, { status: 404 });
  }
  return NextResponse.json({ device: updated });
}

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
