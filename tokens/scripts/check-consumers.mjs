#!/usr/bin/env node
/** Static contract check, not a browser computed-style or variable-cycle check. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--root')) {
  console.error('Usage: node tokens/scripts/check-consumers.mjs [--root directory]');
  process.exit(2);
}
const root = args.length ? resolve(args[1]) : resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const generated = join(root, 'tokens/generated/tokens.css');
if (!existsSync(generated)) {
  console.error('tokens: consumers require tokens/generated/tokens.css; run tokens:build first');
  process.exit(1);
}
const ignored = new Set(['__tests__', '__snapshots__', 'fixtures', 'node_modules', '.git']);
function sourceFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && ['.ts', '.tsx', '.css'].includes(extname(path)) && !/\.(?:test|spec)\.[^.]+$/.test(path) ? [path] : [];
  });
}
const files = ['app', 'components', 'lib'].flatMap((name) => sourceFiles(join(root, name)));
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '');
const declarations = new Set();
for (const path of [generated, ...files.filter((file) => extname(file) === '.css')]) {
  for (const match of withoutComments(readFileSync(path, 'utf8')).matchAll(/(--reme-[\w-]+)\s*:/g)) declarations.add(match[1]);
}
const missing = [];
for (const path of files) {
  const text = withoutComments(readFileSync(path, 'utf8'));
  // Delimiter requirement avoids treating template-literal prefixes as complete names.
  for (const match of text.matchAll(/var\(\s*(--reme-[\w-]+)\s*(?=[,)])/g)) {
    if (!declarations.has(match[1])) missing.push(`${relative(root, path).split('\\').join('/')}: ${match[1]}`);
  }
}
if (missing.length) {
  console.error(`tokens: consumers — ${new Set(missing).size} unresolved references\n${[...new Set(missing)].sort().join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`tokens: consumers OK — 0 unresolved references (${files.length} source files)`);
}
