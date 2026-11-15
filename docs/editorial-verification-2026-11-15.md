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

## Continued execution — browser and route checks

- Chromium 153 was obtained in `/tmp`, and NSS/NSPR libraries were built locally from Mozilla sources. The overall NSS tools build stopped on a missing `zlib.h`, but the required shared libraries built successfully. This setup is temporary, not a project dependency or a persistent CI browser.
- Pages Playwright (`test/e2e/token-theme.spec.ts` and `test/e2e/theme.spec.ts`): **10 passed** using local Wrangler and the temporary Chromium. Wrangler warned that fetching `Request.cf` failed and used a placeholder. These checks cover theme preference, explicit light, badge contrast and token aliases, not article layout.
- The existing Pages in-process dispatcher tests (`test/pages/public-routes.test.ts`): **16 passed**, including a seeded article rendered in HTML and an HTTP-shaped 404 response for a missing article. This is not a live Pages network/browser article test.
- A real Next dev-server request to a missing article returned **200** before the fix. The segment's `loading.tsx` caused streaming before `notFound()`. Removed that segment loading boundary; the new `test/browser/next-article.spec.ts` failed with 200 before removal and passed with 404 afterward. Tradeoff: the article-specific skeleton is no longer shown during navigation.
- Next dev-server Playwright: **6 passed**, including 404 and a seeded long-title fixture at widths 320, 390, 768, 1024 and 1440 pixels with reduced motion, no horizontal page overflow, and inline (non-fixed) reading controls. This is automated geometry coverage, not manual visual review, zoom, dark-mode, keyboard or Pages article coverage.
- To reproduce the Next fixture locally, copy `test/fixtures/editorial-cms-posts.json` to `cms-posts.json` in a new temporary directory, start `npm run dev` with `RWM_DATA_DIR` pointing to that directory and blank public Supabase variables, then set `RWM_ARTICLE_FIXTURE=1` and run `npx playwright test --config test/playwright.next.config.ts`. The configuration requires a separately running local server; use `RWM_CHROMIUM_PATH` if needed. Never point fixture setup at production data.
- After the change: `npm test` **1061 passed** (React `act(...)` warnings present); Next production build passed with blank public Supabase variables; `npm run typecheck`, targeted ESLint and `git diff --check` passed. The first typecheck ran concurrently with the Next build and failed because `.next/types` was being rewritten; it passed after the build and dev server were stopped.
- Remaining: Pages browser fixture and article interaction checks, Next actual theme/keyboard/zoom checks, manual visual review, and independent review. The Next 404 was tested against the dev server; production/Worker HTTP status still needs explicit verification.

## Continued reader checks

- Re-ran the Next reader browser tests against `next start` serving the production build with an isolated local CMS fixture: **9 passed**. They cover a real missing-article HTTP 404, five viewport widths with reduced motion and no horizontal page overflow, light/dark content and citation visibility, and keyboard Save activation with persistence across reload. `next start` warned that the app uses `output: standalone`; this is not a test of the standalone server or deployed Worker.
- Local Wrangler Pages reader-tool tests: **5 passed**, including a real HTTP 404 for a missing article and existing bookmark/navigation checks. This does not establish a production Worker result or a seeded Pages article browser test.
- `npm run typecheck`, targeted ESLint and `git diff --check` passed after the added tests. Chromium and its locally built NSS/NSPR libraries remain temporary environment setup, not repository dependencies.
- Still outstanding: a deterministic server-side fixture for Pages browser article layout/interaction, actual 200% zoom and manual visual inspection, standalone/Worker 404 checks, and independent review. The new Next keyboard test confirms the Save control is reachable and operable; it does not by itself audit the visual focus indicator or every control.

## Reader and homepage batch

- Added an opt-in browser integration harness using the real Pages in-process dispatcher, an isolated local CMS fixture and the built Pages client assets. It binds only to loopback and does not expose fixture selection to production. With temporary Chromium/NSS and `RWM_BROWSER_TESTS=1`, **7 tests passed**: article widths 320/390/768/1024/1440 without page overflow, inline controls, dark-theme keyboard Save and persistence, and the homepage clear-search action at mobile size. This harness is not Wrangler/workerd or a deployed Pages browser test.
- The homepage clear-search button was 32px. A new focused test failed before the change; it now passes with a 44×44px button, room for it in the input, a visible focus style, and unchanged clear behavior. The Pages browser harness also measured the 44px target and exercised it.
- Pages build passed with its existing large-chunk warning. Full `npm test` passed **1062 tests**, with six opt-in browser cases skipped at the time of that run; a seventh browser case was added afterward and all seven opt-in cases passed separately. React `act(...)` and React Router future warnings were emitted. Typecheck, targeted lint and `git diff --check` passed after all changes.
- Still needed: real Wrangler/Pages browser testing with a server-side article fixture, 200% zoom and manual visual/focus review, production Worker/standalone verification, independent review and the rest of the homepage, discovery, author, tools and studio batches. The browser integration harness does not validate every image, endpoint, motion state or visual appearance.

## Homepage filters and motion batch

- Category and format filter chips now have 44px minimum height while retaining selection semantics. Hero browse and feed reset/category scrolling use immediate behavior when OS reduced motion or the reader's reduced/static mode is active.
- A browser test caught the document root retaining `scroll-behavior: smooth` in static mode even when descendants were overridden. Both build stylesheets now set the root to `auto` for explicit reduced/static modes. The test failed before and passed after the change.
- `npm test`: 1065 passed, 9 opt-in browser tests skipped; the same nine browser tests were run separately with the local Chromium/in-process Pages harness and passed. Typecheck, targeted ESLint, token checks and Pages build passed; the build retains its large-chunk warning. Tests do not prove workerd article rendering, 200% zoom or manual visual accessibility.

## Discovery actions batch

- The active-column, clear-all and empty-state reset controls now share a 44px minimum height, pill radius, typography and padding, using outlined versus filled styling. Their existing clear-filter callback remains unchanged. A component test failed on the former inconsistent shape before the update and passed after it.
- Pages in-process browser harness: **10 passed**, including a mobile test that selects a column, searches for an absent article, checks the three reset actions and clears the query. One initial browser-test locator was ambiguous because two controls share the accessible name “All columns”; scoping it to the article feed resolved the test, without changing production behavior.
- Pages build, typecheck, targeted lint and token checks passed. Full unit suite: **1066 passed, 10 opt-in browser tests skipped**; those 10 browser cases passed separately. React Router and React act environment warnings remain. This does not complete the broader discovery/author, tools/studio or visual review phases.
