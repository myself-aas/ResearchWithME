import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Forbidden-copy guard — confirmshame, fake scarcity, unit-mismatched anchoring.
 *
 * Scans every user-facing .tsx in app/, components/ and emails/ for the banned
 * patterns (case-insensitive). Tests and node_modules are out of scope. The
 * unit-mismatch rule ("just 40% of" a different unit) cannot be caught by
 * regex — it is a DESIGN.md §Do not review rule, not this test.
 *
 * If this test fires: rewrite the string to state the real reason, or say
 * nothing. Do not weaken the pattern — the patterns are the design system.
 */

const root = process.cwd();
const SCAN = ['app', 'components', 'emails'];

const BANNED = [
  /\b(i'?ll risk it|risk it anyway|don't miss out)\b/i,
  /\bonly \d+ (seats?|slots?|spots?|copies) left\b/i,
  /\b(selling fast|last chance|never forget|before it's gone)\b/i,
  /\b(we miss you|we('ve)? missed you)\b/i,
];

/** `!` after a word character inside button text — shouting in a control. */
const BUTTON_BLOCK = /<button\b[^>]*>([\s\S]*?)<\/button>/g;
const SHOUT = /\w[^<]*!{2,}/;

function* tsxFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      yield* tsxFiles(full);
    } else if (/\.tsx?$/.test(entry) && !/\.(test|spec|stories)\.tsx?$/.test(entry)) {
      yield full;
    }
  }
}

const files = SCAN.flatMap((dir) => [...tsxFiles(join(root, dir))]);

describe('forbidden copy guard', () => {
  it('finds the user-facing surface (a realistic number of files)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no banned confirmshame / fake-scarcity / win-back phrases anywhere user-facing', () => {
    const hits: string[] = [];
    for (const file of files) {
      const rel = relative(root, file).replaceAll('\\', '/');
      const text = readFileSync(file, 'utf8');
      for (const pattern of BANNED) {
        for (const match of text.matchAll(new RegExp(pattern.source, 'gi'))) {
          const line = text.slice(0, match.index).split('\n').length;
          hits.push(`${rel}:${line}  "${match[0]}"`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('no shouting (!!) in button copy', () => {
    const hits: string[] = [];
    for (const file of files) {
      const rel = relative(root, file).replaceAll('\\', '/');
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(BUTTON_BLOCK)) {
        const inner = match[1];
        // ignore expression braces — copy inside {'...!!'} still counts as literal copy
        if (SHOUT.test(inner)) {
          const line = text.slice(0, match.index).split('\n').length;
          hits.push(`${rel}:${line}  "${inner.trim().slice(0, 80)}"`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
