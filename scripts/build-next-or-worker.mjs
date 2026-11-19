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

// Run each CLI's JS entry with the current Node instead of the
// node_modules/.bin shim. On Windows the shim is a `.cmd` file, and since the
// CVE-2024-27980 fix Node refuses to spawn `.cmd` without a shell (EINVAL), so
// `npm run build` / `opennextjs-cloudflare build` failed on every Windows machine.
const cliEntry = (...segments) => join(root, 'node_modules', ...segments);
const runCli = (entry, cliArgs, options) =>
  execFileSync(process.execPath, [entry, ...cliArgs], options);
const isWorkersCI =
  process.env.WORKERS_CI === '1' || process.env.WORKERS_CI === 'true';
const isInnerBuild =
  process.env.NEXT_PRIVATE_STANDALONE === 'true' ||
  process.env.RWM_SKIP_WORKER_WRAPPER === '1';

const args = process.argv.slice(2);

// Workers Builds may run `npm run build` (outer wrapper) or
// `npx @opennextjs/cloudflare build`, which calls `npm run build` as an inner
// build. Guard on both entry points, before any build starts. The outer wrapper
// sets RWM_ENV_GUARD_DONE for its OpenNext child so the guard runs once per build.
if (isWorkersCI && process.env.RWM_ENV_GUARD_DONE !== '1') {
  execFileSync(process.execPath, [join(root, 'scripts', 'check-production-env.mjs')], {
    cwd: root,
    stdio: 'inherit',
  });
}

if (isWorkersCI && !isInnerBuild) {
  console.log(
    '[build] WORKERS_CI detected — running opennextjs-cloudflare build so .open-next/ is ready for preview/deploy.',
  );
  runCli(cliEntry('@opennextjs', 'cloudflare', 'dist', 'cli', 'index.js'), ['build'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      RWM_SKIP_WORKER_WRAPPER: '1',
      RWM_ENV_GUARD_DONE: '1',
    },
  });
} else {
  runCli(cliEntry('next', 'dist', 'bin', 'next'), ['build', ...args], {
    cwd: root,
    stdio: 'inherit',
  });
}
