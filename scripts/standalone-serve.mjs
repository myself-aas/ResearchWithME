#!/usr/bin/env node
/**
 * Serve the production build the way it is actually deployed locally.
 *
 * Next's `output: 'standalone'` copies the server and its traced node_modules,
 * but not `public/` or `.next/static/` — those are expected to be served by the
 * CDN in front of the app. Without them every stylesheet, chunk, image, and
 * font 404s while the HTML still returns 200, which looks like a broken site
 * rather than a missing copy step.
 *
 * This copies both into the standalone tree, then starts the server with the
 * current environment (so `PORT` and `HOSTNAME` behave as they do in a
 * container). Use it as `npm run serve` after `npm run build`.
 */
import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const serverEntry = '.next/standalone/server.js';

if (!existsSync(serverEntry)) {
  console.error('No standalone build found. Run `npm run build` first.');
  process.exit(1);
}

for (const [from, to] of [
  ['.next/static', '.next/standalone/.next/static'],
  ['public', '.next/standalone/public'],
]) {
  if (!existsSync(from)) {
    console.warn(`skip ${from}: not found`);
    continue;
  }
  cpSync(from, to, { recursive: true, force: true });
  console.log(`copied ${from} -> ${to}`);
}

const child = spawn(process.execPath, [serverEntry], { stdio: 'inherit', env: process.env });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
