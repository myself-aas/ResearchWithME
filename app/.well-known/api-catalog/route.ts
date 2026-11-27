import { buildApiCatalog } from '@/lib/api-catalog';

/**
 * RFC 9727 api-catalog well-known URI.
 *
 * Serves the linkset document that lets agents discover the site's
 * machine-readable APIs: an `anchor` per API plus the `service-desc`,
 * `service-doc`, and `status` link relations from RFC 9727 Appendix A.1.
 * Generated from the same source as the OpenAPI specs it links to, so the
 * catalog and the specs cannot drift apart.
 */
export const dynamic = 'force-static';

export function GET() {
  const catalog = buildApiCatalog();

  return new Response(JSON.stringify(catalog, null, 2), {
    headers: {
      'Content-Type': 'application/linkset+json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

