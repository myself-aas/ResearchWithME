import { describe, expect, it } from 'vitest';
import { buildLegacyRedirects, RENAMED_POST_SLUGS, REMOVED_STATIC_ROUTES } from '@/lib/redirects';
import { getPostSlugs } from '@/lib/content/posts';

/**
 * Legacy URL redirects for the multi-author → single-author migration.
 *
 * Google's Search Console reported these as critical indexing issues: the
 * old site's sitemap URLs (`/post/:slug`, plus four static routes) now 404
 * or redirect into 404s because the rewrite renamed every post slug. The
 * redirect map must send every legacy URL to a live, canonical destination
 * in one permanent hop.
 */

async function redirectEntries() {
  const builder = buildLegacyRedirects();
  return await builder();
}

describe('legacy post slug redirects', () => {
  it('maps every old /post/<slug> to the new /blog/<slug>', async () => {
    const entries = await redirectEntries();
    for (const [oldSlug, newSlug] of RENAMED_POST_SLUGS) {
      const entry = entries.find((e) => e.source === `/post/${oldSlug}`);
      expect(entry, `missing redirect for /post/${oldSlug}`).toBeDefined();
      expect(entry?.destination).toBe(`/blog/${newSlug}`);
      expect(entry?.permanent).toBe(true);
    }
  });

  it('maps every /blog/<old-slug> (the redirect-chain 404) to the new slug', async () => {
    const entries = await redirectEntries();
    for (const [oldSlug, newSlug] of RENAMED_POST_SLUGS) {
      const entry = entries.find((e) => e.source === `/blog/${oldSlug}`);
      expect(entry, `missing redirect for /blog/${oldSlug}`).toBeDefined();
      expect(entry?.destination).toBe(`/blog/${newSlug}`);
      expect(entry?.permanent).toBe(true);
    }
  });

  it('every destination slug is a real published post', async () => {
    const entries = await redirectEntries();
    const liveSlugs = new Set(getPostSlugs());
    for (const [, newSlug] of RENAMED_POST_SLUGS) {
      expect(liveSlugs.has(newSlug), `${newSlug} is not a published post`).toBe(true);
    }
    // And every destination in the map points at one of them.
    for (const entry of entries) {
      const match = entry.destination.match(/^\/blog\/([^/]+)$/);
      if (match) {
        expect(liveSlugs.has(match[1]), `${entry.destination} does not resolve to a post`).toBe(true);
      }
    }
  });

  it('covers all twelve renamed posts', () => {
    expect(RENAMED_POST_SLUGS).toHaveLength(12);
  });
});

describe('removed static route redirects', () => {
  it('maps every removed static route to a live destination', async () => {
    const entries = await redirectEntries();
    for (const [source, destination] of REMOVED_STATIC_ROUTES) {
      const entry = entries.find((e) => e.source === source);
      expect(entry, `missing redirect for ${source}`).toBeDefined();
      expect(entry?.destination).toBe(destination);
      expect(entry?.permanent).toBe(true);
    }
  });

  it('covers all four removed routes', () => {
    expect(REMOVED_STATIC_ROUTES).toHaveLength(4);
  });
});

describe('redirect map integrity', () => {
  it('has no duplicate sources', async () => {
    const entries = await redirectEntries();
    const sources = entries.map((e) => e.source);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it('every entry is a single permanent hop', async () => {
    const entries = await redirectEntries();
    for (const entry of entries) {
      expect(entry.permanent).toBe(true);
      expect(entry.source).toMatch(/^\//);
      expect(entry.destination).toMatch(/^\//);
      // Destinations must be absolute paths, not further redirects.
      expect(entry.destination).not.toContain(':');
    }
  });

  it('no redirect chain: no destination is itself a redirect source', async () => {
    // A -> B -> C is a defect (§2.7). Every destination must be a final
    // URL, never another redirect's source. This is the rule that the
    // generic /post/:slug wildcard violated: /post/<old> -> /blog/<old>
    // where /blog/<old> was itself a (404) redirect source.
    const entries = await redirectEntries();
    const sources = new Set(entries.map((e) => e.source));
    for (const entry of entries) {
      expect(sources.has(entry.destination), `redirect chain: ${entry.destination} is also a source`).toBe(false);
    }
  });

  it('every static-route destination is a real, crawlable route', async () => {
    // The destinations of the removed-static-route redirects must resolve
    // to live pages, never to a 404. A redirect to a missing page is the
    // same GSC rejection as a 404, just one hop later.
    const liveStaticRoutes = new Set(['/', '/blog', '/tags', '/about', '/contact', '/privacy', '/assistant', '/lab']);
    for (const [, destination] of REMOVED_STATIC_ROUTES) {
      expect(liveStaticRoutes.has(destination), `${destination} is not a live route`).toBe(true);
    }
  });
});
