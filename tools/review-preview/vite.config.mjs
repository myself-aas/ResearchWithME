import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
const repo = fileURLToPath(new URL('../..', import.meta.url));
export default defineConfig({
  root: here,
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': repo, 'next/dynamic': `${here}dynamic.tsx` } },
  server: { host: '0.0.0.0', port: 4173, strictPort: true, allowedHosts: true, fs: { allow: [repo, '/tmp/reme-chart-deps'] } },
});
