import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for ResearchWithME v3.4 end-to-end user journeys,
 * WCAG 2.1 AA axe-core audits, and 320–1920px responsive reflow verification.
 *
 * Run against a local production server (`npm run start`) or preview URL:
 *   RWM_NEXT_TEST_URL=http://127.0.0.1:3000 npm run test:e2e:v34
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['v34-research-network.spec.ts', 'v34-a11y-reflow.spec.ts'],
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  timeout: 45_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../playwright-report-v34' }]],
  use: {
    baseURL: process.env.RWM_NEXT_TEST_URL || 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.RWM_CHROMIUM_PATH
      ? {
          launchOptions: {
            executablePath: process.env.RWM_CHROMIUM_PATH,
            args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage'],
          },
        }
      : {}),
  },
});
