import { API_CATALOG_LINK, apiCatalog } from '@/lib/api-catalog';

// The extensionless route must keep its Linkset media type on Cloudflare too.
export const dynamic = 'force-dynamic';

const headers = {
  'Content-Type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
  Link: API_CATALOG_LINK,
};

export function GET() {
  return new Response(JSON.stringify(apiCatalog()), { status: 200, headers });
}

// RFC 9727 also requires the api-catalog Link relation on HEAD responses.
export function HEAD() {
  return new Response(null, { status: 200, headers });
}
