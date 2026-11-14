/**
 * Discovery mirror for Supabase Auth's OAuth server. The issuer is Supabase,
 * never researchwith.me: this service does not issue OAuth tokens. Fetching the
 * OAuth-specific endpoint (rather than OIDC, which GoTrue may publish even when
 * its OAuth server is off) avoids advertising a disabled authorization server.
 *
 * Auth.md's `agent_auth` block is added on the success path only. An agent that
 * reads the block will POST to the registration URI; publishing it beside a 503
 * would send that agent to a door that does not open, and the failure would look
 * like our bug rather than a disabled feature on the authorization server.
 */

import { agentAuthBlock } from './agent-auth';
import { OAUTH_METADATA_SNAPSHOT, snapshotMatches } from './oauth-metadata';
const DISCOVERY_PATH = '/auth/v1/.well-known/oauth-authorization-server';
const REQUIRED_ENDPOINTS = ['authorization_endpoint', 'token_endpoint', 'jwks_uri'] as const;

/**
 * Validate an upstream document: the issuer must be this exact project, every
 * advertised endpoint must stay on it, and the server must actually support the
 * authorization-code flow. Returns the issuer, or the reason it was rejected.
 *
 * Shared by the relay below and by the protected-resource metadata, so the
 * `authorization_servers` a client is told to trust is always the same value
 * this file is willing to serve a document for. Two validators that could
 * disagree would let the PRM name a server the relay then refuses.
 */
export function validateDiscoveryDocument(
  doc: Record<string, unknown>,
  base: URL,
): { ok: true; issuer: string } | { ok: false; reason: string } {
  let issuer: URL;
  try {
    issuer = new URL(String(doc.issuer));
  } catch {
    return { ok: false, reason: 'upstream issuer was not a URL' };
  }
  // GoTrue's OAuth endpoints and signing keys must all belong to our own
  // configured Supabase project; never publish arbitrary upstream links.
  if (issuer.origin !== base.origin || issuer.pathname !== '/auth/v1' || issuer.search || issuer.hash) {
    return { ok: false, reason: 'upstream issuer did not match the configured project' };
  }
  for (const field of REQUIRED_ENDPOINTS) {
    if (typeof doc[field] !== 'string') return { ok: false, reason: `upstream omitted ${field}` };
    let endpoint: URL;
    try {
      endpoint = new URL(doc[field] as string);
    } catch {
      return { ok: false, reason: `upstream ${field} was not a URL` };
    }
    if (endpoint.origin !== base.origin || !endpoint.pathname.startsWith('/auth/v1/') || endpoint.search || endpoint.hash) {
      return { ok: false, reason: `upstream ${field} left the configured project` };
    }
  }
  if (
    !Array.isArray(doc.grant_types_supported) ||
    !doc.grant_types_supported.includes('authorization_code') ||
    !Array.isArray(doc.response_types_supported) ||
    !doc.response_types_supported.includes('code')
  ) {
    return { ok: false, reason: 'upstream does not support the authorization-code flow' };
  }
  return { ok: true, issuer: issuer.href.replace(/\/$/, '') };
}

/**
 * The issuer a client should be told to fetch, or undefined when no reachable
 * authorization server validates. Used by the protected-resource metadata, which
 * must not name a server that cannot answer the RFC 8414 check.
 *
 * Never throws: an unreachable or malformed upstream means "advertise nothing".
 */
export async function discoverIssuer(supabaseUrl: string | undefined): Promise<string | undefined> {
  let base: URL;
  try {
    if (!supabaseUrl) return undefined;
    base = new URL(supabaseUrl);
    if (
      base.protocol !== 'https:' ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      base.pathname !== '/'
    ) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  try {
    const upstream = await fetch(new URL(DISCOVERY_PATH, base), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) return snapshotIssuer(supabaseUrl, `upstream ${upstream.status}`);
    const metadata: unknown = await upstream.json();
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
    const result = validateDiscoveryDocument(metadata as Record<string, unknown>, base);
    return result.ok ? result.issuer : snapshotIssuer(supabaseUrl, result.reason);
  } catch (error) {
    return snapshotIssuer(supabaseUrl, error instanceof Error ? error.message : 'fetch failed');
  }
}

/** The snapshot's issuer, only for the project it was captured from. */
function snapshotIssuer(supabaseUrl: string | undefined, reason: string): string | undefined {
  if (!snapshotMatches(supabaseUrl ?? '')) return undefined;
  console.warn(
    `OAuth issuer resolved from the captured snapshot (${reason}). Refresh lib/oauth-metadata.ts when the authorization server changes.`,
  );
  const issuer = OAUTH_METADATA_SNAPSHOT.document.issuer;
  return typeof issuer === 'string' ? issuer : undefined;
}

export async function oauthDiscoveryResponse(
  supabaseUrl: string,
  method: string,
  siteUrl = 'https://researchwith.me',
): Promise<Response> {
  if (method !== 'GET' && method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const unavailable = () => new Response(JSON.stringify({ error: 'OAuth discovery is not available.' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

  // The document, plus the block, with the provenance of whichever source
  // answered. Split out so the live path and the snapshot path cannot drift in
  // what they advertise.
  const respond = (
    doc: Record<string, unknown>,
    source: 'upstream' | 'snapshot',
  ): Response => {
    const registrationEndpoint =
      typeof doc.registration_endpoint === 'string' ? doc.registration_endpoint : undefined;

    const body = {
      ...doc,
      agent_auth: agentAuthBlock({ siteUrl, registrationEndpoint }),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      // A snapshot is a week-old fact at best, so it gets a short TTL and the
      // response says where it came from.
      'Cache-Control': source === 'upstream' ? 'public, max-age=300' : 'public, max-age=60',
      'X-ResearchWithMe-Source': source,
    };
    if (source === 'snapshot') headers['X-ResearchWithMe-Metadata-Captured'] = OAUTH_METADATA_SNAPSHOT.captured;

    return new Response(method === 'HEAD' ? null : JSON.stringify(body), { headers });
  };

  // Any failure of the round-trip — refused connection, timeout, bad JSON, a
  // non-2xx — degrades to the captured document for this same project rather
  // than telling an agent we have no OAuth. A different project gets no
  // fallback: the snapshot is evidence about one issuer, not a template.
  const fallback = (reason: string): Response => {
    if (!snapshotMatches(supabaseUrl)) return unavailable();
    console.warn(
      `OAuth discovery relay fell back to the captured snapshot (${reason}). Refresh lib/oauth-metadata.ts when the authorization server changes.`,
    );
    return respond(OAUTH_METADATA_SNAPSHOT.document, 'snapshot');
  };

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
    if (!upstream.ok) return fallback(`upstream ${upstream.status}`);
    const metadata: unknown = await upstream.json();
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return unavailable();
    const doc = metadata as Record<string, unknown>;
    // Same validator the PRM uses to decide which server to advertise, so the
    // two can never disagree about what this deployment is willing to serve.
    const result = validateDiscoveryDocument(doc, base);
    if (!result.ok) return fallback(result.reason);
    return respond(doc, 'upstream');
  } catch (error) {
    return fallback(error instanceof Error ? error.message : 'fetch failed');
  }
}
