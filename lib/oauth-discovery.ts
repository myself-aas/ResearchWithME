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
 *
 * ── One fetch, two consumers ────────────────────────────────────────────────
 *
 * `loadDiscovery` performs the round-trip and the validation exactly once. The
 * relay needs the document and the protected-resource metadata needs only the
 * issuer; if they fetched separately they could disagree about whether the
 * authorization server is usable, and a PRM naming a server the relay then
 * refuses is the same failure in two places.
 *
 * ── Why `redirect: 'manual'` ────────────────────────────────────────────────
 *
 * workerd rejects `redirect: 'error'` outright — it accepts only `follow` and
 * `manual` — so that value made every fetch throw before a request was sent.
 * The snapshot fallback then answered 200 on every request and the relay served
 * a week-old capture indefinitely, with nothing in the response saying the
 * upstream had never been reached. `manual` still refuses to follow; the status
 * check turns a 3xx into a failed round-trip, which is what a redirect to
 * another origin deserves.
 */

import { agentAuthBlock } from './agent-auth';
import { getOAuthMetadataSnapshot, snapshotMatches } from './oauth-metadata';
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
 * One round-trip, one validation, for both consumers.
 *
 * The relay needs the document; the protected-resource metadata needs only the
 * issuer. They must never disagree about whether the authorization server is
 * usable — a PRM naming a server the relay then 503s is the same failure in two
 * places — so the fetch and the validation happen exactly once, here.
 *
 * Failure degrades to the captured snapshot only for the project it was taken
 * from: the snapshot is evidence about one issuer, not a template that can be
 * pointed at another.
 */
type DiscoveryResult =
  | { ok: true; doc: Record<string, unknown>; source: 'upstream' | 'snapshot'; issuer: string }
  | { ok: false; reason: string; unavailableForThisProject: boolean };

export async function loadDiscovery(supabaseUrl: string | undefined): Promise<DiscoveryResult> {
  let base: URL;
  try {
    if (!supabaseUrl) throw new Error('not configured');
    base = new URL(supabaseUrl);
    if (
      base.protocol !== 'https:' ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      base.pathname !== '/'
    ) {
      throw new Error('not configured');
    }
  } catch {
    // No usable configuration: there is nothing to fall back to, and a 503 tells
    // an agent the truth rather than naming an issuer we cannot reach.
    return { ok: false, reason: 'authorization server is not configured', unavailableForThisProject: false };
  }

  const snapshot = (reason: string): DiscoveryResult => {
    if (!snapshotMatches(supabaseUrl ?? '')) {
      return { ok: false, reason, unavailableForThisProject: false };
    }
    console.warn(
      `OAuth discovery relay fell back to the captured snapshot (${reason}). Refresh lib/oauth-metadata.ts when the authorization server changes.`,
    );
    const doc = getOAuthMetadataSnapshot().document as Record<string, unknown>;
    return { ok: true, doc, source: 'snapshot', issuer: String(doc.issuer) };
  };

  try {
    const upstream = await fetch(new URL(DISCOVERY_PATH, base), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      // 'manual', not 'error': workerd rejects 'error' outright ("must be one
      // of follow or manual"), which made every request throw before it was
      // sent and left the relay serving the snapshot forever. 'manual' still
      // refuses to follow — a 3xx is caught by the !ok check below — so the
      // validation stays about this exact origin, which is the point.
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    // Includes 3xx: a redirect means the document is not served from the origin
    // we validated, so it is not usable.
    if (!upstream.ok) return snapshot(`upstream ${upstream.status}`);
    const metadata: unknown = await upstream.json();
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return snapshot('upstream returned a non-object document');
    }
    const doc = metadata as Record<string, unknown>;
    const result = validateDiscoveryDocument(doc, base);
    if (!result.ok) return snapshot(result.reason);
    return { ok: true, doc, source: 'upstream', issuer: result.issuer };
  } catch (error) {
    return snapshot(error instanceof Error ? error.message : 'fetch failed');
  }
}

/**
 * The issuer a client should be told to fetch, or undefined when no reachable
 * authorization server validates. The protected-resource metadata uses this: it
 * must not name a server that cannot answer the RFC 8414 check.
 */
export async function discoverIssuer(supabaseUrl: string | undefined): Promise<string | undefined> {
  const result = await loadDiscovery(supabaseUrl);
  return result.ok ? result.issuer : undefined;
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
    if (source === 'snapshot') headers['X-ResearchWithMe-Metadata-Captured'] = getOAuthMetadataSnapshot().captured;

    return new Response(method === 'HEAD' ? null : JSON.stringify(body), { headers });
  };

  // Same loader the protected-resource metadata uses, so the two can never
  // disagree about what this deployment is willing to serve.
  const result = await loadDiscovery(supabaseUrl);
  if (!result.ok) return unavailable();
  return result.source === 'upstream' ? respond(result.doc, 'upstream') : respond(result.doc, 'snapshot');
}
