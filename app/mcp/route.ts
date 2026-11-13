import { handleMcp } from '@/lib/mcp';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limit = await rateLimit(clientKey(request, 'mcp'), 30, 60_000);
  if (!limit.allowed) return Response.json({ error: 'Too many requests.' }, {
    status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfter / 1000)), 'Cache-Control': 'no-store' },
  });
  return handleMcp(request, getArticleCatalogue, SITE_URL);
}

// This server does not provide a server-initiated SSE stream.
export function GET(request: Request) {
  return handleMcp(request, getArticleCatalogue, SITE_URL);
}
