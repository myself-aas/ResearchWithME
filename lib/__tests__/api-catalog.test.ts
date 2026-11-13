import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GET, HEAD } from '@/app/.well-known/api-catalog/route';
import { GET as getOpenApi } from '@/app/openapi.json/route';
import ApiDocsPage from '@/app/api-docs/page';
import nextConfig from '@/next.config';
import { API_CATALOG_LINK, API_CATALOG_PATH, API_DOCS_PATH, API_GROUPS, OPENAPI_PATH } from '@/lib/api-catalog';
import { API_OPERATIONS, OPENAPI_DOCUMENT } from '@/lib/openapi';
import { SITE_URL } from '@/lib/seo';

vi.mock('@/components/BlogHeader', () => ({ default: () => null }));
vi.mock('@/components/BlogFooter', () => ({ default: () => null }));

function apiRoutes(directory: string): Array<{ path: string; method: string }> {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) return apiRoutes(file);
    if (entry.name !== 'route.ts') return [];

    const route = `/api/${relative(join(process.cwd(), 'app/api'), directory).split(sep).join('/')}`
      .replace(/\[([^\]]+)\]/g, '{$1}');
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(/export\s+(?:(?:async\s+)?function\s+|const\s+)(GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\b/g)]
      .map((match) => ({ path: route, method: match[1].toLowerCase() }));
  });
}

describe('RFC 9727 API catalog', () => {
  it('returns the linkset media type, catalog relation, and one entry for each API group', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"');
    expect(response.headers.get('link')).toBe(API_CATALOG_LINK);

    const { linkset } = await response.json();
    expect(linkset).toHaveLength(API_GROUPS.length);
    expect(new Set(linkset.map((entry: { anchor: string }) => entry.anchor)).size).toBe(API_GROUPS.length);
    expect(new Set(API_GROUPS.map((group) => group.id)).size).toBe(API_GROUPS.length);
    for (const [index, group] of API_GROUPS.entries()) {
      expect(linkset[index]).toEqual({
        anchor: new URL(group.path, SITE_URL).toString(),
        'service-desc': [{ href: new URL(OPENAPI_PATH, SITE_URL).toString(), type: 'application/json' }],
        'service-doc': [{ href: `${new URL(API_DOCS_PATH, SITE_URL)}#${group.id}`, type: 'text/html' }],
      });
      expect(API_OPERATIONS.some((operation) => operation.path === group.path && operation.group === group.id)).toBe(true);
    }
  });

  it('advertises the catalog from the homepage', async () => {
    const rules = await nextConfig.headers?.();
    const home = rules?.find((rule) => rule.source === '/');
    expect(home?.headers).toContainEqual({ key: 'Link', value: API_CATALOG_LINK });
  });

  it('answers HEAD with the same discovery headers and no body', async () => {
    const response = HEAD();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(GET().headers.get('content-type'));
    expect(response.headers.get('link')).toContain(`rel="api-catalog"`);
    expect(response.headers.get('link')).toContain(API_CATALOG_PATH);
    expect(await response.text()).toBe('');
  });
});

describe('OpenAPI and human-readable reference', () => {
  it('serves an OpenAPI document with an origin-relative server', async () => {
    const response = getOpenApi();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    const spec = await response.json();
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.servers).toEqual([{ url: '/' }]);
    expect(spec.paths).toEqual(OPENAPI_DOCUMENT.paths);
  });

  it('covers the methods in the actual API route files without duplicates or invented paths', () => {
    const actual = apiRoutes(join(process.cwd(), 'app/api')).map(({ path, method }) => `${method} ${path}`).sort();
    const documented = API_OPERATIONS.map(({ path, method }) => `${method} ${path}`).sort();
    expect(new Set(documented).size).toBe(documented.length);
    expect(documented).toEqual(actual);
    expect(new Set(API_OPERATIONS.map((operation) => operation.operationId)).size).toBe(API_OPERATIONS.length);
  });

  it('has valid group tags, path parameters, schemas, and security references', () => {
    const groupIds = new Set(API_GROUPS.map((group) => group.id));
    for (const operation of API_OPERATIONS) {
      expect(groupIds.has(operation.group)).toBe(true);
      const group = API_GROUPS.find((item) => item.id === operation.group)!;
      expect(operation.path === group.path || operation.path.startsWith(`${group.path}/`)).toBe(true);
      const placeholders = [...operation.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
      const declared = (operation.parameters ?? []).filter((parameter) => parameter.in === 'path' && parameter.required).map((parameter) => parameter.name);
      expect(declared.sort()).toEqual(placeholders.sort());
      expect(Object.keys(operation.responses).length).toBeGreaterThan(0);
      for (const requirement of operation.security ?? []) {
        for (const scheme of Object.keys(requirement)) {
          expect(OPENAPI_DOCUMENT.components.securitySchemes).toHaveProperty(scheme);
        }
      }
    }
    const references = JSON.stringify(OPENAPI_DOCUMENT).matchAll(/#\/components\/schemas\/([A-Za-z0-9]+)/g);
    for (const [, name] of references) expect(OPENAPI_DOCUMENT.components.schemas).toHaveProperty(name);
  });

  it('renders documentation targets and request fields for the catalog entries', () => {
    const html = renderToStaticMarkup(createElement(ApiDocsPage));
    for (const group of API_GROUPS) expect(html).toContain(`id="${group.id}"`);
    for (const operation of API_OPERATIONS) expect(html).toContain(operation.summary);
    expect(html).toContain('<code>approve</code> (boolean, required)');
  });

  it('identifies restricted operations without claiming anonymous access', () => {
    for (const operation of API_OPERATIONS.filter(({ group }) => ['cms-posts', 'cms-comments', 'applications'].includes(group))) {
      expect(operation.security).toEqual([{ SessionCookie: [] }]);
    }
    expect(API_OPERATIONS.find(({ group }) => group === 'revalidate')?.security).toEqual([{ RevalidateSecret: [] }]);
  });
});
