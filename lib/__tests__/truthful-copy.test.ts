import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCAN_DIRS = ['app', 'components', 'lib', 'emails', 'public'];
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.next',
  'lib/__tests__',
  'lib/schemas', // generic identifier parser for cited works
  'lib/images',
  'lib/cms',
]);
const TRACKED_FILES = ['README.md', 'PRODUCT.md'];

const BANNED = [
  { pattern: /\bISSN\b/, label: 'ISSN' },
  { pattern: /2994-0821/, label: 'fake ISSN 2994-0821' },
  { pattern: /10\.5555/, label: 'test-prefix DOI 10.5555' },
  { pattern: /DOI prefix/, label: 'DOI prefix claim' },
  { pattern: /diamond open[- ]access/i, label: 'diamond open access' },
  { pattern: /monograph/i, label: 'monograph' },
  { pattern: /verified (domain )?specialists?/i, label: 'verified specialist(s)' },
  { pattern: /editorial (board|office)/i, label: 'editorial board/office' },
  { pattern: /peer-reviewed preprint/i, label: 'peer-reviewed preprint' },
  { pattern: /OVERVIEW_STATS/, label: 'OVERVIEW_STATS' },
  { pattern: /Elena Rostova|Marcus Vance|Ananya Sen|Thabo Khumalo|Sarah Chen|Julian Ross|Hiroshi Tanaka/, label: 'fictional editor/author' },
];

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).split(path.sep).join('/');
    if (EXCLUDED_DIRS.has(rel) || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx|md|json|html)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) out.push(full);
  }
  return out;
}

function collectFiles(): string[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) files.push(...walk(path.join(ROOT, dir)));
  for (const rel of TRACKED_FILES) {
    const full = path.join(ROOT, rel);
    if (existsSync(full)) files.push(full);
  }
  return files;
}

describe('truthful copy', () => {
  it('contains no banned false claims, identifiers or fictional names', () => {
    const hits: string[] = [];
    for (const file of collectFiles()) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      // Skip the test file itself, docs/ historical notes, and CHANGELOG
      // (which records removed-but-once-present identifiers by design).
      if (rel.includes('truthful-copy') || rel.startsWith('docs/') || rel === 'CHANGELOG.md' || rel.endsWith('/progress.md')) continue;
      const text = readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        for (const { pattern, label } of BANNED) {
          if (pattern.test(line)) {
            hits.push(`${rel}:${i + 1}: ${label}  --  ${line.trim().slice(0, 160)}`);
          }
        }
      }
    }
    expect(hits, `Banned patterns found:\n  ${hits.join('\n  ')}`).toEqual([]);
  });

  it('footer shows the CC BY 4.0 licence line', () => {
    const footer = readFileSync(path.join(ROOT, 'components/BlogFooter.tsx'), 'utf8');
    expect(footer).toContain('Articles are published under CC BY 4.0.');
  });
});
