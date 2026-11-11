import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  assertProductionConfig,
  createRequestContext,
  getBuildTarget,
  getEffectiveEnvironment,
  isPublicConfigValid,
  PublicConfigError,
  resolvePublicConfig,
  type PublicConfig,
} from '@/cloudflare-pages/src/server/context';
import { TEST_ORIGIN } from '@/test/support/pages';

afterEach(() => {
  vi.unstubAllEnvs();
});

const VALID: PublicConfig = {
  siteUrl: TEST_ORIGIN,
  supabaseUrl: 'https://fake.supabase.test',
  supabaseKey: 'sb_publishable_test-only-not-a-secret',
};
const BLANK: PublicConfig = { siteUrl: TEST_ORIGIN, supabaseUrl: '', supabaseKey: '' };
const MALFORMED: PublicConfig = { ...VALID, supabaseUrl: 'not a url' };

describe('public config resolution', () => {
  it('prefers the publishable key, then the legacy anon key', () => {
    expect(
      resolvePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: 'https://proj.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy-anon',
      }).supabaseKey,
    ).toBe('sb_publishable_x');

    expect(
      resolvePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: 'https://proj.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy-anon',
      }).supabaseKey,
    ).toBe('legacy-anon');
  });

  it('defaults the site URL and trims values', () => {
    const config = resolvePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: '  https://proj.supabase.co  ',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '  key  ',
    });
    expect(config.siteUrl).toBe('https://researchwith.me');
    expect(config.supabaseUrl).toBe('https://proj.supabase.co');
    expect(config.supabaseKey).toBe('key');
  });

  it('blanks out cleanly when the public variables are absent (CI workerd tests)', () => {
    const config = resolvePublicConfig({});
    expect(config.supabaseUrl).toBe('');
    expect(config.supabaseKey).toBe('');
    expect(isPublicConfigValid(config)).toBe(false);
  });

  it('rejects malformed public URLs and non-http protocols', () => {
    expect(isPublicConfigValid(MALFORMED)).toBe(false);
    expect(isPublicConfigValid({ ...VALID, supabaseUrl: 'ftp://proj.supabase.co' })).toBe(false);
    expect(isPublicConfigValid({ ...VALID, supabaseUrl: '' })).toBe(false);
    expect(isPublicConfigValid({ ...VALID, supabaseKey: '' })).toBe(false);
    expect(isPublicConfigValid(VALID)).toBe(true);
  });
});

describe('build target and preview isolation', () => {
  it('normalises the build target and defaults to local', () => {
    expect(getBuildTarget({})).toBe('local');
    expect(getBuildTarget({ RWM_BUILD_TARGET: 'PRODUCTION' })).toBe('production');
    expect(getBuildTarget({ RWM_BUILD_TARGET: 'test' })).toBe('test');
    expect(getBuildTarget({ RWM_BUILD_TARGET: 'preview' })).toBe('preview');
    expect(getBuildTarget({ RWM_BUILD_TARGET: 'staging' })).toBe('local');
  });

  it('requires both the build target and the deploy binding to agree on production', () => {
    expect(getEffectiveEnvironment({ RWM_DEPLOY_ENV: 'production' }, 'production')).toBe('production');
    expect(getEffectiveEnvironment({ RWM_DEPLOY_ENV: 'production' }, 'preview')).toBe('preview');
    expect(getEffectiveEnvironment({ RWM_DEPLOY_ENV: 'production' }, 'local')).toBeNull();
    expect(getEffectiveEnvironment({ RWM_DEPLOY_ENV: 'preview' }, 'production')).toBe('preview');
    expect(getEffectiveEnvironment({}, 'production')).toBeNull();
    expect(getEffectiveEnvironment({ RWM_DEPLOY_ENV: 'preview' }, 'local')).toBe('preview');
  });

  it('treats a preview deployment as never-production, even with production values in flight', () => {
    // Preview isolation: a preview build carrying production-looking values must
    // not be served as production.
    expect(getEffectiveEnvironment({ RWM_DEPLOY_ENV: 'preview' }, 'preview')).toBe('preview');
    // And a misconfigured production deploy is not downgraded silently to demo:
    // the guard below decides based on the *effective* identity.
    expect(getEffectiveEnvironment({ RWM_DEPLOY_ENV: 'preview' }, 'production')).toBe('preview');
  });
});

