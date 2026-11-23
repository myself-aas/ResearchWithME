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
