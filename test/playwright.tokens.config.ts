import { defineConfig } from '@playwright/test';

// Generated CSS contracts require no app server, credentials or production requests.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'token-theme.spec.ts',
  use: { browserName: 'chromium' },
});
