import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindPostcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import { defineConfig, type Plugin } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, '..');

// Only the four explicitly allowlisted NEXT_PUBLIC_* expressions (including
// the legacy anon-key fallback), plus RWM_BUILD_TARGET for build guards. All
// are public values inlined as data — never the whole environment, and never
// a per-request secret. Anything else stays a runtime binding on the Function.
export const ALLOWED_DEFINE_KEYS = [
  'process.env.NEXT_PUBLIC_SUPABASE_URL',
  'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'process.env.NEXT_PUBLIC_SITE_URL',
  'process.env.RWM_BUILD_TARGET',
] as const;

export const define = {
  'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
  'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''),
  'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''),
  'process.env.NEXT_PUBLIC_SITE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://researchwith.me'),
  'process.env.RWM_BUILD_TARGET': JSON.stringify(process.env.RWM_BUILD_TARGET ?? 'local'),
};

/**
 * The client build must not contain a server-only module — not even tree-shaken
 * to nothing. Any transitive `server-only` import fails the build here rather
 * than leaking into the browser or throwing at runtime.
 */
export function failOnServerOnly(): Plugin {
  return {
    name: 'fail-on-server-only',
    resolveId(source) {
      if (source === 'server-only') {
        throw new Error(
          'A server-only module reached the Pages client build. Move the import behind the SSR boundary (cloudflare-pages/src/server) or import from a shared client-safe module.',
        );
      }
      return null;
    },
  };
}

export default defineConfig({
  root: rootDir,
  // The Pages project root is cloudflare-pages/, but the static assets live in
  // the repository-root public/ and are copied into dist/ on build.
  publicDir: path.resolve(repoRoot, 'public'),
  plugins: [react(), failOnServerOnly()],
  css: {
    // The Next app gets Tailwind v4 via postcss.config.mjs at the repo root;
    // give the Pages build the same pipeline explicitly so CSS output does
    // not depend on postcss-load-config's search path.
    postcss: {
      plugins: [tailwindPostcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      '@': repoRoot,
      // Vite-only compatibility surface for shared client components; the real
      // modules resolve in the Next build. Exact matches — subpath imports of
      // next/* are intentionally not shimmed.
      'next/link': path.resolve(rootDir, 'src/compat/link.tsx'),
      'next/image': path.resolve(rootDir, 'src/compat/image.tsx'),
      'next/navigation': path.resolve(rootDir, 'src/compat/navigation.tsx'),
      'next/dynamic': path.resolve(rootDir, 'src/compat/dynamic.tsx'),
    },
  },
  define,
  build: {
    outDir: path.resolve(rootDir, 'dist'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: path.resolve(rootDir, 'src/entry-client.tsx'),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
