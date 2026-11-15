import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|css|mjs|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const BANNED_PATTERN = /Bengali|Hind Siliguri|lang="bn"|lang="ar"|reme-locale|LocaleSwitcher|useLocale|[ঀ-৿]/;

describe('English-only', () => {
  it('has no i18n modules', () => {
    expect(existsSync(path.join(ROOT, 'lib/i18n'))).toBe(false);
    expect(existsSync(path.join(ROOT, 'components/i18n'))).toBe(false);
  });

  it('ships no Bengali or Arabic support', () => {
    const dirs = ['app', 'components', 'lib', 'cloudflare-pages/src', 'tokens'];
    const hits: string[] = [];
    for (const dir of dirs) {
      for (const file of walk(path.join(ROOT, dir))) {
        const rel = path.relative(ROOT, file).split(path.sep).join('/');
        if (rel.includes('__tests__')) continue;
        if (rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')) continue;
        const text = readFileSync(file, 'utf8');
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i += 1) {
          if (BANNED_PATTERN.test(lines[i])) {
            hits.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 140)}`);
          }
        }
      }
    }
    expect(hits, `Banned i18n patterns found:\n  ${hits.join('\n  ')}`).toEqual([]);
  });

  it('renders lang="en"', () => {
    const layout = readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8');
    expect(layout).toContain('lang="en"');
  });
});
