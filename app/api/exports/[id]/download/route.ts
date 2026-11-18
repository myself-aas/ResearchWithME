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
  const exp = await getScholarlyExport(auth.actor.id, id);
  if (!exp) {
    return NextResponse.json({ error: 'Scholarly export not found.' }, { status: 404 });
  }

  const headers: Record<string, string> = {
    'Content-Type': `${exp.contentType}; charset=utf-8`,
    'Content-Disposition': `attachment; filename="${exp.filename}"`,
    'X-Content-SHA256': exp.checksumSha256,
    'X-Storage-Provider': exp.storageProvider,
    'Cache-Control': 'private, no-store',
  };

  if (exp.storageProvider !== 'inline' && exp.signedDownloadUrl) {
    const url = new URL(request.url);
    if (url.searchParams.get('redirect') === '1') {
      return NextResponse.redirect(exp.signedDownloadUrl, {
        status: 302,
        headers: {
          'X-Content-SHA256': exp.checksumSha256,
          'X-Storage-Provider': exp.storageProvider,
          'Cache-Control': 'private, no-store',
        },
      });
    }
    headers['X-Signed-Download-Url'] = exp.signedDownloadUrl;
    if (exp.signedUrlExpiresAt) {
      headers['X-Signed-Url-Expires-At'] = exp.signedUrlExpiresAt;
    }
  }

  return new NextResponse(exp.payload, {
    status: 200,
    headers,
  });
}
