import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { checkDraft } from '../scripts/reme-check.mjs';

const sample = '# A specific review\n\n> Summary: What the reviewed work actually reports.\n\n## Evidence\nA reported result, subject to source review.\n\n## References\n- [Source](https://doi.org/10.1000/example)\n';

test('draft structure check accepts a complete outline without certifying citations', () => {
  assert.deepEqual(checkDraft(sample), []);
});

test('draft structure check rejects missing sections and example links', () => {
  const issues = checkDraft('# First\n# Second\n\n[placeholder](https://example.org/source)\n');
  assert.equal(issues.length, 4);
});

test('changed-drafts and whole-repository checks are read-only and succeed without drafts', () => {
  const changed = execFileSync(process.execPath, ['scripts/reme-check.mjs', '--changed'], { encoding: 'utf8' });
  const all = execFileSync(process.execPath, ['scripts/reme-check.mjs', '--all'], { encoding: 'utf8' });
  assert.match(changed, /no changed article drafts/);
  assert.match(all, /(?:no article drafts|structure OK)/);
});

test('--all checks untracked article drafts; --file reports mechanical failures', () => {
  const path = 'docs/articles/reme-check-fixture.md';
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '# Draft without a summary\n');
  try {
    for (const flag of ['--all', '--file']) {
      const result = spawnSync(process.execPath, ['scripts/reme-check.mjs', flag, ...(flag === '--file' ? [path] : [])], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stdout, /reme-check-fixture.md/);
      assert.match(result.stdout, /Summary:/);
    }
  } finally {
    rmSync(path);
  }
});
