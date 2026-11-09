#!/usr/bin/env node
/**
 * πeme token pipeline — WCAG contrast gate. Fails (exit 1) when a required
 * semantic pair falls below 4.5:1 (normal text) or 3:1 (focus ring / large text).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const light = JSON.parse(readFileSync(join(here, '..', 'src', 'semantic-light.json'), 'utf8'));
const dark = JSON.parse(readFileSync(join(here, '..', 'src', 'semantic-dark.json'), 'utf8'));

const lum = (hex) => {
  const c = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
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
  ['focus ring on canvas', s.focus, s.canvas, 3.0],
  ['focus ring on surface', s.focus, s.surface, 3.0],
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
console.log('tokens: contrast OK — all semantic pairs meet WCAG AA');