describe('production guard', () => {
  it('throws for an effective-production deployment without valid public config', () => {
    expect(() => assertProductionConfig(BLANK, { RWM_DEPLOY_ENV: 'production' }, 'production')).toThrow(
      PublicConfigError,
    );
    expect(() => assertProductionConfig(MALFORMED, { RWM_DEPLOY_ENV: 'production' }, 'production')).toThrow(
      PublicConfigError,
    );
  });

  it('passes for a valid effective-production deployment and no-ops elsewhere', () => {
    expect(() =>
      assertProductionConfig(VALID, { RWM_DEPLOY_ENV: 'production' }, 'production'),
    ).not.toThrow();
    // Preview and local demo deployments may run without the CMS on purpose.
    expect(() => assertProductionConfig(BLANK, { RWM_DEPLOY_ENV: 'preview' }, 'preview')).not.toThrow();
    expect(() => assertProductionConfig(BLANK, {}, 'local')).not.toThrow();
    expect(() => assertProductionConfig(BLANK, {}, 'test')).not.toThrow();
  });

  it('createRequestContext enforces the guard before serving anything', () => {
    const blankSource = {
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      NEXT_PUBLIC_SITE_URL: TEST_ORIGIN,
      RWM_BUILD_TARGET: 'production',
    };
    expect(() =>
      createRequestContext(
        new Request(`${TEST_ORIGIN}/`),
        { RWM_DEPLOY_ENV: 'production' },
        'pages',
        undefined,
        { target: 'production', config: blankSource },
      ),
    ).toThrow(PublicConfigError);

    // The same blank config is fine outside effective production.
    expect(() =>
      createRequestContext(
        new Request(`${TEST_ORIGIN}/`),
        { RWM_DEPLOY_ENV: 'preview' },
        'pages',
        undefined,
        { target: 'preview', config: { ...blankSource, RWM_BUILD_TARGET: 'preview' } },
      ),
    ).not.toThrow();
  });
});

describe('vite define allowlist (client and SSR configs)', () => {
  const clientConfigPath = path.resolve(__dirname, '../../cloudflare-pages/vite.config.ts');
  const source = readFileSync(clientConfigPath, 'utf8');

  it('inlines only the allowlisted public keys, never per-request secrets', () => {
    for (const key of [
      'process.env.NEXT_PUBLIC_SUPABASE_URL',
      'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'process.env.NEXT_PUBLIC_SITE_URL',
      'process.env.RWM_BUILD_TARGET',
    ]) {
      expect(source).toContain(key);
    }
    for (const secret of [
      'GEMINI_API_KEY',
      'HF_TOKEN',
      'HF_SPACE_NAME',
      'RESEND_API_KEY',
      'REVALIDATE_SECRET',
      'MY_SECRET_TOKEN',
      'RATE_LIMIT_KV',
      'RESEND_TPL_',
    ]) {
      expect(source).not.toContain(secret);
    }
    expect(source).not.toMatch(/\.\.\.\s*process\.env/);
  });

  it('client build fails on transitive server-only imports', async () => {
    const { failOnServerOnly } = await import('@/cloudflare-pages/vite.config');
    const plugin = failOnServerOnly();
    const resolveId = plugin.resolveId as unknown as (
      this: unknown,
      source: string,
      importer: string | undefined,
      options: unknown,
    ) => unknown;
    expect(() => resolveId.call({}, 'server-only', undefined, {})).toThrow(/server-only/);
    expect(resolveId.call({}, 'react', undefined, {})).toBeNull();
  });

  it('SSR server-only stub is inert', async () => {
    await expect(import('@/cloudflare-pages/src/build-stubs/server-only')).resolves.toBeDefined();
  });
});

describe('built asset secret hygiene', () => {
  const distDir = path.resolve(__dirname, '../../cloudflare-pages/dist');
  const serverDir = path.resolve(__dirname, '../../cloudflare-pages/.server');
  const SECRET_NAMES = [
    'GEMINI_API_KEY',
    'HF_TOKEN',
    'RESEND_API_KEY',
    'REVALIDATE_SECRET',
    'MY_SECRET_TOKEN',
  ] as const;

  function* walk(dir: string): Generator<string> {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) yield* walk(full);
      else yield full;
    }
  }

  // The bundler output only exists after `npm run build:pages`; when it is
  // absent (fresh checkout, pre-build `npm test`) this reports and skips rather
  // than blocking the unit suite. CI runs the test after the build.
  it.runIf(existsSync(distDir) && existsSync(serverDir))(
    'no configured secret value appears in the client or SSR bundles',
    () => {
      const sentinels = SECRET_NAMES.map((name) => process.env[name]).filter(
        (value): value is string => Boolean(value && value.length > 0),
      );
      sentinels.push('rwm-secret-sentinel-9f3c1f2a7b4e6d0c');

      const offenders: string[] = [];
      for (const dir of [distDir, serverDir]) {
        for (const file of walk(dir)) {
          if (!/\.(js|mjs|css|html|json|map)$/.test(file)) continue;
          const text = readFileSync(file, 'utf8');
          for (const sentinel of sentinels) {
            if (text.includes(sentinel)) offenders.push(`${file}: contains a secret sentinel`);
          }
        }
      }
      expect(offenders).toEqual([]);
    },
  );
});
