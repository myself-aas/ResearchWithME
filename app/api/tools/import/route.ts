import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { importToolRepositoryFromUrl } from '@/lib/v34/wave3-store';
import { ImportToolRepoInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-tools-import', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, ImportToolRepoInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    { scope: 'POST:/api/tools/import', actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      const result = await importToolRepositoryFromUrl({
        ...parsed.data,
        actorId: auth.actor.id,
        supabase: auth.actor.supabase,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: result.status });
      }
      return NextResponse.json(
        {
          tool: result.tool,
          created: result.created,
          deduplicated: !result.created,
        },
        { status: result.created ? 201 : 200 },
      );
    },
  );
}
