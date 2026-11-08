import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('production Supabase configuration', () => {
  it('is loaded by Next.js and can be overridden by the build environment', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rwm-env-'));
    try {
      copyFileSync(join(process.cwd(), '.env.production'), join(dir, '.env.production'));
      const script = `require(${JSON.stringify(require.resolve('@next/env'))}).loadEnvConfig(${JSON.stringify(dir)}, false, {info(){},error(){}}); console.log(JSON.stringify([process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY]));`;
      const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production' };
      delete env.NEXT_PUBLIC_SUPABASE_URL;
      delete env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const read = (extra: Record<string, string> = {}) => JSON.parse(execFileSync(process.execPath, ['-e', script], { env: { ...env, ...extra }, encoding: 'utf8' })) as string[];
      const defaults = read();
      expect(defaults[0]).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
      expect(defaults[1]).toMatch(/^sb_publishable_/);
      expect(read({ NEXT_PUBLIC_SUPABASE_URL: 'https://override.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'override-key' })).toEqual(['https://override.supabase.co', 'override-key']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
