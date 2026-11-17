import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateExpertiseInputSchema } from '@/lib/v34/wave8-contracts';
import { addUserExpertise } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-me-exp-create', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateExpertiseInputSchema);
  if (!parsed.ok) return parsed.response;

  const expertise = await addUserExpertise({
    userId: auth.actor.id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json({ expertise }, { status: 201 });
}
