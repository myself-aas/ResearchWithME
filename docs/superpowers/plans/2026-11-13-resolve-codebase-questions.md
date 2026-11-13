# Resolve Codebase Questions, Replace AI Images, Remove False Claims, and Reconcile Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the owner's answers to the seven `[ASK USER]` questions in `docs/codebase/CONCERNS.md` §6, remove every AI image feature (Hugging Face cover generation and Gemini author avatars), and replace them with JPEG upload plus minimal editing. Images are compressed in the browser and stored in Supabase.

Also remove every placeholder and false claim, including:
  - the ISSN, fake `10.5555/rwm.*` DOIs and journal language
  - fictional editors and seed authors
  - invented statistics and the impact chart

Ashif Ahmed Shuvo is listed as the only Editor-in-Chief. Make the site English-only (no Bangla, no language toggle) and simplify the header to brand, menu items, a search icon and one CTA. Finally, reconcile the live Supabase database with `supabase/migrations/`. The rest of today's working `main` stays intact.

**Architecture:** `main` (Next.js 15 → OpenNext → `researchwithme` Worker, deployed by Cloudflare Workers Builds) is the reference. Characterisation tests come before each behaviour change, and every build-affecting change is proven on a Workers Builds **preview** build before it reaches `main`.

Image processing runs **in the browser**. Canvas decode, crop and encode are native and fast. The Worker runs on the free plan's 10 ms CPU budget, which a WASM encoder would exceed.

Supabase Storage enforces type and size server-side through bucket limits and RLS. URLs are stored in the existing columns: `public.posts.cover_image` and `public.profiles.avatar_url`.

**Tech Stack:** Next.js 15.5.28, React 19, `@opennextjs/cloudflare` 1.20.14, Supabase JS 2 (Storage + Postgres RLS), `react-easy-crop` 6.2.4, Canvas / `createImageBitmap`, Vitest 3 (+ jsdom), npm, GitHub Actions, Cloudflare Workers Builds.

**Spec:** `docs/codebase/CONCERNS.md` (§6, §1) plus the owner's decisions below (2026-11-13). The live-database facts in Decision 13 were read with read-only SQL on 2026-11-13.

## Decisions (owner's answers)

