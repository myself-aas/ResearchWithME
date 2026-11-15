import { defineConfig } from '@playwright/test';

// Generated CSS contracts require no app server, credentials or production requests.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'token-theme.spec.ts',
  use: {
    browserName: 'chromium',
    ...(process.env.RWM_CHROMIUM_PATH ? {
      launchOptions: {
        executablePath: process.env.RWM_CHROMIUM_PATH,
        args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage', '--disable-gpu'],
      },
    } : {}),
  },
});
