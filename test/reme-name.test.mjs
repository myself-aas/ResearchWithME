import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, lstatSync } from 'node:fs';

// Construct the retired spellings so the guard itself does not reintroduce them.
const retired = new RegExp(`p${'ie'}me|\u03c0eme`, 'iu');

test('tracked paths and text use the current reme identity', () => {
  const paths = execFileSync('git', ['ls-files', '-z']).toString().split('\0').filter(Boolean);
  const stale = [];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    if (retired.test(path)) stale.push(path);
    if (lstatSync(path).isSymbolicLink()) continue;
    const content = readFileSync(path);
    if (content.includes(0)) continue; // Binary assets do not contain searchable text.
    if (retired.test(content.toString('utf8'))) stale.push(path);
  }
  assert.deepEqual(stale, []);
});
