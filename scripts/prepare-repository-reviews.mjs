#!/usr/bin/env node
/** Offline preparation of the ten-review batch. No CMS, publication or network calls. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCmsBody } from './review-body.mjs';
import { upsertChartSection, publicChartInventory } from './review-chart-data.mjs';

export const root = fileURLToPath(new URL('..', import.meta.url));
export const manifestPath = 'docs/articles/repository-review-batch.json';
const read = (path) => readFileSync(resolve(root, path), 'utf8');
export const reviews = JSON.parse(read(manifestPath)).reviews;

export function buildPublicEvidence(snapshot, title, inventory) {
  return {
    title,
    reviewedRepository: snapshot.reviewedRepository,
    reviewedVersion: snapshot.reviewedVersion,
    reviewedCommit: snapshot.reviewedCommit,
    retrievedAt: snapshot.retrievedAt,
    method: snapshot.method,
    scope: 'Curated source identifiers and claim ledger only; no raw API responses, full source excerpts, runtime results or exhaustive security audit.',
    treeScope: snapshot.treeScope,
    sources: snapshot.sources.map(({ id, path, url, apiUrl, gitBlobSha, bytes }) => ({ id, path, url, apiUrl, gitBlobSha, bytes })),
    claims: snapshot.claims,
    chartInventory: publicChartInventory(inventory),
  };
}

export function prepare(check = false) {
  if (reviews.length !== 10 || new Set(reviews.map(({ slug }) => slug)).size !== 10) {
    throw new Error('Expected ten distinct review slugs.');
  }
  for (const { slug, repository, reviewedCommit } of reviews) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Invalid review slug.');
    const intakePath = `docs/articles/${slug}.intake.json`;
    const intake = JSON.parse(read(intakePath));
    const snapshot = JSON.parse(read(`docs/articles/evidence/${slug}/github-snapshot.json`));
    if (snapshot.reviewedCommit !== reviewedCommit || snapshot.reviewedRepository !== `https://github.com/${repository}`) {
      throw new Error(`Evidence identity mismatch: ${slug}`);
    }
    if (intake.cmsFields.status !== 'draft' || intake.cmsFields.publicationType !== 'review') {
      throw new Error(`Only unpublished reviews can be prepared: ${slug}`);
    }
    const inventory = JSON.parse(read(`docs/articles/evidence/${slug}/chart-inventory.json`));
    if (inventory.reviewedCommit !== reviewedCommit || inventory.reviewedRepository !== snapshot.reviewedRepository) {
      throw new Error(`Chart identity mismatch: ${slug}`);
    }
    const draftPath = `docs/articles/${slug}.md`;
    const draft = upsertChartSection(read(draftPath), inventory);
    const body = buildCmsBody(draft);
    const minutes = Math.max(1, Math.round(body.trim().split(/\s+/).length / 220));
    intake.cmsFields.readTime = `${minutes} min read`;
    if (intake.cmsBodyFile !== `${slug}.cms.txt` || intake.publicEvidencePath !== `/evidence/${slug}/inspection-record.json`) {
      throw new Error(`Unexpected output path: ${slug}`);
    }
    const outputs = new Map([
      [draftPath, draft],
      [`docs/articles/${intake.cmsBodyFile}`, body],
      [`public${intake.publicEvidencePath}`, `${JSON.stringify(buildPublicEvidence(snapshot, intake.cmsFields.title, inventory), null, 2)}\n`],
      [intakePath, `${JSON.stringify(intake, null, 2)}\n`],
    ]);
    for (const [path, content] of outputs) {
      if (check) {
        if (read(path) !== content) throw new Error(`Stale preparation output: ${path}`);
      } else {
        mkdirSync(dirname(resolve(root, path)), { recursive: true });
        writeFileSync(resolve(root, path), content);
      }
    }
  }
  console.log(`Ten repository reviews ${check ? 'verified' : 'prepared'} offline; no CMS or network operations.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) throw new Error('Only --check is supported.');
  prepare(args.includes('--check'));
}
