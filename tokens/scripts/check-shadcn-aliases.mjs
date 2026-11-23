#!/usr/bin/env node
/**
 * reme token pipeline — shadcn/undefined-token guard.
 *
 * Catches the failure mode that silently rendered every shadcn-stock element
 * transparent before the aliases existed: a class names a colour token that no
 * Tailwind `@theme` block defines, so Tailwind mints nothing and the element
 * inherits its parent colour.
 *
 * Two rules, both fail with file:line:
 *  A. Every var(--x) referenced WITHOUT a fallback by the app's CSS entry
 *     files is defined in one of them (globals.css, generated tokens.css,
 *     generated shadcn-aliases.css) or is provided at runtime by next/font
 *     (--font-*).
 *  B. Every colour utility in app/components/lib source names a --color-<name>
 *     that exists in the union of those files (mirrors the "no phantom classes"
 *     rule in lib/__tests__/design-token-usage.test.ts so CI fails before vitest).
 *
 * Email templates are excluded: mail clients have no CSS variables.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const CSS_FILES = [
  'app/globals.css',
  'tokens/generated/tokens.css',
  'tokens/generated/shadcn-aliases.css',
];

const errors = [];

for (const rel of CSS_FILES) {
  if (!existsSync(join(root, rel))) {
    errors.push(`${rel}: missing — run \`npm run tokens:build\` first (tokens/generated/*.css is committed; regenerate after pulling)`);
  }
}
const css = CSS_FILES.filter((rel) => existsSync(join(root, rel))).map((rel) => ({
  rel,
  text: readFileSync(join(root, rel), 'utf8'),
}));

// A. var(--x) references resolve (fallback-free uses only)
const definedVars = new Set();
for (const { text } of css) {
  for (const m of text.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) definedVars.add(m[1]);
}
const RUNTIME_PREFIX = [/^--font-/]; // provided by next/font on <html> at runtime
for (const { rel, text } of css) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // var(--name) with no top-level comma before the closing paren = no fallback
    for (const m of lines[i].matchAll(/var\(\s*(--[a-z0-9-]+)\s*([,)])/gi)) {
      const [, name, closer] = m;
      if (closer === ',') continue; // has fallback
      if (definedVars.has(name) || RUNTIME_PREFIX.some((re) => re.test(name))) continue;
      errors.push(`${rel}:${i + 1}: var(${name}) is not defined in ${CSS_FILES.join(', ')} and has no fallback`);
    }
  }
}

// B. colour utilities in source name a defined --color-<name>
const NOT_COLOUR = new Set([
  'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'left', 'center', 'right', 'justify', 'start', 'end',
  'balance', 'pretty', 'wrap', 'nowrap', 'ellipsis', 'clip',
  'cover', 'contain', 'fixed', 'local', 'scroll', 'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'none', 'clip-text', 'origin-border',
  'top', 'bottom', 'left-top', 'right-top', 'left-bottom', 'right-bottom', 'blend-multiply',
  't', 'b', 'l', 'r', 's', 'e',
  '0', '1', '2', '4', '8', 'solid', 'dashed', 'dotted', 'double', 'hidden', 'collapse', 'separate', 'x', 'y', 'reverse', 'x-reverse', 'y-reverse',
  'inset', 'offset-1', 'offset-2', 'offset-4', 'from-font', 'auto', 'image',
]);
const KEYWORD_COLOURS = new Set(['transparent', 'current', 'inherit', 'none']);
const RAW_FAMILY = /^(?:stone|slate|gray|zinc|neutral|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d+)?$/;
const PREFIX = /^(?:[a-z0-9-]+:)*(text|bg|border(?:-[xytrbl])?|divide|ring|ring-offset|outline|fill|stroke|decoration|placeholder|from|via|to|accent|caret)-(.+)$/;
const EXCLUDE = /(__tests__|[\\/]email[\\/]|\.test\.)/;
const SCAN = ['app', 'components', 'lib'];

function definedColours() {
  const set = new Set();
  for (const { text } of css) {
    for (const m of text.matchAll(/--color-([a-z0-9-]+)\s*:/g)) set.add(m[1]);
  }
  for (const d of ['base-100', 'base-200', 'base-300', 'base-content', 'primary', 'primary-content']) set.add(d);
  return set;
}

function* sourceFiles() {
  const walk = function* (dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        yield* walk(full);
      } else if (/\.(tsx?|ts)$/.test(entry) && !EXCLUDE.test(full)) {
        yield full;
      }
    }
  };
  for (const top of SCAN) {
    const abs = join(root, top);
    if (existsSync(abs)) yield* walk(abs);
  }
}

const defined = definedColours();
const LITERAL = /(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1/g;
for (const file of sourceFiles()) {
  const rel = relative(root, file).replaceAll('\\', '/');
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(LITERAL)) {
      const start = m.index ?? 0;
      // `token['text-primary']` indexes an object by token name; not a class.
      const isComputedKey =
        /[A-Za-z0-9_$\])]\s*\[$/.test(line.slice(0, start)) && /^\s*\]/.test(line.slice(start + m[0].length));
      if (isComputedKey) continue;
      for (const rawToken of m[2].split(/\s+/)) {
        const cls = rawToken.replace(/^['"`({]+|['"`)},;]+$/g, '');
        if (!/^[a-z0-9:/[\].\-_%#!]+$/.test(cls) || cls.endsWith(':')) continue;
        const hit = cls.match(PREFIX);
        if (!hit) continue;
        const value = hit[2].replace(/\/\d+$/, '');
        if (value.includes(':') || value.startsWith('[') || /^\d/.test(value) || /^[xy]-\d+$/.test(value)) continue;
        if (NOT_COLOUR.has(value)) continue;
        if (/^(gradient|linear|radial|conic)-/.test(value)) continue;
        if (defined.has(value) || NOT_COLOUR.has(value) || KEYWORD_COLOURS.has(value) || RAW_FAMILY.test(value)) continue;
        errors.push(`${rel}:${i + 1}: "${cls}" names --color-${value}, which is not defined in ${CSS_FILES.join(', ')}`);
      }
    }
  });
}

if (errors.length) {
  console.error('tokens: shadcn/undefined-token guard FAILED');
  for (const e of errors.slice(0, 60)) console.error('  - ' + e);
  if (errors.length > 60) console.error(`  … and ${errors.length - 60} more`);
  process.exit(1);
}
console.log(`tokens: shadcn/undefined-token guard OK (${definedVars.size} CSS vars referenced & defined or runtime-provided; ${defined.size} --color-* roles checked against app/components/lib)`);
