import { NextResponse } from 'next/server';
import { validateCitations } from '@/lib/v34/ai-governance';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { ValidateCitationsInputSchema } from '@/lib/v34/wave6-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-ai-validate-citations', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, ValidateCitationsInputSchema);
  if (!parsed.ok) return parsed.response;

  const result = await validateCitations({
    ...parsed.data,
    actorId: auth.actor.id,
    supabase: auth.actor.supabase,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: result.status },
    );
  }

  return NextResponse.json(result, { status: 200 });
}
