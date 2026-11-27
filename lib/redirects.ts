

/**
 * Legacy URL redirects for the 2026-11-24 migration from the multi-author
 * publishing platform to the single-author MDX blog.
 *
 * Google's Search Console reported these pages as critical indexing issues
 * after the rewrite: the old site's sitemap listed `/post/:slug`,
 * `/category/:slug`, `/author/:id`, and the static routes below. The
 * rewrite renamed every post and removed four static pages, so:
 *
 * - `/post/<old-slug>` redirected generically to `/blog/<old-slug>`, which
 *   no longer exists (the slug was renamed) — a redirect chain ending in a
 *   404. Each old slug now maps explicitly to its new URL.
 * - `/blog/<old-slug>` — the URL Google landed on after following the
 *   generic redirect — 404s. These are mapped to the new slug as well.
 * - The four removed static pages had no redirect and 404'd outright.
 *   They redirect to their closest current equivalent.
 *
 * Every entry is a single permanent (308) hop to a live, canonical URL.
 */

/** The shape of a Next.js `redirects()` entry (structural, no import). */
export interface LegacyRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

/**
 * Post slug renames: `[oldSlug, newSlug]` pairs. Old slugs come from the
 * multi-author CMS (`/post/<slug>`); new slugs are the current
 * `content/posts/*.mdx` files. Topics were matched by title to build the
 * mapping; see the intake fixtures in the migration history.
 */
export const RENAMED_POST_SLUGS: ReadonlyArray<readonly [string, string]> = [
  ['apache-airflow-repo-teardown', 'apache-airflow-review-should-you-use-it'],
  ['apache-superset-repo-teardown', 'apache-superset-review-before-you-self-host'],
  ['gta6-kytyps5-repo-teardown', 'gta6-emulator-review-verify-the-claim'],
  ['n8n-repo-teardown', 'n8n-review-before-you-automate'],
  ['nats-server-repo-teardown', 'nats-jetstream-review-before-you-ship'],
  ['owasp-wstg-repo-teardown', 'owasp-wstg-review-how-to-test'],
  ['perspective-repo-teardown', 'perspective-api-review-before-you-moderate'],
  ['plane-repo-teardown', 'plane-review-before-you-migrate'],
  ['polars-repo-teardown', 'polars-review-before-you-switch'],
  ['posthog-repo-teardown', 'posthog-review-before-you-self-host'],
  ['rustdesk-repo-teardown', 'rustdesk-review-before-you-deploy'],
  ['svelte-repo-teardown', 'svelte-review-before-you-migrate'],
];

/**
 * Static pages that existed on the multi-author platform and were removed
 * in the rewrite, mapped to their closest current equivalent.
 */
export const REMOVED_STATIC_ROUTES: ReadonlyArray<readonly [string, string]> = [
  ['/editorial-board', '/about'],
  ['/bookmarks', '/blog'],
  ['/cite', '/about'],
  ['/pricing', '/about'],
];

/**
 * Builds the Next.js redirect entries for the legacy URLs. Explicit
 * per-slug entries are emitted before the generic `/post/:slug` wildcard
 * so the renamed slugs resolve to their new URLs instead of falling through
 * to the wildcard (which would land on a 404).
 */
export function buildLegacyRedirects(): () => Promise<LegacyRedirect[]> {
  const entries: LegacyRedirect[] = [];

  for (const [oldSlug, newSlug] of RENAMED_POST_SLUGS) {
    // The old post URL.
    entries.push({
      source: `/post/${oldSlug}`,
      destination: `/blog/${newSlug}`,
      permanent: true,
    });
    // The URL Google landed on after the generic /post/:slug wildcard.
    entries.push({
      source: `/blog/${oldSlug}`,
      destination: `/blog/${newSlug}`,
      permanent: true,
    });
  }

  for (const [source, destination] of REMOVED_STATIC_ROUTES) {
    entries.push({ source, destination, permanent: true });
  }

  return async () => entries;
}
