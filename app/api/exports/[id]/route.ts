import { NextResponse } from 'next/server';
import { getScholarlyExport } from '@/lib/v34/exports';
import { enforceRateLimit, requireAuthorized, requireContributor } from '@/lib/v34/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-exports-get', 60, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const authz = requireAuthorized(auth.actor, 'export:read', {
    kind: 'export',
    ownerId: auth.actor.id,
    classification: 'CONFIDENTIAL',
  });
  if (!authz.ok) return authz.response;

  const { id } = await context.params;
  const rec = getScholarlyExport(auth.actor.id, id);
  if (!rec) {
    return NextResponse.json({ error: 'Export not found.' }, { status: 404 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get('download') === '1') {
    return new NextResponse(rec.payload, {
      status: 200,
      headers: {
        'Content-Type': rec.contentType,
        'Content-Disposition': `attachment; filename="${rec.filename}"`,
        'X-Export-Checksum-SHA256': rec.checksumSha256,
      },
    });
  }

  return NextResponse.json({ export: rec });
}
