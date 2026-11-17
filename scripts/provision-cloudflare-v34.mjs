#!/usr/bin/env node
/**
 * ResearchWithME v3.4 — Wave 19 Production Cloudflare Provisioning & Cutover Script.
 *
 * Idempotently provisions Cloudflare infrastructure and syncs runtime secrets for
 * the v3.4 async platform without ever echoing secret values to stdout/argv:
 *   1. R2 bucket: `researchwithme-artifacts` (OPTIONAL — R2 requires a payment
 *      method on the Cloudflare account. Use `--skip-r2` and store artifacts in
 *      Supabase Storage instead: `npm run storage:provision:supabase`.)
 *   2. Queues:    `researchwithme-outbox` and `researchwithme-outbox-dlq`
 *   3. Secrets:   `CRON_SECRET`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
 *                 `R2_SECRET_ACCESS_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
 *                 `VAPID_SUBJECT`, `RESEND_API_KEY`, `OTEL_EXPORTER_OTLP_ENDPOINT`,
 *                 `SENTRY_DSN` (piped over stdin to `wrangler secret put`)
 *   4. Workers:   deploys `workers/outbox` (`npm run worker:outbox:deploy`) when
 *                 `--deploy-workers` is passed.
 *
 * Usage:
 *   node scripts/provision-cloudflare-v34.mjs --dry-run
 *   node scripts/provision-cloudflare-v34.mjs --generate-vapid
 *   node scripts/provision-cloudflare-v34.mjs --apply --deploy-workers
 *   node scripts/provision-cloudflare-v34.mjs --apply --skip-r2   # no credit card
 *
 * Queues, Cron, VAPID keys and observability secrets work on Cloudflare's free
 * plan without billing info; only the R2 bucket needs a payment method.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CLOUDFLARE_V34_RESOURCES = Object.freeze({
  accountId: '74d241df16b8aaa80914e3dbb6e16758',
  r2Bucket: 'researchwithme-artifacts',
  queues: ['researchwithme-outbox', 'researchwithme-outbox-dlq'],
  appWorkerConfig: 'wrangler.jsonc',
  outboxWorkerConfig: 'workers/outbox/wrangler.jsonc',
  appSecrets: [
    'CRON_SECRET',
    'R2_ACCOUNT_ID',
    'R2_BUCKET',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_SUBJECT',
    'RESEND_API_KEY',
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    'SENTRY_DSN',
  ],
  optionalAppSecrets: ['OTEL_EXPORTER_OTLP_HEADERS'],
  outboxWorkerSecrets: ['CRON_SECRET'],
  rolloutFlags: ['V34_FEED_ENABLED', 'V34_EDITOR_ENABLED', 'V34_REALTIME_ENABLED'],
});

function toBase64Url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generates an RFC 8292 compliant P-256 (ES256) VAPID keypair plus a 256-bit
 * hex CRON_SECRET suitable for Cloudflare Worker secrets.
 */
export function generateVapidKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pubJwk = publicKey.export({ format: 'jwk' });
  const privJwk = privateKey.export({ format: 'jwk' });

  const x = Buffer.from(pubJwk.x, 'base64url');
  const y = Buffer.from(pubJwk.y, 'base64url');
  const uncompressedPublic = Buffer.concat([Buffer.from([0x04]), x, y]);
  const rawPrivate = Buffer.from(privJwk.d, 'base64url');

  return {
    vapidPublicKey: toBase64Url(uncompressedPublic),
    vapidPrivateKey: toBase64Url(rawPrivate),
    vapidSubject: 'mailto:ops@researchwith.me',
    cronSecret: randomBytes(32).toString('hex'),
  };
}

function readLocalEnvFile(cwd = process.cwd()) {
  const values = {};
  for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    const filePath = join(cwd, name);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      values[match[1]] = val;
    }
  }
  return values;
}

/** @param {Record<string, string | undefined>} [env] */
export function auditSecretReadiness(env = /** @type {Record<string, string | undefined>} */ (process.env)) {
  const statuses = {};
  const present = [];
  const missing = [];

  for (const key of CLOUDFLARE_V34_RESOURCES.appSecrets) {
    const ok = Boolean((env[key] ?? '').trim());
    statuses[key] = ok ? 'PRESENT_REDACTED' : 'MISSING';
    if (ok) present.push(key);
    else missing.push(key);
  }
  for (const key of CLOUDFLARE_V34_RESOURCES.optionalAppSecrets) {
    statuses[key] = (env[key] ?? '').trim() ? 'PRESENT_REDACTED' : 'OPTIONAL_UNSET';
  }
  for (const flag of CLOUDFLARE_V34_RESOURCES.rolloutFlags) {
    const raw = (env[flag] ?? '').trim();
    statuses[flag] = raw || 'DEFAULT_ENABLED';
  }

  return {
    readyForFullCutover: missing.length === 0,
    presentCount: present.length,
    requiredCount: CLOUDFLARE_V34_RESOURCES.appSecrets.length,
    missing,
    statuses,
  };
}

