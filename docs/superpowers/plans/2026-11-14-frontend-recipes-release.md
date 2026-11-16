# Frontend Recipes and Release Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate visual recipes and documentation, then verify actual runtime behaviour without overstating structural gates.

**Architecture:** Use existing semantic tokens and page families, keep deterministic browser fixtures separate from public routes, and record measured evidence per commit. Cosmetic composition changes follow correctness repairs and require visual owner review.

**Tech Stack:** Next.js 15.5.28, React 19, TypeScript, Tailwind CSS v4, existing Radix/Motion/Zustand, Vitest, Playwright.

**Spec:** [../specs/2026-11-14-frontend-remediation.md](../specs/2026-11-14-frontend-remediation.md); audit evidence is linked there. This plan implements the indicated requirement IDs; the programme index assigns the other requirements.

## Global Constraints

- Work only on `arena/7c1641ff-researchwithme`; do not create, switch, or rename branches/worktrees in this Arena session.
- Preserve Next.js 15.5.28, React 19, Tailwind CSS v4, and Node >=20.9; use `package-lock.json` and `npm ci` when execution is authorized.
- No new production dependency is required; reuse Radix, Zustand, existing motion utilities, Vitest, and Playwright.
- English only. Do not restore removed localization or retired `/papers`, `/paper/[slug]`, or `/editions` routes.
- Keep light canvas `#FAF9F6`, surface `#F3F1EC`, ink `#121214`, secondary ink `#5C5C63`, and primary action `#1D4ED8`; retain the existing Obsidian dark palette.
- Keep Aptos/Aptos Serif/Aptos Mono as installed-name preferences, bundled fallbacks, and body-reading measure <=68ch. Keep useful scientific captions, citations, identifiers, units, and source attribution.
- Normal text contrast >=4.5:1; large text and non-text focus indicators >=3:1 where applicable. Verify composed/tinted states, not only base tokens.
- Responsive verification widths are 320, 768, 1024, and 1440 CSS px, plus 390px phone and short landscape. At 200% zoom, focused content/actions remain reachable without document-level horizontal overflow; technical tables/code may scroll locally.
- Full/reduced/static motion modes remain supported. Reduced motion removes travel/transform motion without hiding state feedback.
- No fabricated study results, contributor portraits, provenance, testimonials, or delivered-media claims. No new generated imagery is required.
- Reading, citations, bookmarks, and assistant access stay free. Preserve existing billing behaviour; catalogue expansion/pricing changes require a separate owner-approved product plan.
- No production requests, Supabase writes, schema application, deployment, destructive cleanup, or email delivery setup without separate authorization.
- Store rollback paths and backwards-compatible reads accompany additive media changes. Do not delete legacy asset fields or backfill invented metadata.
- A source scan, static markup snapshot, suite-presence check, or historical report is not current rendered conformance evidence.

## Review Focus

- Long English titles/scientific Greek symbols must remain legible in social renderers without an assumed browser font (Task 2).
- Missing values and numeric zero must stay distinct in a keyboard-scrollable dense table (Task 1).
- Reduced/static motion and system preference changes must retain feedback without transform travel (Task 1).
- Retired routes or draft pricing PRDs must not silently become active product requirements (Task 3).
- A skipped browser run or suite-presence check must never be reported as an accessibility/performance pass (Task 4).

---

## File and execution map

Files are listed per task below; `Create` means proposed, not already present. Tests and implementation stay in the repository's established folders. No global file reorganization. Commit steps are future implementation checkpoints, not commands executed during planning. Provision existing dependencies with authorized `npm ci` before red/green cycles; missing executables are BLOCKED, not a red regression test. Use the current branch for every commit.

### Task 1: Documented primitive and motion recipes

**Files:**
- Modify: `components/primitives/Text.tsx`
- Modify: `components/primitives/Button.tsx`
- Modify: `components/primitives/Card.tsx`
- Modify: `components/primitives/Box.tsx`
- Modify: `components/primitives/Icon.tsx`
- Modify: `tokens/src/component.json`
- Modify: `components/reader/ArticleSmoothScroll.tsx`
- Modify: `lib/__tests__/reader-dock-lenis.test.tsx`
- Modify: `components/ui/DataTable.tsx`
- Modify: `app/globals.css`
- Modify: `lib/motion/tokens.ts`
- Modify: `tokens/src/motion.json`
- Modify: `docs/design-system/primitives.md`
- Modify: `lib/__tests__/workspace.test.ts`
- Modify: `lib/__tests__/motion-system.test.tsx`
- Modify: `lib/__tests__/design-token-usage.test.ts`
- Create: `test/e2e/recipes.spec.ts`

