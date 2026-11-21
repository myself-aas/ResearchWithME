import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCmsBody } from '../scripts/review-body.mjs';
import { checkDraft } from '../scripts/reme-check.mjs';
import { buildChartSection, validateInventory, upsertChartSection } from '../scripts/review-chart-data.mjs';
import { root, reviews, prepare, buildPublicEvidence } from '../scripts/prepare-repository-reviews.mjs';

const read = (path) => readFileSync(resolve(root, path), 'utf8');
const citations = (text) => [...new Set([...text.matchAll(/\[(\d+)\]\((https:[^)]+)\)/g)].map((m) => `${m[1]} ${m[2]}`))].sort();
const expectedRepos = ['sveltejs/svelte', 'pola-rs/polars', 'nats-io/nats-server', 'OWASP/wstg', 'PostHog/posthog', 'n8n-io/n8n', 'rustdesk/rustdesk', 'makeplane/plane', 'perspective-dev/perspective', 'apache/superset'];

test('batch includes exactly the ten requested repositories with distinct questions and slugs', () => {
  assert.deepEqual(reviews.map(({ repository }) => repository), expectedRepos);
  for (const key of ['slug', 'focus', 'reviewedCommit']) assert.equal(new Set(reviews.map((r) => r[key])).size, 10);
});

