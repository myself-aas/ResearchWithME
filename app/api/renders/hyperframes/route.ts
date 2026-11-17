import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { CreateRenderJobInputSchema } from '@/lib/v34/wave8-contracts';
import { createRenderJob } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-render-hyperframes', 10, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateRenderJobInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    { scope: 'v34-render-hyperframes', actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      const render = await createRenderJob({
        ownerId: auth.actor.id,
        engine: 'HYPERFRAMES',
        compositionId: parsed.data.compositionId,
        sourceContributionId: parsed.data.sourceContributionId,
        durationSeconds: parsed.data.durationSeconds,
        humanApproved: parsed.data.humanApproved,
        payload: parsed.data.payload,
        supabase: auth.actor.supabase,
      });
      return NextResponse.json({ render }, { status: 202 });
    },
  );
}
