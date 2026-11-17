import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { getContributorProfile, listUserDevices } from '@/lib/v34/wave7-store';
import { DeleteAccountInputSchema } from '@/lib/v34/wave8-contracts';
import { tombstoneUserAccount } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-me-get', 60, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const profile = getContributorProfile(auth.actor.id);
  const devices = listUserDevices(auth.actor.id);
  return NextResponse.json({
    me: {
      id: auth.actor.id,
      name: auth.actor.name,
      isEditor: auth.actor.isEditor,
      profile,
      activeDevicesCount: devices.length,
    },
  });
}

export async function DELETE(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-me-delete', 5, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, DeleteAccountInputSchema);
  if (!parsed.ok) return parsed.response;

  const tombstone = await tombstoneUserAccount({
    userId: auth.actor.id,
    retainCitationTombstones: parsed.data.retainCitationTombstones,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json({ deleted: true, tombstone });
}
