import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * DESIGN.md defines the type ramp in rem steps. An arbitrary pixel size is a
 * design-system escape hatch: it does not scale with the reader's font-size
 * preference, and the 10-11px sizes that had crept in were unreadable on a
 * phone. Keep every text size on the ramp instead of letting them reappear.
 */
const ROOTS = ['app', 'components'];

function sourceFiles(root: string): string[] {
  return readdirSync(root, { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => /\.(tsx|ts)$/.test(entry) && !/\.test\.(tsx|ts)$/.test(entry))
    .map((entry) => join(root, entry));
}

describe('design-system type ramp', () => {
  it('never uses an arbitrary pixel text size in app/ or components/', () => {
    const offenders: string[] = [];

    for (const file of ROOTS.flatMap(sourceFiles)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (/text-\[\d+(?:\.\d+)?px\]/.test(line)) {
          offenders.push(`${file}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
