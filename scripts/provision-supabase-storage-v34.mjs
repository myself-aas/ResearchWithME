#!/usr/bin/env node
/**
 * ResearchWithME v3.4 — Supabase Storage provisioning (no credit card).
 *
 * Creates (or reconciles) the private `researchwithme-artifacts` bucket used by
 * `lib/v34/supabase-storage.ts` for checksummed scholarly exports and render
 * manifests. Supabase Storage has a Free plan that never asks for a payment
 * method, which is why it replaces Cloudflare R2 as the default backend.
 *
 * Usage:
 *   node scripts/provision-supabase-storage-v34.mjs            # dry run (default)
 *   node scripts/provision-supabase-storage-v34.mjs --apply     # create/update
 *   node scripts/provision-supabase-storage-v34.mjs --apply --max-bytes 10485760
 *   node scripts/provision-supabase-storage-v34.mjs --check     # read-only status
 *
 * Requires `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) and
 * `SUPABASE_SERVICE_ROLE_KEY`. Secrets are never printed.
 *
 * You can also apply `supabase/migrations/20261117001400_v34_supabase_artifact_storage.sql`
 * with `supabase db push --linked`, which provisions the bucket and widens the
 * `storage_provider` CHECK constraints in one step.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SUPABASE_ARTIFACT_BUCKET = 'researchwithme-artifacts';
export const SUPABASE_ARTIFACT_MAX_BYTES = 52_428_800; // 50 MB

export const ARTIFACT_MIME_TYPES = Object.freeze([
  'application/x-bibtex',
  'application/json',
  'application/ld+json',
  'application/pdf',
  'application/zip',
  'application/octet-stream',
  'text/csv',
  'text/markdown',
  'text/plain',
  'image/png',
  'image/jpeg',
  'video/mp4',
  'video/webm',
]);

function readLocalEnvFile(cwd = process.cwd()) {
  const values = {};
  for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    const filePath = join(cwd, name);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

export function resolveSupabaseStorageEnv(env = {}) {
  const url = (
    env.SUPABASE_STORAGE_URL ||
    env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();
  const serviceKey = (
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_STORAGE_KEY ||
    ''
  ).trim();
  const bucket = (env.SUPABASE_STORAGE_BUCKET || '').trim() || SUPABASE_ARTIFACT_BUCKET;
  return { url: url.replace(/\/$/, ''), serviceKey, bucket };
}

/**
 * Builds a fully redacted, inspectable provisioning plan. Never includes the
 * service key so the plan can be printed in CI logs.
 */
