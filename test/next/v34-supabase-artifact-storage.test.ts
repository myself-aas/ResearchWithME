import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createArtifactSignedUrl,
  getArtifactStorageStatus,
  resolveArtifactStorageProvider,
  storeArtifact,
} from '@/lib/v34/artifact-storage';
import {
  DEFAULT_SUPABASE_ARTIFACT_BUCKET,
  clampSignedUrlTtl,
  createSupabaseSignedUrl,
  getSupabaseStorageConfig,
  storeArtifactInSupabase,
} from '@/lib/v34/supabase-storage';
import { createScholarlyExport, getScholarlyExport, resetExportsStoreForTesting } from '@/lib/v34/exports';
import { createRenderJob, getRenderJob, resetWave8StoreForTesting } from '@/lib/v34/wave8-store';
import { resetV34StoreForTesting } from '@/lib/v34/store';
import { buildSupabaseStoragePlan } from '@/scripts/provision-supabase-storage-v34.mjs';

const SUPABASE_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
  SUPABASE_STORAGE_BUCKET: 'rwm-artifacts',
};

const R2_ENV = {
  R2_ACCOUNT_ID: '74d241df16b8aaa80914e3dbb6e16758',
  R2_BUCKET: 'rwm-artifacts',
  R2_ACCESS_KEY_ID: 'R2TESTACCESSKEY',
  R2_SECRET_ACCESS_KEY: 'R2TESTSECRETKEY',
};

const STORAGE_KEYS = [
  'ARTIFACT_STORAGE_PROVIDER',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_STORAGE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_STORAGE_BUCKET',
  'R2_ACCOUNT_ID',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
];

const saved: Record<string, string | undefined> = {};
const tmpDirs: string[] = [];

