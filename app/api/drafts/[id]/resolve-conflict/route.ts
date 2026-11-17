import { NextResponse } from 'next/server';
import { ResolveConflictInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { resolveDraftConflict } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-drafts-resolve', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, ResolveConflictInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = resolveDraftConflict({
    draftId: id,
    authorId: auth.actor.id,
    ...parsed.data,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ draft: result.draft });
}
