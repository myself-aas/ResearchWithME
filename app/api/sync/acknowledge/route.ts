import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { AcknowledgeSyncInputSchema } from '@/lib/v34/wave8-contracts';
import { acknowledgeSyncCursor } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-sync-ack', 60, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, AcknowledgeSyncInputSchema);
  if (!parsed.ok) return parsed.response;

  const cursor = await acknowledgeSyncCursor({
    userId: auth.actor.id,
    deviceId: parsed.data.deviceId,
    resourceType: parsed.data.resourceType,
    cursor: parsed.data.cursor,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json({ acknowledged: true, syncCursor: cursor });
}
