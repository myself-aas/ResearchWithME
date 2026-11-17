import { NextResponse } from 'next/server';
import { ResolveSourceInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { parsePaginationParams } from '@/lib/v34/pagination';
import { listSourcesPage } from '@/lib/v34/sql-list-readers';
import { resolveOrCreateSource } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-sources-read', 120, 60_000);
  if (limited) return limited;

  const page = await listSourcesPage(parsePaginationParams(request.url));
  return NextResponse.json({
    sources: page.items,
    cursor: page.cursor,
    limit: page.limit,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    total: page.total,
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-sources-write', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, ResolveSourceInputSchema);
  if (!parsed.ok) return parsed.response;

  const resolved = await resolveOrCreateSource({
    ...parsed.data,
    userId: auth.actor.id,
  });

  return NextResponse.json(resolved, { status: resolved.created ? 201 : 200 });
}
