#!/usr/bin/env node
/** Local review preparation only: no publishing, account, or network operations. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCmsBody } from './review-body.mjs';

export const root = fileURLToPath(new URL('..', import.meta.url));
export const slug = 'apache-airflow-repo-teardown';

export function buildPublicEvidence(snapshot, title) {
  return {
    title,
    reviewedRepository: snapshot.reviewedRepository,
    reviewedVersion: snapshot.reviewedVersion,
    reviewedCommit: snapshot.reviewedCommit,
    retrievedAt: snapshot.retrievedAt,
    method: snapshot.method,
    scope: 'Curated source identifiers and claim ledger, not raw responses, a complete repository audit, or an Airflow runtime/security test.',
    release: snapshot.release,
    sources: snapshot.sources.map(({ id, path, url, apiUrl, gitBlobSha, bytes }) => ({ id, path, url, apiUrl, gitBlobSha, bytes })),
    claims: snapshot.claims,
  };
}

export function prepare(check = false) {
  const read = (path) => readFileSync(resolve(root, path), 'utf8');
  const draft = read(`docs/articles/${slug}.md`);
  const intakePath = `docs/articles/${slug}.intake.json`;
  const intake = JSON.parse(read(intakePath));
  const snapshot = JSON.parse(read(`docs/articles/evidence/${slug}/github-snapshot.json`));
  const body = buildCmsBody(draft);
  const minutes = Math.max(1, Math.round(body.trim().split(/\s+/).length / 220));
  intake.cmsFields.readTime = `${minutes} min read`;
  const outputs = new Map([
    [`docs/articles/${intake.cmsBodyFile}`, body],
    [`public${intake.publicEvidencePath}`, `${JSON.stringify(buildPublicEvidence(snapshot, intake.cmsFields.title), null, 2)}\n`],
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
  console.log(`Airflow preparation ${check ? 'verified' : 'written'}; no CMS or network operations.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) throw new Error('Only --check is supported.');
  prepare(args.includes('--check'));
}
