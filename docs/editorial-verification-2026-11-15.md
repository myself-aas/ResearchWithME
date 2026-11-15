# Editorial foundation verification

## Baseline — 2026-11-15

Work on `arena/e6ad9348-researchwithme`; existing modified and untracked files were retained. Overlapping public routes include home, articles, category, post, authors, assistant, bookmarks, cite, settings and API docs. Next additionally has studio/account, pricing, login and other routes; no assumption of full route parity.

- `npm run tokens:check`: passed, configured contrast and consumer checks.
- `npm run typecheck`: passed.
- Focused article/header/theme Vitest: 10 passed.
- `npm test`: **5 failed, 1048 passed**, 140 test files (3 failed, 137 passed). Failures: `evidence-card.test.ts` component aliases; two `theme-typography.test.tsx` font-stack assertions; `tokens-pipeline.test.ts` exact old palette and component background assertions. These assert the pre-refresh palette/fonts; they predate this execution and need reconciliation with the authorized design.
- Pages test build with blank public Supabase variables: passed. Vite warns of a chunk over 500 kB; client entry 900.76 kB minified, 280.11 kB gzip.
- Chromium: no system browser or Playwright browser installation was found. Prior `/tmp/chromium` is absent. Browser-based and manual visual checks are blocked until a functioning browser is supplied. No screenshot, rendered accessibility or responsive check is claimed.

## Theme checks

Updated five stale unit-test expectations to the authorized editorial colors and fonts; see focused Vitest result recorded in the session. Updated browser palette checks and added system-preference/explicit-light coverage, but **browser tests have not run** because Chromium is unavailable.

## Inline execution results

- Corrected existing browser theme expectations for the current colors and added a system-theme/explicit-light test; these Playwright tests are **not run** because no browser is installed.
- Reconciled the five stale unit assertions to the approved typography and semantic palette. Focused tests for those three files: 37 passed.
- Added rendered-component tests for matching article-action classes, failed-like rollback, clipboard failure, and inline reading controls. Six focused tests passed; the geometry assertions inspect classes, not browser-computed layout.
- Added Next component SSR fixture tests for a missing slug invoking `notFound` and a known fixture rendering its title/body. Added Pages loader tests for an unknown slug throwing a 404 `Response` and a known fixture retaining the body. These do **not** prove either HTTP server's end-to-end response, nor Pages component rendering.
- Final `npm test`: 143 files, 1061 tests passed; test runner emitted existing React `act(...)` environment warnings. `npm run typecheck` and `npm run tokens:check`: passed. `npm run lint`: passed with two pre-existing anonymous-default-export warnings in `open-next.config.ts` and `workers/assistant/src/index.ts`.
- Pages test build passed at baseline with the large-chunk warning above. No Next production build, browser tests, actual responsive/zoom/keyboard verification, or independent review ran. The planned Pages server-side fixture and browser article spec remain to be implemented and verified in a browser-capable environment.
