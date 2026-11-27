import { SITE } from '@/lib/site';

/**
 * Health endpoint, linked from the api-catalog's `status` relations.
 *
 * Minimal and dependency-free: it reports that the Worker is up and which
 * service it is. Deliberately dynamic — a health check that answers from a
 * cache cannot tell a reader anything about the running instance.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(
    JSON.stringify({ status: 'ok', service: SITE.name, time: new Date().toISOString() }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}
