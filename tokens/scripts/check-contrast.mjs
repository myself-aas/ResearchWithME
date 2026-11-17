#!/usr/bin/env node
/**
 * reme token pipeline — WCAG contrast gate. Fails (exit 1) when a required
 * semantic pair falls below 4.5:1 (normal text) or 3:1 (focus ring / large text).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const light = JSON.parse(readFileSync(join(here, '..', 'src', 'semantic-light.json'), 'utf8'));
const dark = JSON.parse(readFileSync(join(here, '..', 'src', 'semantic-dark.json'), 'utf8'));
const primitive = JSON.parse(readFileSync(join(here, '..', 'src', 'primitive.json'), 'utf8'));

// Semantic files may point at a primitive ({primitive.color.x.y}) the same way
// the token build does; resolve those here so the gate reads a real hex value.
const REF = /^\{(.+)\}$/;
const resolveRef = (value, seen = new Set()) => {
  if (typeof value !== 'string') return value;
  const match = value.match(REF);
  if (!match) return value;
  const path = match[1];
  if (seen.has(path)) throw new Error(`Circular token reference: ${[...seen, path].join(' -> ')}`);
  let cur = { primitive };
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object' || !(part in cur)) {
      throw new Error(`Unresolved token reference: {${path}}`);
    }
    cur = cur[part];
  }
  return resolveRef(cur, new Set([...seen, path]));
};
for (const theme of [light, dark]) theme.brand.mark = resolveRef(theme.brand.mark);

const RGBA_RE = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)$/i;

const hexToRgb = (hex) => {
  const clean = hex.trim().replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return full.match(/../g).slice(0, 3).map((h) => parseInt(h, 16));
};

const compositeOverHex = (color, backdropHex = '#FAF9F6') => {
  const trimmed = String(color).trim();
  const match = trimmed.match(RGBA_RE);
  if (!match) return trimmed;
  const [, rs, gs, bs, as] = match;
  const a = as !== undefined ? Math.min(1, Math.max(0, Number(as))) : 1;
  const [br, bg, bb] = hexToRgb(backdropHex);
  const blend = (fg, back) => Math.round(fg * a + back * (1 - a));
  const toHex = (n) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(blend(Number(rs), br))}${toHex(blend(Number(gs), bg))}${toHex(blend(Number(bs), bb))}`;
};

const lum = (hex) => {
  const c = hexToRgb(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

const ratio = (a, b) => {
  const resolvedBg = compositeOverHex(b, '#FAF9F6');
  const resolvedFg = compositeOverHex(a, resolvedBg);
  const [hi, lo] = [lum(resolvedFg), lum(resolvedBg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [label, fg, bg, minRatio]
const pairs = (s) => [
  ['text-primary on canvas', s['text-primary'], s.canvas, 4.5],
  ['text-primary on surface', s['text-primary'], s.surface, 4.5],
  ['text-secondary on surface', s['text-secondary'], s.surface, 4.5],
  ['text-tertiary on surface', s['text-tertiary'], s.surface, 4.5],
  ['text-inverse on surface-inverse', s['text-inverse'], s['surface-inverse'], 4.5],
  ['on-primary on action.primary', s.action['on-primary'], s.action.primary, 4.5],
  ['destructive on surface', s.action.destructive, s.surface, 4.5],
  ['link on surface', s.action.link, s.surface, 4.5],
  ['visited on surface', s.action.visited, s.surface, 4.5],
  ['brand mark on canvas', s.brand.mark, s.canvas, 3.0],
  ['brand mark on surface', s.brand.mark, s.surface, 3.0],
  ['focus ring on canvas', s.focus, s.canvas, 3.0],
  ['focus ring on surface', s.focus, s.surface, 3.0],
  ...['source', 'evidence', 'insight', 'discussion', 'publication', 'archive'].flatMap((role) => [
    [`knowledge.${role} on surface`, s.knowledge[role], s.surface, 4.5],
    [`knowledge.${role} on canvas`, s.knowledge[role], s.canvas, 4.5],
  ]),
  ['collaboration.suggestion on surface', s.collaboration.suggestion, s.surface, 4.5],
  ['collaboration.suggestion on canvas', s.collaboration.suggestion, s.canvas, 4.5],
  ...['emerging', 'uncertain'].flatMap((status) => {
    const [r, g, b] = hexToRgb(s.trust[status]);
    return ['canvas', 'surface', 'surface-raised'].map((surface) => [
      `${status} badge on ${surface}`, s.domainText[status],
      compositeOverHex(`rgba(${r}, ${g}, ${b}, 0.1)`, s[surface]), 4.5,
    ]);
  }),
];

let failed = 0;
for (const [theme, s] of [['light', light], ['dark', dark]]) {
  for (const [label, fg, bg, min] of pairs(s)) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${theme} ${r.toFixed(2)}:1 (min ${min})  ${label}`);
  }
}
if (failed) {
  console.error(`tokens: contrast check FAILED (${failed} pairs below threshold)`);
  process.exit(1);
}
console.log('tokens: contrast OK — all configured semantic pairs meet WCAG AA');