| # | Topic | Decision |
|---|---|---|
| 1 | `.agents/` and `.impeccable/` deleted in `0b799fc` | **Restore everything; delete nothing.** All 128 files return from `0b799fc^`. `config.json` and `surfaces/` go back to `.impeccable/`; the rest stays in `.agents/`. The retired `/verify` brief is kept and marked retired |
| 2 | Build target | **Next.js/OpenNext Worker is canonical.** `cloudflare-pages/` is frozen (not deployed, not deleted). Next handlers get tests; one shared `clientIp()` |
| 3 | Deploy path | **Cloudflare Workers Builds only**, with the production env guard inside the build |
| 4 | Package manager | **npm.** `package-lock.json` only; CI uses `npm ci` |
| 5 | Fonts | **Aptos family:** Aptos Serif (reading and headings), Aptos (UI chrome), Aptos Mono (code/DOIs/metadata). Installed name only, never bundled. Newsreader / Inter / JetBrains Mono stay as fallbacks |
| 6 | Conventional Commits | **Enforce on PR titles** in CI |
| 7 | Email | **Keep; remove `billing-receipt`**; make `PRODUCT.md` accurate |
| 8 | AI images | **Remove all of it:** `/api/generate` (Hugging Face / Qwen covers, `@gradio/client`, `HF_*`), `QwenCoverGenerator` and its prompt builder, and model avatars in `/api/author-avatar`. The route goes entirely; avatars without a photo use the existing deterministic SVG, rendered locally. Gemini stays only for `/api/research-assistant` |
| 9 | Uploads | **JPG/JPEG only, ≤ 512 KB in.** Minimal editor: fixed-aspect crop, zoom, 90° rotate, reset. **Avatar:** 1:1 → 512×512. **Article banner:** 16:9 (matches `app/post/[slug]/page.tsx:214` `aspect-[16/9]`) → 1600×900 plus an 800×450 variant. Output is WebP (JPEG if the browser cannot encode WebP), EXIF stripped, and no upscaling. Stored in Supabase Storage: covers in `blog-images/covers/…`, avatars in a new `profile-images/<user id>/…` bucket |
| 10 | Seed corpus | **Remove** the 8 seed articles and 5 comments in `data/*.json` (fictional bylines, invented likes) and the whole legacy layer (`lib/legacy/`, `lib/db.ts`, the never-applied `20261110000100_legacy_interactions.sql`). The catalogue is CMS posts only, and pages show honest empty states until real posts exist |
| 11 | False claims | **Remove**:<br>• ISSN `2994-0821`<br>• "DOI prefix 10.5555/rwm" and every generated `10.5555/rwm.*` DOI (10.5555 is Crossref's test prefix)<br>• journal language: "diamond open access", "monograph", "verified specialist", "editorial board/office", "peer-reviewed preprint"<br>• `OVERVIEW_STATS`<br>• the four fictional editors<br>• the hash-derived `AuthorImpactRadarChart`<br>• the empty placeholder archives `/papers`, `/paper/[slug]`, `/editions` and `/api/papers*`<br><br>**Keep** the CC BY 4.0 licence statement, worded as the site's own licence |
| 12 | Editors | **One person:** Ashif Ahmed Shuvo, Editor-in-Chief, linked to the live profile `/author/myself-aas`. In the database, keep only the university account's `public.editors` row; the Gmail account becomes a reader |
| 13 | Live database | **Reconcile in place.** Drift found:<br>• the migration log lists 14 migrations (`00001`–`00014`) from an older project<br>• only 5 tables exist (`posts`, `comments`, `editors`, `author_applications`, `profiles`)<br>• `legacy_*` is missing<br>• 10 policies call `private.is_editor()`, which is identical to `public.is_editor()` but not in the repo<br>• the empty private bucket `researchwith-me-media` is orphaned<br><br>Fix: back up, mark the old log reverted, re-push every repo migration (all idempotent), then add one reconcile migration, so the live schema equals the repo. The profile, editor and application rows are kept |
| 14 | Language | **English only.** Remove Bangla entirely, along with the language toggle and the i18n layer (`lib/i18n/`, `components/i18n/`, the `pieme-locale` cookie, Bengali and Arabic font stacks and `[lang]` CSS, the Bengali video tokens). Strings are inlined from `lib/i18n/messages/en.json` |
| 15 | Header | **Brand + menu items + search icon + one CTA.** Menu items: Articles, Writers, Assistant, Reading list, About. The search is an icon button with no `⌘K` badge or text label (the shortcut still works but isn't advertised). CTA: `Start writing` for visitors and readers, `Open studio` for editors. Theme toggle, citation builder, Editor page and sign-in move to the footer or the CTA flow. The locale switcher, digest badge, saved-count pulse and secondary nav leave the header |

## Global Constraints

- Branch `chore/resolve-codebase-questions`. Never push to `main` directly.
- `npm run quality` passes after every task. Baseline: 68 files / 691 passed / 1 skipped, lint 0 errors, typecheck clean, Impeccable 0 findings.
- `main` is the reference. When a characterisation test disagrees with it, fix the **assertion**. Intended behaviour changes:
  - Task 3: rate-limit identity
  - Task 6: font stacks
  - Task 10: AI image removal
  - Tasks 11–12: the upload pipeline
- Image rules, verbatim:
  - **input:** `image/jpeg`, extension `.jpg` or `.jpeg`, magic bytes `FF D8 FF`, ≤ `512 * 1024` bytes
  - **avatar:** aspect 1, output 512×512, minimum crop 256×256, quality 85, ≤ 100 KB
  - **banner:** aspect 16/9, outputs 1600×900 and 800×450, minimum crop 1200×675, quality 82, ≤ 300 KB
  - **all images:** quality floor 70, step 5
- Never upscale: an output's width is `min(target width, crop width)`.
- Existing content keeps rendering:
  - the `data:` cover branches in `app/post/[slug]/page.tsx` and `components/FeaturedArticle.tsx`
  - the bundled `/images/…` presets
  - every cover already in `blog-images`
- Body images uploaded through `components/cms/MarkdownEditor.tsx` are **unchanged**: they still use `uploadBlogImage`, and the `blog-images` bucket limits stay untouched.
- Font roles don't change. Task 6 leaves the Bengali/Arabic stacks alone; Task 17 then removes them, together with all non-English language support.
- Build-affecting tasks (package.json, lockfile, build scripts, global CSS, routes) are verified by a **successful Workers Builds preview build** before merge. OpenNext builds on Windows aren't authoritative.
- Commit types: only `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` (`CLAUDE.md`).
- No changes to `wrangler.jsonc` or KV bindings. The one new migration is idempotent SQL (`CLAUDE.md`).
- New interactive studio widgets are lazy-loaded with `lazyWidget()` from `lib/motion/lazy.tsx` (`CLAUDE.md` motion rules).
- **Truthful copy:** the platform is not a journal. Never claim an ISSN, DOI registration, peer-review process, editorial board, indexing, or statistics the code can't compute from real data. The only named person in shipped copy is **Ashif Ahmed Shuvo, Editor-in-Chief**. CC BY 4.0 stays.
- Removed routes keep their surface briefs, marked `status: retired` (owner rule: delete nothing in `.impeccable/`).
- **Live database rules:**
  - change it only through repo migrations, plus the owner data steps listed in Task 16
  - take a backup first
  - never commit dumps, emails or user IDs
  - all Supabase CLI commands against the linked project are run by the owner (they need the DB password)

  This overrides the earlier "no changes to `supabase/migrations/`" scope only for Tasks 12, 13 and 16.

## Review Focus

1. **Re-pushing every migration against the live database.** Expected: no row is lost (1 profile, editors, 1 application), and no policy is left referencing `private.`. Task 16 requires:
   - a backup
   - a twice-applied local run
   - `--dry-run`
   - before/after counts
2. **The site with zero published posts** (true today: `posts` has 0 rows). Expected: the home, category, sitemap, search, author and `/api/articles` surfaces return honest empty states (200, no error), never a crash or fictional fallback. Pinned in Task 13.
3. **A phone photo with EXIF orientation.** Expected: it stays upright through `createImageBitmap(file, { imageOrientation: 'from-image' })`. Checked manually in Task 11 Step 6.
4. **A browser that can't encode WebP.** Expected: a JPEG is saved instead. Pinned in Task 9.
5. **A profile `avatar_url` on another host.** Expected: the fallback SVG renders, with no `next/image` crash. Pinned in Task 10.

---

### Task 1: Restore `.agents/` and `.impeccable/`, and keep the briefs in sync

**Files:**
- Restore (all 128 files of `0b799fc^:.agents/`):
  - `.agents/agents/`, `.agents/contexts/` (13), `.agents/instructions/`, `.agents/skills/` (impeccable, supabase, supabase-postgres-best-practices, svg-logo-designer), `.agents/workflows/` (historical `deploy.yml` and `quality.yml`), `.agents/hooks.json`, `.agents/hook.cache.json`, `.agents/settings.local.json`
  - `.impeccable/config.json` and `.impeccable/surfaces/*.md` (20 briefs)
- Modify:
  - In 4 dashboard briefs (`app-dashboard-page-tsx`, `-manage-`, `-edit-id-`, `-comments-`), point `primary_target` at the `app/dashboard/(studio)/…` path
  - In `app-verify-page-tsx.md`, add `status: retired`
- Create: 9 briefs: `app-about-page-tsx`, `app-api-docs-page-tsx`, `app-category-slug-page-tsx`, `app-contact-page-tsx`, `app-dashboard-access-page-tsx`, `app-dashboard-applications-page-tsx`, `app-global-error-tsx`, `app-motion-page-tsx`, `app-privacy-page-tsx`
- Test: `lib/__tests__/surface-briefs.test.ts`

**Interfaces:**
- Produces:
  - **Slug rule:** the route file path with `(group)/` segments dropped, `[` and `]` dropped, and `/` and `.` replaced by `-`. Example: `app/dashboard/(studio)/edit/[id]/page.tsx` → `app-dashboard-edit-id-page-tsx`.
  - **Retirement:** briefs with `status: retired` are exempt from the target and orphan checks.

- [ ] **Step 1: Write the failing test** `lib/__tests__/surface-briefs.test.ts`

Walk `app/` with `node:fs` to collect `page.tsx`, `error.tsx`, `not-found.tsx` and `global-error.tsx`. Exclude `app/articles/page.tsx`, which only calls `redirect('/')`.
  - `every page route has a brief`: `existsSync('.impeccable/surfaces/<slug>.md')`. The failure message lists the missing slugs.
  - `every active brief points at a file that exists`: parse `primary_target:` and assert `existsSync`; skip retired briefs.
  - `no active brief is orphaned`: every non-retired `.md` maps to a collected route.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run lib/__tests__/surface-briefs.test.ts` → FAIL (`.impeccable/surfaces` doesn't exist).

- [ ] **Step 3: Restore**

```bash
git checkout 0b799fc^ -- .agents
mkdir -p .impeccable
git mv .agents/config.json .impeccable/config.json
git mv .agents/surfaces .impeccable/surfaces
git ls-files .agents .impeccable | wc -l     # expect 128
```

Edit the 4 dashboard targets and mark the verify brief retired. Write the 9 new briefs in the restored format:
  - frontmatter `version: 1`, `slug`, `primary_target`, `related_targets`
  - then `# Title`, `Mode:`, `## Purpose`, `## First useful result`, `## Direction`, `## Constraints`, `## Checks`

Copy the five `## Constraints` bullets from `app-cite-page-tsx.md` verbatim. Take Purpose and Mode from the page and the README route table.

- [ ] **Step 4: Verify**

Run:
  - `npx vitest run lib/__tests__/surface-briefs.test.ts` → PASS (3)
  - `npm run impeccable:source` → 0 findings
  - `npm run lint` and `npm run typecheck` → unchanged. The restored tree has no JS/TS.

- [ ] **Step 5: Commit**

```bash
git add .agents .impeccable lib/__tests__/surface-briefs.test.ts
git commit -m "chore: restore .agents and Impeccable briefs deleted in 0b799fc"
```

---

### Task 2: Characterisation tests for the production Next API handlers

No production code changes.

**Files:**
- Create: `test/next/support.ts`, `test/next/cms-posts-route.test.ts`, `test/next/articles-like-route.test.ts`, `test/next/revalidate-route.test.ts`

**Interfaces:**
- Consumes:
  - `POST` from `@/app/api/cms/posts/route`
  - `PATCH` from `@/app/api/articles/[id]/route`
  - `POST` from `@/app/api/revalidate/route`
  - `setRateLimitStoreForTesting`, `createMemoryRateLimitStore` from `@/lib/rate-limit`
  - `validPostBody` from `@/test/fixtures/cms`
- Produces: `loadRoute<T>(path: string): Promise<T>` in `test/next/support.ts`. In order, it:
  1. makes a temp dir with `fs.mkdtemp`;
  2. calls `vi.stubEnv('RWM_DATA_DIR', dir)`;
  3. calls `vi.stubEnv(name, '')` for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
  4. calls `vi.resetModules()`;
  5. returns `import(path)`.

- [ ] **Step 1: `test/next/cms-posts-route.test.ts`**

Requests go to `https://researchwith.me/api/cms/posts`, `host: researchwith.me`. Use draft bodies only (`validPostBody({ status: 'draft' })`), because publishing calls `revalidatePath`.
  - `refuses a cross-site origin` → `origin: https://evil.example` → `403`
  - `refuses a non-JSON body` → `content-type: text/plain` → `415`
  - `reports field errors for an empty body` → `{}` → `400`, `body.fieldErrors` is an object
  - `creates a draft` → `201`, `body.post.slug` equals the fixture slug
  - `refuses a duplicate slug` → the second identical POST → `409`

- [ ] **Step 2: `test/next/articles-like-route.test.ts`**

`beforeEach`:
  1. `const { PATCH } = await loadRoute('@/app/api/articles/[id]/route')`
  2. **then** `const rl = await import('@/lib/rate-limit')`
  3. `rl.setRateLimitStoreForTesting(rl.createMemoryRateLimitStore())`

The second import has to come after `loadRoute`, because of `vi.resetModules()`. `afterEach`: `rl.setRateLimitStoreForTesting(null)`.
  - `returns 404 for an unknown article` → `PATCH /api/articles/no-such-id` → `404`
  - `limits one client to 30 likes a minute` → 30 PATCHes with `x-forwarded-for: 203.0.113.7` → all `404`; the 31st → `429` with `Retry-After`

- [ ] **Step 3: `test/next/revalidate-route.test.ts`**
  - `is 503 when no secret is configured` → `vi.stubEnv('REVALIDATE_SECRET', '')` → `503`
  - `rejects a wrong secret` → secret `s3cret`, header `x-revalidate-secret: wrong` → `401`

- [ ] **Step 4: Run them**

Run: `npx vitest run test/next` → PASS on the first run. If a status differs, check `docs/migration-baseline.md` and the matching `test/pages/*` test, then fix the **assertion**.

- [ ] **Step 5: Commit**

```bash
git add test/next
git commit -m "test: pin production Next API handler behaviour"
```

---

### Task 3: One `clientIp()` for both targets, preferring `cf-connecting-ip`

**Files:**
- Modify:
  - `lib/rate-limit-core.ts` (add `clientIp`)
  - `lib/rate-limit.ts` (`clientKey` uses it)
  - `cloudflare-pages/src/server/http.ts` (re-export the core `clientIp`)
- Test: `lib/__tests__/rate-limit.test.ts`, `test/next/articles-like-route.test.ts`

**Interfaces:**
- Produces:
  - `export function clientIp(request: Request): string` in `lib/rate-limit-core.ts`. Order: `cf-connecting-ip`, then the first comma-separated `x-forwarded-for` entry, then `x-real-ip`, then `'local'`. Each value is trimmed and `.slice(0, 64)`.
  - `clientKey(request, scope)` returns `` `${scope}:${clientIp(request)}` `` in both targets.

- [ ] **Step 1: Write failing tests**

`lib/__tests__/rate-limit.test.ts`, `describe('clientKey')`:
  - `prefers cf-connecting-ip over x-forwarded-for` → `'likes:203.0.113.7'`
  - `falls back to the first x-forwarded-for entry`: `' 198.51.100.1 , 10.0.0.1'` → `'likes:198.51.100.1'`
  - `falls back to x-real-ip, then local` → `'likes:192.0.2.5'`, then `'likes:local'`
  - `truncates to 64 characters`: `'a'.repeat(100)` → length `'likes:'.length + 64`

`test/next/articles-like-route.test.ts`: `cannot be bypassed by rotating x-forwarded-for` (31 PATCHes, `cf-connecting-ip: 203.0.113.7`, `x-forwarded-for: 10.0.0.${i}`) → the 31st is `429`.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run lib/__tests__/rate-limit.test.ts test/next/articles-like-route.test.ts` → FAIL (`prefers cf-…`, `truncates`, bypass).

- [ ] **Step 3: Implement**

Add `clientIp` to the core. `lib/rate-limit.ts` `clientKey` calls it. Pages `http.ts`: `export { clientIp } from '@/lib/rate-limit-core';`, and keep its `clientKey`.

- [ ] **Step 4: Verify**

Run:
  - `npx vitest run lib/__tests__/rate-limit.test.ts test/next test/pages` → PASS
  - `npm run quality` → PASS
  - `npm run build:pages` → exit 0

- [ ] **Step 5: Commit**

```bash
git add lib/rate-limit-core.ts lib/rate-limit.ts cloudflare-pages/src/server/http.ts lib/__tests__/rate-limit.test.ts test/next/articles-like-route.test.ts
git commit -m "fix: key rate limits on cf-connecting-ip so x-forwarded-for cannot rotate them"
```

---

### Task 4: Workers Builds is the deploy path, guarded

**Files:**
- Modify: `scripts/build-next-or-worker.mjs`, `README.md` (:109), `docs/deployment.md` (:42, the `deploy.yml` sections around :542–:768)

**Interfaces:**
- Consumes: `scripts/check-production-env.mjs`. Exit 0 = OK, 1 = blocked; honours `ALLOW_DEMO_DEPLOY=1`.

- [ ] **Step 1: Prove the guard passes in a clean checkout**

```bash
git worktree add ../rwm-guard-check HEAD
cd ../rwm-guard-check && node scripts/check-production-env.mjs; echo "exit=$?"
cd - && git worktree remove ../rwm-guard-check
```

Expected: `Production build environment looks right (https://bxyjjbclaklzjxeumeat.supabase.co, default site URL)` and `exit=0`. If it fails, **stop the task**.

- [ ] **Step 2: Wire the guard**

In the `isWorkersCI && !isInnerBuild` branch, **before** the OpenNext build, add:

```js
execFileSync(process.execPath, [join(root, 'scripts', 'check-production-env.mjs')], { cwd: root, stdio: 'inherit' })
```

- [ ] **Step 3: Fix the docs**
  - `README.md`: Workers Builds deploys (production on `main`, previews elsewhere); there is no GitHub deploy workflow; the build runs the guard first.
  - `docs/deployment.md`: set the `Deploy` row to "**Removed** from `.github/workflows/` in `85465ce` (historical copy at `.agents/workflows/deploy.yml`); Cloudflare Workers Builds deploys". Add a one-line "historical" note atop each `deploy.yml` section, deleting nothing.

- [ ] **Step 4: Verify on a preview build:** `npm run quality` → PASS; push; the log shows `Production build environment looks right`, then a successful `wrangler preview`.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-next-or-worker.mjs README.md docs/deployment.md
git commit -m "chore: guard Workers Builds deploys and document it as the deploy path"
```

---

### Task 5: npm is the package manager

**Files:**
- Delete: `bun.lock`
- Modify:
  - `package.json`: remove `"packageManager": "bun@1.4.4"`
  - `.github/workflows/quality.yml`
  - `README.md` (Run it)
  - `open-next.config.ts` (comment only; keep `buildCommand: 'npm run build'`)
  - `CLAUDE.md`, `docs/deployment.md` (wherever they say Bun)

- [ ] **Step 1:** Record the install line from the latest successful `main` build log.
- [ ] **Step 2: Switch**
  - `git rm bun.lock`
  - remove `packageManager`
  - `quality.yml`: drop `oven-sh/setup-bun@v2`; `actions/setup-node@v4` with `cache: npm`; `npm ci`; `bun run` → `npm run`
  - README: `npm ci` / `npm run dev`, plus "Node 20.9 or newer. `package-lock.json` is the only lockfile, and CI installs with `npm ci`."
- [ ] **Step 3: Verify locally**

Run `npm ci` → exit 0; `npm run quality` → PASS. Then `git grep -n -iw "bun" -- README.md CLAUDE.md package.json .github docs/deployment.md` → no output.

- [ ] **Step 4: Verify on a preview build:** the install step uses npm, and the build and GitHub `Quality` pass.
- [ ] **Step 5: Commit**

```bash
git add -A bun.lock package.json .github/workflows/quality.yml README.md open-next.config.ts CLAUDE.md docs/deployment.md
git commit -m "chore: make npm the only package manager"
```

---

### Task 6: Aptos family first, existing faces as fallbacks

**Files:**
- Modify:
  - `app/globals.css:16-23`, `cloudflare-pages/src/globals.css:50-57`
  - `app/layout.tsx:11-14` (comment)
  - `DESIGN.md` (:50-114 frontmatter, :152 prose)
  - `README.md` (Fonts)
  - `docs/pieme-design-system-v3.1.md` (one-line note)
  - `CLAUDE.md`, `PRODUCT.md`
- Test: `lib/__tests__/theme-typography.test.tsx`

**Interfaces:**
- Produces, in both CSS files (names only; no `@font-face`, no CDN):
  - `--font-serif: 'Aptos Serif', var(--font-newsreader), 'Newsreader', Georgia, Cambria, "Times New Roman", serif;`
  - `--font-sans: 'Aptos', var(--font-inter), 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;`
  - `--font-mono: 'Aptos Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;`

- [ ] **Step 1: Write the failing test.** In the existing `it.each` over both CSS files, add:
  - `toMatch(/--font-serif:\s*'Aptos Serif',\s*var\(--font-newsreader\)/)`
  - `toMatch(/--font-sans:\s*'Aptos',\s*var\(--font-inter\)/)`
  - `toMatch(/--font-mono:\s*'Aptos Mono',\s*'JetBrains Mono'/)`
  - `not.toMatch(/@font-face[^}]*Aptos/)`
- [ ] **Step 2: Run it:** `npx vitest run lib/__tests__/theme-typography.test.tsx` → FAIL on the three stacks.
- [ ] **Step 3: Implement** the three variables and comment blocks, leaving `[lang="bn"]`, `[lang="ar"]` and `next/font/local` as they are. Docs:
  - `DESIGN.md`: each `fontFamily` leads with the Aptos name and keeps the old stack; update :152.
  - `README.md` Fonts: same.
  - `docs/pieme-design-system-v3.1.md`: add "2026-11-13: Aptos family leads each stack; these faces are fallbacks".
  - `CLAUDE.md`: "Aptos Serif is primary (headings + reading copy)".
  - `PRODUCT.md`: confirm it matches.
- [ ] **Step 4: Verify**
  - the typography test → PASS
  - `npm run quality` → PASS
  - `npm run impeccable:source` → 0 findings (if `design-system-font` flags a fallback face, fix DESIGN.md)
  - `npm run build:pages` → exit 0
- [ ] **Step 5: Visual check**

`npm run dev`. With Aptos installed (Windows 11 + Microsoft 365), DevTools → Rendered Fonts shows:
  - Aptos Serif on `/post/[slug]` body text
  - Aptos on the header
  - Aptos Mono on a DOI

Without Aptos, Newsreader / Inter / JetBrains Mono render as today. Push and confirm the preview build.
- [ ] **Step 6: Commit**

```bash
git add app/globals.css cloudflare-pages/src/globals.css app/layout.tsx DESIGN.md README.md docs/pieme-design-system-v3.1.md CLAUDE.md PRODUCT.md lib/__tests__/theme-typography.test.tsx
git commit -m "feat: lead font stacks with the Aptos family, keeping self-hosted faces as fallbacks"
```

---

### Task 7: Enforce Conventional Commits on PR titles

**Files:**
- Create: `.github/workflows/pr-title.yml`

- [ ] **Step 1: Create the workflow**
  - Trigger: `pull_request_target`, types `[opened, edited, synchronize, reopened]`
  - `permissions: { pull-requests: read }`
  - Job: `amannn/action-semantic-pull-request@v5` with `GITHUB_TOKEN`, `types` exactly `feat fix docs refactor test chore`, `requireScope: false`
- [ ] **Step 2: Verify:** a PR titled `chore: resolve codebase questions` passes. Retitled `Resolve codebase questions`, it fails. Restore the title.
- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pr-title.yml
git commit -m "chore: require Conventional Commit PR titles"
```

Owner follow-up (GitHub → Settings → Branches → `main`): require `Quality` and `pr-title`, and block direct pushes.

---

### Task 8: Drop the `billing-receipt` email scenario

**Files:**
- Delete: `emails/billing-receipt.tsx`
- Modify:
  - `lib/email/scenarios.ts`
  - `lib/email/components.ts` (:1, :21)
  - `.env.example` (`RESEND_TPL_BILLING_RECEIPT`)
  - `docs/email-scenarios.md`
  - `PRODUCT.md` (email line)
- Test: `lib/__tests__/email-scenarios.test.ts`

- [ ] **Step 1:** Remove `'billing-receipt'` from the expected list (`:24`), leaving `welcome`, `verify-email`, `password-reset`, `security-alert`, `support-reply`.
- [ ] **Step 2:** `npx vitest run lib/__tests__/email-scenarios.test.ts` → FAIL (6 vs 5).
- [ ] **Step 3:** Remove the scenario. Set the `PRODUCT.md` email line to "No email is sent at runtime. A Resend scenario library exists in `lib/email/` and `emails/`, but no route calls it."
- [ ] **Step 4: Verify**
  - `npx vitest run lib/__tests__/email-scenarios.test.ts lib/__tests__/email-send.test.ts test/pages` → PASS
  - `git grep -n "billing-receipt\|BILLING_RECEIPT"` → no output
  - `npm run quality` → PASS
- [ ] **Step 5: Commit**

```bash
git add -A emails lib/email lib/__tests__/email-scenarios.test.ts .env.example docs/email-scenarios.md PRODUCT.md
git commit -m "refactor: remove the billing-receipt email scenario; the product has no billing"
```

---

### Task 9: Image policy, encoder budget, and URL helpers (pure functions)

**Files:**
- Create: `lib/images/policy.ts`, `lib/images/encode.ts`, `lib/images/urls.ts`
- Test: `lib/__tests__/image-policy.test.ts`, `lib/__tests__/image-encode.test.ts`, `lib/__tests__/image-urls.test.ts`

**Interfaces:**

Produces, in `lib/images/policy.ts`:
  - `export type ImageKind = 'avatar' | 'banner'`
  - `export type Size = { width: number; height: number }`
  - `export const MAX_INPUT_BYTES = 512 * 1024`
  - `export const IMAGE_POLICY: Record<ImageKind, { aspect: number; outputs: Size[]; minCrop: Size; quality: number; minQuality: number; maxOutputBytes: number }>`. Quality is an integer percent; the step is 5.
    - `avatar`: `{ aspect: 1, outputs: [{width:512,height:512}], minCrop: {width:256,height:256}, quality: 85, minQuality: 70, maxOutputBytes: 100*1024 }`
    - `banner`: `{ aspect: 16/9, outputs: [{width:1600,height:900},{width:800,height:450}], minCrop: {width:1200,height:675}, quality: 82, minQuality: 70, maxOutputBytes: 300*1024 }`
  - `export function validateJpegInput(file: { name: string; type: string; size: number }, head: Uint8Array): string | null`
  - `export function outputSizes(kind: ImageKind, crop: Size): Size[] | { error: string }`. Each width is `min(target.width, round(crop.width))`, height is `round(width / aspect)`, and duplicates are removed.

Produces, in `lib/images/encode.ts`:
  - `export type Encoder = (type: 'image/webp' | 'image/jpeg', quality: number) => Promise<Blob | null>`, where quality is 0–1
  - `export async function encodeWithinBudget(encode: Encoder, kind: ImageKind): Promise<{ blob: Blob; type: 'image/webp' | 'image/jpeg'; quality: number }>`. Algorithm:
    1. Start with WebP at `quality`.
    2. If the encoder returns `null` or a blob whose `type` isn't `image/webp`, switch to JPEG at the same quality and stay on JPEG.
    3. While `blob.size > maxOutputBytes`, drop quality by 5 down to `minQuality`.
    4. If it's still over at `minQuality`, throw.

Produces, in `lib/images/urls.ts` (uses `SUPABASE_URL` from `@/lib/supabase/config`):
  - `export function isProfileImageUrl(url: string | null | undefined): boolean` → same origin as `SUPABASE_URL`, and the path starts with `/storage/v1/object/public/profile-images/`
  - `export function uniqueImageId(): string` → `` `${Date.now().toString(36)}-${8 random chars from [a-z0-9]}` ``. Covers (Task 11) and avatars (Task 12) both use it.
  - `export function isProcessedCover(url: string): boolean` → path matches `^/storage/v1/object/public/blog-images/covers/\d{4}/\d{2}/[a-z0-9]+-[a-z0-9]{8}\.(webp|jpg)$`. The exact two-part id shape is what keeps a `-800` variant from matching.
  - `export function coverVariantUrl(url: string, width: number): string` → inserts `-<width>` before the extension
  - `export function coverLoader({ src, width }: { src: string; width: number }): string` → `width <= 800 ? coverVariantUrl(src, 800) : src`

Exact error copy:
  - `'Choose a JPG or JPEG photo.'`
  - `'Choose a photo under 512 KB.'`
  - `'That file is not a valid JPEG.'`
  - `` `Crop at least ${w} × ${h} px of the photo.` ``
  - `` `The image could not be compressed under ${kb} KB. Crop tighter or choose a smaller photo.` ``

- [ ] **Step 1: Write the failing tests**

`image-policy.test.ts`. `JPEG = new Uint8Array([0xff, 0xd8, 0xff])`.
  - `{name:'a.png', type:'image/png', size:1000}` → `'Choose a JPG or JPEG photo.'`; `'a.JPEG'` with `image/jpeg` → `null`
  - `size: 512*1024 + 1` → `'Choose a photo under 512 KB.'`; `size: 512*1024` → `null`
  - `head = [0x89,0x50,0x4e]` → `'That file is not a valid JPEG.'`
  - `outputSizes('banner', {width:2000, height:1125})` → `[{1600,900},{800,450}]`
  - `outputSizes('banner', {width:1300, height:731})` → `[{1300,731},{800,450}]`
  - `outputSizes('banner', {width:1000, height:563})` → `{ error: 'Crop at least 1200 × 675 px of the photo.' }`
  - `outputSizes('avatar', {width:900, height:900})` → `[{512,512}]`; `{300,300}` → `[{300,300}]`; `{200,200}` → `{ error: 'Crop at least 256 × 256 px of the photo.' }`

`image-encode.test.ts`. The fake encoder returns `new Blob([new Uint8Array(n)], { type })` from a scripted list and records its calls.
  - `returns WebP at the starting quality when it fits` → `{ type: 'image/webp', quality: 82 }`, 1 call (banner)
  - `steps quality down by 5 until it fits` → sizes 400 KB, 350 KB, 280 KB → quality `72`, calls at `0.82, 0.77, 0.72`
  - `falls back to JPEG when WebP encoding is unsupported` → the first call returns `type: 'image/png'`, so later calls request `'image/jpeg'` and the result type is `'image/jpeg'`
  - `throws when even the floor quality is too big` → always 400 KB → rejects with `'The image could not be compressed under 300 KB. Crop tighter or choose a smaller photo.'`

`image-urls.test.ts`. `vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')`, then `vi.resetModules()`, then dynamic import.
  - `isProfileImageUrl('https://abc.supabase.co/storage/v1/object/public/profile-images/u1/avatar-x.webp')` → true; `'https://evil.example/storage/v1/object/public/profile-images/u1/a.webp'` → false; `''` → false
  - `isProcessedCover('https://abc.supabase.co/storage/v1/object/public/blog-images/covers/2026/11/k3x9-ab12cd34.webp')` → true; `…/k3x9-ab12cd34-800.webp` → false; `/images/folio-hero.jpeg` → false; `.../blog-images/uploads/2026/11/x.jpg` → false
  - `coverVariantUrl('…/k3x9-ab12cd34.webp', 800)` → `'…/k3x9-ab12cd34-800.webp'`
  - `uniqueImageId()` matches `/^[a-z0-9]+-[a-z0-9]{8}$/`, and two calls differ
  - `coverLoader({src, width: 640})` → the `-800` URL; `width: 1200` → `src`

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run lib/__tests__/image-policy.test.ts lib/__tests__/image-encode.test.ts lib/__tests__/image-urls.test.ts` → FAIL (modules missing).

- [ ] **Step 3: Implement** the three modules to the interfaces above. No browser APIs in these files.

- [ ] **Step 4: Verify:** the three files → PASS; `npm run quality` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/images lib/__tests__/image-policy.test.ts lib/__tests__/image-encode.test.ts lib/__tests__/image-urls.test.ts
git commit -m "feat: add image upload policy, encode budget and storage URL helpers"
```

---

### Task 10: Remove Hugging Face cover generation and AI avatars

**Files:**
- Delete:
  - `app/api/generate/route.ts`, `app/api/author-avatar/route.ts`
  - `components/cms/QwenCoverGenerator.tsx`
  - `cloudflare-pages/src/server/api/generate.ts`, `cloudflare-pages/src/server/api/avatar.ts`
- Modify:
  - `components/cms/PostEditor.tsx` (the import at :20 and the block around :726–:735), `app/write/page.tsx` (the import at :9 and its usage). The existing upload button and presets remain until Task 11.
  - `components/AuthorAvatar.tsx` (rewrite), `components/AuthorProfileCard.tsx` (:106, :148: drop `showControls`)
  - `cloudflare-pages/src/server/api/registry.ts`, `cloudflare-pages/src/server/models.ts` (remove `generateCover`; keep `generateText` for the assistant), `cloudflare-pages/src/server/context.ts` (remove `generateCover` from `RuntimeServices` and the HF env reads)
  - `test/support/pages.ts` (remove the `generateCover` fake), `test/pages/models.test.ts` (remove the `POST /api/author-avatar` and `/api/generate` describes; keep the assistant ones), `test/pages/env.test.ts` (HF expectations)
  - `lib/svg.ts` (remove `sanitizeSvgMarkup`; keep `svgToDataUri`), `lib/__tests__/svg.test.ts` (remove its `describe('sanitizeSvgMarkup')`)
  - `lib/openapi.ts` (:143–:158 entries), `lib/api-catalog.ts` (:10–:11), `lib/__tests__/api-catalog.test.ts` if it lists them
  - `test/fixtures/next-api-methods.json` (remove `POST /api/author-avatar`, `GET /api/generate`, `POST /api/generate`: 24 → 21), `test/contracts/baseline.test.ts` (title: 21 operations), `test/fixtures/next-http-contract.json` (entries for those paths)
  - `package.json` + `package-lock.json` (`npm uninstall @gradio/client`), `.env.example` (`HF_SPACE_NAME`, `HF_TOKEN`), `README.md` (env rows, route list), `docs/deployment.md` (HF secrets), `docs/design-system/component-inventory.md` (the QwenCoverGenerator row; the AuthorAvatar description)
- Test: `lib/__tests__/author-avatar.test.tsx` (new)

**Interfaces:**
- Consumes: `isProfileImageUrl` (Task 9); `createDomainFallbackSvg(name, domain, role)` from `lib/avatar-fallback.ts`; `svgToDataUri` from `lib/svg.ts`.
- Produces: `export default function AuthorAvatar({ author, size = 'lg' }: { author: Author; size?: 'sm' | 'md' | 'lg' | 'xl' })`. No `'use client'`, no fetch, no effects. It renders:
  - a `next/image` of `author.avatar` when `isProfileImageUrl(author.avatar)`, with explicit `width`/`height` of 40/56/80/112 per size, `alt={author.name}`, and the existing rounded classes;
  - otherwise an `<img>` of `svgToDataUri(createDomainFallbackSvg(author.name, author.domain, author.role))`.

- [ ] **Step 1: Write the failing tests**
  - `test/fixtures/next-api-methods.json`: delete the three operations; set the baseline test title to `records exactly the existing 21 operations`.
  - `lib/__tests__/author-avatar.test.tsx` (jsdom). Stub `NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co`, then `vi.resetModules()`, then import the component. Render with `renderToStaticMarkup`:
    - `renders an uploaded profile photo`: avatar `https://abc.supabase.co/storage/v1/object/public/profile-images/u1/avatar-x.webp` → markup contains that URL
    - `falls back to the domain SVG for a foreign URL`: `https://evil.example/a.png` → contains `data:image/svg+xml` and not `evil.example`
    - `falls back to the domain SVG when there is no photo`: `''` → contains `data:image/svg+xml`
    - `never calls the network`: `vi.spyOn(globalThis, 'fetch')` → not called
- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run test/contracts lib/__tests__/author-avatar.test.tsx` → FAIL (24 ≠ 21; the component still fetches and has no photo path).
- [ ] **Step 3: Implement** the deletions and modifications above. `git grep -nE "gradio|HF_TOKEN|HF_SPACE|api/generate|api/author-avatar|QwenCover|generateCover|forceAi|sanitizeSvgMarkup"` → no output outside `docs/codebase/`, `docs/superpowers/` and `docs/migration-baseline.md` (historical).
- [ ] **Step 4: Verify**
  - `npm run quality` → PASS
  - `npm run build:pages` → exit 0
  - push; the preview build succeeds; `/author/<slug>` renders the fallback SVG with no request to `/api/author-avatar` (DevTools → Network)
- [ ] **Step 5: Commit**

```bash
git add -A app/api components cloudflare-pages lib test package.json package-lock.json .env.example README.md docs/deployment.md docs/design-system/component-inventory.md
git commit -m "refactor: remove Hugging Face cover generation and AI-generated author avatars"
```

Owner follow-ups after merge:
  - `npx wrangler secret delete HF_TOKEN` and `npx wrangler secret delete HF_SPACE_NAME`
  - revoke the token on huggingface.co
  - `GEMINI_API_KEY` stays, because the research assistant uses it

---

### Task 11: Banner upload with crop, compression and responsive delivery

**Files:**
- Create:
  - `lib/images/process.ts` (`'use client'`)
  - `components/media/ImageCropDialog.tsx`
  - `components/media/LazyImageCropDialog.tsx` (`lazyWidget` wrapper)
- Modify:
  - `lib/supabase/storage.ts` (add `uploadCover`)
  - `components/cms/PostEditor.tsx` (replace the cover file input and its `uploadBlogImage` handler at :364 with an "Upload banner" button that opens the dialog; keep presets and remove)
  - `app/write/page.tsx` (same)
  - `app/post/[slug]/page.tsx` (:226 `Image`), `components/FeaturedArticle.tsx` (:36 `Image`): pass `loader={isProcessedCover(src) ? coverLoader : undefined}`
  - `cloudflare-pages/src/compat/image.tsx` (`ImageShim` destructures and ignores `loader`, so it never reaches the DOM)
  - `package.json`, `package-lock.json` (`npm install react-easy-crop@6.2.4 --save-exact`)
- Test: `lib/__tests__/upload-cover.test.ts`, `lib/__tests__/image-crop-dialog.test.tsx`

**Interfaces:**
- Consumes: Task 9 (`IMAGE_POLICY`, `validateJpegInput`, `outputSizes`, `encodeWithinBudget`, `isProcessedCover`, `coverLoader`, `coverVariantUrl`).
- Produces:
  - `export type Rotation = 0 | 90 | 180 | 270`
  - `export type PixelArea = { x: number; y: number; width: number; height: number }` (`react-easy-crop`'s `croppedAreaPixels`, relative to the rotated image)
  - `export type EncodedImage = { blob: Blob; width: number; height: number; type: 'image/webp' | 'image/jpeg' }`
  - `export async function cropAndEncode(file: File, area: PixelArea, rotation: Rotation, kind: ImageKind): Promise<EncodedImage[]>` in `lib/images/process.ts`. It:
    1. decodes with `createImageBitmap(file, { imageOrientation: 'from-image' })`;
    2. draws the rotated bitmap onto a canvas sized to the rotated bounds;
    3. copies `area` out;
    4. for each `outputSizes(kind, area)` entry, draws onto a target canvas with `imageSmoothingQuality = 'high'`;
    5. encodes through `encodeWithinBudget`, using `canvas.toBlob(type, quality)` as the `Encoder`.

    It throws `outputSizes`' error message when that function returns `{ error }`. Re-encoding strips EXIF, including GPS.
  - `export async function uploadCover(images: EncodedImage[], client = getSupabaseBrowserClient()): Promise<string>` in `lib/supabase/storage.ts`.
    - Bucket: `blog-images`.
    - Paths: `covers/<YYYY>/<MM>/<id>.<ext>` for `images[0]` and `covers/<YYYY>/<MM>/<id>-<width>.<ext>` for the rest.
    - `id`: `uniqueImageId()` (Task 9); `ext`: `webp` | `jpg`.
    - Options: `{ contentType: image.type, cacheControl: '31536000', upsert: false }`.
    - Returns the public URL of `images[0]`.
  - `ImageCropDialog` props: `{ kind: ImageKind; open: boolean; onCancel: () => void; onConfirm: (images: EncodedImage[]) => Promise<void> }`. Radix Dialog, in two stages.
    - **Choose:** `<input type="file" accept=".jpg,.jpeg,image/jpeg">`, validated with `validateJpegInput` (head = `await file.slice(0, 3).arrayBuffer()`). Errors render in a `role="alert"` element.
    - **Edit:**
      - `Cropper` with `aspect={IMAGE_POLICY[kind].aspect}`, `cropShape={kind === 'avatar' ? 'round' : 'rect'}`
      - a labelled zoom range 1–3, step 0.01
      - "Rotate 90°", "Reset" and "Save" buttons
      - Save runs `cropAndEncode`, shows `Saved size: <KB> KB`, and calls `onConfirm`

- [ ] **Step 1: Write the failing tests**

`upload-cover.test.ts`: the fake client records `storage.from(bucket).upload(path, blob, opts)` calls and returns `getPublicUrl(path) → { data: { publicUrl: 'https://abc.supabase.co/storage/v1/object/public/blog-images/' + path } }`.
  - `uploads the primary and the 800 variant` → 2 uploads, both to bucket `blog-images`, paths matching `/^covers\/\d{4}\/\d{2}\/[a-z0-9]+-[a-z0-9]{8}\.webp$/` and the same stem + `-800.webp`, `contentType: 'image/webp'`, `cacheControl: '31536000'`, `upsert: false`. The resolved URL ends with the primary path and satisfies `isProcessedCover`.
  - `uses .jpg for JPEG output` → paths end in `.jpg`
  - `throws the storage error message` → upload returns `{ error: { message: 'Bucket full' } }` → rejects `'Bucket full'`

`image-crop-dialog.test.tsx` (jsdom; choose stage only, so the Cropper doesn't mount):
  - `rejects a PNG before cropping` → `fireEvent.change` with `new File([new Uint8Array([0x89,0x50,0x4e,0x47])], 'a.png', { type: 'image/png' })` → alert text `'Choose a JPG or JPEG photo.'`
  - `rejects a JPEG over 512 KB` → a 524,289-byte `image/jpeg` file starting `FF D8 FF` → `'Choose a photo under 512 KB.'`
  - `accepts .jpg and .jpeg` → the input's `accept` is `.jpg,.jpeg,image/jpeg`

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run lib/__tests__/upload-cover.test.ts lib/__tests__/image-crop-dialog.test.tsx` → FAIL (missing exports and component).

- [ ] **Step 3: Implement** `process.ts`, `uploadCover`, the dialog, and its `lazyWidget` wrapper. Wire both editors to `LazyImageCropDialog kind="banner"` → `uploadCover` → `update('coverImage', url)`. Pass the loader on the two cover `Image`s, and make `ImageShim` drop `loader`. Update the `/write` and `/dashboard` surface briefs' `related_targets` to include `components/media/ImageCropDialog.tsx`.

- [ ] **Step 4: Verify:** the two files → PASS; `npm run quality` → PASS; `npm run build:pages` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/images/process.ts lib/supabase/storage.ts components/media components/cms/PostEditor.tsx app/write/page.tsx app/post/[slug]/page.tsx components/FeaturedArticle.tsx cloudflare-pages/src/compat/image.tsx package.json package-lock.json .impeccable/surfaces lib/__tests__/upload-cover.test.ts lib/__tests__/image-crop-dialog.test.tsx
git commit -m "feat: upload article banners as cropped, compressed WebP with an 800px variant"
```

- [ ] **Step 6: Manual check on the preview build**, signed in as an editor:
  1. Upload a 480 KB portrait phone JPEG that carries EXIF orientation. The cropper shows it upright.
  2. Crop to 16:9 and save. The status shows ≤ 300 KB.
  3. Storage shows `covers/YYYY/MM/<id>.webp` and `<id>-800.webp`.
  4. At a 375 px viewport, the published post requests the `-800` file; at 1440 px it requests the primary.
  5. An existing post with an older cover (`uploads/…` or `/images/…`) still renders.

---

### Task 12: Author profile photo upload (1:1)

**Files:**
- Create:
  - `supabase/migrations/20261113000100_profile_images.sql`
  - `supabase/tests/profile_images.test.sql`
  - `lib/profile-photo.ts` (`'use client'`)
  - `components/dashboard/ProfilePhotoCard.tsx`
- Modify:
  - `app/dashboard/access/page.tsx` (read the signed-in user's own profile and render the card)
  - `.impeccable/surfaces/app-dashboard-access-page-tsx.md` (`related_targets`, plus a `## Checks` line for the photo flow)
- Test: `lib/__tests__/profile-photo.test.ts`

**Interfaces:**
- Consumes: `EncodedImage`, `cropAndEncode`, `ImageCropDialog`/`LazyImageCropDialog` (Task 11), `isProfileImageUrl` (Task 9), `AuthorAvatar` (Task 10).
- Produces:
  - The migration, wrapped in `begin; … commit;`, idempotent:
    - `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('profile-images', 'profile-images', true, 102400, array['image/webp','image/jpeg']) on conflict (id) do update set …`
    - four `drop policy if exists` / `create policy` pairs on `storage.objects`:
      - `"Profile images are publicly readable"` (select, `bucket_id = 'profile-images'`)
      - `"Users upload their own profile image"` (insert, authenticated)
      - `"Users replace their own profile image"` (update, authenticated)
      - `"Users delete their own profile image"` (delete, authenticated)

      The three authenticated policies require `bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid())::text`.
  - `export async function uploadOwnAvatar(image: EncodedImage, userId: string, previousUrl: string | null, client = getSupabaseBrowserClient()): Promise<string>`. It:
    1. uploads to `profile-images` at `` `${userId}/avatar-${uniqueImageId()}.${ext}` `` with `cacheControl: '31536000'` and `upsert: false`;
    2. runs `client.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', userId)` (RLS: owners only, `20261108000500_restrict_profile_writes.sql`);
    3. if `isProfileImageUrl(previousUrl)` and its object path starts with `` `${userId}/` ``, calls `storage.from('profile-images').remove([oldPath])`. A failure there is logged with `console.warn`, not thrown;
    4. returns `publicUrl`.

    If the profile update fails, it removes the just-uploaded object and throws `'Your profile photo could not be saved. Try again.'`.
  - `ProfilePhotoCard` props: `{ userId: string; author: Author }`. It shows the current `AuthorAvatar size="xl"` and a "Change photo" button that opens the lazy dialog with `kind="avatar"`. On confirm it calls `uploadOwnAvatar(images[0], …)` and then `router.refresh()`. Status text (`role="status"`): `'Profile photo updated. It can take about a minute to appear on public pages.'` (author directory cache: `revalidate: 60` in `lib/author-directory.ts:93`).
  - `/dashboard/access`:
    - Supabase configured, signed in, with a profile row (`select slug, display_name, role, domain, avatar_url … .eq('user_id', user.id).maybeSingle()`): render the card.
    - Signed in without a row: render `'Your profile photo can be added once your author profile exists.'`
    - Local mode: render nothing.

- [ ] **Step 1: Write the failing tests**

`profile-photo.test.ts`, with a fake client recording calls. `uid = '7f9c…-uuid'`, `ORIGIN = https://abc.supabase.co` (stubbed env, `vi.resetModules()`).
  - `uploads into the user's own folder and saves the URL` → the upload path matches `` new RegExp(`^${uid}/avatar-[a-z0-9]+-[a-z0-9]{8}\\.webp$`) ``, bucket `profile-images`, then `update({ avatar_url: <publicUrl> })` and `.eq('user_id', uid)`. Resolves to the public URL.
  - `removes the user's previous photo` → previous `${ORIGIN}/storage/v1/object/public/profile-images/${uid}/avatar-old.webp` → `remove([`${uid}/avatar-old.webp`])`
  - `never removes someone else's photo or a foreign URL` → previous `…/profile-images/other-uid/a.webp` or `https://evil.example/a.webp` → `remove` not called
  - `does not fail when cleanup fails` → `remove` returns `{ error }` → still resolves
  - `rolls back the upload when the profile update fails` → update returns `{ error }` → `remove([newPath])` is called and it rejects with `'Your profile photo could not be saved. Try again.'`

`supabase/tests/profile_images.test.sql` (pgTAP, local only, same header style as `author_applications.test.sql`). `plan(6)`:
  - the bucket exists and is public
  - `file_size_limit = 102400`
  - `allowed_mime_types = '{image/webp,image/jpeg}'`
  - each of the 4 policies exists (one assertion covering all 4 names, plus one asserting the insert policy text contains `storage.foldername`)

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run lib/__tests__/profile-photo.test.ts` → FAIL (module missing). If a local Supabase is available, `npx supabase db reset --local && npx supabase test db --local` → `profile_images` fails.

- [ ] **Step 3: Implement** the migration, `uploadOwnAvatar`, `ProfilePhotoCard`, and the `/dashboard/access` wiring.

- [ ] **Step 4: Verify**
  - `npx vitest run lib/__tests__/profile-photo.test.ts lib/__tests__/surface-briefs.test.ts` → PASS
  - `npm run quality` → PASS
  - pgTAP → PASS when a local Supabase is available
  - Run the migration twice against the local database to prove it's idempotent: `npx supabase db reset --local` applies it, then re-run the file with `psql`. No error.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261113000100_profile_images.sql supabase/tests/profile_images.test.sql lib/profile-photo.ts components/dashboard/ProfilePhotoCard.tsx app/dashboard/access/page.tsx .impeccable/surfaces/app-dashboard-access-page-tsx.md lib/__tests__/profile-photo.test.ts
git commit -m "feat: let authors upload a cropped 1:1 profile photo to Supabase Storage"
```

- [ ] **Step 6: Owner checks it live after Task 16.** Don't apply this migration by hand: Task 16 Step 5's `db push` applies it, together with the repaired history. After that, on the preview build, as an author with a profile:
  1. Upload a JPEG and crop it in the circle. Save shows ≤ 100 KB.
  2. `/author/<slug>` shows the photo within a minute.
  3. Storage holds only the newest `avatar-*` file.
  4. A second account can't write into the first account's folder (Storage API returns 403).

---

### Task 13: Remove the fictional seed corpus and the legacy layer

**Files:**
- Delete:
  - `data/articles.json`, `data/comments.json`
  - `lib/legacy/` (all files), `lib/db.ts`
  - `supabase/migrations/20261110000100_legacy_interactions.sql` and `supabase/tests/legacy_interactions.test.sql` (never applied live; Task 16 drops any leftovers in other databases)
  - `test/fixtures/legacy.ts`, `lib/__tests__/legacy-store.test.ts`
- Modify:
  - `lib/cms/catalogue.ts`: `getArticleCatalogue(cms?: CmsStore): Promise<BlogPost[]>` and `getFeedArticles(cms?: CmsStore)`. CMS posts only; the `legacy` parameter and `DEFAULT_LEGACY_SEEDS` fallback are gone.
  - `app/api/articles/[id]/route.ts`: non-`cms-` ids return `404` for GET and PATCH.
  - `app/api/comments/route.ts`: legacy branch → `404` for non-CMS ids.
  - `app/api/cms/posts/route.ts`, `app/api/cms/posts/[id]/route.ts`: remove the `getPublicLegacyStore().findArticle` slug check (`:73-88`); the CMS slug check stays.
  - `app/page.tsx`, `app/sitemap.ts`: drop the `@/data/articles.json` import and legacy calls.
  - `lib/author-directory.ts` (legacy references)
  - `cloudflare-pages/src/server/{stores,context,loaders/public,metadata}.ts`, `cloudflare-pages/src/server/api/{articles,comments,cms-posts,revalidate}.ts`: the same removals, so `build:pages` stays green
  - `test/support/pages.ts`, `test/pages/{archive-api,interactions-api,public-routes,cms-api,auth,env,webhook-email}.test.ts`: drop legacy fakes and expectations
  - `lib/__tests__/{catalog-motion,command-palette}.test.tsx`: build articles from a new neutral fixture
  - `components/ArticleFeed.tsx:240` empty state → `'No articles have been published yet.'` when the catalogue is empty; `'No articles match these filters.'` when filters exclude everything
  - `.env.example` and `README.md`: describe `RWM_DATA_DIR` as the local CMS JSON directory only
  - Supabase test harness types that reference `legacy_*`
- Create: `test/fixtures/articles.ts` exporting `makeTestArticle(overrides?: Partial<BlogPost>): BlogPost` (author `Test Author`, slug `test-article-1`, likes 0)
- Test: `lib/__tests__/cms-catalogue.test.ts` (new), `test/next/articles-like-route.test.ts` (update)

**Interfaces:**
- Produces: `getArticleCatalogue(cms?: CmsStore)` and `getFeedArticles(cms?: CmsStore)`. Same return types; CMS only.
- Consumes: `loadRoute` (Task 2).

- [ ] **Step 1: Write the failing tests**

`lib/__tests__/cms-catalogue.test.ts`, using an injected in-memory `CmsStore` fake. Implement `listPosts()` (returning both `draft` and `published` posts, because `lib/cms/read.ts:13-14` filters) and `listCommentCounts()`; the other methods throw `new Error('unused')`.
  - `is empty when nothing is published` → `getArticleCatalogue(emptyStore)` resolves `[]`
  - `contains only published CMS posts` → one published post → length 1, `article.slug` equals the post slug
  - `never contains seed articles` → no result has `id` matching `/^post-\d+$/`
  - `getFeedArticles strips bodies` → `content` is `[]` and `bodyMarkdown` is undefined

`test/next/articles-like-route.test.ts`: `returns 404 for a former seed id` → `PATCH /api/articles/post-1` → `404`.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run lib/__tests__/cms-catalogue.test.ts test/next/articles-like-route.test.ts` → FAIL (seeds are still merged; `post-1` resolves).

- [ ] **Step 3: Implement** the deletions and edits above. `git grep -nE "lib/legacy|@/lib/db'|data/articles\.json|data/comments\.json|DEFAULT_LEGACY_SEEDS|legacy_articles|LegacyStore"` → no output outside `docs/`.

- [ ] **Step 4: Verify**
  - `npm run quality` → PASS
  - `npm run build:pages` → exit 0
  - `npm run dev` with no Supabase posts:
    - `/` shows `No articles have been published yet.`
    - `/sitemap.xml` lists only static routes
    - `/api/articles` → `200 []`
    - `/author/myself-aas` renders with its archive empty state

- [ ] **Step 5: Commit**

```bash
git add -A data lib app cloudflare-pages test supabase components/ArticleFeed.tsx .env.example README.md
git commit -m "refactor: remove the fictional seed corpus and legacy storage layer"
```

---

### Task 14: Remove false identifiers and journal claims, guarded by a copy test

**Files:**
- Create: `lib/__tests__/truthful-copy.test.ts`
- Modify (every hit of the banned list below; known files):
  - `components/BlogFooter.tsx:32-46`
  - `components/BlogHero.tsx:51,88,202-207`
  - `components/ArticleFeed.tsx:131,280,423`
  - `components/FeaturedArticle.tsx:46`
  - `components/HomeFeed.tsx:96`
  - `components/AboutPage.tsx`
  - `components/ContactPage.tsx:68`
  - `components/AuthorSpotlight.tsx:34`
  - `components/CitationTool.tsx:38,69`
  - `app/post/[slug]/page.tsx:71,415-416`
  - `app/opengraph-image.tsx:41`
  - `app/assistant/layout.tsx`, `app/authors/page.tsx`, `app/author/[id]/page.tsx:46,110`, `app/contact/page.tsx`, `app/dashboard/access/page.tsx:15,81`, `app/write/layout.tsx`
  - `app/llms.txt/route.ts`
  - `lib/citations.ts`, `lib/citations-inline.tsx:21`, `lib/search/catalog-index.ts:124`, `lib/seo/jsonld.ts`, `lib/openapi.ts`
  - `lib/research-data.ts` (delete `OVERVIEW_STATS`)
  - `public/AGENTS.md`
  - `cloudflare-pages/src/routes/{post,paper}.tsx`, `cloudflare-pages/src/routes.tsx`
  - `PRODUCT.md`, `README.md`
  - matching unit tests (`lib/__tests__/{citations,citation-component,reader-popovers,command-palette,seo-jsonld,visual-regression}.test.*`)

**Interfaces:**
- Produces:
  - **Citations:**
    - `formatCitation(article, style)` in `lib/citations.ts` cites the article's canonical URL (`absoluteUrl('/post/<slug>')`) and the accessed date; no `doi` field for site articles.
    - The citation venue is `'ResearchWithMe'`, and `CitationTool`'s custom-venue default becomes `''`.
    - DOIs supplied by users for external papers (custom citations) are still allowed.
  - **Licence line (exact copy):** `Articles are published under CC BY 4.0.`
  - **Footer identity line (exact copy):** `ResearchWithMe (πeme) · Edited by Ashif Ahmed Shuvo`.

- [ ] **Step 1: Write the failing test** `lib/__tests__/truthful-copy.test.ts`

Read every tracked file under `app/`, `components/`, `lib/` (excluding `lib/__tests__/` and `lib/schemas/identifiers.ts`, a generic identifier parser for cited works), `cloudflare-pages/src/`, `emails/`, `public/`, plus `README.md` and `PRODUCT.md`. Assert none match these case-insensitive patterns, listing `file:line` for each hit:

```ts
const BANNED = [
  /\bISSN\b/, /2994-0821/, /10\.5555/, /DOI prefix/,
  /diamond open[- ]access/, /monograph/, /verified (domain )?specialists?/,
  /editorial (board|office)/, /peer-reviewed preprint/, /OVERVIEW_STATS/,
  /Elena Rostova|Marcus Vance|Ananya Sen|Thabo Khumalo|Maya Lin|Sarah Chen|Julian Ross|Hiroshi Tanaka/,
];
```

Plus: `components/BlogFooter.tsx` contains `Articles are published under CC BY 4.0.`

- [ ] **Step 2: Run it** with `npx vitest run lib/__tests__/truthful-copy.test.ts` → FAIL, listing the hits.

- [ ] **Step 3: Rewrite the copy** with these rules:
  - Describe the site as "an open platform for long-form explanations of published research and open-source code", never a journal or publication.
  - "Verified specialists" becomes "writers approved by the editor".
  - Remove "peer review" when it refers to this site's own process. Keep it only when describing external papers.
  - Change citations as specified under Interfaces.
  - Remove `canonicalDoi` and its UI everywhere.
  - Keep the CC BY 4.0 line.
  - `PRODUCT.md`: delete "Real DOI records, author credentials, citation counts" from "Evidence on Hand", and state that the catalogue contains only articles published through the studio.

- [ ] **Step 4: Verify**
  - `npx vitest run lib/__tests__/truthful-copy.test.ts` → PASS
  - `npm run quality` → PASS. Update affected citation/search/jsonld tests to the new outputs (URL-based citations).
  - `npm run build:pages` → exit 0

- [ ] **Step 5: Commit**

```bash
git add -A app components lib cloudflare-pages public PRODUCT.md README.md
git commit -m "fix: remove the fake ISSN, test-prefix DOIs and journal claims from site copy"
```

---

### Task 15: One Editor-in-Chief; remove placeholder archives and the invented impact chart

**Files:**
- Delete:
  - `app/papers/`, `app/paper/`, `app/editions/` (pages, layouts, OG images)
  - `app/api/papers/route.ts`, `app/api/papers/[slug]/route.ts`
  - `components/PapersArchive.tsx`, `components/EditionsArchive.tsx`, `components/AuthorImpactRadarChart.tsx`, `components/author/DeferredImpactChart.tsx`
  - `cloudflare-pages/src/routes/{papers,paper,editions}.tsx`, `cloudflare-pages/src/server/api/papers.ts`
- Modify:
  - `lib/research-data.ts`: delete `EDITORIAL_BOARD`, `PUBLICATIONS_DATA`, `PDF_EDITIONS_DATA` and the `Publication`/`PdfEdition` types if unused. Add:

    ```ts
    export const EDITOR_IN_CHIEF = { name: 'Ashif Ahmed Shuvo', role: 'Editor-in-Chief', profileSlug: 'myself-aas' } as const
    ```
  - `components/EditorialBoard.tsx`: rename to `components/EditorPage.tsx`. It renders one entry from `EDITOR_IN_CHIEF`, linking to `/author/${profileSlug}`, under heading `Editor`, plus the editorial standards text with board language removed.
  - `app/editorial-board/page.tsx` and `layout.tsx` (keep the URL; title `Editor`)
  - `components/BlogHeader.tsx:48,50,57`, `components/BlogFooter.tsx:9-12`: remove the Papers and Editions links; rename `Editorial board` to `Editor`
  - `app/sitemap.ts:13,15`, `app/llms.txt/route.ts`, `lib/openapi.ts`, `lib/api-catalog.ts`, `lib/search/catalog-index.ts` (no `EDITORIAL_BOARD`, no papers), `cloudflare-pages/src/routes.tsx`, `cloudflare-pages/src/server/{api/registry,loaders/public}.ts`
  - `app/author/[id]/page.tsx` and `cloudflare-pages/src/routes/author.tsx`: remove the impact chart section
  - `package.json` and `package-lock.json`: `npm uninstall recharts` if `git grep -n "recharts"` finds no other importer
  - `test/fixtures/next-api-methods.json` (remove `GET /api/papers` and `GET /api/papers/[slug]`: 21 → 19), `test/contracts/baseline.test.ts` (title 19), `test/fixtures/next-http-contract.json` (entries for the removed paths)
  - `.impeccable/surfaces/{app-papers-page-tsx,app-paper-slug-page-tsx,app-editions-page-tsx}.md` → `status: retired`; `app-editorial-board-page-tsx.md` updated to the single-editor page
  - `test/e2e/*.spec.ts` and `test/pages/*` routes that visit removed pages
- Test: `lib/__tests__/editor-page.test.tsx` (new), `test/contracts/baseline.test.ts`

**Interfaces:**
- Produces: `EDITOR_IN_CHIEF` (above) and `components/EditorPage.tsx` (default export, no props).

- [ ] **Step 1: Write the failing tests**
  - `lib/__tests__/editor-page.test.tsx` (`renderToStaticMarkup`):
    - `names exactly one editor` → contains `Ashif Ahmed Shuvo` and `Editor-in-Chief`, and the text doesn't contain `Editorial board`
    - `links to the editor's author profile` → contains `href="/author/myself-aas"`
  - `test/fixtures/next-api-methods.json`: delete the two papers operations and set the title to 19.
- [ ] **Step 2: Run them:** `npx vitest run lib/__tests__/editor-page.test.tsx test/contracts` → FAIL.
- [ ] **Step 3: Implement** the deletions and edits. `git grep -nE "PapersArchive|EditionsArchive|AuthorImpactRadarChart|EDITORIAL_BOARD|PUBLICATIONS_DATA|PDF_EDITIONS_DATA|/api/papers"` → no output outside `docs/`.
- [ ] **Step 4: Verify**
  - `npm run quality` → PASS. This includes `surface-briefs` (retired briefs exempt) and `truthful-copy`.
  - `npm run build:pages` → exit 0
  - push; the preview build passes; `/papers` and `/editions` return 404; `/editorial-board` shows only the Editor-in-Chief
- [ ] **Step 5: Commit**

```bash
git add -A app components lib cloudflare-pages test .impeccable package.json package-lock.json
git commit -m "feat: list one Editor-in-Chief and remove placeholder archives and invented metrics"
```

---

### Task 16: Reconcile the live Supabase database with `supabase/migrations/`

The live project is `bxyjjbclaklzjxeumeat`. The steps marked **(owner)** need the database password and must be run by the owner.

**Files:**
- Create: `supabase/migrations/20261113000200_reconcile_live_schema.sql`, `supabase/tests/reconcile.test.sql`, `docs/supabase-reconcile-2026-11-13.md` (runbook and results; no emails, IDs or dumps)

**Interfaces:**
- Consumes: every migration in `supabase/migrations/`, including Task 12's `20261113000100_profile_images.sql`.
- Produces the reconcile migration, wrapped in `begin; … commit;` and idempotent. Each statement is a no-op where the object is already absent:
  - `drop policy if exists "Editors can list blog images" on storage.objects;`. This live-only policy isn't in any repo migration, so the re-push won't touch it; it still references `private.is_editor()`, so it must go first. Nothing in the app lists the bucket (`git grep "\.list("` finds no storage listing).
  - `drop function if exists public.increment_legacy_like(text);`
  - `drop function if exists public.add_legacy_comment(text, text, text, text);`
  - `drop table if exists public.legacy_comments;`
  - `drop table if exists public.legacy_articles;`
  - `drop function if exists private.is_editor();`
  - `drop schema if exists private;` (`restrict`, the default, so it fails loudly if anything else ever lands there)

- [ ] **Step 1: Write the pgTAP test** `supabase/tests/reconcile.test.sql` (local only; header like `author_applications.test.sql`). `plan(5)`:
  - `select is((select count(*) from pg_policies where qual ilike '%private.%' or with_check ilike '%private.%'), 0::bigint, 'no policy depends on private.*')`
  - `select hasnt_schema('private')`
  - `select hasnt_table('public', 'legacy_articles', …)`
  - `select hasnt_table('public', 'legacy_comments', …)`
  - `select policies_are('storage', 'objects', ARRAY['Blog images are publicly readable','Editors can upload blog images','Editors can replace blog images','Editors can delete blog images','Profile images are publicly readable','Users upload their own profile image','Users replace their own profile image','Users delete their own profile image'])`
- [ ] **Step 2: Write the reconcile migration** (above).
- [ ] **Step 3: Prove it locally (twice-applied)**

```bash
npx supabase start
npx supabase db reset --local                  # applies every repo migration once
for f in supabase/migrations/*.sql; do psql "$(npx supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" -v ON_ERROR_STOP=1 -f "$f"; done   # second application
npx supabase test db --local                   # all pgTAP suites pass
```

Expected: no SQL error in either pass, and all suites PASS. Commit:

```bash
git add supabase/migrations/20261113000200_reconcile_live_schema.sql supabase/tests/reconcile.test.sql
git commit -m "feat: reconcile migration that removes private.is_editor and legacy leftovers"
```

- [ ] **Step 4 (owner): Back up and record counts.** Run outside the repo; never commit the output.

```bash
npx supabase link --project-ref bxyjjbclaklzjxeumeat
npx supabase db dump --linked -f ../rwm-backup-2026-11-13-schema.sql
npx supabase db dump --linked --data-only -f ../rwm-backup-2026-11-13-data.sql
```

In the SQL editor, record:

```sql
select (select count(*) from public.profiles) profiles, (select count(*) from public.editors) editors, (select count(*) from public.author_applications) apps, (select count(*) from public.posts) posts;
```

Expected now: `1, 2, 1, 0`.

- [ ] **Step 5 (owner): Repair the history and re-push**

```bash
npx supabase migration repair --status reverted 00001 00002 00003 00004 00005 00006 00007 00008 00009 00010 00011 00012 00013 00014
npx supabase db push --dry-run     # lists every repo migration, oldest first, ending with 20261113000200
npx supabase db push
npx supabase migration list --linked
```

Expected: the dry run lists exactly the repo files; the push finishes without error; `migration list` shows Local = Remote for every repo version and no `0000x` rows.

- [ ] **Step 6 (owner): Data steps** (the dashboard; these aren't migrations)
  - **SQL editor**, removing the second editor (your Gmail account):

    ```sql
    delete from public.editors e using auth.users u where u.id = e.user_id and u.email = '<your Gmail address>';
    ```

    Then `select count(*) from public.editors` → `1`.
  - **Storage:** delete the empty `researchwith-me-media` bucket in Storage → bucket menu → Delete. Supabase blocks SQL deletes on storage tables.

- [ ] **Step 7: Verify live** (read-only SQL, owner or agent)
  - The counts from Step 4 are unchanged, except editors `1`.
  - `select count(*) from pg_policies where qual ilike '%private.%' or with_check ilike '%private.%'` → `0`.
  - `select id from storage.buckets order by id` → `blog-images`, `profile-images`.
  - Dashboard → Advisors → Security shows no new errors.
  - On the deployed site:
    - the university account opens `/dashboard` and saves a draft
    - the Gmail account sees `This account does not have editor access`
    - `/author/myself-aas` renders

- [ ] **Step 8: Commit the runbook** `docs/supabase-reconcile-2026-11-13.md`. It records what was found (Decision 13), the commands run, the before/after counts, and how to restore from the backup (`psql … -f ../rwm-backup-2026-11-13-data.sql` onto a re-pushed schema).

```bash
git add docs/supabase-reconcile-2026-11-13.md
git commit -m "docs: record the live Supabase reconciliation"
```

---

### Task 17: English only (remove Bangla, the i18n layer and the language toggle)

**Files:**
- Delete:
  - `lib/i18n/` (`format.ts`, `index.ts`, `locales.ts`, `pseudo.ts`, `server.ts`, `messages/en.json`, `messages/bn.json`)
  - `components/i18n/LocaleProvider.tsx`, `components/i18n/LocaleSwitcher.tsx`
  - `cloudflare-pages/src/server/locale.ts`
  - `lib/__tests__/i18n.test.ts`, `lib/__tests__/i18n-wiring.test.ts`
- Modify:
  - `app/layout.tsx`: drop the `LocaleProvider` wrapper (`:5`, `:100`, `:110`); keep `<html lang="en" dir="ltr">`
  - `components/BlogHeader.tsx`: drop `LocaleSwitcher`, `useLocale` and `t()` (the header is rebuilt in Task 18)
  - `components/ThemeToggle.tsx`: drop `useLocale` (`:7`, `:28`) and the `locale === 'bn'` branch (`:57`)
  - `components/reader/InlineCitationPopover.tsx` (`:11`, `:74`, `:122`, `:181`), `components/search/CommandPalette.tsx` (`:12`, `:46`, `:140` …): replace each `t(locale, 'key')` with the literal English value from `en.json`, unchanged
  - `cloudflare-pages/src/document.tsx`, `cloudflare-pages/src/entry-client.tsx`: fixed `lang="en"`, no cookie read
  - `app/globals.css` and `cloudflare-pages/src/globals.css`: delete `--font-bengali-*`, `--font-arabic-*` and the `:root[lang="bn"]` / `[lang="ar"]` blocks (around `:26-29`, `:705-730`)
  - `tokens/scripts/build.mjs` (`:121-123`: the Bengali video font group), then `npm run tokens:build` regenerates `tokens/generated/tokens.video.{css,json}`
  - `lib/__tests__/theme-typography.test.tsx`: delete the `Hind Siliguri`, `Noto Serif Bengali` and `bn line-height` assertions, and the `LocaleProvider` wrapper in the ThemeToggle render
  - `test/e2e/archive-routes.spec.ts` (`:30-32`), `test/pages/archive-routes.test.ts` (`:57-59`): replace the bn-cookie cases with `ignores a pieme-locale cookie and serves lang="en"`
  - `DESIGN.md`, `README.md`, `CLAUDE.md`, `docs/pieme-design-system-v3.1.md`: remove the bn/pseudo-localization requirements; add one line, "English only"
- Test: `lib/__tests__/english-only.test.ts` (new)

**Interfaces:**
- Produces: no i18n API. Components render English literals; `lang="en"` is fixed in both targets.

- [ ] **Step 1: Write the failing test** `lib/__tests__/english-only.test.ts`
  - `has no i18n modules` → `existsSync('lib/i18n')` and `existsSync('components/i18n')` are both `false`
  - `ships no Bengali or Arabic support`: across tracked files in `app/`, `components/`, `lib/` (excluding `__tests__`), `cloudflare-pages/src/` and `tokens/`, no match for `/Bengali|Hind Siliguri|lang="bn"|lang="ar"|pieme-locale|LocaleSwitcher|useLocale|[ঀ-৿]/`. `[ঀ-৿]` is the Bengali Unicode block.
  - `renders lang="en"` → `readFileSync('app/layout.tsx')` contains `lang="en"`
- [ ] **Step 2: Run it** with `npx vitest run lib/__tests__/english-only.test.ts` → FAIL.
- [ ] **Step 3: Implement** the deletions and edits above. Copy the English strings verbatim from `en.json` before deleting it.
- [ ] **Step 4: Verify**
  - `npm run quality` → PASS. This includes `tokens:check`, and Task 6's `--font-*` assertions still pass.
  - `npm run build:pages` → exit 0
  - `npm run dev`: no language control anywhere; a `pieme-locale=bn` cookie has no effect
- [ ] **Step 5: Commit**

```bash
git add -A lib components app cloudflare-pages tokens test DESIGN.md README.md CLAUDE.md docs/pieme-design-system-v3.1.md
git commit -m "refactor: make the site English-only and remove the language toggle"
```

---

### Task 18: Simplify the header to brand, menu items, search icon and one CTA

**Files:**
- Create: `components/header/nav.ts`, `lib/__tests__/header.test.tsx`
- Modify:
  - `components/BlogHeader.tsx` (rewrite)
  - `components/BlogFooter.tsx`: links = Articles `/`, Writers `/authors`, Assistant `/assistant`, Citation builder `/cite`, Reading list `/bookmarks`, Editor `/editorial-board`, About `/about`, Contact `/contact`, Privacy `/privacy`; plus `<ThemeToggle />`
  - `.impeccable/surfaces/*` whose `related_targets` include `components/BlogHeader.tsx`: add `components/header/nav.ts`
  - `docs/header-footer-audit-2026-11-09.md`: one dated note pointing at this task

**Interfaces:**
- Consumes: `useSession()` from `@/lib/supabase/use-session` (`user: { isEditor: boolean; … } | null`); `CommandPalette` (lazy, unchanged); `BrandLogo`; motion tokens.
- Produces, in `components/header/nav.ts`:
  - `export const PRIMARY_NAV: ReadonlyArray<{ href: string; label: string; match: (path: string) => boolean }>`, exactly, in order:
    - Articles `/` (matches `/`, `/articles`, `/post/…`, `/category/…`)
    - Writers `/authors` (matches `/authors`, `/author/…`)
    - Assistant `/assistant`
    - Reading list `/bookmarks`
    - About `/about`
  - `export function headerCta(user: { isEditor: boolean } | null): { href: string; label: string }`:
    - `null` → `{ href: '/login?next=%2Fdashboard%2Faccess', label: 'Start writing' }`
    - reader → `{ href: '/dashboard/access', label: 'Start writing' }`
    - editor → `{ href: '/dashboard', label: 'Open studio' }`
- **Header layout:**
  - **`lg` and up:** `BrandLogo` (links to `/`, `aria-label="ResearchWithMe home"`), then `<nav aria-label="Primary">` with `PRIMARY_NAV` (active item gets `aria-current="page"`), then a right cluster: the search icon button and the CTA link.
    - Search button: `aria-label="Search articles"`, `lucide` `Search` icon only, opens the lazy `CommandPalette`.
    - CTA: primary-button tokens `bg-brand text-on-primary`, min height 44 px.
  - **Below `lg`:** `BrandLogo` (compact), the search icon button, and a menu button (`aria-expanded`, `aria-controls`). The panel lists `PRIMARY_NAV`, then the CTA full-width.
  - **Kept:** the sticky hairline-to-raised elevation (existing motion tokens), Escape closes the menu and returns focus, and the menu closes on route change. The Cmd/Ctrl+K handler stays, but there's no visible `⌘K` or `kbd`.
  - **Removed:** the locale switcher, ThemeToggle, reading-list badge and `AttentionPulse`, the digest indicator, the account link, the separate write link, and `secondaryNav`.

- [ ] **Step 1: Write the failing tests** `lib/__tests__/header.test.tsx` (jsdom)
  - `nav has exactly the five items` → `PRIMARY_NAV.map(i => i.label)` equals `['Articles', 'Writers', 'Assistant', 'Reading list', 'About']`; no `href` among `/papers`, `/editions`, `/editorial-board`
  - `CTA for visitors, readers and editors` → the three `headerCta` cases above, exact objects
  - `Articles is active on an article page` → `PRIMARY_NAV[0].match('/post/x') === true`; `PRIMARY_NAV[1].match('/author/myself-aas') === true`
  - `renders brand, nav, search icon and CTA only` → `renderToStaticMarkup(<BlogHeader />)` with `useSession` mocked to `{ user: null }`:
    - contains `Start writing`, `aria-label="Search articles"` and `aria-label="Primary"`
    - doesn't contain `⌘K`, `<kbd`, `LocaleSwitcher`, `Theme`, `Sign In` or `Editorial studio`
  - `editors see Open studio` → mocked `{ user: { isEditor: true, name: 'A' } }` → contains `Open studio` and not `Start writing`
- [ ] **Step 2: Run it** with `npx vitest run lib/__tests__/header.test.tsx` → FAIL.
- [ ] **Step 3: Implement** `nav.ts`, the rewritten `BlogHeader` and the footer changes. Keep the `BlogHeader` props (`searchQuery`, `setSearchQuery`, `savedCount`) accepted but unused, so callers in both targets compile unchanged; mark them `/** @deprecated unused since Task 18 */`.
- [ ] **Step 4: Verify (Impeccable included)**
  - `npm run quality` → PASS. Update the snapshot in `lib/__tests__/visual-regression.test.ts` with `npx vitest run lib/__tests__/visual-regression.test.ts -u` only if the diff is the header, and review it first.
  - `npm run dev`, then:
    - `npm run impeccable:url` → 0 findings at 1280×800
    - `npx impeccable detect --viewport 390x844 http://localhost:3000` and `--viewport 320x720` → 0 findings, with no horizontal scroll at 320 px
  - Keyboard: Tab order is brand → nav items → search → CTA; on mobile the menu button opens the panel and Escape returns focus.
  - `npm run build:pages` → exit 0. Push; the preview build passes.
- [ ] **Step 5: Commit**

```bash
git add components/header components/BlogHeader.tsx components/BlogFooter.tsx lib/__tests__/header.test.tsx .impeccable/surfaces docs/header-footer-audit-2026-11-09.md
git commit -m "feat: simplify the header to brand, menu items, search icon and one CTA"
```

---

### Task 19: Record the decisions in the project docs

**Files:**
- Modify:
  - `CLAUDE.md` (Project overview)
  - `PRODUCT.md` (Capabilities: banner and profile photo uploads; no AI image generation)
  - `README.md` (Editorial CMS: image upload rules)
  - `docs/codebase/CONCERNS.md`, `docs/codebase/STACK.md`, `docs/codebase/STRUCTURE.md`, `docs/codebase/TESTING.md`, `docs/codebase/INTEGRATIONS.md`

- [ ] **Step 1: `CLAUDE.md` Project overview.** State:
  - production is the Next.js app on the `researchwithme` Worker via OpenNext, deployed by Workers Builds
  - npm is the package manager
  - `cloudflare-pages/` is frozen and undeployed; shared logic goes in `lib/*-core.ts`, and API tests in `test/next/`
  - images are JPEG uploads processed in the browser (`lib/images/`) and stored in Supabase Storage; there is no AI image generation
  - the site is not a journal: no ISSN, DOIs, editorial board or seed content; the only editor is Ashif Ahmed Shuvo (Editor-in-Chief), and `lib/__tests__/truthful-copy.test.ts` enforces the banned list
  - the site is English-only (no i18n layer); the header is brand + `PRIMARY_NAV` + search icon + `headerCta()` (`components/header/nav.ts`)
  - the live database is changed only through `supabase/migrations/` (`npx supabase db push`); the history was reconciled on 2026-11-13 (`docs/supabase-reconcile-2026-11-13.md`)
- [ ] **Step 2: `PRODUCT.md` and `README.md`:** the upload rules from Global Constraints, in one short paragraph each.
- [ ] **Step 3: `docs/codebase/`**
  - **CONCERNS:**
    - §6: each question becomes its decision plus commit.
    - Move the resolved §1 rows (Impeccable, deploy docs, guard, client key, lockfiles) to "Resolved".
    - Keep the KV write-budget row open.
    - Update "Intent vs. reality" (fonts, email, AI images).
  - **STACK:** npm, Aptos, `react-easy-crop` 6.2.4; `@gradio/client` removed.
  - **INTEGRATIONS:**
    - Hugging Face removed; Gemini is assistant-only.
    - Storage buckets `blog-images` (covers in `covers/`) and `profile-images`.
    - Remove `generate` and `author-avatar` from the route table.
  - **STRUCTURE:** `.agents/`, `.impeccable/`, `lib/images/`, `components/media/`.
  - **TESTING:** `test/next/`, the image tests, and the new pgTAP suite.
- [ ] **Step 4: Verify:** `npm run quality` → PASS.
- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md PRODUCT.md README.md docs/codebase
git commit -m "docs: record decisions, image uploads and AI image removal"
```

---

## Out of scope (separate plans)

- Moving rate-limit counters off the shared KV namespace (CONCERNS §1, still **High**).
- Finishing or retiring `cloudflare-pages/`. Its routes get only the changes needed to keep `build:pages` and `test/pages` green.
- Running Playwright and pgTAP in CI.
- Removing `?secret=` from `/api/revalidate`.
- Aptos in email templates and HyperFrames videos.
- Re-pointing the restored `.agents/` Impeccable hooks.
- Social-card previews: `og:image` for processed covers points at the 1600×900 WebP. Platforms that reject WebP previews would need a JPEG OG variant.
- Re-processing or deleting covers already stored under `blog-images/uploads/`, and the Markdown body-image uploader.
