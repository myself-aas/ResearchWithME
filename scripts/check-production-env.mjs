#!/usr/bin/env node
/**
 * Guards `npm run deploy` and `npm run upload`.
 *
 * The blog has no secrets and no database, so the only deployment mistake that
 * matters is shipping the wrong canonical origin: NEXT_PUBLIC_SITE_URL is
 * compiled into metadata, canonical links, JSON-LD, the sitemap, and the RSS
 * feed. A production deploy with a localhost origin would publish broken links
 * that a rebuild fixes only after someone notices.
 *
 * Set ALLOW_LOCALHOST_DEPLOY=1 to deploy a localhost build on purpose.
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
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
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

const site = read('NEXT_PUBLIC_SITE_URL');
const problems = [];

if (!site) {
  problems.push('NEXT_PUBLIC_SITE_URL is not set, so canonical links would fall back to the production default.');
} else {
  try {
    const url = new URL(site);
    if (url.protocol !== 'https:') problems.push(`NEXT_PUBLIC_SITE_URL uses ${url.protocol}; production must be https.`);
    if (/localhost|127\.0\.0\.1/.test(url.hostname) && process.env.ALLOW_LOCALHOST_DEPLOY !== '1') {
      problems.push(
        `NEXT_PUBLIC_SITE_URL points at ${site}, so canonical links would ship that origin. Set ALLOW_LOCALHOST_DEPLOY=1 to deploy anyway.`,
      );
    }
  } catch {
    problems.push(`NEXT_PUBLIC_SITE_URL is not a valid URL: ${site}`);
  }
}

if (problems.length > 0) {
  console.error('\nDeploy guard failed:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('');
  process.exit(1);
}

console.log(`Deploy guard passed. Canonical origin: ${site || 'https://researchwith.me (default)'}`);
