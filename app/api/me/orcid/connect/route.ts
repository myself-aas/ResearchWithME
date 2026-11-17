import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { ConnectOrcidInputSchema } from '@/lib/v34/wave8-contracts';
import { connectUserOrcid } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-me-orcid', 10, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, ConnectOrcidInputSchema);
  if (!parsed.ok) return parsed.response;

  const profile = await connectUserOrcid({
    userId: auth.actor.id,
    orcid: parsed.data.orcid,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json({ connected: true, orcid: profile.orcidId, profile });
}
