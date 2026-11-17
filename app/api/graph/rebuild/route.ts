import { NextResponse } from 'next/server';
import { getAllV34FeatureFlags, isV34FlagEnabled } from '@/lib/v34/feature-flags';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { getGraphProjection, rebuildGraphProjection } from '@/lib/v34/wave5-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isV34FlagEnabled('v34-graph-projection')) {
    return NextResponse.json({
      projection: null,
      flagDisabled: true,
      featureFlags: getAllV34FeatureFlags(),
    });
  }
  const projection = await getGraphProjection();
  return NextResponse.json({
    projection,
    nodeCount: projection.nodes.length,
    edgeCount: projection.edges.length,
    featureFlags: getAllV34FeatureFlags(),
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-graph-rebuild', 10, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const projection = await rebuildGraphProjection(auth.actor.supabase);
  return NextResponse.json(
    {
      rebuilt: true,
      projection,
      nodeCount: projection.nodes.length,
      edgeCount: projection.edges.length,
    },
    { status: 200 },
  );
}
