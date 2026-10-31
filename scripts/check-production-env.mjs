#!/usr/bin/env node
/**
 * Guards `npm run deploy` and `npm run upload`.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so a Worker built without
 * them runs in local demo mode: the studio is public, and its JSON adapter has
 * nowhere to write because the Worker filesystem is read-only. That is a fine
 * way to review the app on a laptop and a bad way to serve a domain.
 *
 * Set ALLOW_DEMO_DEPLOY=1 to deploy demo mode on purpose.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const files = ['.env.production.local', '.env.production', '.env.local', '.env'];

function readEnvFiles() {
  const values = {};
  // Lowest precedence first; later files win, matching Next.js.
  for (const file of files.slice().reverse()) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values[match[1]] = value;
    }
  }
  return values;
}

const fromFiles = readEnvFiles();
const read = (name) => (process.env[name] ?? fromFiles[name] ?? '').trim();

const url = read('NEXT_PUBLIC_SUPABASE_URL');
const key =
  read('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || read('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const site = read('NEXT_PUBLIC_SITE_URL');

const problems = [];
if (!url) problems.push('NEXT_PUBLIC_SUPABASE_URL is not set.');
if (!key) problems.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or _ANON_KEY) is not set.');
if (/localhost|127\.0\.0\.1/.test(site)) {
  problems.push(`NEXT_PUBLIC_SITE_URL points at ${site}, so canonical links would ship that origin.`);
}

if (problems.length === 0) {
  console.log(`Production build environment looks right (${url}, ${site || 'default site URL'}).`);
  process.exit(0);
}

const allow = process.env.ALLOW_DEMO_DEPLOY === '1';
console.error('\nThis build would ship without a working CMS:');
for (const problem of problems) console.error(`  - ${problem}`);
console.error(`
These values are compiled into the build, so they have to be set as Worker
build variables (Workers & Pages → researchwithme → Settings → Build →
Variables and secrets) or in the shell that runs the deploy, and the Worker has
to be rebuilt afterwards. Runtime variables cannot fix this.
`);

console.error(`
Demo mode is unauthenticated by design, and a Worker cannot write the JSON
files it falls back to. Set the values, or pass ALLOW_DEMO_DEPLOY=1 to deploy
demo mode deliberately.
`);

process.exit(allow ? 0 : 1);