function setStorageEnv(env: Record<string, string | undefined>) {
  for (const key of STORAGE_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
}

beforeEach(() => {
  for (const key of STORAGE_KEYS) saved[key] = process.env[key];
  resetV34StoreForTesting();
  resetExportsStoreForTesting();
  resetWave8StoreForTesting();
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of STORAGE_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('Supabase Storage artifact backend (no-credit-card replacement for R2)', () => {
  it('1. resolves providers as supabase → r2 → inline and respects an explicit override', () => {
    expect(resolveArtifactStorageProvider({})).toBe('inline');
    expect(resolveArtifactStorageProvider(R2_ENV)).toBe('r2');
    expect(resolveArtifactStorageProvider(SUPABASE_ENV)).toBe('supabase');
    // Supabase wins in auto mode even when R2 credentials happen to exist.
    expect(resolveArtifactStorageProvider({ ...R2_ENV, ...SUPABASE_ENV })).toBe('supabase');
    expect(
      resolveArtifactStorageProvider({ ...R2_ENV, ...SUPABASE_ENV, ARTIFACT_STORAGE_PROVIDER: 'r2' }),
    ).toBe('r2');
    expect(
      resolveArtifactStorageProvider({ ...SUPABASE_ENV, ARTIFACT_STORAGE_PROVIDER: 'inline' }),
    ).toBe('inline');
    expect(getArtifactStorageStatus(SUPABASE_ENV)).toEqual({
      preference: 'auto',
      provider: 'supabase',
      bucket: 'rwm-artifacts',
      configured: true,
    });
  });

  it('2. reads Supabase Storage config from env and defaults the bucket name', () => {
    expect(getSupabaseStorageConfig({})).toBeNull();
    expect(
      getSupabaseStorageConfig({
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'k',
      }),
    ).toEqual({
      url: 'https://example.supabase.co',
      bucket: DEFAULT_SUPABASE_ARTIFACT_BUCKET,
      serviceKey: 'k',
    });
    // Placeholder values from .env.example must not look configured.
    expect(
      getSupabaseStorageConfig({
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
        SUPABASE_SERVICE_ROLE_KEY: 'k',
      }),
    ).toBeNull();
  });

  it('3. uploads to the private bucket and mints a signed URL without extra SDKs', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      if (String(url).includes('/storage/v1/object/sign/')) {
        return new Response(
          JSON.stringify({ signedURL: '/object/sign/rwm-artifacts/exports/u-1/exp-1/paper.bib?token=jwt' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ Key: 'rwm-artifacts/exports/u-1/exp-1/paper.bib' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const stored = await storeArtifactInSupabase({
      key: 'exports/u-1/exp-1/paper.bib',
      body: '@misc{test, title={Test}}',
      contentType: 'application/x-bibtex; charset=utf-8',
      filename: 'paper.bib',
      env: SUPABASE_ENV,
      fetchImpl,
    });

    expect(stored.provider).toBe('supabase');
    expect(stored.bucket).toBe('rwm-artifacts');
    expect(stored.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.byteSize).toBeGreaterThan(0);
    expect(stored.signedUrl).toBe(
      'https://example.supabase.co/storage/v1/object/sign/rwm-artifacts/exports/u-1/exp-1/paper.bib?token=jwt',
    );
    expect(stored.signedUrlExpiresAt).toMatch(/Z$/);

    expect(calls[0].url).toBe(
      'https://example.supabase.co/storage/v1/object/rwm-artifacts/exports/u-1/exp-1/paper.bib',
    );
    expect(calls[0].init.method).toBe('POST');
    const uploadHeaders = calls[0].init.headers as Record<string, string>;
    expect(uploadHeaders.Authorization).toBe('Bearer service-role-test-key');
    expect(uploadHeaders['x-upsert']).toBe('false');
    expect(uploadHeaders['Content-Type']).toBe('application/x-bibtex; charset=utf-8');

    const signBody = JSON.parse(String(calls[1].init.body));
    expect(signBody.expiresIn).toBe(900);
    expect(signBody.download).toBe('paper.bib');
  });

  it('4. surfaces upload and signing failures instead of persisting broken pointers', async () => {
    const failing = (async () =>
      new Response(JSON.stringify({ message: 'new row violates row-level security' }), {
        status: 403,
      })) as unknown as typeof fetch;

    await expect(
      storeArtifactInSupabase({
        key: 'exports/u-1/exp-1/paper.bib',
        body: 'x',
        contentType: 'text/plain',
        env: SUPABASE_ENV,
        fetchImpl: failing,
      }),
    ).rejects.toThrow(/HTTP 403/);

    await expect(
      createSupabaseSignedUrl(
        { url: 'https://example.supabase.co', bucket: 'rwm-artifacts', serviceKey: 'k' },
        'exports/u-1/paper.bib',
        { fetchImpl: failing },
      ),
    ).rejects.toThrow(/signing failed with HTTP 403/);
  });

  it('5. clamps signed-URL lifetimes to Supabase Storage limits', () => {
    expect(clampSignedUrlTtl(undefined)).toBe(900);
    expect(clampSignedUrlTtl(1)).toBe(60);
    expect(clampSignedUrlTtl(999_999_999)).toBe(604_800);
    expect(clampSignedUrlTtl(3_600)).toBe(3_600);
  });

  it('6. forces an explicit provider and fails loudly when it is unconfigured', async () => {
    await expect(
      storeArtifact({
        key: 'exports/u-1/exp-1/paper.bib',
        body: 'x',
        contentType: 'text/plain',
        env: { ARTIFACT_STORAGE_PROVIDER: 'supabase' },
      }),
    ).rejects.toThrow(/not configured/);

    const inline = await storeArtifact({
      key: 'exports/u-1/exp-1/paper.bib',
      body: 'x',
      contentType: 'text/plain',
      env: {},
    });
    expect(inline).toEqual({
      provider: 'inline',
      bucket: null,
      key: null,
      checksumSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      byteSize: 1,
      signedUrl: null,
      signedUrlExpiresAt: null,
    });
  });

  it('7. refreshes Supabase signed URLs for exports and render manifests', async () => {
    const fetchImpl = (async (url: string | URL | Request) =>
      String(url).includes('/storage/v1/object/sign/')
        ? new Response(
            JSON.stringify({
              signedURL: `/object/sign/rwm-artifacts/${String(url).split('/object/sign/rwm-artifacts/')[1]}?token=fresh`,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        : new Response('{}', { status: 200 })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchImpl);
    setStorageEnv(SUPABASE_ENV);

    const exp = await createScholarlyExport({
      userId: 'local-contributor',
      targetType: 'contribution',
      targetId: 'contrib-rl-cold-start',
      format: 'bibtex',
    });
    expect(exp.ok).toBe(true);
    if (!exp.ok) return;
    expect(exp.exportRecord.storageProvider).toBe('supabase');
    expect(exp.exportRecord.storageKey).toBeTruthy();
    expect(exp.exportRecord.signedDownloadUrl).toContain('token=fresh');

    const refreshed = await getScholarlyExport('local-contributor', exp.exportRecord.id);
    expect(refreshed?.signedDownloadUrl).toContain('token=fresh');
    expect(refreshed?.signedUrlExpiresAt).toMatch(/Z$/);

    const rnd = await createRenderJob({
      ownerId: 'local-contributor',
      engine: 'REMOTION',
      compositionId: 'EvidenceExplainer',
      durationSeconds: 30,
      humanApproved: true,
      payload: { sourceId: 'src-arxiv-2501-12948' },
    });
    expect(rnd.storageProvider).toBe('supabase');
    expect(rnd.outputChecksumSha256).toMatch(/^[0-9a-f]{64}$/);

    const fresh = await getRenderJob(rnd.id, 'local-contributor');
    expect(fresh?.outputUrl).toContain('token=fresh');
  });

  it('8. reports LIVE_SUPABASE in the v3.4 cutover audit and never needs R2', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rwm-supabase-storage-'));
    tmpDirs.push(cwd);
    writeFileSync(
      join(cwd, '.env.production'),
      [
        'NEXT_PUBLIC_SUPABASE_URL=https://bxyjjbclaklzjxeumeat.supabase.co',
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_demo',
        'SUPABASE_SERVICE_ROLE_KEY=service-role-demo',
        'SUPABASE_STORAGE_BUCKET=researchwithme-artifacts',
        'CRON_SECRET=test-cron',
      ].join('\n'),
    );

    const script = resolve(process.cwd(), 'scripts', 'check-production-env.mjs');
    const out = execFileSync(process.execPath, [script, '--v34-cutover', '--json'], {
      cwd,
      env: { PATH: process.env.PATH } as unknown as NodeJS.ProcessEnv,
      encoding: 'utf8',
    });
    const parsed = JSON.parse(out) as {
      subsystems: Record<string, string | null>;
      missingSecrets: string[];
    };
    expect(parsed.subsystems.artifactStorage).toBe('LIVE_SUPABASE');
    expect(parsed.subsystems.storageBucket).toBe('researchwithme-artifacts');
    expect(parsed.missingSecrets).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(parsed.missingSecrets).not.toContain('R2_BUCKET');
  });

  it('9. builds a redacted Supabase Storage provisioning plan', () => {
    const plan = buildSupabaseStoragePlan({
      projectUrl: 'https://example.supabase.co',
      serviceKey: 'super-secret-service-key',
      bucket: 'rwm-artifacts',
      maxBytes: 1048576,
    });
    expect(plan.ready).toBe(true);
    expect(plan.bucket).toBe('rwm-artifacts');
    expect(plan.public).toBe(false);
    expect(plan.fileSizeLimit).toBe(1048576);
    expect(plan.allowedMimeTypes).toContain('application/x-bibtex');
    expect(JSON.stringify(plan)).not.toContain('super-secret-service-key');

    const incomplete = buildSupabaseStoragePlan({ projectUrl: '', serviceKey: '' });
    expect(incomplete.ready).toBe(false);
    expect(incomplete.requiredSecrets).toEqual([
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ]);
  });

  it('10. leaves R2 usable when Supabase Storage is not configured', async () => {
    const signed = await createArtifactSignedUrl({
      provider: 'r2',
      key: 'exports/u-1/exp-1/paper.bib',
      env: R2_ENV,
    });
    expect(signed?.url).toContain('X-Amz-Signature=');
    expect(await createArtifactSignedUrl({ provider: 'r2', key: 'k', env: {} })).toBeNull();
    expect(await createArtifactSignedUrl({ provider: 'supabase', key: 'k', env: {} })).toBeNull();
  });
});
