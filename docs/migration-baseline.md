# Next.js → Pages migration baseline

**Status:** recorded 2026-11-10 on `arena/7e7ed1c5-researchwithme` from the pre-migration Next.js 15.5.28 / OpenNext build. This file freezes the current behavior so the React/Vite Pages port can be checked against it. It is a reference, not a certification.

## What was frozen

| Artifact | Contents |
| --- | --- |
| `test/fixtures/next-api-methods.json` | The 24 operations exported by the 17 route files under `app/api/` (path template + method, sorted). Guarded by `test/contracts/baseline.test.ts`. |
| `test/fixtures/next-http-contract.json` | 61 normalized responses captured from the running Next server: status, allow-listed headers (`content-type`, `cache-control`, `link`, `location`, `allow`, `x-robots-tag`), `<title>`/canonical for HTML, and timestamp-normalized parsed JSON. |

## How the capture ran

- `npm run build` and `npm run start` with `NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= NEXT_PUBLIC_SUPABASE_ANON_KEY= ` (empty) and `RWM_DATA_DIR=/tmp/rwm-capture-data`, a scratch directory seeded with a **copy** of the tracked `data/articles.json` and `data/comments.json`.
- Before capture, `curl -s http://127.0.0.1:3000/` was checked for the production Supabase host from the tracked `.env.production`; the production URL did not appear, and no production credentials were used.
- Tracked files (`data/*.json`) were **not** modified; the capture issued no mutating requests (successful writes are deliberately excluded so the fixture is stable).
- No browser, accessibility or LCP measurement was recorded — see "Blocked" below.
- The fixture records demo-mode behavior with the production project blanked, which is deterministic. Known properties of this mode: `PUBLICATIONS_DATA` is empty (every paper is a 404), the author directory is backed solely by `public.profiles` so `/author/*` is 404 without Supabase, `/api/dashboard/applications` returns 503, and `POST /api/revalidate` returns 503 (no secret configured). The 404/405/415/503 semantics here are the baseline for *unconfigured* deployments; a configured production deployment serves CMS content instead and must be re-measured after the bridge exists.
- The `Link` header on `/` contains font preload URLs with build-specific hashes. Those entries change on every build; they are recorded for completeness but are not reproducible across builds.
- Pages were served via `next start`, which prints a warning under `output: 'standalone'` but responds correctly; `sitemap.xml` is `application/xml`.
- The capture server logged repeated `Failed to load dynamic font … fetch failed` (no route to fonts.googleapis.com from this environment). Requests still succeeded; the failure is a warning, not an error.

## Notable captured behavior (for the parity checklist)

- `/.well-known/api-catalog` GET and HEAD → 200 `application/linkset+json`, 11 linkset groups, `Link: rel="api-catalog"` on both the resource and `/`.
- `/?category=Data%20%26%20Policy` → 307 to `/category/data-policy`.
- `/api/articles` → 200 with 8 seeded articles; `/api/articles/post-1` → 200; `/api/articles/no-such-id` → 404.
- `OPTIONS /api/articles` → 204 with no allow-listed headers; `HEAD /api/articles` → 200 `application/json` with an empty body.
- `POST /api/comments` with malformed JSON → 400; with `text/plain` → 415. Both bodies are `{"error": …}` JSON.
- `POST /api/cms/posts` with `text/plain` → 415.
- `/api/openapi.json` documents 17 paths; `/openapi.json` serves it as `application/json`.
- Seeded comments: 5 records; likes for `post-1`: 342.

## Blocked (not passes)

- **Browser / accessibility / LCP baseline.** No Chromium, Chrome or Playwright browser is installed in this environment and the CDN serving browser downloads is unreachable, so Task 1 could not record zero-violation axe results, screenshots or p75 LCP for the Next build. These must be collected on a capable CI runner (per the migration plan's Task 2/16 gates) with the same seeded demo data before any performance parity claim is made. This is recorded as blocked, not as a pass.

## PR #16 context

The API-discovery work (`/.well-known/api-catalog`, `/openapi.json`, `/api-docs`, the `Link` header) is still unmerged PR #16. The baseline above was captured from that exact tree. If PR #16 is revised before it lands, re-run the capture and review the diff.
