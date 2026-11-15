import { describe, expect, it } from 'vitest';
import nextConfig from '@/next.config';

/**
 * Supabase Auth's OAuth server (public beta) lets this project act as an
 * authorization server, but its browser flow does not load into our documents:
 * the consent screen is a Supabase-hosted page and the login page already
 * redirects *to* it rather than framing it. So there is no `frame-src` claim to
 * make, and `connect-src` is already `'self' https:` — wide, but unchanged by
 * this work.
 *
 * What *would* have broken is `script-src`: the newer `@supabase/auth-js` loads
 * its ES-module dependencies from jsDelivr (`cdn.jsdelivr.net/npm/@supabase/
 * auth-js@<version>/…`) when the OAuth server is enabled, which is a
 * cross-origin script load. These assertions pin that allowance to the exact
 * package path, so the policy says "Supabase's own SDK from jsDelivr", never
 * "jsDelivr".
 */

async function policy(): Promise<string> {
  const rules = await nextConfig.headers!();
  // One CSP rule covers every path, /auth.md included: there is no second
  // source-specific policy to keep in sync.
  const rule = rules.find((entry) => entry.source === '/:path*');
  const header = rule?.headers.find((item) => item.key === 'Content-Security-Policy');
  if (!header) throw new Error('No Content-Security-Policy for /:path*');
  return header.value;
}

function directives(value: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of value.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length) map.set(tokens[0], tokens.slice(1));
  }
  return map;
}

describe('CSP for the Supabase auth SDK', () => {
  it('allows the auth SDK from jsDelivr, scoped to its package path', async () => {
    const script = directives(await policy()).get('script-src') ?? [];
    expect(script).toContain('https://cdn.jsdelivr.net/npm/@supabase/auth-js@*');
    // Not a blanket allowance: jsDelivr serves arbitrary packages.
    expect(script).not.toContain('https://cdn.jsdelivr.net');
  });

  it('lets the auth SDK reach the Supabase project', async () => {
    // `https:` already covers every Supabase host; this pins that the scheme
    // source is not narrowed to `'self'` by a future edit.
    expect(directives(await policy()).get('connect-src')).toContain('https:');
  });

  it('keeps the Lemon Squeezy overlay working and the default closed', async () => {
    const map = directives(await policy());
    expect(map.get('script-src')).toContain('https://app.lemonsqueezy.com');
    expect(map.get('frame-src')).toContain('https://*.lemonsqueezy.com');
    expect(map.get('default-src')).toEqual(["'self'"]);
    expect(map.get('frame-ancestors')).toEqual(["'none'"]);
    expect(map.get('form-action')).toEqual(["'self'"]);
    expect(map.get('base-uri')).toEqual(["'self'"]);
  });
});
