import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCmsBody, buildPublicEvidence, prepare, root, draftPath, intakePath, snapshotPath } from '../scripts/prepare-gta6-teardown.mjs';
import { checkDraft } from '../scripts/reme-check.mjs';

const read = (path) => readFileSync(resolve(root, path), 'utf8');
const draft = read(draftPath);
const intake = JSON.parse(read(intakePath));
const snapshot = JSON.parse(read(snapshotPath));
const cmsBody = read(`docs/articles/${intake.cmsBodyFile}`);
const publicEvidence = JSON.parse(read(`public${intake.publicEvidencePath}`));

function references(markdown) {
  return [...markdown.matchAll(/\[(\d+)\]\((https:[^)]+)\)/g)].map((match) => `${match[1]} ${match[2]}`);
}

test('improved draft retains review classification, identity, and a title that fits the metadata budget', () => {
  assert.deepEqual(checkDraft(draft), []);
  assert.equal(draft.split('\n')[0], `# ${intake.cmsFields.title}`);
  assert.ok(intake.cmsFields.title.length <= 53); // 60 minus " | reme".
  assert.equal(intake.cmsFields.summary.length, 157);
  assert.equal(intake.cmsFields.authorId, 'ashif-ahmed-shuvo');
  assert.equal(intake.cmsFields.publicationType, 'review');
  assert.equal(intake.cmsFields.status, 'draft');
  assert.equal(intake.cmsFields.format, 'Repo Teardown');
});

test('CMS body removes duplicated page furniture but preserves all unique inline citations and safety limits', () => {
  assert.equal(cmsBody, buildCmsBody(draft));
  assert.doesNotMatch(cmsBody, /^# |^\*\*By |^\*\*Category:|^### Key findings/m);
  assert.doesNotMatch(cmsBody, /source="|locator="|Claim \[QUALIFIES\]|Tool Review|Open Research Question/);
  assert.match(cmsBody, /^> \*\*Summary:\*\*/);
  assert.match(cmsBody, /no software execution/);
  assert.match(cmsBody, /not a malware verdict/);
  assert.match(cmsBody, /Human source review and final article approval remain pending/);
  assert.match(cmsBody, /mailto:shuvo\.1807016@bau\.edu\.bd/);
  assert.deepEqual([...new Set(references(cmsBody))].sort(), [...new Set(references(draft))].sort());
  assert.equal((cmsBody.split('## References')[1].match(/^\d+\. /gm) || []).length, 8);
  const minutes = Math.max(1, Math.round(cmsBody.trim().split(/\s+/).length / 220));
  assert.equal(intake.cmsFields.readTime, `${minutes} min read`);
});

test('CMS body links to real application paths and a bundled public inspection record', () => {
  assert.match(cmsBody, /\]\(\/author\/ashif-ahmed-shuvo\)/);
  assert.match(cmsBody, /\]\(\/category\/github-repo-teardowns\)/);
  assert.ok(cmsBody.includes(`](${intake.publicEvidencePath})`));
  assert.ok(existsSync(resolve(root, `public${intake.publicEvidencePath}`)));
  assert.ok(existsSync(resolve(root, 'app/author/[id]/page.tsx')) || existsSync(resolve(root, 'app/author/[slug]/page.tsx')));
  assert.ok(existsSync(resolve(root, 'app/category/[slug]/page.tsx')));
});

test('public evidence is a deterministic curated extract, not account information or executable content', () => {
  assert.deepEqual(publicEvidence, buildPublicEvidence(snapshot, intake.cmsFields.title));
  assert.equal(publicEvidence.reviewedCommit, snapshot.reviewedCommit);
  assert.equal(publicEvidence.retrievedAt, snapshot.retrievedAt);
  assert.equal(publicEvidence.tree.truncated, false);
  assert.equal(publicEvidence.tree.files.length, 4);
  for (const file of publicEvidence.tree.files) {
    const text = snapshot.sources[file.path].text;
    assert.equal(file.bytes, Buffer.byteLength(text));
    const gitBlob = createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
    assert.equal(file.gitBlobSha, gitBlob);
    assert.equal(file.sourceUrl, snapshot.sources[file.path].url);
  }
  assert.equal(publicEvidence.release.id, snapshot.sources.release.data.id);
  assert.equal(publicEvidence.release.assets[0].bytes, snapshot.sources.release.data.assets[0].size);
  assert.ok(snapshot.sources.release.data.body.includes(publicEvidence.release.executionDescription));
  const json = JSON.stringify(publicEvidence);
  assert.doesNotMatch(json, /user_id|user_metadata|shuvo\.1807016|KYTYG-|BEGIN PRIVATE KEY|sb_secret_/);
  assert.ok(Buffer.byteLength(json) < 20_000);
});

test('preparation outputs remain in sync without writing or calling a network service', () => {
  assert.doesNotThrow(() => prepare(true));
});
