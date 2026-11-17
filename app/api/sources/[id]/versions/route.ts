import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { createSourceVersion, listSourceVersions } from '@/lib/v34/store';
import { CreateSourceVersionInputSchema } from '@/lib/v34/wave5-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const versions = listSourceVersions(id);
  if (!versions) {
    return NextResponse.json({ error: 'Source not found.' }, { status: 404 });
  }
  return NextResponse.json({ sourceId: id, versions, total: versions.length });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-source-version', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateSourceVersionInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  return runWithIdempotency(
    request,
    {
      scope: `POST:/api/sources/${id}/versions`,
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
    },
    async () => {
      const result = await createSourceVersion({
        sourceId: id,
        versionLabel: parsed.data.versionLabel,
        snapshotUrl: parsed.data.snapshotUrl,
        supabase: auth.actor.supabase,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: result.status });
      }
      return NextResponse.json({ version: result.version }, { status: 201 });
    },
  );
}
