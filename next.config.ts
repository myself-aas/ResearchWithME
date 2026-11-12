import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import { API_CATALOG_LINK } from './lib/api-catalog';

/**
 * Supabase Storage serves article images from the project's public bucket.
 * The hostname is derived from the public URL so the optimizer only ever trusts
 * the project actually configured for this deployment.
 */
function supabaseImagePattern() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  if (!url) return null;
  try {
    return {
      protocol: new URL(url).protocol.replace(':', '') as 'https' | 'http',
      hostname: new URL(url).hostname,
      pathname: '/storage/v1/object/public/**',
    };
  } catch {
    return null;
  }
}

const supabaseImages = supabaseImagePattern();

// `next dev` evaluates its module bundles with eval() (webpack eval source
// maps + React Refresh). Without 'unsafe-eval' no route hydrates in dev.
// Production (`next build`, OpenNext worker) never sets NODE_ENV=development,
// so the shipped policy stays eval-free.
const isDev = process.env.NODE_ENV === 'development';

const cspDirectives = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
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
  // Deployed on Cloudflare (HTTPS enforced at the edge); HSTS is safe to send.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: cspDirectives },
  { key: 'Content-Security-Policy-Report-Only', value: cspDirectives },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Render blocking <head> metadata for all HTTP clients instead of streaming <meta> tags into <body>.
  htmlLimitedBots: /.*/,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    localPatterns: [
      {
        pathname: '/images/**',
      },
    ],
    remotePatterns: supabaseImages ? [supabaseImages] : [],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion', '@radix-ui/react-popover', '@radix-ui/react-dialog'],
  },
  output: 'standalone', // switched back to avoid export build issues
  async headers() {
    return [
      {
        source: '/',
        headers: [{ key: 'Link', value: API_CATALOG_LINK }],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config, { dev }) => {
    // AI Studio uses DISABLE_HMR to prevent flickering during automated edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;

// Exposes Cloudflare bindings to `next dev` via getCloudflareContext().
if (process.env.NODE_ENV === 'development') {
  try {
    initOpenNextCloudflareForDev();
  } catch {
    // Ignore when running outside of wrangler dev environment
  }
}
