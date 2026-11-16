import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './browser',
  use: {
    baseURL: process.env.RWM_NEXT_TEST_URL || 'http://127.0.0.1:3000',
    ...(process.env.RWM_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.RWM_CHROMIUM_PATH, args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage'] } } : {}),
  },
});
