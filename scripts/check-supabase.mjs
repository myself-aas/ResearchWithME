/**
 * Connection check for the configured Supabase project.
 *
 *   npm run supabase:check
 *
 * Reads the same environment files Next.js does, then probes the project the
 * way the app will: Auth health, the `posts` table with the publishable key,
 * the public image bucket, and the editor allowlist. Exits non-zero on the
 * first hard failure so it can run in CI or a deploy hook.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function loadEnvFile(name) {
  const path = join(root, name);
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/$/, '');
const key = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ''
).trim();

const results = [];
const pass = (name, detail = '') => results.push({ ok: true, name, detail });
const fail = (name, detail = '') => results.push({ ok: false, name, detail });

function looksLikePlaceholder(value) {
  return /placeholder|your-|example|<.*>|…|\.\.\./i.test(value);
}

if (!url) {
  fail('NEXT_PUBLIC_SUPABASE_URL', 'missing — the app stays in local demo mode');
} else if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(url)) {
  fail('NEXT_PUBLIC_SUPABASE_URL', `${url} does not look like a project URL`);
} else {
  pass('NEXT_PUBLIC_SUPABASE_URL', url);
}

if (!key) {
  fail('publishable key', 'missing — set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
} else if (looksLikePlaceholder(key)) {
  fail('publishable key', 'this is a placeholder, not a real key');
} else if (key.startsWith('sb_publishable_')) {
  pass('publishable key', 'sb_publishable_… (current format)');
} else if (key.split('.').length === 3) {
  pass('publishable key', 'legacy anon JWT');
} else {
  fail('publishable key', 'unrecognised format');
}

async function probe(name, path, { auth = true, expect = [200] } = {}) {
  const target = `${url}${path}`;
  const headers = { accept: 'application/json' };
  if (auth && key) {
    headers.apikey = key;
    headers.authorization = `Bearer ${key}`;
  }
  try {
    const response = await fetch(target, { headers, signal: AbortSignal.timeout(10000) });
    const ok = expect.includes(response.status);
    const detail = `${response.status} ${path}`;
    if (ok) pass(name, detail);
    else fail(name, `${detail} (expected ${expect.join('/')})`);
    return { response, ok };
  } catch (error) {
    fail(name, `${path} — ${error instanceof Error ? error.message : 'request failed'}`);
    return { response: null, ok: false };
  }
}

if (url && key && !results.some((result) => !result.ok)) {
  await probe('auth health', '/auth/v1/health', { auth: false });

  const posts = await probe('posts table', '/rest/v1/posts?select=id&limit=1');
  if (posts.ok && posts.response) {
    const rows = await posts.response.json().catch(() => null);
    if (Array.isArray(rows)) pass('published rows readable', `${rows.length} row(s) visible to anon`);
  }

  const bucket = await probe('blog-images bucket', '/storage/v1/object/public/blog-images/', {
    expect: [200, 400, 404],
  });
  if (bucket.response && bucket.response.status !== 200) {
    results.push({
      ok: false,
      name: 'blog-images bucket',
      detail: 'bucket missing or not public — apply the storage migration',
    });
  }

  await probe('editor allowlist', '/rest/v1/editors?select=user_id&limit=1', { expect: [200, 401, 403] });
}

for (const result of results) {
  console.log(`${result.ok ? 'ok  ' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
}

const hardFailures = results.filter((result) => !result.ok);
if (hardFailures.length > 0) {
  console.log(`\n${hardFailures.length} problem(s). The app falls back to local demo mode until both public values are valid.`);
  process.exitCode = 1;
} else {
  console.log('\nConnection looks good. Rebuild after changing NEXT_PUBLIC_* values: they are inlined at build time.');
}