for (const { slug, repository, reviewedCommit } of reviews) {
  const intake = JSON.parse(read(`docs/articles/${slug}.intake.json`));
  const draft = read(`docs/articles/${slug}.md`);
  const body = read(`docs/articles/${intake.cmsBodyFile}`);
  const snapshot = JSON.parse(read(`docs/articles/evidence/${slug}/github-snapshot.json`));
  const publicEvidence = JSON.parse(read(`public${intake.publicEvidencePath}`));
  const inventory = JSON.parse(read(`docs/articles/evidence/${slug}/chart-inventory.json`));

  test(`${repository}: source chart is reproducible, scoped, and retained in both article bodies`, () => {
    assert.doesNotThrow(() => validateInventory(inventory));
    assert.equal(inventory.reviewedCommit, reviewedCommit);
    assert.equal(inventory.reviewedRepository, snapshot.reviewedRepository);
    const section = buildChartSection(inventory);
    assert.ok(draft.includes(section));
    assert.ok(body.includes(section));
    assert.equal(upsertChartSection(draft, inventory), draft);
    assert.equal((draft.match(/```chart\n/g) || []).length, 1);
    assert.match(section, /not a complete repository breakdown/);
    assert.match(section, /not benchmarks/);
    for (const group of inventory.groups) {
      assert.ok(section.includes(`${group.label}: ${group.files.length}`));
      assert.ok(section.includes(`| ${group.count} |`));
      assert.equal(group.source.truncated, false);
    }
    assert.ok(publicEvidence.chartInventory.groups.every((g) => !('files' in g)));
  });

  test(`${repository}: metadata is an unpublished review with a pinned source snapshot`, () => {
    assert.deepEqual(checkDraft(draft), []);
    const fields = intake.cmsFields;
    assert.equal(draft.split('\n')[0], `# ${fields.title}`);
    assert.equal(fields.status, 'draft');
    assert.equal(fields.publicationType, 'review');
    assert.equal(fields.format, 'Repo Teardown');
    assert.equal(fields.category, 'GitHub Repo Teardowns');
    assert.equal(fields.authorId, 'ashif-ahmed-shuvo');
    assert.equal(fields.authorName, 'Ashif Ahmed Shuvo');
    assert.equal(intake.requestedAuthor.email, 'shuvo.1807016@bau.edu.bd');
    assert.ok(fields.title.length <= 53);
    assert.ok(fields.summary.length >= 115 && fields.summary.length <= 158);
    assert.ok(draft.includes(reviewedCommit));
    assert.match(draft, /default-branch source snapshot, not a release tag/);
    assert.match(snapshot.reviewedVersion, /not a release review/);
    assert.equal(fields.artifact.identifier, repository);
  });

  test(`${repository}: CMS body preserves evidence and removes duplicate reader furniture`, () => {
    assert.equal(body, buildCmsBody(draft));
    assert.doesNotMatch(body, /^# |^\*\*By |^\*\*Category:|^### Key findings/m);
    assert.doesNotMatch(body, /@[1-9]@|<script|application\/ld\+json/);
    assert.deepEqual(citations(body), citations(draft));
    assert.equal((body.split('## References')[1].match(/^\d+\. /gm) || []).length, snapshot.sources.length);
    assert.match(body, /no upstream tests or security probes were run/);
    assert.match(body, /no runtime measurements were collected/);
    assert.match(body, /Human source review and final article approval remain pending/);
    assert.ok(body.includes(`](${intake.publicEvidencePath})`));
    assert.match(body, /\]\(\/author\/ashif-ahmed-shuvo\)/);
    assert.match(body, /\]\(\/category\/github-repo-teardowns\)/);
    assert.equal(intake.cmsFields.readTime, `${Math.max(1, Math.round(body.trim().split(/\s+/).length / 220))} min read`);
  });

  test(`${repository}: retained evidence has valid locators, claim mappings and public privacy boundaries`, () => {
    assert.equal(snapshot.reviewedCommit, reviewedCommit);
    assert.equal(snapshot.reviewedRepository, `https://github.com/${repository}`);
    assert.ok(snapshot.sources.length >= 5);
    assert.equal(snapshot.claims.length, 6);
    const sources = new Map(snapshot.sources.map((source) => [source.id, source]));
    assert.equal(sources.size, snapshot.sources.length);
    for (const source of sources.values()) {
      assert.ok(source.url.includes(`/blob/${reviewedCommit}/`));
      assert.ok(source.apiUrl.endsWith(`?ref=${reviewedCommit}`));
      assert.match(source.gitBlobSha, /^[a-f0-9]{40}$/);
      assert.ok(source.bytes > 0);
      for (const e of source.excerpts) {
        assert.ok(e.startLine >= 1 && e.endLine >= e.startLine);
        assert.equal(e.text.split('\n').length, e.endLine - e.startLine + 1);
        assert.ok(draft.includes(`L${e.startLine}–L${e.endLine}`));
      }
    }
    for (const claim of snapshot.claims) {
      assert.ok(sources.has(claim.sourceId));
      assert.equal(claim.url, sources.get(claim.sourceId).url);
      assert.ok(claim.locator && claim.limitation && claim.evidenceType && claim.confidence);
    }
    assert.deepEqual(publicEvidence, buildPublicEvidence(snapshot, intake.cmsFields.title, inventory));
    assert.ok(publicEvidence.sources.every((s) => !('excerpts' in s) && !('text' in s)));
    assert.doesNotMatch(JSON.stringify(publicEvidence), /user_metadata|shuvo\.1807016|sb_secret_|CODECOV_TOKEN/);
    assert.equal(snapshot.treeScope.truncated, repository === 'PostHog/posthog');
    if (repository === 'PostHog/posthog') assert.match(body, /tree response was truncated/);
  });
}

test('chart insertion treats regex dollar anchors as literal Markdown and rejects truncated or double-counted data', () => {
  const slug = reviews[0].slug;
  const inventory = JSON.parse(read(`docs/articles/evidence/${slug}/chart-inventory.json`));
  const original = '# T\n\nOriginal prose.\n\n## What can a reader inspect or reproduce?\n\nLimits.\n';
  const section = buildChartSection(inventory);
  const inserted = upsertChartSection(original, inventory);
  assert.ok(inserted.includes(section));
  assert.equal((inserted.match(/Original prose\./g) || []).length, 1);
  assert.equal(upsertChartSection(inserted, inventory), inserted);
  const truncated = structuredClone(inventory);
  truncated.groups[0].source.truncated = true;
  assert.throws(() => validateInventory(truncated), /Truncated/);
  const duplicate = structuredClone(inventory);
  duplicate.groups[0].files.push(duplicate.groups[0].files[0]);
  duplicate.groups[0].count += 1;
  assert.throws(() => validateInventory(duplicate), /Double-counted/);
});

test('batch preparation is reproducible without network or CMS access', () => {
  assert.doesNotThrow(() => prepare(true));
});

test('batch titles and descriptions are unique and SEO evidence matches every intake', () => {
  const seo = JSON.parse(read('docs/audits/repository-review-batch-seo-evidence.json'));
  assert.equal(seo.reviews.length, 10);
  assert.equal(seo.liveVerified, false);
  assert.equal(new Set(seo.reviews.map((r) => r.metadata.title)).size, 10);
  assert.equal(new Set(seo.reviews.map((r) => r.metadata.description)).size, 10);
  for (const { slug } of reviews) {
    const fields = JSON.parse(read(`docs/articles/${slug}.intake.json`)).cmsFields;
    const entry = seo.reviews.find((r) => r.slug === slug);
    assert.equal(entry.metadata.title, fields.title);
    assert.equal(entry.metadata.description, fields.summary);
    assert.equal(entry.metadata.openGraph.title, `${fields.title} | reme`);
    assert.equal(entry.metadata.openGraph.type, 'article');
    assert.equal(entry.metadata.alternates.canonical, `/post/${slug}`);
  }
});
