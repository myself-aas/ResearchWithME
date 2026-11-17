import { NextResponse } from 'next/server';
import { CreateClaimInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { createClaim, listClaims, persistClaimToSupabase } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const claims = listClaims();
  return NextResponse.json({ claims, total: claims.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-claims-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateClaimInputSchema);
  if (!parsed.ok) return parsed.response;

  const claim = createClaim({
    ...parsed.data,
    createdBy: auth.actor.id,
  });

  await persistClaimToSupabase(auth.actor.supabase, claim);
  return NextResponse.json({ claim }, { status: 201 });
}
