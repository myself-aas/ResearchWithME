import { describe, expect, it } from 'vitest';
import {
  API_CATALOG_PATH,
  OPENAPI_SPECS,
  buildApiCatalog,
  getOpenApiSpec,
} from '@/lib/api-catalog';

describe('RFC 9727 api-catalog', () => {
  it('serves the well-known path constant', () => {
    expect(API_CATALOG_PATH).toBe('/.well-known/api-catalog');
  });

  it('returns a linkset array with one entry per API', () => {
    const catalog = buildApiCatalog();
    expect(Array.isArray(catalog.linkset)).toBe(true);
    expect(catalog.linkset).toHaveLength(4);
  });

  it('gives every entry an anchor and the required link relations', () => {
    const catalog = buildApiCatalog();
    for (const entry of catalog.linkset) {
      expect(entry.anchor).toMatch(/^https?:\/\//);
      expect(Array.isArray(entry['service-desc'])).toBe(true);
      expect(entry['service-desc']).toHaveLength(1);
      expect(entry['service-desc'][0].href).toMatch(/^https?:\/\//);
      expect(entry['service-desc'][0].type).toBe('application/json');
      expect(Array.isArray(entry['service-doc'])).toBe(true);
      expect(entry['service-doc'][0].href).toMatch(/^https?:\/\//);
      expect(Array.isArray(entry.status)).toBe(true);
      expect(entry.status![0].href).toMatch(/^https?:\/\//);
    }
  });

  it('anchors each API at a real endpoint', () => {
    const anchors = buildApiCatalog().linkset.map((entry) => entry.anchor);
    expect(anchors).toContain('https://researchwith.me/feed.json');
    expect(anchors).toContain('https://researchwith.me/search-index.json');
    expect(anchors).toContain('https://researchwith.me/llms.txt');
    expect(anchors).toContain('https://researchwith.me/');
  });

  it('links every service-desc at a served OpenAPI spec', () => {
    const catalog = buildApiCatalog();
    for (const entry of catalog.linkset) {
      const href = entry['service-desc'][0].href;
      expect(href).toContain(`${API_CATALOG_PATH}/openapi/`);
      const name = href.split('/').pop()!;
      expect(OPENAPI_SPECS).toContain(name as (typeof OPENAPI_SPECS)[number]);
      expect(getOpenApiSpec(name)).not.toBeNull();
    }
  });

  it('links the status relation at the health endpoint', () => {
    const catalog = buildApiCatalog();
    for (const entry of catalog.linkset) {
      expect(entry.status![0].href).toBe('https://researchwith.me/api/health');
    }
  });
});

describe('OpenAPI specifications', () => {
  it('serves a valid OpenAPI 3.1 document for every catalogued spec', () => {
    for (const name of OPENAPI_SPECS) {
      const spec = getOpenApiSpec(name);
      expect(spec).not.toBeNull();
      expect(spec!.openapi).toBe('3.1.0');
      expect(spec!.info.title).toBeTruthy();
      expect(spec!.info.version).toBeTruthy();
      expect(Object.keys(spec!.paths).length).toBeGreaterThan(0);
      expect(spec!.servers[0].url).toBe('https://researchwith.me');
    }
  });

  it('documents the feeds API at both representations', () => {
    const paths = Object.keys(getOpenApiSpec('feeds.json')!.paths);
    expect(paths).toContain('/feed.json');
    expect(paths).toContain('/rss.xml');
  });

  it('documents the markdown API with negotiation and the per-essay route', () => {
    const paths = Object.keys(getOpenApiSpec('markdown.json')!.paths);
    expect(paths).toContain('/');
    expect(paths).toContain('/blog/{slug}/markdown');
  });

  it('returns null for unknown spec names', () => {
    expect(getOpenApiSpec('nope.json')).toBeNull();
  });
});
