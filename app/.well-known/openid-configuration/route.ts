import { oauthDiscoveryResponse } from '@/lib/oauth-discovery';

export const dynamic = 'force-dynamic';

/**
 * OIDC-flavoured address for the same document.
 *
 * OIDC Discovery puts the metadata at `/.well-known/openid-configuration`; RFC
 * 8414 puts it at `/.well-known/oauth-authorization-server`. The scanner accepts
 * either, agents commonly try OIDC first, and the metadata they receive is
 * identical — so both paths answer from one implementation rather than two that
 * can disagree.
 *
 * The configuration is read per request rather than at module load: `SUPABASE_URL`
 * is a module constant captured when the module is first imported, which in a
 * long-lived Worker can predate a configuration change, and in tests can predate
 * the harness that stubs the environment.
 */
export function GET() {
  return oauthDiscoveryResponse((process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(), 'GET');
}

export function HEAD() {
  return oauthDiscoveryResponse((process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(), 'HEAD');
}
