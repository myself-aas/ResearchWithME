import { createSecurityHeaders } from './lib/security/headers';
import { homepageLinkHeader } from './lib/api-catalog';
import { withAui } from '@assistant-ui/next';
import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const securityHeaders = createSecurityHeaders(process.env.NODE_ENV === 'development');

/**
 * Caching policy.
 *
 * HTML: revalidate in the browser on every visit, cache at the edge for a year
 * (the Worker is rebuilt on every push, and a stale-while-revalidate window
 * keeps the first reader after a deploy from waiting on the origin).
 * Feeds and machine artifacts: an hour, with a day of tolerance.
 * Hashed build assets: immutable, which they are by construction.
 */
const HTML_CACHE = 'public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400';
const FEED_CACHE = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';
const ASSET_CACHE = 'public, max-age=31536000, immutable';

const htmlRoutes = ['/', '/blog', '/blog/:slug', '/about', '/contact', '/privacy', '/tags', '/tags/:tag'];
const feedRoutes = [
  '/rss.xml',
  '/feed.json',
  '/llms.txt',
  '/sitemap.xml',
  '/robots.txt',
  '/.well-known/security.txt',
  '/.well-known/api-catalog',
  '/.well-known/api-catalog/openapi/:path*',
  '/auth.md',
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `next dev` blocks cross-origin requests for its own assets and HMR socket.
  // The sandboxed preview is proxied from a different origin, so allow that
  // origin family in development only; production configuration is unchanged.
  ...(process.env.NODE_ENV === 'development' ? { allowedDevOrigins: ['*.e2b.app'] } : {}),
  poweredByHeader: false,
  compress: true,
  // Render blocking <head> metadata for all HTTP clients instead of streaming
  // <meta> tags into <body>.
  htmlLimitedBots: /.*/,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    localPatterns: [{ pathname: '/images/**' }],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion'],
  },
  output: 'standalone',
  /**
   * MDX posts are read from disk at build time. Next's file tracer has to carry
   * `content/` into the standalone/OpenNext bundle, otherwise a Worker build
   * would render empty pages.
   */
  outputFileTracingIncludes: {
    '/**': ['./content/**/*'],
  },
  async redirects() {
    // One hop, permanent. `/blog` is the canonical article tree; the 1.0
    // refactor briefly used `/posts`, and the multi-author platform used
    // `/post`, so both collapse here. A slug change must add its own entry in
    // the same commit that renames the file.
    return [
      { source: '/posts', destination: '/blog', permanent: true },
      { source: '/posts/:slug', destination: '/blog/:slug', permanent: true },
      { source: '/post/:slug', destination: '/blog/:slug', permanent: true },
      { source: '/feed', destination: '/blog', permanent: true },
      { source: '/category/:slug', destination: '/tags', permanent: true },
      { source: '/authors', destination: '/about', permanent: true },
      { source: '/author/:id', destination: '/about', permanent: true },
    ];
  },
  async rewrites() {
    return [{ source: '/feed.xml', destination: '/rss.xml' }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/_next/static/:path*', headers: [{ key: 'Cache-Control', value: ASSET_CACHE }] },
      ...htmlRoutes.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: HTML_CACHE }],
      })),
      ...feedRoutes.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: FEED_CACHE }],
      })),
      // RFC 8288 / RFC 9727 §3: advertise the machine-readable resources an
      // agent can discover, right on the homepage response.
      {
        source: '/',
        headers: [{ key: 'Link', value: homepageLinkHeader() }],
      },
    ];
  },
};

export default withAui(nextConfig, { backendless: true, rules: ['*.generative.ts', '*.generative.tsx'] });

// Exposes Cloudflare bindings to `next dev` via getCloudflareContext().
if (process.env.NODE_ENV === 'development') {
  try {
    initOpenNextCloudflareForDev();
  } catch {
    // Ignore when running outside of wrangler dev environment.
  }
}
