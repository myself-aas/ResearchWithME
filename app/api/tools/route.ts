import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { parsePaginationParams } from '@/lib/v34/pagination';
import { listToolsPage } from '@/lib/v34/sql-list-readers';
import { RegisterToolRepositoryInputSchema } from '@/lib/v34/wave3-contracts';
import { registerToolRepository } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-tools-read', 120, 60_000);
  if (limited) return limited;

  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? undefined;
  const topic = url.searchParams.get('topic') ?? undefined;

  const page = await listToolsPage(parsePaginationParams(url), { query, topic });
  return NextResponse.json({
    tools: page.items,
    cursor: page.cursor,
    limit: page.limit,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    total: page.total,
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-tools-write', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, RegisterToolRepositoryInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    {
      scope: 'v34-tools-register',
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
      supabase: auth.actor.supabase,
    },
    async () => {
      const result = await registerToolRepository({
        ...parsed.data,
        actorId: auth.actor.id,
        supabase: auth.actor.supabase,
      });

      return NextResponse.json(result, { status: result.created ? 201 : 200 });
    },
  );
}
