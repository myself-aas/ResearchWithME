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
const args = new Set(process.argv.slice(2));
const v34CutoverMode = args.has('--v34-cutover');
const jsonMode = args.has('--json');

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

if (v34CutoverMode) {
  const r2Keys = ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
  const vapidKeys = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'];
  const missingR2 = r2Keys.filter((k) => !read(k));
  const missingVapid = vapidKeys.filter((k) => !read(k));

  // Artifact storage resolution mirrors lib/v34/artifact-storage.ts:
  //   supabase → r2 → inline, unless ARTIFACT_STORAGE_PROVIDER forces one.
  const storagePreference = (read('ARTIFACT_STORAGE_PROVIDER') || 'auto').toLowerCase();
  const storageUrl =
    read('SUPABASE_STORAGE_URL') || read('SUPABASE_URL') || url;
  const storageServiceKey = read('SUPABASE_SERVICE_ROLE_KEY') || read('SUPABASE_SECRET_KEY');
  const supabaseStorageReady = Boolean(storageUrl && storageServiceKey);
  const supabaseStorageMissing = [
    ...(storageUrl ? [] : ['NEXT_PUBLIC_SUPABASE_URL']),
    ...(storageServiceKey ? [] : ['SUPABASE_SERVICE_ROLE_KEY']),
  ];
  let artifactStorage;
  let missingStorage;
  if (storagePreference === 'inline') {
    artifactStorage = 'DISABLED_INLINE';
    missingStorage = [];
  } else if (storagePreference === 'supabase') {
    artifactStorage = supabaseStorageReady ? 'LIVE_SUPABASE' : 'MISCONFIGURED';
    missingStorage = supabaseStorageReady ? [] : supabaseStorageMissing;
  } else if (storagePreference === 'r2') {
    artifactStorage = missingR2.length === 0 ? 'LIVE_R2' : 'MISCONFIGURED';
    missingStorage = missingR2;
  } else if (supabaseStorageReady) {
    artifactStorage = 'LIVE_SUPABASE';
    missingStorage = [];
  } else if (missingR2.length === 0) {
    artifactStorage = 'LIVE_R2';
    missingStorage = [];
  } else {
    // No object storage at all: recommend the no-credit-card Supabase path.
    artifactStorage = 'FALLBACK_INLINE';
    missingStorage = ['SUPABASE_SERVICE_ROLE_KEY'];
  }

  const report = {
    coreBuildReady: problems.length === 0,
    coreProblems: problems,
    subsystems: {
      outboxCron: read('CRON_SECRET') ? 'LIVE' : 'DISABLED_FAIL_CLOSED',
      artifactStorage,
      storagePreference,
      storageBucket:
        artifactStorage === 'LIVE_SUPABASE'
          ? read('SUPABASE_STORAGE_BUCKET') || 'researchwithme-artifacts'
          : artifactStorage === 'LIVE_R2'
            ? read('R2_BUCKET')
            : null,
      r2SignedStorage: missingR2.length === 0 ? 'LIVE' : 'FALLBACK_INLINE',
      webPushVapid: missingVapid.length === 0 ? 'LIVE' : 'FALLBACK_SKIPPED',
      resendDigests: read('RESEND_API_KEY') ? 'LIVE' : 'FALLBACK_SKIPPED',
      otelTraces: read('OTEL_EXPORTER_OTLP_ENDPOINT') ? 'LIVE' : 'FALLBACK_CONSOLE',
      sentryErrors: read('SENTRY_DSN') ? 'LIVE' : 'FALLBACK_CONSOLE',
    },
    missingSecrets: [
      ...(read('CRON_SECRET') ? [] : ['CRON_SECRET']),
      ...missingStorage,
      ...missingVapid,
      ...(read('RESEND_API_KEY') ? [] : ['RESEND_API_KEY']),
      ...(read('OTEL_EXPORTER_OTLP_ENDPOINT') ? [] : ['OTEL_EXPORTER_OTLP_ENDPOINT']),
      ...(read('SENTRY_DSN') ? [] : ['SENTRY_DSN']),
    ],
    rolloutFlags: {
      V34_FEED_ENABLED: read('V34_FEED_ENABLED') || 'default(true)',
      V34_EDITOR_ENABLED: read('V34_EDITOR_ENABLED') || 'default(true)',
      V34_REALTIME_ENABLED: read('V34_REALTIME_ENABLED') || 'default(true)',
    },
  };
  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('ResearchWithME v3.4 Production Cutover Readiness Audit');
    console.log(JSON.stringify(report, null, 2));
  }
  const strict = args.has('--strict');
  if (problems.length > 0 || (strict && report.missingSecrets.length > 0)) {
    process.exit(1);
  }
  process.exit(0);
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
