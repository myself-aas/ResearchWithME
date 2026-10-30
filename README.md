# πeme (ResearchWithMe)

An open-access publication of long-form reviews: published papers taken apart, repositories read line by line, and every claim tied to something you can open. Built on the Next.js App Router with React 19 and Tailwind CSS v4, with a Supabase-backed article studio and a local demo adapter.

The interface follows the design system recorded in [`DESIGN.md`](./DESIGN.md) and uses the [Impeccable](https://impeccable.style) workflow and detector. Product context lives in [`PRODUCT.md`](./PRODUCT.md); per-route briefs live in [`.impeccable/surfaces/`](./.impeccable/surfaces).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Node 20.9 or newer. `next.config.ts` sets `output: 'standalone'`, so a production container can run `node .next/standalone/server.js`; `next start` is used for local verification.

## Routes

| Route | Mode | What it does |
| --- | --- | --- |
| `/` | Persuade | Searchable article feed, field browser, featured review, contributor roster |
| `/post/[slug]` | Read | Server-rendered article with takeaways, artifact record, discussion, related reviews |
| `/papers` | Operate | Filterable paper archive with DOI and citation actions |
| `/paper/[slug]` | Read | Structured paper with abstract, methods, findings, references, publication record |
| `/authors`, `/author/[id]` | Operate / Read | Contributor directory and profile with verification record and archive |
| `/editions` | Operate | Quarterly compendiums with browser print-to-PDF |
| `/editorial-board` | Read | Editors and editorial standards |
| `/assistant` | Operate | Catalog-grounded research assistant with citations |
| `/cite` | Operate | APA, MLA, Chicago, IEEE, BibTeX, RIS citation builder |
| `/bookmarks` | Operate | Reading list with Markdown export and clear confirmation |
| `/submit` | Operate | Manuscript intake with validation and failure recovery |
| `/verify` | Operate | Prototype contributor identity and permission model |
| `/write` | Operate | Prototype draft autosave, validation, preview, publish (local archive) |
| `/login` | Operate | Editor sign-in: password or magic link (Supabase), setup guide in demo mode |
| `/dashboard` | Operate | Article studio: new review with Markdown editor, cover library, takeaways |
| `/dashboard/manage` | Operate | Search, filter, publish or revert, delete, live status |
| `/dashboard/edit/[id]` | Operate | Edit a draft or published article |
| `/dashboard/comments` | Operate | Comment moderation with live updates |

Unknown routes and render failures have their own pages (`app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`). Loading states sit inside the studio pages: a global `loading.tsx` boundary would start streaming before a missing article could return a real 404.

## Quality checks

```bash
npm run lint        # ESLint (Next core-web-vitals + TypeScript + jsx-a11y)
npm run typecheck   # tsc --noEmit
npm test            # Vitest: validation, CMS schema/mapping, both storage adapters, ORCID, citations
npm run build       # production build, types enforced
npm run impeccable:source   # Impeccable source detector over app/ and components/
npm run impeccable:url      # rendered detector against a running server
npm run quality     # lint + typecheck + test + source detector
```

For a rendered audit (requires a Chromium-based browser):

```bash
npx impeccable detect --viewport 390x844 http://localhost:3000
```

Current state: no Impeccable findings in source, and none in rendered scans at 1280×800, 390×844, and 320×720; no axe WCAG 2.1 A/AA violations; CLS 0 and LCP under 400 ms on local runs. See [`docs/audit-2026-10-25.md`](./docs/audit-2026-10-25.md).

## Browser tests

The Playwright scripts in `scripts/` drive the running app the way a reader or editor would. They need a Chromium build and a server on `QA_BASE_URL` (default `http://localhost:3000`).

```bash
python -m pip install playwright
python -m playwright install chromium

npm run dev                       # or npm start, in another shell
QA_CHROMIUM_PATH=/path/to/chrome python scripts/qa_sweep.py    # every route: status, headings, duplicate ids, axe WCAG 2.1 AA, overflow, console and network failures
python scripts/qa_flows.py                                     # search, filters, like, save, comment, citation copy, submit validation, ORCID, assistant, mobile menu
python scripts/qa_studio.py                                    # draft → publish → public render → delete, in the local JSON adapter
python scripts/qa_layout.py                                     # gutters, page padding, card columns and rail alignment at 375/768/1024/1440
```

`QA_CHROMIUM_PATH` is optional; set it when the sandbox ships its own Chromium instead of Playwright's download.

Video explainers and the edition trailer only appear when a rendered file exists. `npm run videos:manifest` (also run by `predev` and `prebuild`) lists `public/videos/*.mp4` in `lib/video-manifest.json`; without a file the section stays out of the page instead of loading a 404.

The homepage hero film is authored in HyperFrames at `video/hero/`: five HTML scenes, a TTS narration as the clock, burned-in captions, and variables for its copy and colours. See `video/hero/README.md` for the file map and `SPEC.md` / `REVIEW.md` for the brief and the review. `npm run video:hero:check` runs its lint, layout, motion and contrast pass; a render needs ffmpeg on the machine.

## Deploy (Cloudflare Workers)

Production runs on Cloudflare Workers through the [OpenNext adapter](https://opennext.js.org/cloudflare). The app needs a server (middleware, API routes, the OAuth callback), so it can't be served as a static Cloudflare Pages export. The Worker is `researchwithme` in account `74d241df16b8aaa80914e3dbb6e16758` and serves `https://researchwith.me` plus `https://www.researchwith.me`.

### Where deploys run

`.github/workflows/deploy.yml` has two jobs:

| Trigger | Job | What happens |
| --- | --- | --- |
| `Quality` completes on `main` | `Deploy (production)` | Runs only if Quality succeeded, on the exact commit that passed. Builds, deploys with `npx wrangler deploy`, smoke-tests the site. |
| Actions → Deploy → Run workflow | `Deploy (production)` | Same path, for a manual release. Needs `main` as the ref. |
| Pull request opened / updated | `Preview (PR)` | Builds and runs `npx wrangler versions upload --preview-alias pr-<number>`, then comments the preview URL on the PR. Production traffic does not move. |

Both jobs run `bun install --frozen-lockfile`, `npm run videos:manifest`, `npm run deploy-guard`, `npm run build:worker`. Nothing deploys unverified: production waits for Quality, and the guard refuses a build without CMS values.

`workflow_dispatch` only appears once the workflow is on the default branch, so the first real deploy happens after this PR is merged.

### GitHub secrets and variables

Settings → Secrets and variables → Actions.

| Name | Kind | Where the value comes from |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | secret | Cloudflare dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template, or a custom token with **Account → Workers Scripts: Edit** and **Account → Workers KV Storage: Edit** for this account. |
| `CLOUDFLARE_ACCOUNT_ID` | secret | `74d241df16b8aaa80914e3dbb6e16758` (`npx wrangler whoami` prints it too). The same ID is in `wrangler.jsonc`, so local and CI deploys hit the same Worker. |
| `NEXT_PUBLIC_SITE_URL` | variable | `https://researchwith.me`. Falls back to that value in the workflow, so the variable is optional. |
| `NEXT_PUBLIC_SUPABASE_URL` | secret | Supabase → Project Settings → API → Project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | secret | Supabase → Project Settings → API keys → publishable key (`sb_publishable_…`). |
| `HF_SPACE_NAME`, `HF_TOKEN` | optional secrets | Only needed when the build reaches a Hugging Face Space. |

`NEXT_PUBLIC_*` values are compiled into the Worker at build time, so they must exist when the build runs; changing them means rebuilding. Server-only values (`GEMINI_API_KEY`, `HF_TOKEN`, `REVALIDATE_SECRET`, …) are Worker secrets and are set with `npx wrangler secret put`, not in GitHub.

### `wrangler.jsonc`

One file describes the Worker; every value in it has to resolve or `wrangler deploy` fails.

- `name: researchwithme`, `main: .open-next/worker.js` (the OpenNext bundle), `account_id` as above, `compatibility_date: 2026-10-23` with `nodejs_compat` and `global_fetch_strictly_public`.
- `assets` points at `.open-next/assets` on the `ASSETS` binding; that is where the film (`/videos/hero.mp4`) and the rest of the static files live.
- `routes` declares both custom domains, so Wrangler owns the DNS: it creates a proxied `AAAA` record pointing at `100::` for each host. The zone already runs on Cloudflare's nameservers (`luciana.ns.cloudflare.com`, `evan.ns.cloudflare.com`), which is what makes a custom domain possible. If a deploy reports that a record already exists for `www`, delete the old `www` record once and let Wrangler recreate it.
- `preview_urls: true` is what lets `wrangler versions upload --preview-alias` hand back a link per pull request. The alias points at the newest version for that PR and is replaced on every push; it never receives production traffic.
- `kv_namespaces` binds `NEXT_INC_CACHE_KV` and `NEXT_TAG_CACHE_KV`. One namespace (`researchwithme-opennext-cache`, `8d2dc8f0b1bb4839962ae63df8296b31`) backs both OpenNext caches; their key prefixes don't overlap (see `open-next.config.ts`), and KV is eventually consistent, so a revalidation can take up to about 60 s to show. Each deploy writes about 33 entries, well inside KV's free 1,000 writes a day. To move to another account: `npx wrangler kv namespace create researchwithme-opennext-cache`, then replace both IDs.
- **D1 is not used.** Articles, comments, and studio data live in Supabase Postgres and the Worker never opens a database binding, so there is no `d1_databases` entry — a binding that does not resolve fails the deploy, and declaring one for capacity the app does not have would be a lie in the config. If a feature ever needs D1: `npx wrangler d1 create researchwithme-db`, add `d1_databases` with the returned `database_id` (the commented block in `wrangler.jsonc` is the shape), apply `npx wrangler d1 migrations apply researchwithme-db --remote`, and regenerate types with `npm run cf-typegen`.
- `services` holds the `WORKER_SELF_REFERENCE` binding OpenNext's cache uses to regenerate stale pages; it must match `name`.

### Smoke tests

The deploy job calls `https://researchwith.me/` and `https://researchwith.me/videos/hero.mp4` up to ten times, six seconds apart, and fails the run if either does not answer 200. That covers both halves of the deploy: the Worker rendering and the static assets.

### Turn Cloudflare's own builds off

Cloudflare's **Workers Builds** check fails within a second on every commit in this repo, `main` included, and keeps its log behind the dashboard. Once the Actions deploy has run once: Workers & Pages → `researchwithme` → Settings → Builds → delete the build configuration (or switch auto-build off). Otherwise every push to `main` deploys twice and the red check keeps appearing on commits.

### Local commands

```bash
npm run preview     # OpenNext build, then serve the Worker locally in workerd (:8787)
npm run deploy      # OpenNext build, then deploy with wrangler.jsonc
npm run upload      # OpenNext build, then upload a new version without promoting it
npm run cf-typegen  # regenerate cloudflare-env.d.ts after binding changes
```

- The Worker filesystem is read-only and doesn't persist, so the local JSON fallback can't save anything there. Configure Supabase in production.
- `npm run deploy` and `npm run upload` refuse to build when `NEXT_PUBLIC_SUPABASE_URL` or the publishable key is missing, or when `NEXT_PUBLIC_SITE_URL` still points at localhost. A Worker built that way serves the studio unauthenticated and cannot save a draft; `ALLOW_DEMO_DEPLOY=1` overrides the guard when demo mode is intentional. The same guard runs in CI as `npm run deploy-guard`.
- Production origin is `https://researchwith.me`. Supabase needs `https://researchwith.me/auth/callback` in Authentication → URL Configuration → Redirect URLs, and the same origin as Site URL.
- OpenNext's build is only partly supported on Windows; use WSL or CI for release builds.

## Editorial CMS

The studio writes to Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured. Without them the same interface writes to `data/cms-posts.json` and `data/cms-comments.json`, so the project runs for review without cloud credentials.

- **Database, RLS, storage, realtime:** `supabase/migrations/` (idempotent SQL) with published-only public reads, authenticated editorial writes, append-only comments, a 5 MB public image bucket, and realtime replication.
- **One canonical reader:** published CMS articles are merged into `/`, `/post/[slug]`, the sitemap, and the author record. There is no duplicate `/blog` route.
- **Writes are server-mediated:** `/api/cms/*` validates, rate-limits, checks the request origin, and lets RLS enforce access a second time. No service-role key ships with the app.
- **Cache invalidation:** studio writes revalidate `/` and `/post/[slug]`; an optional Supabase webhook hits `/api/revalidate` with a timing-safe shared secret.
- **Auth:** Supabase email/password and magic links. Magic links return to `/login` to exchange the PKCE code. Accounts are created by an administrator; there is no public sign-up.

`npm run supabase:check` verifies a configured project (URL, key, auth health, tables, bucket) and `npm run supabase:bundle` rebuilds `supabase/setup.sql` for a single paste into the SQL editor.

Full setup, the blueprint-to-code map, the data model, and the security notes are in [`docs/supabase-cms.md`](./docs/supabase-cms.md).

## Data and prototype behavior

- Bundled catalogue, browser reading list, newsletter preference, and submission receipt data remain local JSON or `localStorage`.
- Contributor verification on `/verify` is a **local prototype**: it validates ORCID checksums, GitHub handle syntax, and academic email domains in the browser, then stores a session in `localStorage`. No credentials are sent to ORCID, GitHub, an institution, or Google. Studio authentication is separate and real when Supabase is configured.
- The research assistant answers from the local catalog. With `GEMINI_API_KEY` set it asks Gemini to summarize the same records; without a key it returns a deterministic cited answer.

Environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional. Project URL; enables the Supabase CMS, auth, storage, and realtime. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional. Publishable key (`sb_publishable_…`); RLS protects every table. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted. |
| `REVALIDATE_SECRET` | Optional. Shared secret for the `/api/revalidate` webhook. |
| `GEMINI_API_KEY` | Optional. Enables model-written assistant answers. |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.8-flash`. |
| `HF_SPACE_NAME` | Optional. Private Hugging Face ZeroGPU Space serving Qwen 2.1 AVIF diffusion. |
| `HF_TOKEN` | Optional. Hugging Face user access token for private Space authorization. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, sitemap, robots, and origin checks. Defaults to `https://researchwith.me`. |

## Project layout

```
app/           routes, metadata files (sitemap, robots, manifest, OG image), API handlers
components/    shared UI, studio shell, Markdown editor, auth form
lib/           data access, CMS adapters, Supabase clients, validation, citations, SEO
lib/cms/       schema, mapping, local + Supabase stores, client hooks
lib/supabase/  config, browser/server/public clients, storage upload
supabase/      SQL migrations and setup notes
middleware.ts  session refresh and studio route protection
data/          seed JSON records (runtime state for the local adapters)
.impeccable/   detector config, surface briefs
.agents/       Impeccable skill and its launcher
docs/          audit report, CMS guide, project notes
```

`ResearchWith.me-main/` is a legacy WordPress theme kept for reference only; it is excluded from builds and linting.

## Fonts

The journal is set in the Aptos family: Aptos Serif for headlines and reading copy, Aptos for interface chrome, Aptos Mono for code and data. Aptos is licensed by Microsoft, so this repository does not bundle it; the font stacks in `app/globals.css` use the copy installed on the reader's machine (it ships with Microsoft 365).

Readers without Aptos get Newsreader and Inter. Their variable WOFF2 files are self-hosted in `app/fonts/` and loaded with `next/font/local` so the browser gets preloaded, size-adjusted faces with no layout shift. Both are licensed under the SIL Open Font License 1.1; the licence texts ship next to the files. If you obtain a web-embedding licence for Aptos, add its WOFF2 files to `app/fonts/` and load them with `next/font/local` ahead of the fallbacks.

## Contributing

1. Read `PRODUCT.md` and `DESIGN.md` before changing a surface.
2. Keep the matching brief in `.impeccable/surfaces/` current.
3. Run `npm run quality` and re-run the rendered detector before opening a pull request.
