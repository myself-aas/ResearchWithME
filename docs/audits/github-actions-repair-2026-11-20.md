# GitHub Actions repair — 2026-11-20

## Reported failures

PR #40, previous head `3c1bf7276ed75c3a3bf42bd3a8dd1656b140a47d`:

- Quality run `44877002675` and LinkedIn Automation Tests run `44877002715`: check annotations report `Property 'glob' does not exist on type 'ImportMeta'` in `tools/review-preview/main.tsx` lines 9–10.
- PR-title run `44877002773`: the title had no accepted conventional release-type prefix.
- A Cloudflare Workers Builds check also failed; its build logs are not exposed in the GitHub check output, so no independent cause is asserted here.

GitHub Actions archived log downloads redirect to a host unavailable in this sandbox. Diagnosis used the job step outcomes and check-run annotations through `gh api`, then reproduced the failures locally.

## Fixes

- Added `tools/review-preview/vite-env.d.ts` importing `vite/client`, supplying the real Vite types for the preview's asset loader instead of inventing a glob signature or disabling typechecking.
- Removed the hero's unused Link/ArrowRight imports left after product-sales removal.
- Updated the About-page navigation regression to expect only the surviving sections and to reject retired funding/pricing links.
- Renamed PR #40 to `feat: add evidence-backed reviews and remove product sales`; the new PR-title run `45089397440` passed.
- Removed the obsolete Python product test step from Quality together with the product source/build/test removal. The remaining quality, build, browser, and release gates are not suppressed or relaxed.

The exact requested GitHub Actions skill command was executed, and its complete output and all three supporting references were read from its supplied temporary directory. The skill's iOS/Android build templates are not applicable to this Next.js web repository; no mobile pipeline was added.

## Clean-install validation

A canonical `npm ci --no-audit --no-fund` succeeded, replacing the earlier selective dependency setup. No dependency manifest or lockfile version changes were needed.

Passed locally:

- `npm run lint`
- `npm run typecheck`
- `npm test`: **171 files / 1,115 tests**
- `npm run test:linkedin`: **9 files / 34 tests** (also included in the full suite)
- `npm run tokens:build && npm run tokens:check`
- `npm run dns:test`: **6 tests**
- `npm run webmcp:test`: **15 tests**
- `npm run impeccable:source`: regex source scan only, not rendered accessibility certification
- `npm run worker:assistant:check`: types, TypeScript, and Worker dry-run; no deployment
- `npm run reme:check`: all 12 draft structures
- `npm run reme:test`: **58 tests**
- `node scripts/v34-backfill-reconcile.mjs --dry-run`: no database mutation
- `npm run build`: complete Next.js production build
- `npm run budgets`: **194.1 KiB gzip / 200 KiB budget**
- `npm run release:gate`: **32/32 machine checks**, not human sign-off
- `git diff --check`

The generated release-manifest timestamp was not retained as a source change. Earlier reports of missing dependencies and failed lint/typecheck/tests in the commerce/skill-cleanup audits describe the previous selectively installed environment; the clean-install results above supersede those validation limits.

## Remote and browser acceptance

The PR-title correction is verified remotely. New code-check runs require the follow-up commit to be pushed; their eventual result must be inspected, not inferred from local success. Browser/E2E acceptance and Cloudflare deployment status are separate from the local unit/build gates.

No article publication, hosted database migration, payment-provider mutation, or manual production deployment was performed as part of this repair.

## Merged-base regressions and follow-up

The first pushed repair (`d7cd784`) fixed the original head-only failures. New PR runs `45089915010` (Quality) and `45089914988` (LinkedIn) test the merge with a newer `main` commit, `d3720216db2a83d769949a71e5f38e014027f17c`, which was absent from the original checkout. Their annotations exposed additional lint errors in `MobileBottomNav` and `EditorToolbar`.

Integrated that main commit into the existing session branch without switching branches, preserving its frontend refactor and newly added skills. Follow-up fixes:

- Derive the mobile active destination directly from the route, removing the effect after an early return. A regression test first reproduced “Rendered fewer hooks than expected” when entering the editor, then passed after the fix.
- Remove unused toolbar state/props and restore the named responsive toolbar groups required by the existing accessibility regression.
- The merged frontend initially raised shell JS to **266.6 KiB**, failing the unchanged 200 KiB budget. Load optional GSAP/ScrollTrigger/Lenis engines and the decorative preloader asynchronously; use the existing lightweight Motion component entry point. The rebuilt shell is **196.3 KiB**. Keep the reading content SSR-visible without a JavaScript-dependent loading overlay.
- Clean up the exact registered animation ticker on unmount rather than attempting to remove a different anonymous function; regression tests verify identity and cleanup.
- Browser axe checks reproduced insufficient contrast from the mobile labels' 0.7 opacity. Keep semantic text colors at full opacity rather than weakening the accessibility gate.

The two skills introduced upstream (`acquire-codebase-knowledge` and `premium-frontend-ui`) are preserved. The earlier six-skill cleanup inventory describes the pre-merge state, not an instruction to remove these incoming skills.

The merged code passes lint, typecheck, **173 Vitest files / 1,119 tests**, production build and the unchanged bundle gate. The isolated production server passes `scripts/verify-v34-live.mjs`, including SSR landmarks, API latency samples, privacy redaction, and authentication redirects. Browser verification uses an externally installed Chromium binary and libraries (no app dependency changes); the first run intentionally stopped after exposing the contrast regression. Final remote/browser results must be checked after the follow-up push.