**Interfaces:** Preserves public primitive APIs. DataTable adds only a focusable labeled overflow region; table caption/scope unchanged. JS motion token exports keep existing names but derive from generated token values. Token/theme prerequisite: tokens plan complete.

- [ ] **Step 1: Write failing regression `recipes_preserve_zero_values_keyboard_overflow_and_suppressed_motion`.** DataTable fixture null/undefined => Not reported, 0=>literal 0; caption/header associations unchanged. Browser 320px: named scroll wrapper focusable and ArrowRight can reveal last column. Assert full/reduced/static resolve the documented durations and reduced/static have no transform travel; token-backed overrides yield expected computed padding/font size/radius.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(table.textContent).toContain("Not reported");
expect(table.textContent).toContain("0"); // distinct null/zero fixture cells
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/workspace.test.ts lib/__tests__/motion-system.test.tsx lib/__tests__/design-token-usage.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Choose documented house recipes: sm/md/lg buttons retain min heights 36/44/48px, rounded-sm default; Card keeps padding none/sm/md/lg/xl as 0/12/16/20/24px. Text body-reading stays 18px/1.7/68ch. Keep Box component-specific padding names explicitly documented rather than silently equating Box lg with Card lg. Align button component radius token to primitive.radius.sm; apply approved icon stroke/size tokens through Icon. Make Text weight prop override variant weight by construction (test page-title + normal emits no font-bold); className is additive-only, not a conflict-resolution API. Document explicit overrides and prefer component variants over global important selectors. Remove a specificity patch only with a computed-style assertion. Correct DataTable mobile comment to semantic horizontal overflow. Derive JS/CSS motion from token source, retaining full/reduced/static contract and no animated scientific values.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/workspace.test.ts lib/__tests__/motion-system.test.tsx lib/__tests__/design-token-usage.test.ts`; expected PASS. Run recipes browser spec in both themes/forced colors/200% zoom. Compare existing Lenis RAF/scroll CPU and interaction behavior against native scrolling on the same reader/viewport; remove/suppress custom scroll only if measured regression or reduced/static mode warrants it, preserving dock progress tests. Record evidence rather than promise a performance gain. Do not mass-migrate all 31 large files: extract only repeated responsibilities touched by approved tasks.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "refactor: consolidate primitive motion and table contracts"` on the current branch. Do not push/deploy as part of this task.

### Task 2: Cross-channel brand adapter

**Files:**
- Create: `lib/og/brand-tokens.ts`
- Modify: `lib/og/brand-image.tsx`
- Modify: `app/opengraph-image.tsx`
- Modify: `app/post/[slug]/opengraph-image.tsx`
- Modify: `app/apple-icon.tsx`
- Modify: `app/icon-512.png/route.tsx`
- Modify: `app/manifest.ts`
- Modify: `emails/_layout.tsx`
- Create: `lib/__tests__/brand-renderer.test.ts`
- Create: `test/e2e/brand-images.spec.ts`

**Interfaces:** Produces immutable `brandImageTokens {canvas,surface,ink,secondary,action}` derived from generated light semantic tokens; exported constant `brandImageFontFamily = "sans-serif"` records an intentional ImageResponse supported fallback. Existing public assets are WOFF2, not an approved Satori TTF/OTF font payload; do not pretend browser font names load them. No font download or browser CSS dependency.

- [ ] **Step 1: Write failing regression `brand_outputs_use_approved_palette_and_supported_glyphs`.** Assert adapter values canvas #FAF9F6/ink #121214/action #1D4ED8. Render short/200-character titles, β and punctuation without font fetch from external hosts; assert responses valid PNG with expected sizes. Capture root/post OG and icon masks to inspect clipping; do not claim pixel font equivalence from token assertions.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(brandImageTokens.canvas).toBe("#FAF9F6");
expect(brandImageTokens.ink).toBe("#121214");
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/brand-renderer.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Use the supported ImageResponse sans-serif fallback explicitly and document it as an intentional channel exception; keep browser/email font stacks intact. No font loader is introduced because only WOFF2 assets were found. Use brand adapter in OG/icon/email layout. Constrain title wrapping and keep icon mark inside central maskable safe zone; add dedicated maskable asset only if inspection proves reuse fails.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/brand-renderer.test.ts`; expected PASS. Run brand-images browser tests and inspect long-title/glyph/circle/squircle masks manually. No network font service, copied logos, or generated fake research screenshots.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: align generated media and email brand tokens"` on the current branch. Do not push/deploy as part of this task.

