import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { API_GROUPS } from '@/lib/api-catalog';
import { OPENAPI_DOCUMENT } from '@/lib/openapi';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.name === '__tests__') return [];
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(path) ? [path] : [];
  });
}

describe('research publication without a storefront', () => {
  it('has no storefront, billing handlers, product bundles or sales components', () => {
    for (const path of ['app/pricing', 'app/api/billing', 'app/api/webhooks/lemonsqueezy', 'components/billing', 'lib/billing', 'products', 'public/downloads']) {
      expect(existsSync(path), path).toBe(false);
    }
  });

  it('has no live imports, navigation, structured offers or provider configuration', () => {
    for (const path of [...sourceFiles('app'), ...sourceFiles('components'), ...sourceFiles('lib'), 'next.config.ts', '.env.example', 'wrangler.jsonc', '.github/workflows/quality.yml']) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/@\/(?:lib|components)\/billing|\/pricing|lemonsqueezy|BILLING_BRIDGE_SECRET|OfferCatalog|products\/tests/i);
    }
  });

  it('omits removed API operations, schemas and security schemes from discovery', () => {
    expect(API_GROUPS.some((group) => ['billing', 'entitlement', 'webhooks'].includes(group.id))).toBe(false);
    expect(JSON.stringify(OPENAPI_DOCUMENT)).not.toMatch(/lemonsqueezy|billing|Entitlement|BillingWebhookSignature/i);
    const fixture = JSON.parse(readFileSync('test/fixtures/next-api-methods.json', 'utf8')) as Array<{ path: string }>;
    expect(fixture.some(({ path }) => /billing|lemonsqueezy/.test(path))).toBe(false);
  });

  it('keeps research tools and free API routes', () => {
    for (const path of ['app/assistant/page.tsx', 'app/cite/page.tsx', 'app/bookmarks/page.tsx', 'app/api/account/api-keys/route.ts', 'app/api/v1/assistant/answers/route.ts', 'app/api/v1/usage/route.ts']) {
      expect(existsSync(path), path).toBe(true);
    }
  });
});
