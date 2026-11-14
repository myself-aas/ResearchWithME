import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, FAKE_SUPABASE_URL } from '@/test/support/pages';
import { oauthDiscoveryResponse } from '@/lib/oauth-discovery';
import { OAUTH_METADATA_SNAPSHOT } from '@/lib/oauth-metadata';

/**
 * The endpoint must answer with valid metadata even when the runtime fetch to
 * Supabase fails.
 *
 * Why this exists: the deployed endpoint returned `503` in production while the
 * upstream document was demonstrably healthy and publicly reachable. A discovery
 * endpoint that depends on a live round-trip from inside a Worker inherits every
 * way that round-trip can fail — DNS, egress policy, a timeout race, a cold
 * start — and reports all of them as "this service has no OAuth", which is a
 * false statement about a working configuration.
 *
 * The fix keeps live data first (a fresh fetch wins whenever it succeeds) and
 * falls back to a snapshot captured from the same issuer, labelled as such. The
 * fallback is refused outright when the configured project is not the project
 * the snapshot came from — a snapshot is evidence about one issuer, not a
 * template for any issuer.
 */

const metadata = {
  issuer: `${FAKE_SUPABASE_URL}/auth/v1`,
  authorization_endpoint: `${FAKE_SUPABASE_URL}/auth/v1/oauth/authorize`,
  token_endpoint: `${FAKE_SUPABASE_URL}/auth/v1/oauth/token`,
  jwks_uri: `${FAKE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  grant_types_supported: ['authorization_code', 'refresh_token'],
  response_types_supported: ['code'],
};

afterEach(() => vi.unstubAllGlobals());

describe('OAuth discovery resilience', () => {
  it('serves live upstream metadata when the fetch succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json(metadata)));
    const response = await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET');
    expect(response.status).toBe(200);
    expect(response.headers.get('x-researchwithme-source')).toBe('upstream');
    const doc = await response.json();
    expect(doc.issuer).toBe(metadata.issuer);
    expect(doc.grant_types_supported).toEqual(metadata.grant_types_supported);
  });

  it('falls back to the snapshot for the same issuer when the fetch fails', async () => {
    // Every way the round-trip can break, not just a 404.
    for (const failure of [
      vi.fn().mockRejectedValue(new Error('ECONNRESET')),
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
      vi.fn().mockResolvedValue(new Response('not json', { status: 200 })),
    ]) {
      vi.stubGlobal('fetch', failure);
      const response = await oauthDiscoveryResponse(OAUTH_METADATA_SNAPSHOT.issuerOrigin, 'GET');
      expect(response.status).toBe(200);
      expect(response.headers.get('x-researchwithme-source')).toBe('snapshot');

      const doc = await response.json();
      // The four fields the scanner requires, every time.
      for (const field of ['issuer', 'authorization_endpoint', 'token_endpoint', 'jwks_uri']) {
        expect(typeof doc[field]).toBe('string');
        expect(doc[field]).not.toBe('');
      }
      expect(Array.isArray(doc.grant_types_supported)).toBe(true);
      expect(Array.isArray(doc.response_types_supported)).toBe(true);
      expect(doc.issuer).toBe(OAUTH_METADATA_SNAPSHOT.document.issuer);
    }
  });

  it('refuses the snapshot for a different project', async () => {
    // A snapshot is evidence about one issuer. Serving it for another origin
    // would advertise endpoints belonging to a project the caller does not own.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    const response = await oauthDiscoveryResponse('https://otherproject.supabase.co', 'GET');
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('agent_auth');
  });

  it('marks the fallback as stale, and does not let it be cached as fresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    const response = await oauthDiscoveryResponse(OAUTH_METADATA_SNAPSHOT.issuerOrigin, 'GET');
    expect(response.headers.get('cache-control')).toContain('max-age=60');
    // Warn so an operator sees the relay degraded before a customer does.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await oauthDiscoveryResponse(OAUTH_METADATA_SNAPSHOT.issuerOrigin, 'GET');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('accepts a trailing slash in the configured project URL', async () => {
    // `https://project.supabase.co/` is a perfectly ordinary way to write this
    // value, and rejecting it turned a working configuration into a 503.
    for (const configured of [FAKE_SUPABASE_URL, `${FAKE_SUPABASE_URL}/`]) {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json(metadata)));
      const response = await oauthDiscoveryResponse(configured, 'GET');
      expect(response.status).toBe(200);
      expect((await response.json()).issuer).toBe(metadata.issuer);
    }
  });

  it('serves the same document at the OIDC path', async () => {
    // The scanner accepts either well-known path, and agents commonly try OIDC
    // first. One source of truth, two addresses.
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json(metadata)));
    const app = createTestApp();
    const oidc = await app.request('/.well-known/openid-configuration');
    const oauth = await app.request('/.well-known/oauth-authorization-server');

    expect(oidc.status).toBe(200);
    expect(oauth.status).toBe(200);
    expect(oidc.headers.get('content-type')).toContain('application/json');
    const [a, b] = [await oidc.json(), await oauth.json()];
    // Same issuer, same endpoints, same agent block: one source of truth.
    expect(a.issuer).toBe(b.issuer);
    expect(a.authorization_endpoint).toBe(b.authorization_endpoint);
    expect(a.token_endpoint).toBe(b.token_endpoint);
    expect(a.jwks_uri).toBe(b.jwks_uri);
    expect(a.agent_auth).toEqual(b.agent_auth);
  });
});
