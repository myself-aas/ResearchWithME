#!/usr/bin/env node
/**
 * Performance budget gate — πeme v3.1 §18.
 *
 * Reads the production build output (.next) and enforces:
 *  - initial shell JS (chunks referenced by the root layout / app shell)
 *    ≤ 200 KB gzip, excluding editor/graph/video routes;
 *  - reports LCP-relevant largest chunks for review.
 * Run after `next build`:  node scripts/check-budgets.mjs
 * Budgets are overridable via env (PIEME_BUDGET_SHELL_KB) for staged rollout.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const nextDir = join(root, '.next');
if (!existsSync(join(nextDir, 'static'))) {
  console.error('budgets: .next/static not found — run `next build` first');
  process.exit(2);
}

const BUDGET_SHELL_KB = Number(process.env.PIEME_BUDGET_SHELL_KB ?? 200);

const gzipKb = (buf) => gzipSync(buf, { level: 9 }).length / 1024;

// Shell = chunks referenced by the root layout + landing route in Next's
// app-build-manifest, minus any chunk that belongs to editor/graph/video
// routes (those are code-split per §18 and excluded from the shell budget).
const manifestPath = join(nextDir, 'app-build-manifest.json');
if (!existsSync(manifestPath)) {
  console.error('budgets: .next/app-build-manifest.json not found — run `next build` first');
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const shellFiles = new Set([
  ...(manifest.pages['/layout'] ?? []),
  ...(manifest.pages['/page'] ?? []),
]);
const EXCLUDED = /editor|graph|video|remotion|hyperframes|\/app\/(write|editor)/i;
const shellList = [...shellFiles].filter((f) => f.endsWith('.js') && !EXCLUDED.test(f));

const sizes = shellList
  .map((f) => ({ file: '/' + f, kb: gzipKb(readFileSync(join(nextDir, f))) }))
  .sort((a, b) => b.kb - a.kb);
const shellKb = sizes.reduce((a, s) => a + s.kb, 0);

console.log(`budgets: ${sizes.length} JS chunks, shell (non editor/graph/video) = ${shellKb.toFixed(1)} KB gzip (budget ≤ ${BUDGET_SHELL_KB} KB)`);
console.log('budgets: largest chunks:');
for (const s of sizes.slice(0, 5)) console.log(`  ${s.kb.toFixed(1).padStart(8)} KB  ${s.file}`);

if (shellKb > BUDGET_SHELL_KB) {
  console.error(`budgets: FAIL — shell ${shellKb.toFixed(1)} KB > ${BUDGET_SHELL_KB} KB budget (§18)`);
  process.exit(1);
}
console.log('budgets: PASS');
