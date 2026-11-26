import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  testMatch: '**/reme-v4*.spec.ts',
  timeout: 90_000,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/design',
  use: {
    baseURL: process.env.DESIGN_BASE_URL ?? 'http://localhost:3000',
    browserName: 'chromium',
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
      args: ['--disable-dev-shm-usage'],
    },
    trace: 'retain-on-failure',
  },
  // Deliberately no hidden server: run a production build and start the preview
  // explicitly, so geometry is measured against the artifacts being reviewed.
});
