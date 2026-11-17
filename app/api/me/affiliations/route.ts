import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateAffiliationInputSchema } from '@/lib/v34/wave8-contracts';
import { addUserAffiliation } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-me-aff-create', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateAffiliationInputSchema);
  if (!parsed.ok) return parsed.response;

  const affiliation = await addUserAffiliation({
    userId: auth.actor.id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json({ affiliation }, { status: 201 });
}
