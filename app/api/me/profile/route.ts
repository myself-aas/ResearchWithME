import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { UpdateProfileInputSchema } from '@/lib/v34/wave7-contracts';
import { getContributorProfile, updateContributorProfile } from '@/lib/v34/wave7-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const profile = getContributorProfile(auth.actor.id, {
    username: auth.actor.handle,
    displayName: auth.actor.name,
  });
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-me-profile', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateProfileInputSchema);
  if (!parsed.ok) return parsed.response;

  const profile = await updateContributorProfile({
    userId: auth.actor.id,
    username: auth.actor.handle,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });

  return NextResponse.json({ profile });
}