export function buildSupabaseStoragePlan(input = {}) {
  const env = input.env ?? {};
  const projectUrl = (input.projectUrl ?? env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  const serviceKey =
    input.serviceKey ?? env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY ?? '';
  const bucket = input.bucket ?? env.SUPABASE_STORAGE_BUCKET ?? SUPABASE_ARTIFACT_BUCKET;
  const maxBytes =
    input.maxBytes ?? Number(env.SUPABASE_STORAGE_MAX_BYTES ?? SUPABASE_ARTIFACT_MAX_BYTES);

  const missing = [];
  if (!projectUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  return {
    projectUrl: projectUrl || null,
    bucket,
    public: false,
    fileSizeLimit: Number.isFinite(maxBytes) ? maxBytes : SUPABASE_ARTIFACT_MAX_BYTES,
    allowedMimeTypes: [...ARTIFACT_MIME_TYPES],
    requiredSecrets: missing,
    ready: missing.length === 0,
    steps: [
      'ensure-bucket:researchwithme-artifacts',
      'apply-migration:20261117001400_v34_supabase_artifact_storage',
      'set-worker-secret:SUPABASE_SERVICE_ROLE_KEY',
    ],
  };
}

async function storageRequest(url, serviceKey, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { ok: response.ok, status: response.status, body };
}

async function bucketExists(baseUrl, serviceKey, bucket) {
  const result = await storageRequest(
    `${baseUrl}/storage/v1/bucket/${encodeURIComponent(bucket)}`,
    serviceKey,
  );
  if (result.status === 404) return { exists: false, status: result.status };
  return { exists: result.ok, status: result.status, body: result.body };
}

async function createOrUpdateBucket(baseUrl, serviceKey, plan) {
  const payload = {
    id: plan.bucket,
    name: plan.bucket,
    public: plan.public,
    file_size_limit: plan.fileSizeLimit,
    allowed_mime_types: plan.allowedMimeTypes,
  };

  const existing = await bucketExists(baseUrl, serviceKey, plan.bucket);
  if (existing.exists) {
    const updated = await storageRequest(
      `${baseUrl}/storage/v1/bucket/${encodeURIComponent(plan.bucket)}`,
      serviceKey,
      { method: 'PUT', body: JSON.stringify(payload) },
    );
    return updated.ok
      ? { action: 'updated', status: updated.status }
      : { action: 'failed', status: updated.status, body: updated.body };
  }

  const created = await storageRequest(`${baseUrl}/storage/v1/bucket`, serviceKey, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (created.ok) return { action: 'created', status: created.status };
  // 409 means another run created it between our GET and POST.
  if (created.status === 409) return { action: 'exists', status: created.status };
  return { action: 'failed', status: created.status, body: created.body };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply');
  const checkOnly = args.has('--check');
  const json = args.has('--json');
  const fromFiles = readLocalEnvFile();
  const mergedEnv = { ...fromFiles, ...process.env };
  const { url, serviceKey, bucket } = resolveSupabaseStorageEnv(mergedEnv);

  const plan = buildSupabaseStoragePlan({
    projectUrl: url,
    serviceKey,
    bucket,
    maxBytes: mergedEnv.SUPABASE_STORAGE_MAX_BYTES
      ? Number(mergedEnv.SUPABASE_STORAGE_MAX_BYTES)
      : undefined,
  });

  const log = (...parts) => {
    if (!json) console.log(...parts);
  };

  log('ResearchWithME v3.4 — Supabase Storage provisioning');
  log(JSON.stringify({ ...plan, serviceKey: undefined }, null, 2));

  if (!plan.ready) {
    const message = `Missing ${plan.requiredSecrets.join(', ')}. Add them to .env.local (or export them) and retry.`;
    if (json) console.log(JSON.stringify({ ok: false, error: message, plan }, null, 2));
    else console.error(message);
    process.exit(2);
  }

  if (checkOnly) {
    const existing = await bucketExists(plan.projectUrl, serviceKey, plan.bucket);
    const result = {
      ok: existing.exists,
      bucket: plan.bucket,
      exists: existing.exists,
      status: existing.status,
      public: existing.body?.public ?? null,
      fileSizeLimit: existing.body?.file_size_limit ?? null,
    };
    if (json) console.log(JSON.stringify(result, null, 2));
    else log(`Bucket "${plan.bucket}" ${existing.exists ? 'exists' : 'is missing'}.`);
    process.exit(existing.exists ? 0 : 1);
  }

  if (!apply) {
    log('Dry run only. Re-run with --apply to create/update the bucket.');
    if (json) console.log(JSON.stringify({ ok: true, applied: false, plan }, null, 2));
    process.exit(0);
  }

  const result = await createOrUpdateBucket(plan.projectUrl, serviceKey, plan);
  const ok = result.action !== 'failed';
  if (json) {
    console.log(JSON.stringify({ ok, action: result.action, bucket: plan.bucket, status: result.status }, null, 2));
  } else {
    log(`Bucket "${plan.bucket}": ${result.action} (HTTP ${result.status}).`);
    log('Next: apply the migration and set SUPABASE_SERVICE_ROLE_KEY on the Worker.');
  }
  if (!ok) {
    if (!json) console.error(JSON.stringify(result.body));
    process.exit(1);
  }
}

const isDirectRun =
  process.argv[1] && process.argv[1].endsWith('provision-supabase-storage-v34.mjs');
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
