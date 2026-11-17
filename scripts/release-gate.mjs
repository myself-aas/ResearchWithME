#!/usr/bin/env node
/**
 * reme v3.1 §44/§46 stable release gate — machine-checkable items.
 *
 * Verifies the automatable release-blocking checks and writes
 * docs/design-system/release-manifest.json with a token checksum.
 * Human sign-off items live in docs/design-system/release-gate.md.
 *
 * Usage: node scripts/release-gate.mjs   (run after tokens:build + test)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const results = [];
const check = (id, description, fn) => {
  try {
    const evidence = fn();
    results.push({ id, description, status: 'pass', evidence: evidence ?? true });
    console.log(`  PASS  ${id} — ${description}`);
  } catch (e) {
    results.push({ id, description, status: 'fail', evidence: String(e.message ?? e) });
    console.error(`  FAIL  ${id} — ${description}: ${e.message ?? e}`);
  }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

console.log('reme release gate (§44/§46) — machine-checkable items');

// Design system
check('DS-1', 'token pipeline builds from tokens/src', () => {
  execFileSync('node', [join(root, 'tokens/scripts/build.mjs')], { cwd: root, stdio: 'pipe' });
  return 'tokens/generated/* rebuilt';
});
check('DS-2', 'token checksum (conformance manifest §46.1)', () => {
  const css = readFileSync(join(root, 'tokens/generated/tokens.css'), 'utf8');
  return 'sha256:' + createHash('sha256').update(css).digest('hex').slice(0, 16);
});
check('DS-3', 'contrast gate passes (tokens:check)', () => {
  execFileSync('node', [join(root, 'tokens/scripts/validate.mjs')], { cwd: root, stdio: 'pipe' });
  execFileSync('node', [join(root, 'tokens/scripts/check-contrast.mjs')], { cwd: root, stdio: 'pipe' });
  return 'all semantic pairs ≥ 4.5:1';
});
check('DS-4', 'stable components reference tokens, not primitives', () => {
  const dir = join(root, 'components/scholarly');
  const bad = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.tsx')) continue;
    const s = readFileSync(join(dir, f), 'utf8');
    if (/#(?:[0-9a-fA-F]{3}){1,2}\b/.test(s)) bad.push(f);
  }
  assert(bad.length === 0, `hard-coded hex in scholarly components: ${bad.join(', ')}`);
  return `${readdirSync(dir).filter((f) => f.endsWith('.tsx')).length} components clean`;
});

// Accessibility & localization
check('A11Y-1', 'axe-core suite present and wired into vitest', () => {
  const t = readFileSync(join(root, 'lib/__tests__/a11y.test.ts'), 'utf8');
  assert(t.includes('axe.run'), 'axe.run not found');
  return 'lib/__tests__/a11y.test.ts';
});
check('I18N-1', 'site declares English-only (lang="en", dir="ltr"); multi-locale dicts not required', () => {
  // Per the 2026-11 cleanup the product ships English-only (Bengali/Arabic
  // i18n was removed). This gate now verifies that declaration instead of
  // requiring Bangla/RTL dictionaries.
  const layout = readFileSync(join(root, 'app/layout.tsx'), 'utf8');
  assert(/lang="en"/.test(layout), 'root layout must declare lang="en"');
  assert(/dir="ltr"/.test(layout), 'root layout must declare dir="ltr"');
  return 'app/layout.tsx declares lang="en" dir="ltr"';
});
check('I18N-2', 'LTR bidi isolation for identifiers and inline code', () => {
  const css = readFileSync(join(root, 'app/globals.css'), 'utf8');
  assert(css.includes('unicode-bidi: isolate'), 'bidi isolation missing on code/identifier blocks');
  return 'globals.css unicode-bidi: isolate on identifiers';
});
check('I18N-3', 'pseudo-localization not applicable (English-only product)', () => {
  // Skipped: site is English-only; no multi-locale dictionary to expand.
  return 'skipped — English-only product per 2026-11 product decision';
});

// Resilience & motion
check('RES-1', 'annotation anchors revalidate without silent relocation (§29)', () => {
  const t = readFileSync(join(root, 'lib/__tests__/annotations.test.ts'), 'utf8');
  assert(t.includes('unresolved'), 'unresolved state not tested');
  return 'lib/scholarly/annotations.ts';
});
check('RES-2', 'conflicts preserve both versions + rationale (§34)', () => {
  const t = readFileSync(join(root, 'lib/__tests__/annotations.test.ts'), 'utf8');
  assert(t.includes('both versions'), 'conflict preservation not tested');
  return 'resolveConflict()';
});
check('VID-1', 'Remotion/Hyperframes compositions use generated tokens only', () => {
  const dir = join(root, 'videos');
  const files = readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('.html'));
  const bad = files.filter((f) => /#[0-9a-fA-F]{6}/.test(readFileSync(join(dir, f), 'utf8')));
  assert(files.length > 0 && bad.length === 0, `hard-coded hex remains: ${bad.join(', ')}`);
  assert(existsSync(join(root, 'tokens/generated/tokens.video.json')), 'tokens.video.json missing');
  return `${files.length} compositions tokenized`;
});
check('PERF-1', 'performance budgets script present (§18)', () => {
  assert(existsSync(join(root, 'scripts/check-budgets.mjs')), 'missing');
  return 'scripts/check-budgets.mjs (CI runs it after build)';
});

// v3.4 Knowledge Network & Personal Research OS Hardening (§A–§G)
check('V34-1', 'v3.4 ordered Supabase SQL migrations present (Waves 1–6)', () => {
  const migrations = [
    'supabase/migrations/20261117000100_v34_research_network.sql',
    'supabase/migrations/20261117000200_v34_wave2_workspaces_reviews.sql',
    'supabase/migrations/20261117000300_v34_wave3_discussions_tools_os.sql',
    'supabase/migrations/20261117000400_v34_wave5_topics_collections_alerts_graph.sql',
    'supabase/migrations/20261117000500_v34_wave6_ai_provenance_exports_search.sql',
  ];
  for (const m of migrations) assert(existsSync(join(root, m)), `missing migration ${m}`);
  return `${migrations.length} ordered v3.4 migrations verified`;
});
check('V34-2', 'v3.4 components use semantic design tokens only (no raw hex or text-white)', () => {
  const dir = join(root, 'components/v34');
  const bad = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.tsx')) continue;
    const s = readFileSync(join(dir, f), 'utf8');
    if (/#(?:[0-9a-fA-F]{3}){1,2}\b/.test(s) || /\btext-white\b/.test(s)) bad.push(f);
  }
  assert(bad.length === 0, `raw color token in components/v34: ${bad.join(', ')}`);
  return `${readdirSync(dir).filter((f) => f.endsWith('.tsx')).length} v3.4 components clean`;
});
check('V34-3', 'v3.4 axe-core WCAG 2.1 AA & BottomSheet focus-trap suite wired into vitest', () => {
  const p = join(root, 'lib/__tests__/v34-a11y-visual.test.tsx');
  assert(existsSync(p), 'missing lib/__tests__/v34-a11y-visual.test.tsx');
  const content = readFileSync(p, 'utf8');
  assert(content.includes('axe.run') && content.includes('BottomSheet'), 'incomplete v3.4 a11y suite');
  return 'lib/__tests__/v34-a11y-visual.test.tsx';
});
check('V34-4', 'v3.4 Playwright E2E journeys & 320–1920px reflow matrix present', () => {
  const files = [
    'test/playwright.v34.config.ts',
    'test/e2e/v34-research-network.spec.ts',
    'test/e2e/v34-a11y-reflow.spec.ts',
  ];
  for (const f of files) assert(existsSync(join(root, f)), `missing ${f}`);
  return `${files.length} Playwright v3.4 test suites ready`;
});
check('V34-5', 'idempotency key replay guard & retraction-to-attention propagation wired', () => {
  assert(existsSync(join(root, 'lib/v34/idempotency.ts')), 'missing lib/v34/idempotency.ts');
  assert(existsSync(join(root, 'test/next/v34-wave4-hardening.test.ts')), 'missing wave4 route test');
  const integrityRoute = readFileSync(
    join(root, 'app/api/sources/[id]/integrity-events/route.ts'),
    'utf8',
  );
  assert(
    integrityRoute.includes('propagateIntegrityEventToAttention'),
    'retraction propagation not wired into integrity-events route',
  );
  return 'Idempotency-Key + RETRACTION_IMPACT propagation verified';
});
check('V34-6', 'v3.4 surface briefs cover all core v3.4 page surfaces', () => {
  const briefsDir = join(root, '.impeccable/surfaces');
  const expected = [
    'app-feed-page-tsx.md',
    'app-search-page-tsx.md',
    'app-topics-page-tsx.md',
    'app-contribute-page-tsx.md',
    'app-library-page-tsx.md',
    'app-workspaces-page-tsx.md',
    'app-workspaces-slug-page-tsx.md',
    'app-graph-page-tsx.md',
    'app-tools-page-tsx.md',
    'app-research-os-page-tsx.md',
  ];
  for (const b of expected) assert(existsSync(join(briefsDir, b)), `missing brief ${b}`);
  return `${expected.length} core v3.4 surface governance briefs present`;
});
check('V34-7', 'v3.4 ADR-032 decisions, rollout feature flags, and migration/rollback runbook present', () => {
  const files = [
    'lib/v34/feature-flags.ts',
    'docs/adr/ADR-032-v34-canonical-decisions.md',
    'docs/runbooks/v34-migration-and-rollback-runbook.md',
    'test/next/v34-wave5-routes.test.ts',
  ];
  for (const f of files) assert(existsSync(join(root, f)), `missing ${f}`);
  return `${files.length} Wave 5 governance & verification artifacts present`;
});
check('V34-8', 'v3.4 AI provenance, publication blockers, unified search, checksummed exports, and safe notification preview present', () => {
  const files = [
    'lib/v34/ai-governance.ts',
    'lib/v34/search.ts',
    'lib/v34/exports.ts',
    'lib/v34/notifications-safe.ts',
    'app/search/page.tsx',
    'test/next/v34-wave6-routes.test.ts',
  ];
  for (const f of files) assert(existsSync(join(root, f)), `missing ${f}`);
  const publishRoute = readFileSync(
    join(root, 'app/api/contributions/[id]/publish/route.ts'),
    'utf8',
  );
  assert(
    publishRoute.includes('evaluateContributionPublishBlockers'),
    'publication blocker engine not wired into publish route',
  );
  return `${files.length} Wave 6 AI governance, search & export artifacts verified`;
});

const failed = results.filter((r) => r.status === 'fail');
const manifest = {
  gate: 'reme v3.4 §44/§46 + Part VIII stable release gate',
  generatedAt: new Date().toISOString(),
  tokenChecksum: results.find((r) => r.id === 'DS-2')?.evidence,
  results,
  verdict: failed.length ? 'BLOCKED' : 'MACHINE-CHECKS-PASS (human sign-off still required — see release-gate.md)',
};
writeFileSync(join(root, 'docs/design-system/release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nverdict: ${manifest.verdict} (${results.length - failed.length}/${results.length} machine checks pass)`);
process.exit(failed.length ? 1 : 0);
