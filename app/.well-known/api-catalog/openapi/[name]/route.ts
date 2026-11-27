import { getOpenApiSpec, OPENAPI_SPECS } from '@/lib/api-catalog';

/**
 * OpenAPI 3.1 specifications linked from the api-catalog's `service-desc`
 * relations, one document per catalogued API. Unknown names return 404 so
 * the catalog and the served specs stay in lockstep.
 */
export const dynamic = 'force-static';

export function generateStaticParams() {
  return OPENAPI_SPECS.map((name) => ({ name }));
}

export function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  return (async () => {
    const { name } = await params;
    const spec = getOpenApiSpec(name);

    if (!spec) {
      return new Response(JSON.stringify({ error: 'Unknown API specification.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(JSON.stringify(spec, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  })();
}
