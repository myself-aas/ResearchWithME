import { NextResponse } from 'next/server';
import { listContributionVersions } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const versions = listContributionVersions(id);
  if (!versions) {
    return NextResponse.json({ error: 'Contribution not found.' }, { status: 404 });
  }
  return NextResponse.json({ contributionId: id, versions, total: versions.length });
}
