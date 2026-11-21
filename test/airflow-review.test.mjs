import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCmsBody } from '../scripts/review-body.mjs';
import { buildPublicEvidence, prepare, root, slug } from '../scripts/prepare-airflow-teardown.mjs';
import { checkDraft } from '../scripts/reme-check.mjs';

const read = (path) => readFileSync(resolve(root, path), 'utf8');
const draft = read(`docs/articles/${slug}.md`);
const intake = JSON.parse(read(`docs/articles/${slug}.intake.json`));
const body = read(`docs/articles/${intake.cmsBodyFile}`);
const snapshot = JSON.parse(read(`docs/articles/evidence/${slug}/github-snapshot.json`));
const publicEvidence = JSON.parse(read(`public${intake.publicEvidencePath}`));
const pin = '619a787ac81e8b7c8a9102fc78e3f0b00625d04e';

function citations(text) {
  return [...new Set([...text.matchAll(/\[(\d+)\]\((https:[^)]+)\)/g)].map((m) => `${m[1]} ${m[2]}`))].sort();
}

test('Airflow draft is a versioned, non-editorial review with metadata inside formatter limits', () => {
  assert.deepEqual(checkDraft(draft), []);
  assert.equal(draft.split('\n')[0], `# ${intake.cmsFields.title}`);
  assert.equal(intake.cmsFields.status, 'draft');
  assert.equal(intake.cmsFields.publicationType, 'review');
  assert.equal(intake.cmsFields.category, 'GitHub Repo Teardowns');
  assert.equal(intake.cmsFields.format, 'Repo Teardown');
  assert.equal(intake.cmsFields.authorId, 'ashif-ahmed-shuvo');
  assert.ok(intake.cmsFields.title.length <= 53);
  assert.ok(intake.cmsFields.summary.length >= 115 && intake.cmsFields.summary.length <= 158);
  assert.match(draft, new RegExp(pin));
  assert.equal(snapshot.reviewedVersion, '3.4.0');
  assert.equal(snapshot.release.tag_name, '3.4.0');
  assert.equal(snapshot.release.prerelease, false);
});

test('Airflow CMS body preserves citations and runtime limits without duplicate reader furniture', () => {
  assert.equal(body, buildCmsBody(draft));
  assert.doesNotMatch(body, /^# |^\*\*By |^\*\*Category:|^### Key findings/m);
  assert.doesNotMatch(body, /@R\d+@|@T\d+@|@SCHEDLOCK@|@SECCOMP@/);
  assert.deepEqual(citations(body), citations(draft));
  assert.equal((body.split('## References')[1].match(/^\d+\. /gm) || []).length, 12);
  assert.match(body, /No Airflow package was installed/);
  assert.match(body, /no upstream tests or security probes were run/);
  assert.match(body, /Human source review and final article approval remain pending/);
  assert.match(body, /not a penetration test/);
  const minutes = Math.max(1, Math.round(body.trim().split(/\s+/).length / 220));
  assert.equal(intake.cmsFields.readTime, `${minutes} min read`);
});

test('Airflow evidence retains pinned source locators, not invented test results or account details', () => {
  assert.equal(snapshot.reviewedCommit, pin);
  assert.equal(snapshot.sources.length, 11);
  const ids = new Set(snapshot.sources.map((source) => source.id));
  for (const source of snapshot.sources) {
    assert.ok(source.url.includes(`/blob/${pin}/`));
    assert.ok(source.apiUrl.endsWith(`?ref=${pin}`));
    assert.match(source.gitBlobSha, /^[a-f0-9]{40}$/);
    for (const excerpt of source.excerpts) {
      assert.equal(excerpt.text.split('\n').length, excerpt.endLine - excerpt.startLine + 1);
    }
  }
  assert.equal(snapshot.claims.length, 12);
  for (const claim of snapshot.claims) {
    assert.ok(ids.has(claim.sourceId));
    assert.ok(claim.locator && claim.limitation && claim.evidenceType);
  }
  assert.deepEqual(publicEvidence, buildPublicEvidence(snapshot, intake.cmsFields.title));
  assert.ok(publicEvidence.sources.every((source) => !('excerpts' in source)));
  assert.doesNotMatch(JSON.stringify(publicEvidence), /user_id|user_metadata|shuvo\.1807016|sb_secret_|CODECOV_TOKEN/);
});

test('Airflow preparation and linked public evidence are present and reproducible offline', () => {
  assert.ok(body.includes(`](${intake.publicEvidencePath})`));
  assert.ok(existsSync(resolve(root, `public${intake.publicEvidencePath}`)));
  assert.match(body, /\]\(\/author\/ashif-ahmed-shuvo\)/);
  assert.match(body, /\]\(\/category\/github-repo-teardowns\)/);
  assert.doesNotThrow(() => prepare(true));
});
