import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { SYNC_RESOURCE_TYPES, type SyncResourceType } from '@/lib/v34/wave7-contracts';
import { getSyncDelta } from '@/lib/v34/wave7-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ resourceType: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-mobile-sync', 60, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { resourceType } = await context.params;
  if (!(SYNC_RESOURCE_TYPES as readonly string[]).includes(resourceType)) {
    return NextResponse.json(
      {
        error: `Unsupported sync resourceType "${resourceType}". Supported: ${SYNC_RESOURCE_TYPES.join(', ')}.`,
      },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');
  const delta = getSyncDelta({
    userId: auth.actor.id,
    resourceType: resourceType as SyncResourceType,
    cursor,
  });

  return NextResponse.json(delta);
}
