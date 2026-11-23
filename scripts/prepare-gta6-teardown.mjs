#!/usr/bin/env node
/** Offline, deterministic preparation only. Never writes to the CMS or publishes. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCmsBody } from './review-body.mjs';

export const root = fileURLToPath(new URL('..', import.meta.url));
export const slug = 'gta6-kytyps5-repo-teardown';
export const draftPath = `docs/articles/${slug}.md`;
export const intakePath = `docs/articles/${slug}.intake.json`;
export const snapshotPath = `docs/articles/evidence/${slug}/github-snapshot.json`;

export { buildCmsBody } from './review-body.mjs';

export function buildPublicEvidence(snapshot, title) {
  const sources = snapshot.sources;
  return {
    title,
    reviewedRepository: sources.repository.data.full_name,
    reviewedCommit: snapshot.reviewedCommit,
    retrievedAt: snapshot.retrievedAt,
    method: snapshot.method,
    scope: 'Curated inspection record, not raw API responses or a binary/security audit. No account data, access key, or release archive is included.',
    tree: {
      url: sources.tree.url,
      truncated: sources.tree.data.truncated,
      files: sources.tree.data.tree.filter((entry) => entry.type === 'blob').map((entry) => ({
        path: entry.path, bytes: entry.size, gitBlobSha: entry.sha,
        sourceUrl: sources[entry.path].url,
      })),
    },
    release: {
      sourceUrl: sources.release.url,
      id: sources.release.data.id,
      tag: sources.release.data.tag_name,
      publishedAt: sources.release.data.published_at,
      updatedAt: sources.release.data.updated_at,
      executionDescription: 'The game runs on a real PS5, while KittyPS5 streams the video to your PC and sends your controls back to the console.',
      executionDescriptionLocator: 'Release body, How it works paragraph; quoted, not runtime-verified.',
      assets: sources.release.data.assets.map(({ id, name, size, digest }) => ({ id, name, bytes: size, apiReportedDigest: digest })),
      limitation: 'Release text and assets are mutable. Asset digests are API-reported, not independently verified by downloading files.',
    },
    workflows: {
      sourceUrl: sources.workflows.url,
      countAtInspection: sources.workflows.data.total_count,
      limitation: 'Current workflow definitions only, not external or historical CI coverage.',
    },
    claimLocators: [
      { observation: 'The pinned tree contains four files and no emulator implementation or build configuration.', source: sources.tree.url, locator: 'Complete recursive tree; truncated is false.' },
      { observation: 'The README describes an emulator and modules absent from that tree.', source: sources['README.md'].url, locator: 'Introduction, Configuration, Architecture, Roadmap.' },
      { observation: 'The tracked manifest declares build success without source-to-artifact build provenance.', source: sources['metadata/build_manifest_4670.log'].url, locator: 'Entire file, especially Status line.' },
      { observation: 'The license file contains MIT text; no binary authentication is inferred.', source: sources.LICENSE.url, locator: 'LICENSE at the reviewed commit.' },
      { observation: 'The credited upstream describes simple PS4 games and PS5 homebrew, not evidence of this repository running GTA VI.', source: sources.upstream_readme.url, locator: 'Pinned introductory compatibility statement; context only.' },
    ],
  };
}

export function prepare(check = false) {
  const read = (path) => readFileSync(resolve(root, path), 'utf8');
  const draft = read(draftPath);
  const intake = JSON.parse(read(intakePath));
  const snapshot = JSON.parse(read(snapshotPath));
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
  console.log(`Teardown preparation ${check ? 'verified' : 'written'}; no CMS or network operations.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) throw new Error('Only --check is supported.');
  prepare(args.includes('--check'));
}
