import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, FAKE_SUPABASE_URL } from '@/test/support/pages';
import { discoverIssuer, oauthDiscoveryResponse } from '@/lib/oauth-discovery';
import { AUTH_MD } from '@/lib/auth-md';
import { agentAuthBlock, protectedResourceMetadata } from '@/lib/agent-auth';

/**
 * Auth.md's discovery chain, as the spec and the scanner describe it:
 *
 *   GET /auth.md                                     (the walkthrough)
 *   GET /.well-known/oauth-protected-resource        (RFC 9728, points at the AS)
 *   GET <as>/.well-known/oauth-authorization-server  (RFC 8414 + agent_auth)
 *
 * The chain is only honest if every hop agrees. Two properties matter more than
 * presence:
 *
 *   - The AS metadata must not gain an `agent_auth` block when there is no
 *     reachable authorization server. A block pointing at endpoints that 503 is
 *     worse than no block: an agent will follow it and fail later, in a way that
 *     looks like our bug.
 *   - The PRM must describe a resource that actually accepts the credential it
 *     advertises. The only bearer credential these APIs take is this site's
 *     own API key, never an OAuth access token, and the PRM says exactly that.
 */

const metadata = {
  issuer: `${FAKE_SUPABASE_URL}/auth/v1`,
  // Supabase's dynamic client registration is RFC 7591 at this path — not an
  // Auth.md `/agent/auth`. The block must not invent the latter.
  registration_endpoint: `${FAKE_SUPABASE_URL}/auth/v1/oauth/register`,
  authorization_endpoint: `${FAKE_SUPABASE_URL}/auth/v1/oauth/authorize`,
  token_endpoint: `${FAKE_SUPABASE_URL}/auth/v1/oauth/token`,
  jwks_uri: `${FAKE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  grant_types_supported: ['authorization_code', 'refresh_token'],
  response_types_supported: ['code'],
};

afterEach(() => vi.unstubAllGlobals());

describe('agent auth discovery chain', () => {
  it('serves protected-resource metadata that names our resource and the real issuer', async () => {
    const response = protectedResourceMetadata('https://researchwith.me');
    expect(response.status).toBe(200);
    const doc = await response.json();

    expect(doc.resource).toBe('https://researchwith.me');
    // RFC 9728: the resource must not claim a different origin's scopes.
    expect(Array.isArray(doc.authorization_servers)).toBe(true);
    expect(doc.bearer_methods_supported).toEqual(['header']);
    // The only bearer credential validated here is this site's own API key
    // (not an OAuth access token), so there is no OAuth-protected
    // resource to point at and no scope to advertise.
    expect(doc['x-researchwithme-api-bearer-support']).toBe('api-key');
  });

  /**
   * RFC 9728 §3.3: the client fetches
   * `<authorization_servers[0]>/.well-known/oauth-authorization-server` and then
   * checks that the `issuer` it returns *is* the identifier it asked for. If it
   * is not, the metadata MUST be rejected.
   *
   * Adverting our own origin therefore cannot work: our relay deliberately
   * reports Supabase's issuer, so the check fails and the document — including
   * the agent_auth block the self-reference was meant to deliver — is discarded
   * before an agent ever reads it. The advertised value must be the issuer
   * itself.
   */
  it('names the authorization server by the issuer it actually publishes', async () => {
    const doc = await protectedResourceMetadata('https://researchwith.me', {
      issuer: `${FAKE_SUPABASE_URL}/auth/v1`,
    }).json();

    expect(doc.authorization_servers).toEqual([`${FAKE_SUPABASE_URL}/auth/v1`]);
    // No self-reference: pointing at our own relay is what breaks the check.
    expect(doc.authorization_servers).not.toContain('https://researchwith.me');
  });

  /**
   * The invariant that the old self-reference violated: the server the PRM
   * tells a client to trust must be the same issuer the relayed document
   * reports. If those disagree, the RFC 9728 client check fails and the
   * document — agent_auth block included — is discarded unseen.
   */
  it('names the same issuer that the authorization-server document reports', async () => {
    // A fresh Response per call: a Response body can be read only once, so a
    // shared mockResolvedValue makes the second request appear to fail.
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json(metadata)));

    const issuer = await discoverIssuer(FAKE_SUPABASE_URL);
    const prm = await protectedResourceMetadata('https://researchwith.me', { issuer }).json();
    const server = await (await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET')).json();

    expect(prm.authorization_servers).toHaveLength(1);
    expect(prm.authorization_servers[0]).toBe(server.issuer);
    expect(issuer).toBe(server.issuer);
  });

  /**
   * With no issuer known, nothing is advertised. An authorization_servers array
   * naming a host that cannot answer the RFC 8414 check is worse than an empty
   * one: it sends every client down a path that must fail.
   */
  it('omits authorization_servers when no real issuer is available', async () => {
    const doc = await protectedResourceMetadata('https://researchwith.me').json();
    expect(doc.authorization_servers).toEqual([]);
    // The document still says where to read about it.
    expect(doc.resource_documentation).toBe('https://researchwith.me/auth.md');
  });

  it('still declares the resource, the bearer transport, and the honest caveat', async () => {
    const doc = await protectedResourceMetadata('https://researchwith.me').json();
    expect(doc.resource).toBe('https://researchwith.me');
    expect(doc.bearer_methods_supported).toEqual(['header']);
    expect(doc.scopes_supported).toEqual([]);
    expect(doc['x-researchwithme-api-bearer-support']).toBe('api-key');
  });

  it('publishes the agent_auth block only when the authorization server is reachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(metadata)));
    const withServer = await (await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET')).json();

    expect(withServer.agent_auth).toBeDefined();
    expect(withServer.agent_auth.skill).toBe('https://researchwith.me/auth.md');
    // The advertised registration URI is the one upstream actually publishes.
    // Guessing `/agent/auth` would send agents to a 404 on Supabase's host.
    expect(withServer.agent_auth.register_uri).toBe(metadata.registration_endpoint);
    // The issuer is the upstream one, untouched.
    expect(withServer.issuer).toBe(metadata.issuer);
  });

  it('drops the anonymous method when upstream publishes no registration endpoint', async () => {
    // Without a registration endpoint there is nothing an agent can self-serve
    // into, so advertising the method would be a promise with no mechanism.
    const { registration_endpoint: _omitted, ...noRegistration } = metadata;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(noRegistration)));
    const doc = await (await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET')).json();

    expect(doc.agent_auth.register_uri).toBeUndefined();
    // No method at all: nothing an agent can self-serve into.
    expect(doc.agent_auth.identity_types_supported).toEqual([]);
    expect(doc.agent_auth.anonymous).toBeUndefined();
    // The document still exists, because it is where an agent learns this.
    expect(doc.agent_auth.skill).toBe('https://researchwith.me/auth.md');
  });

  it('never advertises ID-JAG, which nothing in this chain mints or verifies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(metadata)));
    const doc = await (await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET')).json();
    // `identity_assertion` is not claimed at all, so neither assertion type is
    // advertised — ID-JAG above all.
    expect(doc.agent_auth.identity_assertion).toBeUndefined();
    expect(JSON.stringify(doc.agent_auth)).not.toContain('id-jag');
  });

  it('leaves the block out entirely when the authorization server is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const response = await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET');
    expect(response.status).toBe(503);
    // And crucially: no stale document promising registration.
    expect(JSON.stringify(await response.json())).not.toContain('agent_auth');
  });

  it('keeps the block consistent with what /auth.md promises', async () => {
    // Render the block against a real issuer, the way the AS document does. The
    // fallback (issuer = site) is only for a caller with no issuer at all.
    const block = agentAuthBlock({
      siteUrl: 'https://researchwith.me',
      registrationEndpoint: metadata.registration_endpoint,
    });
    const doc = await protectedResourceMetadata('https://researchwith.me').json();

    // The back-pointer the scanner checks in both directions.
    expect(block.skill).toBe('https://researchwith.me/auth.md');
    expect(doc.resource_documentation).toBe(block.skill);
    expect(AUTH_MD).toContain(block.skill);

    // Registration paths are documented as `<issuer>/…` suffixes: printing a
    // Supabase URL would go stale if the project moved, and printing one for a
    // server that may be disabled would read as a promise.
    // Only a registration address is advertised, because that is the only
    // mechanism upstream publishes. The walkthrough refers to it as
    // `<register_uri>` rather than printing a Supabase path that would go stale
    // if the project moved — so the contract is "the document points the agent at
    // the metadata value", and that it does not invent `/agent/auth`.
    expect(block.register_uri).toBe(metadata.registration_endpoint);
    expect(AUTH_MD).toContain('<register_uri>');
    // It may *name* `/agent/auth` to say it does not exist; it must never present
    // it as a URL to call.
    expect(AUTH_MD).not.toMatch(/https?:\/\/[^\s`)]*\/agent\/auth/);
  });

  it('serves the PRM over HTTP with a JSON content type in both runtimes', async () => {
    const app = createTestApp();
    const pages = await app.request('/.well-known/oauth-protected-resource');
    expect(pages.status).toBe(200);
    expect(pages.headers.get('content-type')).toContain('application/json');
    expect((await pages.json()).resource).toBe('https://researchwith.me');
  });
});
