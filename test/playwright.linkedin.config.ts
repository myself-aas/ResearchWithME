/**
 * LinkedIn integration smoke tests against an isolated Next.js server.
 * The fake local Supabase URL and empty LinkedIn credentials prevent these
 * tests from contacting the production database or posting to LinkedIn.
 */
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const origin = 'http://127.0.0.1:3217';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'linkedin-automation.spec.ts',
  timeout: 30_000,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: origin,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run build && npx next start -H 127.0.0.1 -p 3217',
    cwd: path.resolve(__dirname, '..'),
    url: `${origin}/login`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-test-publishable-key',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      NEXT_PUBLIC_SITE_URL: origin,
      LINKEDIN_CLIENT_ID: '',
      LINKEDIN_CLIENT_SECRET: '',
      LINKEDIN_REDIRECT_URI: '',
      LINKEDIN_COMPANY_URN: '',
      CRON_SECRET: 'local-test-cron-secret',
      WORKERS_CI: '0',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
