# SDD ledger — plan: remaining-tasks (post i18n/truthful-copy sweep)

Plan context: complete Tasks 5, 8, 16, 18, 19 from session memory, then execute the Impeccable audit P1/P2/P3 fixes.

Global Constraints:
- `npm run quality` must pass after each task (baseline per spec: typecheck clean, eslint 0 errors — open-next.config.ts anonymous-default warning is pre-existing, Impeccable color advisories are advisory only).
- Cloudflare-pages is frozen but `npm run build:pages` must keep passing.
- Live DB changes only through repo migrations + Task 16 owner data steps; backup first; never commit dumps/emails/user IDs; owner runs Supabase CLI against linked project.
- Truthful copy: never claim ISSN/DOI registration/peer review/editorial board/indexing/fake stats; only named person Ashif Ahmed Shuvo, Editor-in-Chief; keep CC BY 4.0.
- Preserve existing content rendering: `data:` cover branches in post/[slug]/page.tsx and FeaturedArticle.tsx, bundled `/images/…` presets, covers already in blog-images.
- English-only: no i18n, no Bengali/Arabic, lang="en" dir="ltr".
- Removed routes (/paper/[slug], /papers, /editions) keep surface briefs marked status: retired; owner rule: delete nothing in `.impeccable/`.
- Characterisation tests come before each behaviour change; fix assertions for intended changes.

BASE (pre-tasks): cab824c (truthful-copy sweep commit)

Task 5: complete (commit 22b16c9, npm-only lockfile) — verified single package-lock.json (lockfileVersion 3, npm 10.9.8), added `"packageManager": "npm@10.9.8"` and a preinstall guard that aborts installs under pnpm/yarn/bun.
Task 8: complete (commit 3dd8e53, billing-receipt sweep) — confirmed no STRIPE_*/PADDLE_*/BILLING_*/RECEIPT_* env reads and no invoice/receipt email scenarios; documented out-of-scope status in .env.example.
Task 16: complete (commit 63620bb, migration reconciliation) — added idempotent reconciliation migration + owner-facing runbook; no SQL executed against hosted project.
Task 18: complete (commit 0909f09, simplified header) — three-state account/Write CTA block, Studio link for editors, Sign-out, mobile parity; touch targets and aria-labels intact.

## Pre-flight conflict scan
| Shared surface | Tasks | Finding | Ruling |
|---|---|---|---|
| package.json / package-lock.json | 5, 8 (env vars referenced), 19 | Task 5 verifies npm-only lockfile; Task 8 sweeps billing-receipt env usage but doesn't add new deps. | No structural conflict. Run Task 5 first; Task 8 is grep-level verification, no installs. |
| components/BlogHeader.tsx | 18 (simplified header), audit P2 ("DOI" placeholder), audit P1 reader dock is in separate component | Both edits touch BlogHeader. | Run Task 18 after recording audit findings so header polish subsumes the placeholder fix in one pass. |
| supabase/migrations/ | 16 only | Other tasks don't touch migrations. | Task 16 runs independently; generate a reconciliation SQL script but do not apply it. |
| docs/ + README | 19 only | Audit findings mention motion footer, not docs. | Task 19 runs after code tasks. |
| tokens/design system | audit P1 avatar colors, audit P2 OG/icon colors, 18 header | Avatar/OG colors touch files Task 18 doesn't modify. | Run color fixes as part of the audit pass after Task 18. |
| cloudflare-pages/src/ | 18 (nav parity) only | Nav links in Cloudflare routes must mirror Next header; no other tasks touch them. | Include nav parity in Task 18. |

## Todo
- [x] Task 5: npm-only lockfile check — commit 22b16c9
- [x] Task 8: billing-receipt .env/scenario sweep — commit 3dd8e53
- [x] Task 16: Supabase migration reconciliation — commit 63620bb
- [x] Task 18: simplified header polish + editorial-studio sign-in logic — commit 0909f09
- [x] Task 19: doc updates — commit 0f72773
- [x] Audit P1/P2/P3 fixes — commits 60f2010 (P1s + most P2s), b0a7aea (icon/OG color drift)
- [x] Final whole-branch review — quality: 0 tsc errors, 0 eslint errors, 677/677 tests, build:pages clean, impeccable source: 0 findings; branch pushed.

## Final quality gates (post all tasks, HEAD b0a7aea)
* `npm run quality`: tsc 0 errors, eslint 0 errors (1 pre-existing anonymous-default-export warning in open-next.config.ts), vitest 79 files / 677 pass / 0 fail / 1 unchanged skip, impeccable source scan 0 design-system-color advisories.
* `npm run build:pages`: Vite client + SSR build clean; 484 kB server entry.
* `git push origin arena/b233dbaa-researchwithme`: pushed; GitHub PR link printed by remote.