### Task 3: Content-first discovery and authoritative documentation

**Files:**
- Modify: `components/HomeFeed.tsx`
- Modify: `components/BlogHero.tsx`
- Modify: `components/FeaturedArticle.tsx`
- Modify: `components/ArticleFeed.tsx`
- Modify: `PRODUCT.md`
- Modify: `DESIGN.md`
- Modify: `docs/reme-design-system-v3.1.md`
- Modify: `docs/design-system/page-layout-matrix.md`
- Modify: `docs/design-system/accessibility-baseline.md`
- Modify: `docs/design-system/release-gate.md`
- Modify: `README.md`
- Create: `test/e2e/discovery-hierarchy.spec.ts`

**Interfaces:** Consumes discovery/filter APIs and approved primitive/media recipes. Produces one current documentation contract: English-only active routes, existing live lib/billing/catalogue.ts products, historical results clearly dated. No checkout/catalogue behavior change.

- [ ] **Step 1: Write failing regression `discovery_surfaces_real_review_before_secondary_promotions`.** With real seeded review, browser DOM order asserts purpose/search then first actual review then services/secondary orientation; filtered view has results and no unrelated promotions. Test zero results and long review title at 320/1440. Add source-doc checks that active route list excludes retired routes, current locale says English only, and catalogue references existing canonical product data without hardcoded competing product count.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(firstReviewOrder).toBeLessThan(servicesOrder); // real review and promotion locator order
```

- [ ] **Step 2: Verify red.** Run `npm run test:pages -- test/e2e/discovery-hierarchy.spec.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Compress duplicate orientation instead of removing source information. Keep category browsing and purposeful grids; remove unsupported role-specific stock-photo implications, using typographic category covers if no authorized relevant asset exists. Retain <=68ch reading, reading/free-product boundaries, and approved prices unchanged. Reconcile normative and route docs with current code; mark old accessibility results historical and removed dictionaries retired. Do not treat draft product catalogue PRD as approved expansion.
- [ ] **Step 4: Verify green.** Run `npm run test:pages -- test/e2e/discovery-hierarchy.spec.ts`; expected PASS. Capture before/after screenshots and obtain owner approval for intended hierarchy/photo changes. Verify search/filters and first useful review at required viewports; do not set an arbitrary hero-height metric or fabricate visual evidence.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "design: prioritize research results and reconcile frontend guidance"` on the current branch. Do not push/deploy as part of this task.

### Task 4: Honest release gates and runtime regression matrix

**Files:**
- Modify: `scripts/release-gate.mjs`
- Modify: `scripts/visual-parity.mjs`
- Modify: `test/playwright.config.ts`
- Modify: `.github/workflows/quality.yml`
- Modify: `lib/__tests__/visual-regression.test.ts`
- Create: `test/e2e/frontend-release.spec.ts`
- Create: `test/release-gate-evidence.test.mjs`
- Create: `scripts/release-evidence.mjs`
- Create: `docs/design-system/verification-results.md`

**Interfaces:** Consumes every preceding plan acceptance case. Produces `classifyEvidence(input:{kind:"structural"|"executed"|"manual";executed:boolean;passed?:boolean;blocked?:boolean}):{evidenceKind:"structural"|"executed"|"manual";status:"pass"|"fail"|"blocked"|"not-run"}` in scripts/release-evidence.mjs. Not executed => not-run unless blocked is true; executed with passed=true => pass, otherwise fail. Keeps existing release manifest consumers compatible; add `evidenceKind: "structural"|"executed"|"manual"` and `status: "pass"|"fail"|"blocked"|"not-run"` only with corresponding schema/consumer updates. A structural pass is not a rendered release pass.

- [ ] **Step 1: Write failing regression `release_evidence_cannot_promote_skipped_checks_to_runtime_pass`.** Node test runs isolated gate fixtures: axe test file present but no result => structural only; failed/missing test result => runtime blocked/not-run; contrast labels retain 3:1 focus versus 4.5:1 text. Browser matrix asserts no console exceptions, one main/h1, named controls, no document overflow, keyboard flows, axe full-route results and print coverage at 320/390/768/1024/1440. Test retired routes 404 rather than capturing them as healthy pages.

Assertion excerpt (inside the named test, using its fixtures):
```ts
const structural = classifyEvidence({ kind: "structural", executed: true, passed: true });
assert.equal(structural.evidenceKind, "structural");
const runtime = classifyEvidence({ kind: "executed", executed: false });
assert.equal(runtime.status, "not-run");
```

- [ ] **Step 2: Verify red.** Run `node --test test/release-gate-evidence.test.mjs`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Implement pure classifyEvidence in scripts/release-evidence.mjs and use it from the gate. Keep machine structural checks but label scope accurately; do not assert tests executed from string matching. Correct parity default routes/widths to active inventory including 1024 and preserve explicit retired-route assertions. Label markup snapshots as markup snapshots. Add a named `next-e2e` Playwright project using local Next at port 8791, retain `e2e` Pages at 8788 and the test-only Vite host at 8790. Add a Next webServer command using installed `next dev --hostname 0.0.0.0 --port 8791` with blank public Supabase settings. Shared specs run on both app projects; component-fixture specs use their isolated Vite URL. CI runs existing lint/typecheck/tests/build plus token consumer check, provisions the existing Playwright Chromium browser, and runs both local app projects with deterministic fixtures and traces on failure. If the browser cannot be provisioned, report blocked, not pass. Write commit/browser/viewport/theme/state/manual/blocked evidence, never secrets.
- [ ] **Step 4: Verify green.** Run `node --test test/release-gate-evidence.test.mjs`; expected PASS. Run all preceding unit/browser specs, both themes, reduced/static motion, 200% zoom and forced colors; include Next contract and Pages routes. Record actual LCP/CLS/transferred bytes only when measured. Human screen-reader/low-memory device sign-off stays pending unless performed. Review generated manifest changes deliberately; never update screenshots solely to quiet diffs.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "test: distinguish structural gates from runtime frontend evidence"` on the current branch. Do not push/deploy as part of this task.

