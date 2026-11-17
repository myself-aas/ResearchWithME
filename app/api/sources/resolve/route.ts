import { NextResponse } from 'next/server';
import { ResolveSourceInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { enqueueAndRunJob } from '@/lib/v34/job-runner';
import { resolveScholarlyMetadata } from '@/lib/v34/resolvers';
import { resolveOrCreateSource } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-sources-resolve', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, ResolveSourceInputSchema);
  if (!parsed.ok) return parsed.response;

  const normalizedMeta = await resolveScholarlyMetadata(parsed.data.query, {
    allowNetwork: false,
  });

  const resolved = await resolveOrCreateSource({
    ...parsed.data,
    title: parsed.data.title ?? normalizedMeta?.title,
    venue: parsed.data.venue ?? normalizedMeta?.venue ?? undefined,
    userId: auth.actor.id,
    supabase: auth.actor.supabase ?? undefined,
  });

  await enqueueAndRunJob({
    ownerId: auth.actor.id,
    jobType: 'source.resolve',
    payload: {
      identifier: parsed.data.query,
      sourceId: resolved.source.id,
      resolver: normalizedMeta?.resolver ?? 'local-deterministic',
    },
  });

  return NextResponse.json(
    {
      ...resolved,
      resolver: normalizedMeta?.resolver ?? 'local-deterministic',
    },
    { status: resolved.created ? 201 : 200 },
  );
}
