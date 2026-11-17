import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { buildPortableUserExport } from '@/lib/v34/wave7-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-me-export', 6, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const exported = buildPortableUserExport(
    auth.actor.id,
    auth.actor.handle,
    auth.actor.name,
  );

  const url = new URL(request.url);
  if (url.searchParams.get('download') === '1') {
    const body = JSON.stringify(exported, null, 2);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="researchwithme-export-${auth.actor.handle}.json"`,
        'X-Export-Checksum-SHA256': exported.checksumSha256,
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json(exported, {
    headers: {
      'X-Export-Checksum-SHA256': exported.checksumSha256,
      'Cache-Control': 'no-store',
    },
  });
}
