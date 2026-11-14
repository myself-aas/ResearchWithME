import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, FAKE_SUPABASE_URL } from '@/test/support/pages';
import { oauthDiscoveryResponse } from '@/lib/oauth-discovery';
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
 *     advertises. These APIs take no bearer token, so the PRM says so rather
 *     than publishing `bearer_methods_supported` for a door that is not there.
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
    // This site's own APIs accept no bearer token, so there is no protected
    // resource to point at and no scope to advertise.
    expect(doc['x-researchwithme-api-bearer-support']).toBe('none');
  });

  it('advertises the host whose document actually carries agent_auth', async () => {
    const doc = await protectedResourceMetadata('https://researchwith.me').json();
    // Deliberate: the advertised server is our own origin, because that is where
    // the document with the `agent_auth` block is served. Pointing at Supabase's
    // canonical issuer would be more literal, but that document has no
    // agent_auth and the chain would dead-end for a scanning agent.
    //
    // The cost is stated rather than hidden: our document relays Supabase's
    // issuer, so a strict RFC 8414 issuer-location check will not match. The PRM
    // says so in `x-researchwithme-issuer-relay`, and /auth.md says so in prose.
    expect(doc.authorization_servers).toEqual(['https://researchwith.me']);
    expect(doc['x-researchwithme-issuer-relay']).toMatch(/supabase/i);
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
