import { defineConfig } from 'vitest/config';
import path from 'node:path';

const compat = (name: string) => path.resolve(__dirname, `test/stubs/next/${name}.tsx`);

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './test/stubs/server-only.ts'),
      'next/link': compat('link'),
      'next/image': compat('image'),
      'next/navigation': compat('navigation'),
      'next/dynamic': compat('dynamic'),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx', 'test/**/*.test.ts', 'test/**/*.test.tsx'],
    reporters: 'default',
    // Several suites cold-import route handlers and the Next config. Each passes
    // in under 2 s on its own, but with ~180 files running in parallel (notably
    // on Windows) different tests crossed the 5 s / 10 s defaults on each run.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
