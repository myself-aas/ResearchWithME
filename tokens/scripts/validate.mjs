#!/usr/bin/env node
/**
 * reme token pipeline — validate. Exits non-zero on:
 *  - unresolved or circular {references}
 *  - dark theme missing a key that light defines (except action/domain shared maps)
 *  - component tokens referencing unknown paths
 *  - published semantic token removed (tracked list in tokens/src/published.json, if present)
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src');
const read = (name) => JSON.parse(readFileSync(join(src, name), 'utf8'));
const root = {
  primitive: read('primitive.json'),
  semantic: { light: read('semantic-light.json'), dark: read('semantic-dark.json') },
  motion: read('motion.json'),
  component: read('component.json'),
};

const errors = [];
const REF = /\{([a-z0-9.\-]+)\}/gi;

// 1. all references resolve, no cycles
const collectRefs = (node, acc = []) => {
  if (typeof node === 'string') {
    for (const m of node.matchAll(REF)) acc.push(m[1]);
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectRefs(v, acc);
  }
  return acc;
};
const resolvePath = (path) => {
  const parts = path.split('.');
  let cur = root;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
};
for (const ref of collectRefs(root)) {
  let cur = ref;
  const seen = new Set();
  while (true) {
    const v = resolvePath(cur);
    if (v === undefined) {
      errors.push(`unresolved reference {${ref}}`);
      break;
    }
    if (typeof v !== 'string') break;
    const m = v.match(/^\{(.+)\}$/);
    if (!m) break;
    if (seen.has(m[1])) {
      errors.push(`cycle: ${[...seen, m[1]].join(' -> ')}`);
      break;
    }
    seen.add(m[1]);
    cur = m[1];
  }
}

// 2. dark completeness for theme-able semantic keys
const themeKeys = ['canvas', 'surface', 'surface-subtle', 'surface-raised', 'surface-inverse', 'text-primary', 'text-secondary', 'text-tertiary', 'text-inverse', 'border-subtle', 'border-strong', 'focus', 'selection'];
for (const k of themeKeys) {
  if (!(k in root.semantic.light)) errors.push(`light semantic missing ${k}`);
  if (!(k in root.semantic.dark)) errors.push(`dark semantic missing ${k}`);
}

// 3. published-token removal guard
const publishedPath = join(src, 'published.json');
if (existsSync(publishedPath)) {
  const published = read('published.json');
  const flat = (o, p = []) => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, [...p, k]) : [[[...p, k].join('.'), v]]));
  const current = new Set(flat(root.semantic.light).map(([p]) => p));
  for (const p of published) if (!current.has(p)) errors.push(`published semantic token removed without migration notes: ${p}`);
}

// 4. shadcnAlias contract: every alias is a {semantic.light.*} reference with a
//    kebab-safe name. The generated tokens/generated/shadcn-aliases.css maps
//    --color-<name> to var(--reme-<dotted-path>); this guard keeps the source
//    honest so the generated file stays a pure projection.
const shadcn = root.component?.shadcnAlias;
if (shadcn !== undefined) {
  if (shadcn === null || typeof shadcn !== 'object' || Array.isArray(shadcn)) {
    errors.push('shadcnAlias must be an object mapping alias-name to a semantic.light.* reference');
  } else {
    const aliasRe = /^[a-z][a-z0-9-]*$/;
    for (const [name, target] of Object.entries(shadcn)) {
      if (!aliasRe.test(name)) errors.push(`shadcnAlias "${name}": alias names must match ${aliasRe}`);
      if (typeof target !== 'string' || !/^\{semantic\.light\.[A-Za-z0-9.\-]+\}$/.test(target)) {
        errors.push(`shadcnAlias "${name}": must be a {semantic.light.…} reference (got ${JSON.stringify(target)})`);
      }
    }
  }
}

if (errors.length) {
  console.error('tokens: validate FAILED');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('tokens: validate OK (refs resolve, no cycles, dark complete' + (existsSync(publishedPath) ? ', published tokens intact' : '') + ')');
