import { protectedResourceMetadata } from '@/lib/agent-auth';
import { discoverIssuer } from '@/lib/oauth-discovery';

export const dynamic = 'force-dynamic';

/**
 * The resource identifier. A fixed public identifier rather than the request
 * host: RFC 9728 wants the resource to name itself consistently, and a canonical
 * value keeps preview and production documents comparable.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim() || 'https://researchwith.me';

/**
 * `authorization_servers` must name an issuer that answers the RFC 8414 check,
 * so it is resolved from the authorization server itself rather than assumed.
 * Read per request: the Supabase URL is runtime configuration and can change
 * between deployments without this module being re-evaluated.
 */
async function document(): Promise<Response> {
  const issuer = await discoverIssuer(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return protectedResourceMetadata(SITE, { issuer });
}

export function GET() {
  return document();
}

export async function HEAD() {
  const response = await document();
  return new Response(null, { status: response.status, headers: response.headers });
}
