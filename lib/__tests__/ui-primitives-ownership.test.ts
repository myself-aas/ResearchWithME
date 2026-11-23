import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ownership contract for `components/ui/*` (reme v3.1 §27):
 *
 *  ui/ holds *composites* — accessible arrangements of primitives — and must
 *  never re-implement what primitives/ owns. This test pins that contract so
 *  the refactor cannot silently regress:
 *
 *  1. No hex colour literals — tokens only (globals.css / tokens.css).
 *  2. No `cva(` / `buttonVariants` declarations — variant logic lives in
 *     primitives (here: plain `cx()` joins in components/primitives).
 *  3. No hand-written interactive JSX elements (<button>, <input>, <select>,
 *     <textarea>, <form>) — import them from `@/components/primitives`.
 *     Dialog/Toast are interactive-only motion portals; they are allowed to
 *     keep their portal shells but must still not hand-write controls.
 *  4. No imports of the retired shadcn stock module or class-variance-authority.
 *
 * The file list is read live from the directory, so new ui/* files are covered
 * automatically. (header-2.tsx and menu-toggle-icon.tsx are scheduled for
 * disposition in the refactor's final ui/ consolidation; they are scanned like
 * everything else and comply today.)
 */

const root = process.cwd();
const UI_DIR = join(root, 'components', 'ui');
const uiFiles = readdirSync(UI_DIR)
  .filter((name) => /\.tsx?$/.test(name))
  .map((name) => join(UI_DIR, name));

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const CVA = /\bcva\s*\(|buttonVariants/g;
const RAW_INTERACTIVE = /<(button|input|select|textarea|form)[\s>]/g;
const RETIRED = ['class-variance-authority', '@/components/ui/button'];

describe('ui/ ownership contract', () => {
  it('finds the composites and scans all of them', () => {
    const names = uiFiles.map((f) => f.split('/').at(-1)).sort();
    for (const required of ['Alert.tsx', 'DataTable.tsx', 'Dialog.tsx', 'EmptyState.tsx', 'RouteSkeleton.tsx', 'Skeleton.tsx', 'Toast.tsx']) {
      expect(names).toContain(required);
    }
    expect(uiFiles.length).toBeGreaterThanOrEqual(7);
  });

  it('declares no hex colour literals', () => {
    for (const file of uiFiles) {
      const hits = readFileSync(file, 'utf8').match(HEX);
      expect({ file, hits }).toEqual({ file, hits: null });
    }
  });

  it('does not redeclare variant logic (cva/buttonVariants)', () => {
    for (const file of uiFiles) {
      const text = readFileSync(file, 'utf8');
      const hits = text.match(CVA);
      expect({ file, hits }).toEqual({ file, hits: null });
    }
  });

  it('hand-writes no interactive controls — those come from @/components/primitives', () => {
    for (const file of uiFiles) {
      const text = readFileSync(file, 'utf8');
      const hits = text.match(RAW_INTERACTIVE);
      expect({ file, hits }).toEqual({ file, hits: null });
    }
  });

  it('does not import the retired shadcn stock module or class-variance-authority', () => {
    for (const file of uiFiles) {
      const text = readFileSync(file, 'utf8');
      for (const specifier of RETIRED) {
        expect(text.includes(specifier)).toBe(false);
      }
    }
  });
});
