import { NextResponse } from 'next/server';
import { AutosaveDraftInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { autosaveDraft, persistDraftToSupabase } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-drafts-autosave', 60, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, AutosaveDraftInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = autosaveDraft({
    draftId: id,
    authorId: auth.actor.id,
    ...parsed.data,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message,
        conflict: result.conflict,
      },
      { status: result.status },
    );
  }

  await persistDraftToSupabase(auth.actor.supabase, result.draft);

  return NextResponse.json(
    { draft: result.draft, replayed: result.replayed },
    {
      status: 200,
      headers: {
        'X-Idempotency-Replayed': result.replayed ? 'true' : 'false',
      },
    },
  );
}
