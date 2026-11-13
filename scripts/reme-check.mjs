#!/usr/bin/env node
/** A deliberately narrow, offline draft-structure check. It cannot fact-check sources. */
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function checkDraft(markdown) {
  const errors = [];
  const headings = [...markdown.matchAll(/^# (.+)$/gm)];
  if (headings.length !== 1 || !headings[0][1].trim()) errors.push('Provide exactly one nonempty level-one title (# ...).');
  if (!/^> Summary:\s*\S/m.test(markdown)) errors.push('Add a nonempty > Summary: line.');
  if (!/^## References\s*$/im.test(markdown)) errors.push('Add a ## References section, even when sources remain to be verified.');
  if (/https?:\/\/(?:www\.)?example\.(?:com|org)\b/i.test(markdown)) errors.push('Replace example.com/example.org placeholder links with verified sources.');
  return errors;
}

function changedDrafts() {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  return [...new Set([
    ...git('diff', '--name-only', '--diff-filter=ACMRT', '-z', 'HEAD', '--', 'docs/articles'),
    ...git('ls-files', '--others', '--exclude-standard', '-z', '--', 'docs/articles'),
  ])].filter((path) => path.endsWith('.md'));
}

function main(args) {
  const files = [];
  let all = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) files.push(args[++i]);
    else if (args[i] === '--all') all = true;
    else if (args[i] !== '--changed') throw new Error(`Unknown option: ${args[i]}`);
  }
  const tracked = () => execFileSync('git', ['ls-files', '-z', '--', 'docs/articles'],
    { cwd: root, encoding: 'utf8' }).split('\0').filter((path) => path.endsWith('.md'));
  const paths = files.length ? files : all ? [...new Set([...tracked(), ...changedDrafts()])] : changedDrafts();
  if (!paths.length) { console.log(`reme: no ${all ? 'article drafts' : 'changed article drafts'} to check.`); return; }
  let failures = 0;
  for (const file of paths) {
    const full = resolve(root, file);
    if (relative(root, full).startsWith('..')) throw new Error(`Outside repository: ${file}`);
    const issues = checkDraft(readFileSync(full, 'utf8'));
    console.log(`${file}: ${issues.length ? issues.join(' ') : 'structure OK; evidence requires human review'}`);
    failures += issues.length;
  }
  if (failures) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`reme check failed: ${error.message}`); process.exitCode = 1; }
}
