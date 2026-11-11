import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { define } from './vite.config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, '..');

// The client builds first (see npm run build:pages); its manifest is embedded
// into the server build by vite.config.server.ts.
const manifestPath = path.resolve(rootDir, 'dist/.vite/manifest.json');
const manifestJson = existsSync(manifestPath) ? readFileSync(manifestPath, 'utf8') : '{}';

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  resolve: {
    alias: {
      '@': repoRoot,
      // server-only is meaningful only under a React Server Components runtime;
      // the Pages SSR bundle aliases it to an inert stub. The client build has
      // no such alias and fails hard on transitive server-only imports.
      'server-only': path.resolve(rootDir, 'src/build-stubs/server-only.ts'),
      'next/link': path.resolve(rootDir, 'src/compat/link.tsx'),
      'next/image': path.resolve(rootDir, 'src/compat/image.tsx'),
      'next/navigation': path.resolve(rootDir, 'src/compat/navigation.tsx'),
      'next/dynamic': path.resolve(rootDir, 'src/compat/dynamic.tsx'),
    },
  },
  build: {
    outDir: path.resolve(rootDir, '.server'),
    emptyOutDir: true,
    ssr: path.resolve(rootDir, 'src/entry-server.tsx'),
    minify: false,
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: 'entry-server.mjs',
        inlineDynamicImports: true,
      },
    },
  },
  ssr: {
    // npm dependencies stay external (React, React Router, the OG plugin): the
    // Pages runtime bundles functions/ with its own toolchain at `pages dev` /
    // deploy time, which handles the OG plugin's .wasm imports natively. Only
    // first-party source is compiled into .server/entry-server.mjs.
  },
  define: {
    ...define,
    __RWM_CLIENT_MANIFEST__: manifestJson,
  },
});
