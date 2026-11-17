import { afterEach, describe, expect, it, vi } from 'vitest';
import { discoverIssuer, oauthDiscoveryResponse } from '@/lib/oauth-discovery';
import { AUTH_MD } from '@/lib/auth-md';
import { agentAuthBlock, protectedResourceMetadata } from '@/lib/agent-auth';
import { GET as prmGet } from '@/app/.well-known/oauth-protected-resource/route';

const FAKE_SUPABASE_URL = 'https://example-project.supabase.co';

const metadata = {
  issuer: `${FAKE_SUPABASE_URL}/auth/v1`,
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
    expect(Array.isArray(doc.authorization_servers)).toBe(true);
    expect(doc.bearer_methods_supported).toEqual(['header']);
    expect(doc['x-researchwithme-api-bearer-support']).toBe('api-key');
  });

  it('names the authorization server by the issuer it actually publishes', async () => {
    const doc = await protectedResourceMetadata('https://researchwith.me', {
      issuer: `${FAKE_SUPABASE_URL}/auth/v1`,
    }).json();

    expect(doc.authorization_servers).toEqual([`${FAKE_SUPABASE_URL}/auth/v1`]);
    expect(doc.authorization_servers).not.toContain('https://researchwith.me');
  });

  it('names the same issuer that the authorization-server document reports', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json(metadata)));

    const issuer = await discoverIssuer(FAKE_SUPABASE_URL);
    const prm = await protectedResourceMetadata('https://researchwith.me', { issuer }).json();
    const server = await (await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET')).json();

    expect(prm.authorization_servers).toHaveLength(1);
    expect(prm.authorization_servers[0]).toBe(server.issuer);
    expect(issuer).toBe(server.issuer);
  });

  it('omits authorization_servers when no real issuer is available', async () => {
    const doc = await protectedResourceMetadata('https://researchwith.me').json();
    expect(doc.authorization_servers).toEqual([]);
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
    expect(withServer.agent_auth.register_uri).toBe(metadata.registration_endpoint);
    expect(withServer.issuer).toBe(metadata.issuer);
  });

  it('drops the anonymous method when upstream publishes no registration endpoint', async () => {
    const { registration_endpoint: _omitted, ...noRegistration } = metadata;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(noRegistration)));
    const doc = await (await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET')).json();

    expect(doc.agent_auth.register_uri).toBeUndefined();
    expect(doc.agent_auth.identity_types_supported).toEqual([]);
    expect(doc.agent_auth.anonymous).toBeUndefined();
    expect(doc.agent_auth.skill).toBe('https://researchwith.me/auth.md');
  });

  it('never advertises ID-JAG, which nothing in this chain mints or verifies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(metadata)));
    const doc = await (await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET')).json();
    expect(doc.agent_auth.identity_assertion).toBeUndefined();
    expect(JSON.stringify(doc.agent_auth)).not.toContain('id-jag');
  });

  it('leaves the block out entirely when the authorization server is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const response = await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET');
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('agent_auth');
  });

  it('keeps the block consistent with what /auth.md promises', async () => {
    const block = agentAuthBlock({
      siteUrl: 'https://researchwith.me',
      registrationEndpoint: metadata.registration_endpoint,
    });
    const doc = await protectedResourceMetadata('https://researchwith.me').json();

    expect(block.skill).toBe('https://researchwith.me/auth.md');
    expect(doc.resource_documentation).toBe(block.skill);
    expect(AUTH_MD).toContain(block.skill);
    expect(block.register_uri).toBe(metadata.registration_endpoint);
    expect(AUTH_MD).toContain('<register_uri>');
    expect(AUTH_MD).not.toMatch(/https?:\/\/[^\s`)]*\/agent\/auth/);
  });

  it('serves the PRM over HTTP with a JSON content type from Next.js', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json(metadata)));
    const response = await prmGet();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect((await response.json()).resource).toBe('https://researchwith.me');
  });
});