### Task 5: Shared cross-runtime stylesheet ownership

**Files:**
- Create: `styles/frontend.css`
- Modify: `app/globals.css`
- Modify: `cloudflare-pages/src/globals.css`
- Modify: `lib/__tests__/design-token-usage.test.ts`
- Modify: `lib/__tests__/tokens-pipeline.test.ts`
- Modify: `test/e2e/recipes.spec.ts`

**Interfaces:** Consumes completed token/theme, navigation, workflow and recipe fixes. Produces one shared base/theme/component CSS import; runtime entrypoints retain Tailwind/font/source setup. No component props change.

- [ ] **Step 1: Write regression `both_runtimes_import_one_semantic_stylesheet`.** Assert both entrypoints import styles/frontend.css exactly once; token consumer checks follow that import; browser fixtures in both targets have identical computed body/field/badge/print styles and typography at matched themes/viewports. Capture baseline screenshots before moving CSS.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(nextEntry).toContain("frontend.css");
expect(pagesEntry).toContain("frontend.css");
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/design-token-usage.test.ts lib/__tests__/tokens-pipeline.test.ts`; expected new shared-import assertion fails, existing tests still run.
- [ ] **Step 3: Implement extraction.** Move shared declarations only, preserving CSS layer/import order, correcting relative generated-token/asset paths from styles/frontend.css and keeping runtime-only font/source rules local. Update test source readers to traverse shared CSS rather than assert declarations live specifically in app/globals.css. Do not delete specificity fixes without the recipe task's replacement assertions.
- [ ] **Step 4: Verify green.** Run the same tests and token consumer gate, then recipes browser matrix against both Next and Pages. Expected no unintended computed-style/screenshot changes. Verify font/network URLs and print after extraction.
- [ ] **Step 5: Review and commit.** Run `git diff --check`; stage only the files above and commit `refactor: share frontend theme and base styles` on the current branch. Do not deploy.

## Completion gate

- [ ] Run `npm run lint`, `npm run typecheck`, and `npm test`; record real results and blockers.
- [ ] Verify the task-specific browser cases with `npm run test:pages` when the existing browser/runtime is available. Read its config: it builds locally with blank public Supabase settings. Do not substitute production or authorized staging without approval.
- [ ] Keep unchanged UI screenshot comparisons strict; require owner review for deliberate visual changes.
- [ ] Report exactly which spec IDs were delivered, tests run, tests blocked, residual risks, and commit IDs. No blanket WCAG or runtime-parity pass from unit results.

## Self-review

Checked requirement coverage, file responsibilities, interface names, five review-focus conditions, and red/green commands. Every focus condition has an owning test below; global cross-system evidence is owned by the governance plan. Requirements outside this plan are mapped in the programme index, not implicitly dropped. Execution must stop on incompatible product/schema decisions rather than improvising them.
