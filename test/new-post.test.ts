import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import matter from 'gray-matter';
import { compile } from '@mdx-js/mdx';
import { afterEach, describe, expect, it } from 'vitest';
import { frontmatterSchema } from '@/lib/content/schema';

const directories: string[] = [];
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function project() {
  const cwd = mkdtempSync(join(tmpdir(), 'reme-new-post-'));
  directories.push(cwd);
  mkdirSync(join(cwd, 'content/posts'), { recursive: true });
  return cwd;
}
function scaffold(cwd: string, ...args: string[]) {
  return spawnSync(process.execPath, [resolve('scripts/new-post.mjs'), ...args], { cwd, encoding: 'utf8' });
}

describe('post scaffolding', () => {
  it.each([[], ['--deep-dive']])('creates a schema-valid, compiling draft with flags %j', async (...flags) => {
    const cwd = project();
    const result = scaffold(cwd, 'A careful technical review', ...flags);
    expect(result.status, result.stderr).toBe(0);
    const { data, content } = matter(readFileSync(join(cwd, 'content/posts/a-careful-technical-review.mdx'), 'utf8'));
    expect(frontmatterSchema.parse(data).draft).toBe(true);
    expect(data.date).toBe(new Date().toISOString().slice(0, 10));
    await expect(compile(content)).resolves.toBeTruthy();
    if (flags.length) {
      expect(content).toContain('## Reproduction playbook');
      expect(content).toContain('## Pre-publication audit');
      expect(content).not.toContain('__TITLE_JSON__');
    }
  });

  it('only removes draft status with the explicit publish flag', () => {
    const cwd = project();
    expect(scaffold(cwd, 'An explicit publication', '--deep-dive', '--publish').status).toBe(0);
    const { data } = matter(readFileSync(join(cwd, 'content/posts/an-explicit-publication.mdx'), 'utf8'));
    expect(frontmatterSchema.parse(data).draft).toBe(false);
  });

  it('escapes YAML titles and preserves replacement-string characters', () => {
    const cwd = project();
    const title = 'A "quoted": title with $&';
    expect(scaffold(cwd, title, '--deep-dive').status).toBe(0);
    const file = readdirSync(join(cwd, 'content/posts'))[0];
    expect(matter(readFileSync(join(cwd, 'content/posts', file), 'utf8')).data.title).toBe(title);
  });

  it('refuses to overwrite an existing draft', () => {
    const cwd = project();
    scaffold(cwd, 'Keep this draft', '--deep-dive');
    const file = join(cwd, 'content/posts/keep-this-draft.mdx');
    const before = readFileSync(file, 'utf8');
    expect(scaffold(cwd, 'Keep this draft', '--publish').status).toBe(1);
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('rejects missing or unusable titles without writing files', () => {
    const cwd = project();
    expect(scaffold(cwd, '--deep-dive').status).toBe(1);
    expect(scaffold(cwd, '!!!', '--deep-dive').status).toBe(1);
    expect(readdirSync(join(cwd, 'content/posts'))).toEqual([]);
  });
});
