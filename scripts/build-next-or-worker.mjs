#!/usr/bin/env node
/**
 * Runs `next build` in local development, GitHub Actions (`Quality`), and inner
 * OpenNext builds, while delegating top-level Cloudflare Workers Builds
 * (`WORKERS_CI=1`) `npm run build` invocations to `opennextjs-cloudflare build`
 * so `.open-next/worker.js` and `.open-next/assets` exist before `wrangler preview`
 * or `wrangler versions upload` runs on non-production branches.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const binSuffix = process.platform === 'win32' ? '.cmd' : '';
const isWorkersCI =
  process.env.WORKERS_CI === '1' || process.env.WORKERS_CI === 'true';
const isInnerBuild =
  process.env.NEXT_PRIVATE_STANDALONE === 'true' ||
  process.env.RWM_SKIP_WORKER_WRAPPER === '1';

const args = process.argv.slice(2);

if (isWorkersCI && !isInnerBuild) {
  console.log(
    '[build] WORKERS_CI detected — running opennextjs-cloudflare build so .open-next/ is ready for preview/deploy.',
  );
  const openNextBin = join(
    root,
    'node_modules',
    '.bin',
    `opennextjs-cloudflare${binSuffix}`,
  );
  execFileSync(openNextBin, ['build'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      RWM_SKIP_WORKER_WRAPPER: '1',
    },
  });
} else {
  const nextBin = join(root, 'node_modules', '.bin', `next${binSuffix}`);
  execFileSync(nextBin, ['build', ...args], {
    cwd: root,
    stdio: 'inherit',
  });
}
