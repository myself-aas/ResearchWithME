import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { listContributions } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-dash-contribs', 60, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? undefined;
  const contributions = listContributions({ includeDraftsForAuthorId: auth.actor.id }).filter((c) =>
    !status ? true : c.lifecycle.toLowerCase() === status.toLowerCase(),
  );
  return NextResponse.json({ contributions, total: contributions.length, nextCursor: null });
}
