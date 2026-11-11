/**
 * Playwright configuration for the real-workerd browser tests.
 *
 * `npm run test:pages` (project `e2e`) is the local gate: it builds the Pages
 * bundle with the public Supabase variables blanked and drives `wrangler
 * pages dev` on port 8788. `npm run test:staging` (project `staging`) only
 * includes test/e2e/staging/** and refuses to run unless RWM_STAGING_BASE_URL
 * points at an isolated, separately authorized staging deployment.
 *
 * RWM_CHROMIUM_PATH (optional): launch this Chrome/Chromium binary instead of
 * Playwright's downloaded one, for locked-down environments where the browser
 * CDN is unreachable. LD_LIBRARY_PATH must satisfy that binary's dynamic
 * library requirements (on this host the spike was verified with an
 * @sparticuz/chromium binary plus a from-source NSPR/NSS at /tmp/nss-dist).
 */
import path from 'node:path';
import { defineConfig } from '@playwright/test';

const repoRoot = path.resolve(__dirname, '..');
const pagesDir = path.join(repoRoot, 'cloudflare-pages');

const stagingBaseURL = process.env.RWM_STAGING_BASE_URL;
const wantsStaging = process.argv.includes('--project=staging');
const chromiumPath = process.env.RWM_CHROMIUM_PATH;
const launchOverride = chromiumPath
  ? {
      launchOptions: {
        executablePath: chromiumPath,
        args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage', '--disable-gpu'],
      },
    }
  : {};

if (wantsStaging) {
  if (!stagingBaseURL || !/^https:\/\//.test(stagingBaseURL)) {
    throw new Error(
      'RWM_STAGING_BASE_URL must be set to the isolated, separately authorized staging origin (https) before test:staging can run.',
    );
  }
}

export default defineConfig({
  testDir: path.join(__dirname, 'e2e'),
  timeout: 30_000,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8788',
    ...launchOverride,
  },
  projects: [
    {
      name: 'e2e',
      testIgnore: /staging\//,
      use: { baseURL: 'http://127.0.0.1:8788' },
    },
    {
      name: 'staging',
      testMatch: /staging\/.*\.spec\.ts$/,
      use: { baseURL: stagingBaseURL },
    },
  ],
  webServer: {
    command:
      `RWM_BUILD_TARGET=test NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm --prefix "${repoRoot}" run build:pages && cd "${pagesDir}" && npx wrangler pages dev dist --ip 0.0.0.0 --port 8788`,
    url: 'http://127.0.0.1:8788/',
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
