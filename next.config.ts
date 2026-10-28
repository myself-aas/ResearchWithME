import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

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

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
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
    optimizePackageImports: ['lucide-react'],
  },
  output: 'standalone',
  async headers() {
    return [
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
initOpenNextCloudflareForDev();
