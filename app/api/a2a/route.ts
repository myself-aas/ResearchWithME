import { handleA2aMessage } from '@/lib/a2a';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limit = await rateLimit(clientKey(request, 'a2a'), 12, 60_000);
  if (!limit.allowed) {
    return Response.json({ error: 'Too many requests.' }, {
      status: 429, headers: { 'Retry-After': String(limit.retryAfter), 'Cache-Control': 'no-store' },
    });
  }
  return handleA2aMessage(request, getArticleCatalogue, SITE_URL);
}
