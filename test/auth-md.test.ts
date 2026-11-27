import { describe, expect, it } from 'vitest';
import { GET } from '@/app/auth.md/route';
import { SITE } from '@/lib/site';

/**
 * Auth.md agent registration discovery.
 *
 * The route is a pure string builder, so these tests invoke the handler
 * directly and assert on the served document: the scanner checks for a
 * Markdown response at the service root with an H1 containing "auth.md",
 * plus the self-contained content the skill requires when no OAuth
 * metadata exists.
 */
async function serveAuthMd() {
  const response = GET();
  const body = await response.text();
  return { response, body };
}

describe('auth.md agent registration discovery', () => {
  it('serves Markdown with an H1 heading containing auth.md', async () => {
    const { response, body } = await serveAuthMd();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/markdown');
    expect(body.startsWith('# auth.md')).toBe(true);
    expect(body).toMatch(/^# .*auth\.md/m);
  });

  it('is cached like the other machine-readable artifacts', async () => {
    const { response } = await serveAuthMd();
    expect(response.headers.get('cache-control')).toContain('max-age=3600');
  });

  it('identifies the agent audience', async () => {
    const { body } = await serveAuthMd();
    expect(body).toContain('## Agent audience');
    expect(body).toContain('automated agents');
  });

  it('documents that no registration or provisioning is required', async () => {
    const { body } = await serveAuthMd();
    expect(body).toContain('## Registration and provisioning');
    expect(body).toContain('No registration or provisioning is required');
    expect(body).toContain('no registration endpoints');
  });

  it('lists the supported access method', async () => {
    const { body } = await serveAuthMd();
    expect(body).toContain('## Supported methods');
    expect(body).toContain('Anonymous HTTP GET');
  });

  it('explains credential use: none are used, issued, or accepted', async () => {
    const { body } = await serveAuthMd();
    expect(body).toContain('## Credential use');
    expect(body).toContain('No credentials are used, issued, or accepted');
  });

  it('stays self-contained: states that no OAuth metadata exists', async () => {
    const { body } = await serveAuthMd();
    expect(body).toContain('/.well-known/oauth-protected-resource');
    expect(body).toContain('/.well-known/oauth-authorization-server');
    expect(body).toContain('complete and authoritative auth contract');
  });

  it('links the machine-readable discovery surface with absolute URLs', async () => {
    const { body } = await serveAuthMd();
    expect(body).toContain(`](${new URL('/.well-known/api-catalog', SITE.url).toString()})`);
    expect(body).toContain(`](${new URL('/llms.txt', SITE.url).toString()})`);
    expect(body).toContain(`](${new URL('/sitemap.xml', SITE.url).toString()})`);
    expect(body).toContain(`](${new URL('/.well-known/security.txt', SITE.url).toString()})`);
  });

  it('mentions the markdown content-negotiation method', async () => {
    const { body } = await serveAuthMd();
    expect(body).toContain('Accept: text/markdown');
  });
});
