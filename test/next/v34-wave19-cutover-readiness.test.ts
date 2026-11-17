import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  auditSecretReadiness,
  buildProvisioningPlan,
  CLOUDFLARE_V34_RESOURCES,
  generateVapidKeypair,
} from '@/scripts/provision-cloudflare-v34.mjs';
import { isV34FlagEnabled, V34_FEATURE_FLAGS } from '@/lib/v34/feature-flags';

const tmpDirs: string[] = [];

afterEach(() => {
  delete process.env.V34_FEED_ENABLED;
  delete process.env.V34_EDITOR_ENABLED;
  delete process.env.V34_REALTIME_ENABLED;
  for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('Wave 19 P2/P3 — Live Production Cutover & Part VIII Sign-Off Readiness', () => {
  it('1. generates RFC 8292 P-256 VAPID keypair + 256-bit CRON_SECRET', () => {
    const keys = generateVapidKeypair();
    const pubBytes = Buffer.from(keys.vapidPublicKey, 'base64url');
    const privBytes = Buffer.from(keys.vapidPrivateKey, 'base64url');
    expect(pubBytes.length).toBe(65);
    expect(pubBytes[0]).toBe(0x04);
    expect(privBytes.length).toBe(32);
    expect(keys.vapidSubject).toBe('mailto:ops@researchwith.me');
    expect(keys.cronSecret).toMatch(/^[0-9a-f]{64}$/);
  });

  it('2. builds idempotent Cloudflare R2 + Queues + Worker provisioning plan without leaking secret values', () => {
    const fakeEnv = {
      CRON_SECRET: 'super-secret-cron-token-xyz',
      R2_ACCOUNT_ID: '74d241df16b8aaa80914e3dbb6e16758',
      R2_BUCKET: 'researchwithme-artifacts',
      R2_ACCESS_KEY_ID: 'r2-access-key-secret-value',
      R2_SECRET_ACCESS_KEY: 'r2-secret-access-key-value',
      VAPID_PUBLIC_KEY: 'vapid-pub-val',
      VAPID_PRIVATE_KEY: 'vapid-priv-secret-val',
      VAPID_SUBJECT: 'mailto:ops@researchwith.me',
      RESEND_API_KEY: 're_secret_test_key',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel.example.invalid',
      SENTRY_DSN: 'https://key@sentry.invalid/42',
    };

    const plan = buildProvisioningPlan({ env: fakeEnv, deployWorkers: true });
    const serialized = JSON.stringify(plan);

    expect(plan.mode).toBe('dry-run');
    expect(plan.r2Bucket).toBe('researchwithme-artifacts');
    expect(plan.queues).toEqual(['researchwithme-outbox', 'researchwithme-outbox-dlq']);
    expect(plan.secretAudit.readyForFullCutover).toBe(true);
    expect(plan.secretAudit.presentCount).toBe(CLOUDFLARE_V34_RESOURCES.appSecrets.length);
    expect(plan.commands.map((c: { step: string }) => c.step)).toEqual([
      'create-r2-bucket',
      'create-queue:researchwithme-outbox',
      'create-queue:researchwithme-outbox-dlq',
      'deploy-outbox-worker',
    ]);
    // Secret values must NEVER appear anywhere in the serialized plan
    expect(serialized).not.toContain('super-secret-cron-token-xyz');
    expect(serialized).not.toContain('r2-secret-access-key-value');
    expect(serialized).not.toContain('vapid-priv-secret-val');
    expect(serialized).not.toContain('re_secret_test_key');
  });

  it('3. audits missing secrets gracefully and flags degraded fallbacks in check-production-env --v34-cutover', () => {
    const partialAudit = auditSecretReadiness({ CRON_SECRET: 'set' });
    expect(partialAudit.readyForFullCutover).toBe(false);
    expect(partialAudit.missing).toContain('R2_BUCKET');
    expect(partialAudit.missing).toContain('VAPID_PRIVATE_KEY');

    const cwd = mkdtempSync(join(tmpdir(), 'rwm-wave19-env-'));
    tmpDirs.push(cwd);
    writeFileSync(
      join(cwd, '.env.production'),
      [
        'NEXT_PUBLIC_SUPABASE_URL=https://bxyjjbclaklzjxeumeat.supabase.co',
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_demo',
        'CRON_SECRET=test-cron',
        'R2_ACCOUNT_ID=acct',
        'R2_BUCKET=researchwithme-artifacts',
        'R2_ACCESS_KEY_ID=ak',
        'R2_SECRET_ACCESS_KEY=sk',
      ].join('\n'),
    );

    const script = resolve(process.cwd(), 'scripts', 'check-production-env.mjs');
    const out = execFileSync(process.execPath, [script, '--v34-cutover', '--json'], {
      cwd,
      env: { PATH: process.env.PATH } as unknown as NodeJS.ProcessEnv,
      encoding: 'utf8',
    });
    const parsed = JSON.parse(out) as {
      coreBuildReady: boolean;
      subsystems: Record<string, string>;
      missingSecrets: string[];
    };
    expect(parsed.coreBuildReady).toBe(true);
    expect(parsed.subsystems.outboxCron).toBe('LIVE');
    expect(parsed.subsystems.r2SignedStorage).toBe('LIVE');
    expect(parsed.subsystems.webPushVapid).toBe('FALLBACK_SKIPPED');
    expect(parsed.missingSecrets).toContain('VAPID_PUBLIC_KEY');
    expect(parsed.missingSecrets).toContain('SENTRY_DSN');
  });

  it('4. honors staged rollout kill-switch env aliases V34_FEED_ENABLED, V34_EDITOR_ENABLED, V34_REALTIME_ENABLED', () => {
    expect(V34_FEATURE_FLAGS).toContain('realtime-private-v1');
    expect(isV34FlagEnabled('contribution-feed-v1')).toBe(true);
    expect(isV34FlagEnabled('scholarly-editor-v1')).toBe(true);
    expect(isV34FlagEnabled('realtime-private-v1')).toBe(true);

    process.env.V34_FEED_ENABLED = 'false';
    process.env.V34_EDITOR_ENABLED = '0';
    process.env.V34_REALTIME_ENABLED = 'off';

    expect(isV34FlagEnabled('contribution-feed-v1')).toBe(false);
    expect(isV34FlagEnabled('scholarly-editor-v1')).toBe(false);
    expect(isV34FlagEnabled('realtime-private-v1')).toBe(false);
  });

  it('5. verifies Migration 13 autosave constraint fix and Part VIII release-gate / evidence dossier sync', () => {
    const mig13Path = resolve(
      process.cwd(),
      'supabase/migrations/20261117001300_v34_wave19_autosave_status_fix.sql',
    );
    expect(existsSync(mig13Path)).toBe(true);
    const mig13 = readFileSync(mig13Path, 'utf8');
    expect(mig13).toContain("'SYNCED'");
    expect(mig13).toContain("WHEN p_reason IN ('interval', 'manual', 'pre-publish', 'conflict')");

    const evidence = readFileSync(resolve(process.cwd(), 'docs/v34-acceptance-evidence.md'), 'utf8');
    expect(evidence).toContain('90/90 `v34_*` tables');
    expect(evidence).toContain('ADR-033-supabase-sql-over-prisma.md');
    expect(evidence).toContain('Migration 13');

    const gate = readFileSync(resolve(process.cwd(), 'docs/design-system/release-gate.md'), 'utf8');
    expect(gate).toContain('32/32');
    // Human/operator sign-offs remain honestly unchecked until attested
    expect(gate).toContain('- [ ] Human design-system owner sign-off');
    expect(gate).toContain('- [ ] Manual NVDA / VoiceOver / TalkBack');
    expect(gate).toContain('- [ ] External Cloudflare R2/Queues/secrets provisioning');
  });
});
