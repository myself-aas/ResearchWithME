import { describe, expect, it } from 'vitest';
import nextConfig from '@/next.config';

/**
 * The CSP change is the security-relevant half of the Lemon.js work, so it is
 * pinned rather than reviewed by eye. Three things must all hold:
 *
 *   - Lemon.js may load (script-src)
 *   - its overlay iframe may render (frame-src; without it the overlay falls
 *     back to `default-src 'self'` and is silently blocked)
 *   - nothing else about the policy got wider, in particular `default-src`
 */

function cspDirectives() {
  const header = async () => {
    const rules = await nextConfig.headers!();
    const rule = rules.find((entry) => entry.source === '/:path*')!;
    const policy = rule.headers.find((item) => item.key === 'Content-Security-Policy')!;
    return policy.value;
  };
  return header();
}

function directive(policy: string, name: string): string[] {
  const found = policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));
  return found ? found.split(/\s+/).slice(1) : [];
}

describe('billing CSP', () => {
  it('lets Lemon.js load and its overlay frame render', async () => {
    const policy = await cspDirectives();
    expect(directive(policy, 'script-src')).toContain('https://app.lemonsqueezy.com');
    expect(directive(policy, 'frame-src')).toContain('https://*.lemonsqueezy.com');
  });

  it('does not widen the default source', async () => {
    const policy = await cspDirectives();
    expect(directive(policy, 'default-src')).toEqual(["'self'"]);
  });

  it('keeps the directives that were already tight', async () => {
    const policy = await cspDirectives();
    expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(policy, 'form-action')).toEqual(["'self'"]);
    expect(directive(policy, 'base-uri')).toEqual(["'self'"]);
  });
});
