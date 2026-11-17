import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { getScholarlyExport } from '@/lib/v34/exports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-exports-download', 40, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const exp = getScholarlyExport(auth.actor.id, id);
  if (!exp) {
    return NextResponse.json({ error: 'Scholarly export not found.' }, { status: 404 });
  }

  return new NextResponse(exp.payload, {
    status: 200,
    headers: {
      'Content-Type': `${exp.contentType}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="${exp.filename}"`,
      'X-Content-SHA256': exp.checksumSha256,
      'Cache-Control': 'private, no-store',
    },
  });
}
