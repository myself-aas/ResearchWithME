import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Guards the 2026-11-12 token migration (docs/design-system/primitives.md):
 *
 *  1. Every colour utility names a token that exists. A class like
 *     `text-ink-secondary` with no `--color-ink-secondary` compiles to nothing
 *     and silently inherits — 261 elements rendered in the wrong colour that
 *     way before this test existed.
 *  2. UI code uses semantic tokens, not the raw palette. Raw families
 *     (`stone-*`, `red-*`, `white`, …) do not switch with the theme, which
 *     left light islands in dark mode and failed WCAG contrast on 9 routes.
 *
 * Email templates are excluded: mail clients have no CSS variables.
 */

const root = process.cwd();
const SCAN = ['app', 'components', 'lib'];
const EXCLUDE = /(__tests__|[\\/]email[\\/]|\.test\.)/;

/** Raw palette uses that are deliberate, with the reason. */
const ALLOW: Record<string, string> = {
  'components/ui/Dialog.tsx:bg-stone-950/50': 'modal scrim is dark in both themes',
};

const PREFIX = /^(?:[a-z0-9-]+:)*(text|bg|border(?:-[xytrbl])?|divide|ring|ring-offset|outline|fill|stroke|decoration|placeholder|from|via|to|accent|caret)-(.+)$/;

// Non-colour values that share a colour prefix.
const NOT_COLOUR = new Set([
  // text
  'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'left', 'center', 'right', 'justify', 'start', 'end',
  'balance', 'pretty', 'wrap', 'nowrap', 'ellipsis', 'clip',
  // bg
  'cover', 'contain', 'fixed', 'local', 'scroll', 'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'none', 'clip-text', 'origin-border',
  'top', 'bottom', 'left-top', 'right-top', 'left-bottom', 'right-bottom', 'blend-multiply',
  // border / divide / outline / decoration / ring / stroke
  't', 'b', 'l', 'r', 's', 'e',
  '0', '1', '2', '4', '8', 'solid', 'dashed', 'dotted', 'double', 'hidden', 'collapse', 'separate', 'x', 'y', 'reverse', 'x-reverse', 'y-reverse',
  'inset', 'offset-1', 'offset-2', 'offset-4', 'from-font', 'auto',
  // createImageBitmap({ imageOrientation: 'from-image' }) in lib/images/process.ts
  'image',
]);
const KEYWORD_COLOURS = new Set(['transparent', 'current', 'inherit', 'none']);
const RAW_FAMILY = /^(?:stone|slate|gray|zinc|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d+)?$/;

function definedColours(): Set<string> {
  const css = readFileSync(join(root, 'app/globals.css'), 'utf8');
  // daisyUI registers these semantic theme roles through its Tailwind plugin.
  const daisy = ['base-100', 'base-200', 'base-300', 'base-content', 'primary', 'primary-content'];
  return new Set([...daisy, ...[...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1])]);
}

function sourceFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|ts)$/.test(name) && !EXCLUDE.test(p)) files.push(p);
    }
  };
  SCAN.forEach((d) => walk(join(root, d)));
  return files;
}

function colourUtilities() {
  const found: Array<{ where: string; cls: string; name: string }> = [];
  const literal = /(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1/g;
  for (const file of sourceFiles()) {
    const rel = relative(root, file).replace(/\\/g, '/');
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const m of line.matchAll(literal)) {
        for (const token of m[2].split(/\s+/)) {
          // Strip quotes/punctuation left by nested template strings; skip prose and CSS (`stroke-width:2px;`).
          const cls = token.replace(/^['"`({]+|['"`)},;]+$/g, '');
          if (!/^[a-z0-9:/[\].\-_%#!]+$/.test(cls) || cls.endsWith(':')) continue;
          const hit = cls.match(PREFIX);
          if (!hit) continue;
          const value = hit[2].replace(/\/\d+$/, '');
          if (value.includes(':') || value.startsWith('[') || /^\d/.test(value) || /^[xy]-\d+$/.test(value) || NOT_COLOUR.has(value)) continue;
          if (/^(?:gradient|linear|radial|conic)-/.test(value)) continue;
          found.push({ where: `${rel}:${i + 1}`, cls, name: value });
        }
      }
    });
  }
  return found;
}

describe('design token usage', () => {
  const defined = definedColours();
  const uses = colourUtilities();

  it('finds the token set and a realistic number of colour utilities', () => {
    expect(defined.has('ink-secondary')).toBe(true);
    expect(defined.has('success')).toBe(true);
    expect(uses.length).toBeGreaterThan(500);
  });

  it('every colour utility names a defined token (no phantom classes)', () => {
    const phantom = uses.filter((u) => !defined.has(u.name) && !KEYWORD_COLOURS.has(u.name) && !RAW_FAMILY.test(u.name));
    expect(phantom.map((u) => `${u.where}  ${u.cls}`)).toEqual([]);
  });

  it('UI code uses semantic tokens, not the raw palette', () => {
    const raw = uses.filter((u) => RAW_FAMILY.test(u.name) && !ALLOW[`${u.where.replace(/:\d+$/, '')}:${u.cls}`]);
    expect(raw.map((u) => `${u.where}  ${u.cls}`)).toEqual([]);
  });
});
