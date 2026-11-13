/**
 * Discovery mirror for Supabase Auth's OAuth server. The issuer is Supabase,
 * never researchwith.me: this service does not issue OAuth tokens. Fetching the
 * OAuth-specific endpoint (rather than OIDC, which GoTrue may publish even when
 * its OAuth server is off) avoids advertising a disabled authorization server.
 */
const DISCOVERY_PATH = '/auth/v1/.well-known/oauth-authorization-server';
const REQUIRED_ENDPOINTS = ['authorization_endpoint', 'token_endpoint', 'jwks_uri'] as const;

export async function oauthDiscoveryResponse(supabaseUrl: string, method: string): Promise<Response> {
  if (method !== 'GET' && method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const unavailable = () => new Response(JSON.stringify({ error: 'OAuth discovery is not available.' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

  let base: URL;
  try {
    base = new URL(supabaseUrl);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
      return unavailable();
    }
  } catch {
    return unavailable();
  }

  try {
    const upstream = await fetch(new URL(DISCOVERY_PATH, base), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) return unavailable();
    const metadata: unknown = await upstream.json();
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return unavailable();
    const doc = metadata as Record<string, unknown>;
    const issuer = new URL(String(doc.issuer));
    // GoTrue's OAuth endpoints and signing keys must all belong to our own
    // configured Supabase project; never publish arbitrary upstream links.
    if (issuer.origin !== base.origin || issuer.pathname !== '/auth/v1' || issuer.search || issuer.hash) {
      return unavailable();
    }
    for (const field of REQUIRED_ENDPOINTS) {
      if (typeof doc[field] !== 'string') return unavailable();
      const endpoint = new URL(doc[field]);
      if (endpoint.origin !== base.origin || !endpoint.pathname.startsWith('/auth/v1/') || endpoint.search || endpoint.hash) {
        return unavailable();
      }
    }
    if (!Array.isArray(doc.grant_types_supported) || !doc.grant_types_supported.includes('authorization_code') ||
        !Array.isArray(doc.response_types_supported) || !doc.response_types_supported.includes('code')) {
      return unavailable();
    }
    return new Response(method === 'HEAD' ? null : JSON.stringify(doc), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  } catch {
    return unavailable();
  }
}
