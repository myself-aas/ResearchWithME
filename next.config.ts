import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// `next dev` evaluates its module bundles with eval() (webpack eval source maps
// + React Refresh). Without 'unsafe-eval' no route hydrates in dev. Production
// (`next build`, the OpenNext worker) never sets NODE_ENV=development, so the
// shipped policy stays eval-free.
const isDev = process.env.NODE_ENV === 'development';

const cspDirectives = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "frame-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // Post covers and MDX figures may point at any https host; local images are
  // served from /images.
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: cspDirectives },
  // Usage preference, expressed at the origin so it is authoritative and
  // survives Cloudflare's Markdown conversion. Deliberately permissive and
  // consistent with robots.txt: crawl yes, answer yes, train yes. Changing
  // `ai-train` is a content-policy decision, not a build detail.
  { key: 'Content-Signal', value: 'search=yes, ai-input=yes, ai-train=yes' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;

// Exposes Cloudflare bindings to `next dev` via getCloudflareContext().
if (process.env.NODE_ENV === 'development') {
  try {
    initOpenNextCloudflareForDev();
  } catch {
    // Ignore when running outside of wrangler dev environment.
  }
}
