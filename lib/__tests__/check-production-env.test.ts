import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = resolve(process.cwd(), 'scripts', 'check-production-env.mjs');
const dirs: string[] = [];

function run(envFile: string) {
  const cwd = mkdtempSync(join(tmpdir(), 'rwm-env-guard-'));
  dirs.push(cwd);
  writeFileSync(join(cwd, '.env.production'), envFile);
  try {
    const stdout = execFileSync(process.execPath, [script], {
      cwd,
      env: { PATH: process.env.PATH } as unknown as NodeJS.ProcessEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const e = error as { status: number; stdout: string; stderr: string };
    return { status: e.status, stdout: e.stdout, stderr: e.stderr };
  }
}

const url = 'NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co';
const key = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_x';

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('check-production-env guard', () => {
  it('passes with CRLF line endings', () => {
    const result = run(`${url}\r\n${key}\r\n`);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Production build environment looks right');
  });

  it('passes with LF line endings', () => {
    const result = run(`${url}\n${key}\n`);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Production build environment looks right');
  });

  it('blocks when the URL is missing', () => {
    const result = run(`${key}\n`);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('NEXT_PUBLIC_SUPABASE_URL is not set.');
  });

  it('blocks a localhost site URL', () => {
    const result = run(`${url}\n${key}\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n`);
    expect(result.status).not.toBe(0);
  });
});
