import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/v34/http';
import { listContributionVersions } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-contributions-versions', 120, 60_000);
  if (limited) return limited;

  const { id } = await context.params;
  const versions = listContributionVersions(id);
  if (!versions) {
    return NextResponse.json({ error: 'Contribution not found.' }, { status: 404 });
  }
  return NextResponse.json({ contributionId: id, versions, total: versions.length });
}
