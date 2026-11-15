import { oauthDiscoveryResponse } from '@/lib/oauth-discovery';

export const dynamic = 'force-dynamic';

/**
 * RFC 8414 authorization-server metadata, relayed from Supabase.
 *
 * Reads configuration per request for the same reason as the OIDC twin — see
 * `app/.well-known/openid-configuration/route.ts`.
 */
export function GET() {
  return oauthDiscoveryResponse((process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(), 'GET');
}

export function HEAD() {
  return oauthDiscoveryResponse((process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(), 'HEAD');
}
