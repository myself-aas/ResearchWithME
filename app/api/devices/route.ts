import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { listUserDevices, registerUserDevice } from '@/lib/v34/wave7-store';
import { RegisterDeviceInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const devices = listUserDevices(auth.actor.id);
  return NextResponse.json({ devices, total: devices.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-devices-register', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, RegisterDeviceInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    { scope: 'POST:/api/devices', actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      const device = await registerUserDevice({
        userId: auth.actor.id,
        label: parsed.data.label,
        platform: parsed.data.platform,
        userAgent: parsed.data.userAgent ?? request.headers.get('user-agent') ?? undefined,
        supabase: auth.actor.supabase,
      });
      return NextResponse.json({ device }, { status: 201 });
    },
  );
}
