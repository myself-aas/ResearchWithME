import { NextResponse } from 'next/server';
import { AutosaveDraftInputSchema } from '@/lib/v34/contracts';
import {
  enforceRateLimit,
  handleV34Error,
  parseJsonBody,
  requireAuthorized,
  requireContributor,
} from '@/lib/v34/http';
import { autosaveDraftAtomic, getDraft } from '@/lib/v34/store';

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
  const existing = getDraft(id, auth.actor.id);
  const authz = requireAuthorized(auth.actor, 'draft:write', {
    kind: 'draft',
    id,
    ownerId: existing?.authorId ?? auth.actor.id,
    classification: 'CONFIDENTIAL',
  });
  if (!authz.ok) return authz.response;

  try {
    const result = await autosaveDraftAtomic({
      draftId: id,
      authorId: auth.actor.id,
      supabase: auth.actor.supabase,
      ...parsed.data,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.message,
          code: result.code,
          conflict: result.conflict,
        },
        { status: result.status },
      );
    }

    return NextResponse.json(
      { draft: result.draft, replayed: result.replayed },
      {
        status: 200,
        headers: {
          'X-Idempotency-Replayed': result.replayed ? 'true' : 'false',
          'X-Persistence-Storage': result.storage,
        },
      },
    );
  } catch (err) {
    return handleV34Error(err);
  }
}