export function buildProvisioningPlan(opts = {}) {
  const env = opts.env ?? { ...readLocalEnvFile(opts.cwd), ...process.env };
  const deployWorkers = Boolean(opts.deployWorkers);
  const skipR2 = Boolean(opts.skipR2);
  const secrets = auditSecretReadiness(env);

  const r2Commands = skipR2
    ? []
    : [
        {
          step: 'create-r2-bucket',
          description: `Create R2 bucket ${CLOUDFLARE_V34_RESOURCES.r2Bucket}`,
          args: ['wrangler', 'r2', 'bucket', 'create', CLOUDFLARE_V34_RESOURCES.r2Bucket],
          idempotentConflictPattern: 'already exists',
        },
      ];

  const commands = [
    ...r2Commands,
    ...CLOUDFLARE_V34_RESOURCES.queues.map((queue) => ({
      step: `create-queue:${queue}`,
      description: `Create Cloudflare Queue ${queue}`,
      args: ['wrangler', 'queues', 'create', queue],
      idempotentConflictPattern: 'already exists',
    })),
  ];

  const secretUploads = [];
  for (const key of [
    ...CLOUDFLARE_V34_RESOURCES.appSecrets,
    ...CLOUDFLARE_V34_RESOURCES.optionalAppSecrets,
  ]) {
    if ((env[key] ?? '').trim()) {
      secretUploads.push({
        target: CLOUDFLARE_V34_RESOURCES.appWorkerConfig,
        secretName: key,
        status: 'PLANNED_REDACTED',
      });
    }
  }
  for (const key of CLOUDFLARE_V34_RESOURCES.outboxWorkerSecrets) {
    if ((env[key] ?? '').trim()) {
      secretUploads.push({
        target: CLOUDFLARE_V34_RESOURCES.outboxWorkerConfig,
        secretName: key,
        status: 'PLANNED_REDACTED',
      });
    }
  }

  if (deployWorkers) {
    commands.push({
      step: 'deploy-outbox-worker',
      description: 'Deploy dedicated Cloudflare Queues + Cron Outbox Worker',
      args: ['wrangler', 'deploy', '-c', CLOUDFLARE_V34_RESOURCES.outboxWorkerConfig],
      idempotentConflictPattern: null,
    });
  }

  return {
    mode: opts.apply ? 'apply' : 'dry-run',
    accountId: CLOUDFLARE_V34_RESOURCES.accountId,
    r2Bucket: skipR2 ? null : CLOUDFLARE_V34_RESOURCES.r2Bucket,
    skipped: skipR2
      ? [
          {
            step: 'create-r2-bucket',
            reason:
              'ARTIFACT_STORAGE_PROVIDER=supabase — artifacts live in Supabase Storage, which needs no payment method.',
            alternative: 'npm run storage:provision:supabase -- --apply',
          },
        ]
      : [],
    queues: CLOUDFLARE_V34_RESOURCES.queues,
    commands,
    secretUploads,
    secretAudit: secrets,
    privacySafeLog: true,
  };
}

function runWrangler(args, opts = {}) {
  const result = spawnSync('npx', args, {
    cwd: opts.cwd ?? process.cwd(),
    input: opts.stdin,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

export function executeProvisioning(opts = {}) {
  const env = opts.env ?? { ...readLocalEnvFile(opts.cwd), ...process.env };
  const plan = buildProvisioningPlan({ ...opts, env });
  if (!opts.apply) return plan;

  // Verify wrangler auth before mutating anything
  try {
    execFileSync('npx', ['wrangler', 'whoami'], { stdio: 'pipe', encoding: 'utf8' });
  } catch {
    throw new Error(
      'Cloudflare Wrangler is not authenticated. Run `npx wrangler login` or export CLOUDFLARE_API_TOKEN before running --apply.',
    );
  }

  const results = [];
  for (const cmd of plan.commands) {
    const res = runWrangler(cmd.args, { cwd: opts.cwd });
    const combined = `${res.stdout}\n${res.stderr}`.toLowerCase();
    const alreadyExists =
      Boolean(cmd.idempotentConflictPattern) &&
      combined.includes(cmd.idempotentConflictPattern.toLowerCase());
    if (res.exitCode !== 0 && !alreadyExists) {
      throw new Error(`Step "${cmd.step}" failed (exit ${res.exitCode}): ${res.stderr || res.stdout}`);
    }
    results.push({
      step: cmd.step,
      status: alreadyExists ? 'ALREADY_EXISTS' : 'APPLIED',
    });
  }

  const uploadedSecrets = [];
  for (const upload of plan.secretUploads) {
    const value = (env[upload.secretName] ?? '').trim();
    if (!value) continue;
    const res = runWrangler(['wrangler', 'secret', 'put', upload.secretName, '-c', upload.target], {
      cwd: opts.cwd,
      stdin: `${value}\n`,
    });
    if (res.exitCode !== 0) {
      throw new Error(
        `Secret upload failed for ${upload.secretName} (${upload.target}): ${res.stderr || res.stdout}`,
      );
    }
    uploadedSecrets.push({
      target: upload.target,
      secretName: upload.secretName,
      status: 'UPLOADED_REDACTED',
    });
  }

  return {
    ...plan,
    appliedSteps: results,
    uploadedSecrets,
  };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const args = new Set(process.argv.slice(2));
  if (args.has('--generate-vapid')) {
    const keys = generateVapidKeypair();
    console.log(
      JSON.stringify(
        {
          notice:
            'Generated locally — store in Cloudflare Worker secrets via `wrangler secret put`; NEVER commit these values.',
          VAPID_PUBLIC_KEY: keys.vapidPublicKey,
          VAPID_PRIVATE_KEY: keys.vapidPrivateKey,
          VAPID_SUBJECT: keys.vapidSubject,
          CRON_SECRET: keys.cronSecret,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const apply = args.has('--apply');
  const deployWorkers = args.has('--deploy-workers');
  const skipR2 = args.has('--skip-r2');
  try {
    const output = executeProvisioning({ apply, deployWorkers, skipR2 });
    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
