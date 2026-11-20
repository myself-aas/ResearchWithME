# Full Spectrum Audit: Merge `1ec95b0` (PR #38 + local `07ec48a`)

**Date**: 2026-11-19
**Mode**: Repo, merge review (all changes the merge brought onto `main`)
**Source**: `main` at `1ec95b0`. Scope: `git diff 07ec48a 1ec95b0` (PR #38, 10 commits, 101 files, +8,219/−743) plus the local commit `07ec48a`
**Lenses Run**: 10/10
**Lenses Skipped**: none. The Backend lens is written for Rust/Tauri; here it was applied to the Next.js API routes, the Supabase storage adapter and the SQL migrations.

---

## Master Verdict: APPROVE WITH CHANGES (one production blocker outstanding)

The merge combined cleanly: no conflict markers, and every PR #38 change survived. The breakage came from the local commit `07ec48a`, which committed a stray 12k-line build bundle that made `npm run lint` fail with 227 errors. Separately, three Windows-only portability faults made the test suite fail on this machine. Those are fixed, along with two real bugs in the merged code (broken GitHub links, mobile drawer focus).

One issue remains that needs the owner's approval because it changes production: migration `20261117001400_v34_supabase_artifact_storage` is **not applied** to the live Supabase project. With the default `ARTIFACT_STORAGE_PROVIDER=auto` and a service-role key set, exports and renders will fail until it is.

## Fixes Applied in This Audit

| # | Problem | Root cause | Fix | Files |
|---|---------|-----------|-----|-------|
| F1 | `npm run lint`: 227 errors / 3,942 warnings | `07ec48a` committed `cloudflare-pages/.server/entry-server.mjs`, an old Vite/React Router SSR build, not this Next.js app. `dist/` was ignored but `.server/` was not | Untracked the bundle (`git rm --cached`; the file stays on disk), ignored `cloudflare-pages/.server/`, and added `cloudflare-pages/**` to ESLint `globalIgnores` | `.gitignore`, `eslint.config.mjs` |
| F2 | 3 test files fail to load: `SyntaxError: Invalid or unexpected token` | `core.autocrlf=true` checks out `#!/usr/bin/env node\r`; Vitest does not strip a shebang ending in `\r` | New `.gitattributes` forcing `eol=lf` for `*.mjs/*.cjs/*.sh`; working copies converted (the index was already LF, so there is no content diff) | `.gitattributes` |
| F3 | `chrome-duplication` test fails: `['components\BlogHeader.tsx']` | `path.join` returns backslashes on Windows; the test's `endsWith('components/BlogHeader.tsx')` never matched | Normalised paths to `/` | `lib/__tests__/chrome-duplication.test.ts` |
| F4 | A different 2–6 tests time out on each full run | 181 files in parallel with cold route/config imports exceed the 5 s/10 s defaults; each passes in under 2 s alone | `testTimeout: 20_000`, `hookTimeout: 30_000` | `vitest.config.ts` |
| F5 | Author "GitHub" links 404 on this site | The new profile editor stores a bare handle (`normalizeGithub` → `octocat`); `AuthorDirectory` and `AuthorProfileCard` render it as `href="octocat"`, a relative link | `githubProfileUrl()` helper used by all three render sites, plus regression tests | `lib/profile/validation.ts`, `components/AuthorDirectory.tsx`, `components/AuthorProfileCard.tsx`, `app/post/[slug]/page.tsx`, `lib/__tests__/profile-validation.test.ts` |
| F6 | Opening the mobile drawer leaves focus on the hamburger behind it | BlogHeader calls `panelRef.focus()` on a `div` without `tabIndex` (a no-op) | `tabIndex={-1}` plus `outline-none` on the panel | `components/layout/MobileNavDrawer.tsx` |

Result: the full `npm run quality` gate passes (exit 0): tokens, lint (0 errors), typecheck, Vitest 181/181 files and 1,165 tests (up from 1,144 because the three previously unloadable files now run, plus 2 new regression tests), DNS and WebMCP tests, the Impeccable scan, and both worker dry-runs.

## Post-Audit Resolution (2026-11-20)

Owner decisions: apply the storage migration, revert the version bump, set up Cloudflare and deploy, then commit.

**Supabase (live project).** Object-level drift check showed six repo migrations never reached production. Applied: `profile_images` (the `profile-images` bucket was missing, so profile photo uploads failed), `v34_supabase_artifact_storage` (C1), `billing`, `linkedin_tokens`, `linkedin_events`, `linkedin_editorial_bridge`. The billing and LinkedIn bridges stay fail-closed until their secret digests are provisioned. New `20261119000100_linkedin_bridge_internal_helpers` revokes API-role execute on two helpers that Supabase's default grants had left callable; verified the bridge still works and direct calls are denied. **Deliberately not applied:** `20261113000200_reconcile_after_cleanup`. It grants Editor-in-Chief rows to a hard-coded email list, resets `blog-images` limits, and adds a `public.editors`-based upload policy beside the live `private.is_editor()` ones. That is an owner decision, not schema sync.

**Version.** Reverted to `0.2.2` (root fields of `package.json` and `package-lock.json` only).

**Build blockers found and fixed.**
- `scripts/build-next-or-worker.mjs` spawned `node_modules/.bin/next.cmd`, which Node refuses without a shell since CVE-2024-27980 (`EINVAL`). It now runs each CLI's JS entry with `process.execPath`.
- A production build on a dev machine compiled `.env.local`'s `http://localhost:3000` into canonical links. Fixed with `NEXT_PUBLIC_SITE_URL` in `.env.production` plus a gitignored `.env.production.local`.
- Building from a lower-case drive path (`g:\`) trips `Invariant: no direct app page entry found for /_not-found`. Environment-only; documented in `docs/deployment.md` §3.2.

**Cloudflare.** Created queue `researchwithme-outbox`. Deployed `researchwithme-assistant` (it did not exist, and the app binds it, so the app deploy would have failed) and `researchwithme-outbox` (cron `*/2`). Set `CRON_SECRET` on both, and the VAPID keys on the app. Deployed `researchwithme` version `6da64c40` (3,813 KiB gzipped, accepted).

**Verified in production.** `/`, `/feed` (404 before the deploy), `/authors`, `/login`, `/write`, `/pricing`, sitemap, robots and manifest return 200; `/dashboard` and `/editor` redirect when signed out; unknown paths return 404; `/api/cron/outbox-drain` returns 401 without or with a wrong secret; the canonical link is `https://researchwith.me`; two consecutive outbox cron runs completed `ok` with no exceptions.

**Still open (owner).** `SUPABASE_SERVICE_ROLE_KEY` is not set on the Worker, so artifacts use the `inline` provider until it is (the bucket is ready). Not configured: `GEMINI_API_KEY` (the assistant falls back to in-process), `RESEND_API_KEY`, Sentry/OTEL, and the billing/LinkedIn bridge secrets. Leaked-password protection is off in Supabase Auth. Recommendations R2–R18 below are unchanged.

## Verdict by Lens

| # | Lens | Verdict | Critical | Recommendations |
|---|------|---------|----------|-----------------|
| 1 | Design Engineer | APPROVE WITH CHANGES | 0 | 3 |
| 2 | UX Engineer | APPROVE WITH CHANGES | 1 (fixed: F5) | 3 |
| 3 | Frontend Engineer | APPROVE WITH CHANGES | 0 | 3 |
| 4 | Backend Engineer (Next API / Supabase) | APPROVE WITH CHANGES | 0 | 4 |
| 5 | Structural Engineer | APPROVE WITH CHANGES | 0 | 2 |
| 6 | Repo Maintainer | APPROVE WITH CHANGES | 1 (fixed: F1) | 2 |
| 7 | Production Readiness | **NEEDS REWORK** | 1 (open: C1) | 4 |
| 8 | DX Engineer | APPROVE WITH CHANGES | 1 (fixed: F1–F4) | 3 |
| 9 | Performance Engineer | APPROVE WITH CHANGES | 0 | 3 |
| 10 | Accessibility Engineer | APPROVE WITH CHANGES | 1 (fixed: F6) | 2 |

## All Critical Issues (Must Fix)

| # | Issue | Lens(es) | File(s) | Impact | Fix | Status |
|---|-------|----------|---------|--------|-----|--------|
| C1 | Storage migration not applied in production: bucket `researchwithme-artifacts` missing; `v34_scholarly_exports.storage_provider` CHECK still `('inline','r2')` (verified read-only against the live project) | Prod Readiness, Backend | `supabase/migrations/20261117001400_v34_supabase_artifact_storage.sql`, `lib/v34/artifact-storage.ts` | With `auto` and a service-role key, `storeArtifact` picks `supabase` with no fallback. The upload fails on the missing bucket, and the row insert would violate the CHECK. Exports and renders return errors | Apply the migration (`supabase db push` or the MCP `apply_migration`), or run `npm run storage:provision:supabase -- --apply` and then the migration | **OPEN: needs owner approval** |
| C2 | Lint gate broken by committed build bundle | Repo Maintainer, DX | `cloudflare-pages/.server/entry-server.mjs` | `npm run quality` cannot pass | F1 | Fixed |
| C3 | Test suite cannot pass on a Windows checkout | DX | 3 shebang scripts, `chrome-duplication.test.ts`, `vitest.config.ts` | Quality gate red on the maintainer's machine | F2–F4 | Fixed |
| C4 | GitHub profile links resolve to on-site 404s | UX, Frontend | `AuthorDirectory.tsx`, `AuthorProfileCard.tsx` | Every author who saved a profile through the editor gets a broken link | F5 | Fixed |
| C5 | Mobile drawer does not take focus on open | Accessibility | `MobileNavDrawer.tsx` | Screen reader and keyboard users get no sign the dialog opened (WCAG 2.4.3) | F6 | Fixed |

## Cross-Cutting Concerns

| Concern | Flagged By | Root Cause | Unified Fix |
|---------|-----------|------------|-------------|
| Profile data is validated only in the browser | Backend, Structural, UX | `ProfileEditor` upserts `profiles` directly via the user's Supabase client; the DB enforces only lengths. A direct REST call can store `website = 'ftp://…'` or a GitHub value of any shape | Add DB `CHECK`s (`website/scholar ~ '^https?://' or ''`, `github ~ '^[A-Za-z0-9-]{1,39}$' or ''`), or route through `/api/profile` running `validateProfileDraft` on the server |
| Storage failures don't degrade gracefully | Prod Readiness, Backend, DX | No `fetch` timeout; no inline fallback when Supabase upload fails; signing errors swallowed by `.catch(() => null)` without logging | `AbortSignal.timeout(15_000)` on storage calls; fall back to `inline` on upload failure for small payloads; log signing failures with the key and provider |
| Artifact records live only in per-isolate memory (predates this merge) | Prod Readiness, Performance | `getScholarlyExport` reads only `exportStore` (a `Map`); `wave8-store` uses `globalThis`. Rows are written to Postgres but never read back | Read from `v34_scholarly_exports` / `v34_render_jobs` when the in-memory store misses; bound or drop the maps |
| Windows portability of the toolchain | DX, Repo Maintainer | No `.gitattributes`; tests assume POSIX separators | Fixed (F2, F3). Keep `.gitattributes` and normalise paths in new tests |

## All Recommendations

| # | Recommendation | Lens | File(s) | Fix |
|---|---------------|------|---------|-----|
| R1 | Decide the version bump `0.2.2 → 1.0.1` | Repo Maintainer | `package.json`, `CHANGELOG.md` | CHANGELOG has only `[Unreleased]`: cut a `[1.0.1]` section or revert the bump |
| R2 | DB-level URL/handle constraints on `profiles` | Backend, Structural | new migration | See cross-cutting concern 1 |
| R3 | Timeouts and an inline fallback for artifact storage | Prod Readiness | `lib/v34/supabase-storage.ts`, `lib/v34/artifact-storage.ts` | See cross-cutting concern 2 |
| R4 | Log signing failures instead of swallowing them | Backend, Prod Readiness | `app/api/renders/[id]/route.ts` | Log inside the `.catch` before returning `null` |
| R5 | Narrow the constraint drop in the storage migration | Backend | `20261117001400_…sql` | Drop by expected name only; the current `ilike '%storage_provider%'` also drops combined constraints |
| R6 | Don't show raw Supabase `error.message` to users | UX, DX | `components/dashboard/ProfileEditor.tsx:143` | Map known codes (`23514` → field-specific text) and keep a generic fallback |
| R7 | Warn before a slug change breaks `/author/<old>` links | UX | `ProfileEditor.tsx` | Inline note when `slug` differs from the saved value |
| R8 | Unsaved-changes guard on the profile form | UX | `ProfileEditor.tsx` | `beforeunload` while the draft differs from the loaded profile |
| R9 | Use motion tokens in the new drawer | Design | `components/layout/MobileNavDrawer.tsx:69,83` | `SPRING.panel` and `TRANSITION.reveal` instead of literals |
| R10 | Share the header height between header and sticky tabs | Design | `BlogHeader.tsx:223`, `DashboardTabs.tsx:78` | A `--header-h` custom property consumed by both |
| R11 | Fold `z-[65]`/`z-[70]` into a z-index scale | Design | `EditorMenu.tsx:124`, `EditorDialog.tsx:87` | Named layers (dropdown, modal, toast) |
| R12 | Debounce the Markdown serialise on edit | Frontend, Performance | `components/editor/PlateBodyEditor.tsx:182` | Serialise on idle (about 250 ms) and flush on blur/save; it is O(document) per keystroke |
| R13 | Parallelise the dashboard profile queries | Performance | `lib/dashboard/profile.ts` | `Promise.all([profileRow, loadProfileSocialCounts(user.id)])` |
| R14 | Type editor history instead of casting | Frontend | `EditorToolbar.tsx:41` | `HistoryEditor` from Plate/slate-history |
| R15 | Clear the copy-feedback timer on unmount | Frontend | `InlineCitationPopover.tsx:95` | Keep the timer id in a ref and clear it in an effect cleanup |
| R16 | `--help` and unknown-flag rejection for the provisioning script | DX | `scripts/provision-supabase-storage-v34.mjs` | `--help` currently prints the dry-run plan |
| R17 | Platform-aware shortcut hints | DX, A11y | `EditorToolbar.tsx:182–219` | Show `Meta+B`/⌘B on macOS; `aria-keyshortcuts` should match the real binding |
| R18 | Use `git pull --rebase` on `main` | Repo Maintainer | n/a | Avoids `Merge branch 'main' of …` commits |

---

# Lens Reports

---

## 1. Design Engineer

**Verdict**: APPROVE WITH CHANGES

### Plan Summary
The merge adds a dashboard profile header and tabs, a profile editor, a unified rich-text editor toolbar/menu/dialog suite, a mobile navigation drawer, three OAuth buttons, and restyles the feed, article and author pages.

### Files Reviewed
| File | Visual Role | Risk |
|------|-------------|------|
| `components/layout/MobileNavDrawer.tsx` | New overlay navigation | Medium |
| `components/dashboard/DashboardTabs.tsx` / `DashboardProfileHeader.tsx` | Dashboard chrome | Low |
| `components/dashboard/ProfileEditor.tsx` | Form surface | Low |
| `components/editor/*` (Toolbar, Menu, Dialog, LinkDialog, BlockPalette, InsertFab) | Editor chrome | Medium |
| `components/BlogHeader.tsx`, `BlogHero.tsx`, `ArticleFeed.tsx` | Site chrome / feed | Low |
| `components/auth/LoginForm.tsx` | Sign-in | Low |
| `app/globals.css` | Tokens / global focus | Low |

### Critical Issues
None.

### Recommendations
| # | Issue | File(s) | Why | Fix |
|---|-------|---------|-----|-----|
| 1 | Literal spring and duration | `MobileNavDrawer.tsx:69,83` | CLAUDE.md requires motion tokens; `SPRING.panel` exists | Use `SPRING.panel`, `TRANSITION.reveal` |
| 2 | Header height duplicated | `BlogHeader.tsx:223` (`min-h-[60px]`), `DashboardTabs.tsx:78` (`top-[60px]`) | `min-h` lets the header grow, so the tabs would slide under it | Shared `--header-h` |
| 3 | Off-scale z-index | `EditorMenu.tsx:124` `z-[65]`, `EditorDialog.tsx:87` `z-[70]` | The rest of the app uses `z-10…z-50` | Named z layers |

### Nice-to-Haves
| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | Note in DESIGN.md that provider marks keep their brand hex fills | `LoginForm.tsx` Google/Discord marks rightly use `#4285F4` etc.; documenting this prevents a future "fix" |

### Design System Compliance
Semantic tokens (`bg-canvas`, `bg-surface`, `border-line`, `text-ink-secondary`, `bg-destructive/5`) are used throughout and there are no `dark:` one-offs, so dark mode comes from the token layer. Arbitrary values are layout-only (grid tracks, aspect ratios, viewport-relative widths), not colour or spacing tokens. The global `:where(a, button, …):focus-visible` rule (`globals.css:370`) gives every interactive element a ring, including files that define only `hover:`.

### Visual State Coverage
| Component/Element | Hover | Focus | Active | Disabled | Loading | Empty | Error | Dark Mode |
|-------------------|-------|-------|--------|----------|---------|-------|-------|-----------|
| Profile editor submit | ✓ | ✓ (global) | ✓ | ✓ | ✓ spinner + "Saving…" | n/a | ✓ field + form | ✓ tokens |
| OAuth buttons | ✓ | ✓ | ✓ | ✓ locked while pending | ✓ "Opening …" | n/a | ✓ alert | ✓ |
| Save to library | ✓ | ✓ | ✓ | ✓ busy | ✓ | n/a | ✓ 401 message | ✓ |
| Mobile drawer | ✓ | ✓ (after F6) | ✓ | n/a | n/a | n/a | n/a | ✓ |
| Editor toolbar toggles | ✓ | ✓ | ✓ `aria-pressed` | ✓ | n/a | n/a | n/a | ✓ |
| MdxEditor lazy load | n/a | n/a | n/a | n/a | ✓ pulse skeleton | n/a | n/a | ✓ |
| Article feed | ✓ | ✓ | n/a | n/a | n/a | ✓ (`article-feed-empty` test) | n/a | ✓ |

### Verdict Details
- Design Token Fidelity: PASS
- Visual State Coverage: PASS
- Dark Mode Parity: PASS
- Animation Quality: CONCERNS (drawer literals)
- Visual Consistency: CONCERNS (z scale, header coupling)

---

## 2. UX Engineer

**Verdict**: APPROVE WITH CHANGES

### Plan Summary
Readers can sign in with Google, LinkedIn, Discord or email; owners edit their public author profile from a new Profile tab; writers get one unified editor toolbar.

### User Journey Map
1. **Sign in**: pick provider → button shows "Opening Google…" and the others lock → redirect. A disabled provider explains itself; a signed-in visitor gets "Go to your dashboard". **OK**
2. **Open Profile tab**: tab with `aria-current` → form pre-filled from the session or existing row. **OK**
3. **Edit fields**: inline hints; slug auto-follows the display name until edited. **OK**
4. **Change slug on an existing profile**: no warning that `/author/<old>` stops working. **WARN**
5. **Leave the page mid-edit**: draft lost with no prompt. **WARN**
6. **Save**: "Saving…" → "Saved" status; slug collision mapped to a field error. **OK**
7. **Save fails for any other reason**: raw Supabase/Postgres `error.message` shown. **WARN**
8. **Visitor follows the author's GitHub link**: relative `href="octocat"` → 404. **FAIL → fixed (F5)**
9. **Save a contribution to the library**: status message; a 401 explains sign-in. **OK**

### Critical Issues
| # | Issue | Step in Journey | Impact on User | Fix |
|---|-------|----------------|----------------|-----|
| 1 | GitHub link broken for editor-saved profiles | 8 | Visitors land on a 404 from every author card | F5 (applied) |

### Recommendations
| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | Raw DB error text (`ProfileEditor.tsx:143`) | "violates check constraint…" means nothing to an author | Map codes; generic fallback |
| 2 | Silent slug change | Breaks shared links and citations | Inline warning showing the old URL |
| 3 | No unsaved-changes guard | Lost bio drafts | `beforeunload` when dirty |

### Nice-to-Haves
| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | "View public profile" link after the first save | Closes the loop on directory visibility |

### Interaction Consistency Check
Pending labels, `role="alert"` error boxes that take focus, and `role="status"` confirmations match the rest of the app. The dashboard tabs are navigation links, consistent with the site nav.

### Verdict Details
- Discoverability: PASS
- Flow Completeness: CONCERNS (slug change, unsaved draft)
- Error Recovery: CONCERNS (raw error text)
- Feedback & Status: PASS
- Consistency: PASS

---

## 3. Frontend Engineer

**Verdict**: APPROVE WITH CHANGES

### Plan Summary
New client components for the editor (Plate), dashboard and drawer; several data functions became async (`getScholarlyExport`, `getRenderJob`).

### Files Reviewed
| File | Frontend Role | Risk |
|------|--------------|------|
| `components/editor/PlateBodyEditor.tsx` | Editor state and serialisation | Medium |
| `components/editor/EditorToolbar.tsx` | Derived toolbar state | Low |
| `components/editor/MdxEditor.tsx` | `next/dynamic` boundary | Low |
| `components/dashboard/ProfileEditor.tsx` | Form state | Low |
| `components/reader/InlineCitationPopover.tsx` | Timer | Low |
| `components/BlogHeader.tsx` / `MobileNavDrawer.tsx` | Overlay effects | Low |

### Critical Issues
None. Every call to the newly async functions is awaited (checked across `app/`, `lib/`, `components/`, `scripts/`). A missing `await` in a truthiness check would have typechecked and silently returned a Promise.

### Recommendations
| # | Issue | File(s) | Why | Fix |
|---|-------|---------|-----|-----|
| 1 | Full-document Markdown serialise per change | `PlateBodyEditor.tsx:182` | O(n) per keystroke on long reviews | Debounce; flush on blur/save |
| 2 | `as unknown as { history }` cast | `EditorToolbar.tsx:41` | Hides an API change in Plate upgrades | `HistoryEditor` type |
| 3 | Timer not cleared on unmount | `InlineCitationPopover.tsx:95` | Harmless in React 19 but leaks a closure | Ref plus cleanup |

### Nice-to-Haves
| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | Stable keys in `write/page.tsx:766` and `PostEditor.tsx:766` lists | `key={index}`; fine while the lists are static |

### Render Path Analysis
`EditorToolbar` subscribes to `useEditorVersion()` and `useSelectionVersion()`, so it re-renders on every value or selection change and derives state on render. That is cheap (a few mark lookups), and deriving avoids a sync effect. The costly work is `markdown.serialize()` in `PlateBodyEditor`'s change handler, which runs on the same cadence and walks the whole document; this is the hot spot. The Plate bundle is behind `next/dynamic` with a skeleton, so it stays off the reader paths. All effects that add listeners or timers in BlogHeader, EditorMenu, EditorDialog and BottomSheet clean up.

### Type Safety Assessment
TypeScript is strict and clean (`tsc --noEmit` passes). There are two `as unknown as` casts (`EditorToolbar.tsx:41`, `wave8-store.ts:181` `globalThis`), no `any`, and no `@ts-ignore`. Client components import only *types* from the `server-only` `lib/dashboard/profile.ts`, which is correct.

### Verdict Details
- Component Architecture: PASS
- State Management: PASS
- Type Safety: PASS
- Rendering Performance: CONCERNS (serialise per keystroke)
- Bundle Impact: PASS

---

## 4. Backend Engineer (Next.js API / Supabase)

**Verdict**: APPROVE WITH CHANGES

### Plan Summary
Artifact storage moves behind a provider adapter (Supabase Storage → R2 → inline); two migrations (storage bucket and provider CHECK, profile social counters RPC); export and render routes become async and provider-agnostic.

### Files Reviewed
| File | Backend Role | Risk |
|------|-------------|------|
| `lib/v34/artifact-storage.ts`, `lib/v34/supabase-storage.ts` | Storage adapter | Medium |
| `lib/v34/exports.ts`, `lib/v34/wave8-store.ts` | Record stores | Medium |
| `app/api/exports/[id]/route.ts`, `…/download/route.ts`, `app/api/renders/[id]/route.ts` | HTTP surface | Low |
| `supabase/migrations/20261117001400_…artifact_storage.sql` | Bucket and CHECK | Medium |
| `supabase/migrations/20261117001500_…social_counts.sql` | SECURITY DEFINER RPC | Low |
| `profiles` RLS (existing `20261108000400/0500`) | Write path for the new editor | Medium |

### Critical Issues
None in code. Deployment state C1 is covered under Production Readiness.

### Recommendations
| # | Issue | File(s) | Why | Fix |
|---|-------|---------|-----|-----|
| 1 | Client-only validation of profile URLs | `profiles` table | RLS limits *who* writes, not *what* | DB CHECKs (R2) |
| 2 | Signing error swallowed | `renders/[id]/route.ts` | Silent expired-link failures | Log before returning `null` |
| 3 | Broad constraint drop | storage migration DO block | Also removes any multi-column CHECK that mentions `storage_provider` | Drop by name |
| 4 | No timeout on storage fetches | `supabase-storage.ts:141,202` | Requests hang until the platform kills them | `AbortSignal.timeout` |

### Nice-to-Haves
| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | Clean up orphaned objects when the row insert fails after upload | Upload-then-insert order is correct (no dangling rows) but can leave objects behind |

### Error Path Analysis
- **Export create**: `storeArtifact` throws on Supabase upload failure → no fallback → the route returns an error. The DB insert goes through `runSupabaseMutation`, which fails closed when a client is present.
- **Export read**: an owner mismatch returns `null` → 404 (no IDOR). Re-signing errors are caught and fall back to the URL minted at upload time, which may be stale.
- **Render read**: re-signing is wrapped in `.catch(() => null)`, so the error is dropped with no log.
- **Profile save**: `23505` is mapped to the slug field; anything else surfaces raw `error.message`.
- **Social counts RPC**: `SECURITY DEFINER`, `search_path` pinned, execute granted to `authenticated` only, returns three integers. The `count(*)` is correct because `v34_library_items` has `UNIQUE (user_id, item_type, item_id)`.

### Resource Lifecycle Audit
| Resource | Allocated In | Cleaned Up In | Error Path Cleanup | Risk |
|----------|-------------|---------------|-------------------|------|
| Storage object | `storeArtifactInSupabase` | `deleteArtifactFromSupabase` (explicit) | None if the DB insert fails | Low (orphan) |
| Signed URL | `createSupabaseSignedUrl` (TTL clamped) | Expires | n/a | Low |
| In-memory `exportStore` / wave8 `globalThis` | per isolate | Never (test reset only) | n/a | Medium (unbounded; predates merge) |
| Service-role key | `getSupabaseStorageConfig` (server-only importers) | n/a | n/a | Low |

### Verdict Details
- Error Handling: CONCERNS (swallowed signing errors, raw messages)
- Concurrency Safety: PASS
- Resource Management: CONCERNS (unbounded maps, orphan objects)
- IPC Correctness (API contract): PASS (`X-Storage-Provider` now reports the real provider)
- File System / Storage Safety: PASS (private bucket; `storage.objects` has no policies, so only the service role has access; keys built server-side from IDs and `sanitizeBibKey`)

---

## 5. Structural Engineer

**Verdict**: APPROVE WITH CHANGES

### Plan Summary
New modules `lib/profile/*`, `lib/dashboard/profile.ts`, `lib/editor/*`, `lib/v34/{artifact,supabase}-storage.ts`, `lib/v34/mdx-roundtrip.ts`; header and dashboard chrome consolidated.

### Files Reviewed
| File | Structural Role | Layer | Risk |
|------|----------------|-------|------|
| `lib/v34/artifact-storage.ts` | Provider adapter | lib | Low |
| `lib/dashboard/profile.ts` | Server loader (`server-only`) | lib | Low |
| `lib/profile/validation.ts` | Shared pure validation | lib | Low |
| `components/dashboard/ProfileEditor.tsx` | Client writer | components | Medium |
| `components/BlogHeader.tsx` + `layout/MobileNavDrawer.tsx` | Single owner of mobile chrome | components | Low |

### Critical Issues
None.

### Recommendations
| # | Issue | Why | Fix |
|---|-------|-----|-----|
| 1 | Profile writes bypass the server layer | The only browser→table write among the new features, so validation exists only in the client | `/api/profile` route or DB CHECKs |
| 2 | GitHub URL building was duplicated in three places | Divergence caused F5 | Done: `githubProfileUrl` |

### Nice-to-Haves
| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | Break the `lib/blog-data.ts ↔ lib/categories.ts` cycle | Predates the merge; found by madge |

### Dependency Map
```
app/api/renders/[id] ──► lib/v34/artifact-storage ──┬─► lib/v34/supabase-storage ──► fetch (Storage REST)
app/api/exports/*    ──► lib/v34/exports ───────────┘   └─► lib/v34/r2-storage
app/dashboard/layout ──► lib/dashboard/profile (server-only) ──► lib/profile/counters ──► RPC v34_profile_social_counts
components/dashboard/* ─(import type only)─► lib/dashboard/profile
components/dashboard/ProfileEditor ──► lib/profile/validation ──► (browser) supabase.from('profiles').upsert   ⚠
components/Author{Directory,ProfileCard}, app/post/[slug] ──► lib/profile/validation.githubProfileUrl
components/editor/* ──► lib/editor/{block-catalog,plate-actions,plate-client-plugins}
```
No `lib → components/app` imports.

### Boundary Crossing Analysis
| Crossing | From → To | Clean? | Notes |
|----------|-----------|--------|-------|
| Server loader → client | `lib/dashboard/profile` → dashboard components | Yes | Type-only imports; `server-only` guard |
| Browser → DB | `ProfileEditor` → `profiles` | Partly | RLS owner-only; no server validation |
| Route → storage | API routes → adapter | Yes | Provider chosen in one place |

### Verdict Details
- Dependency Direction: PASS
- Module Coupling: PASS
- Cohesion: PASS
- Layer Boundaries: CONCERNS (browser write)
- Change Propagation: PASS (after the F5 consolidation)

---

## 6. Repo Maintainer

**Verdict**: APPROVE WITH CHANGES

### Plan Summary
A large, well-tested feature PR merged on top of a local commit that added a generated bundle and a version bump under the message "Refactor code structure for improved readability and maintainability".

### Files Reviewed
| File | Convention Status | Risk |
|------|------------------|------|
| `cloudflare-pages/.server/entry-server.mjs` | Generated artifact committed | High → fixed |
| `package.json` / `package-lock.json` | Version bump without CHANGELOG | Medium |
| `.impeccable/surfaces/*` | Briefs present for all changed routes | Low |
| New components and lib modules | All have importers | Low |

### Critical Issues
| # | Issue | File(s) | Convention Violated | Fix |
|---|-------|---------|-------------------|-----|
| 1 | Build output committed | `cloudflare-pages/.server/entry-server.mjs` | Generated files ignored; quality gate must pass | F1 |

### Recommendations
| # | Issue | Why | Fix |
|---|-------|-----|-----|
| 1 | `1.0.1` with no CHANGELOG release | Version and history disagree | Cut a release section or revert |
| 2 | Non-conventional, misleading commit message and a pull merge commit | CLAUDE.md requires conventional commits | `chore(release): …`; `git pull --rebase` |

### Nice-to-Haves
| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | Delete the on-disk `cloudflare-pages/` if the Vite build is retired | It is now ignored, but its `dist/` holds a stale `AGENTS.md` and `_headers` |

### Convention Compliance Checklist
| Convention | Status | Notes |
|-----------|--------|-------|
| File placement | ✓ | Routes in `app/`, UI in `components/`, data in `lib/` |
| Naming conventions | ✓ | |
| Barrel exports | ✓ | Project imports by file; no barrel expected |
| Import ordering | ✓ | ESLint clean |
| Type imports separated | ✓ | `import type` used for server types |
| Path aliases used | ✓ | `@/` throughout |
| No dead code left | ✓ | Old header drawer code removed; `r2-storage` still used by the adapter |
| Structured logging | ~ | `console.error` in `lib/dashboard/profile.ts` (project pattern) |
| No lint suppressions | ✓ | Only `@next/next/no-img-element`, with reason |
| Surface briefs in sync | ✓ | `surface-briefs` test passes |

### Reuse Opportunities
`githubProfileUrl` (added) replaces three inline URL builders. `orcidHref` in `AuthorDirectory` and the inline ORCID builder in `AuthorProfileCard` could move beside it the same way.

### Verdict Details
- File Organization: PASS
- Naming Consistency: PASS
- Import Hygiene: PASS
- Code Reuse: PASS (after F5)
- Lint Compliance: PASS (after F1)

---

## 7. Production Readiness

**Verdict**: NEEDS REWORK (until C1 is resolved)

### Plan Summary
The merge ships Supabase Storage as the default artifact backend and an owner-editable profile, both of which depend on database state in the live project.

### Files Reviewed
| File | Production Role | Risk |
|------|----------------|------|
| `supabase/migrations/20261117001400_…` | Bucket and CHECK | **High (unapplied)** |
| `supabase/migrations/20261117001500_…` | Counters RPC | Low (applied) |
| `lib/v34/artifact-storage.ts` | Provider selection | High (no fallback) |
| `scripts/check-production-env.mjs` | Env gate | Low |
| `.env.example` | Documentation | Low |

### Critical Issues
| # | Issue | File(s) | Production Failure Mode | Fix |
|---|-------|---------|------------------------|-----|
| 1 | Storage migration not applied (verified live: no bucket; CHECK is `inline, r2`) | `20261117001400_…sql` | Exports and renders error out when `auto` resolves to `supabase` | Apply the migration / provisioning script with `--apply` (owner approval) |

### Recommendations
| # | Issue | Why | Fix |
|---|-------|-----|-----|
| 1 | No inline fallback | One missing bucket takes the feature down | Fall back and log |
| 2 | No fetch timeouts | Hangs consume worker time | `AbortSignal.timeout` |
| 3 | Records read only from isolate memory (predates merge) | Exports 404 across isolates on Workers | Read through to Postgres |
| 4 | Add a migration-applied check to `check-production-env` / `verify-v34-live` | This drift would have been caught at deploy | Query `storage.buckets` and the CHECK definition |

### Nice-to-Haves
| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | Feature-flag `supabase` as the default for one release | Safe rollout while the bucket is provisioned |

### Failure Mode Analysis
| Scenario | What Fails | User Impact | Recovery | Plan Handles It? |
|----------|-----------|-------------|----------|-------------------|
| Bucket missing (current prod) | Upload 400/404 | Export/render error | Apply migration | **No** |
| CHECK not widened (current prod) | Row insert `23514` | Export error even if upload works | Apply migration | **No** |
| Storage slow | Request hangs | Spinner until timeout | None | No |
| Signing fails on read | Stale URL returned / dropped silently | Expired download link | Retry | Partly |
| Request on a different isolate | `exportStore` miss | 404 for a just-created export | None | No (predates merge) |
| Profile row missing | Falls back to session summary | Header still renders | Automatic | Yes |
| Counters RPC fails | Logged; session summary | Header without numbers | Automatic | Yes |
| Provider disabled in Supabase Auth | Friendly message | User picks another provider | n/a | Yes |

### Environment Checklist
| Concern | Dev | Prod | Gap? |
|---------|-----|------|------|
| File paths | Local `cloudflare-pages/` artifacts | Not deployed | No (now ignored) |
| Network | Supabase Storage REST | Same | Timeouts missing |
| Permissions | Service role server-only | Same | No |
| Config | `.env.example` documents `ARTIFACT_STORAGE_PROVIDER`, `SUPABASE_STORAGE_BUCKET`, `SUPABASE_SERVICE_ROLE_KEY`; `check-production-env` gates them | Same | No |
| Database | Migrations in repo | `…001400` **missing** | **Yes** |
| Build output | `.open-next/` | Workers | No |

### Verdict Details
- E2E Flow: CONCERNS (blocked by C1)
- Error Recovery: CONCERNS
- Data Integrity: PASS (upload-then-insert; owner-scoped reads)
- Environment Parity: CONCERNS (migration drift)
- Observability: CONCERNS (swallowed signing errors)

---

## 8. DX Engineer

**Verdict**: APPROVE WITH CHANGES

### Plan Summary
For developers: the quality gate, the provisioning scripts and the test suite. For writers: the editor's keyboard model.

### Files Reviewed
| File | DX Role | Risk |
|------|---------|------|
| `package.json` `quality` script | Gate | High → fixed |
| `scripts/provision-supabase-storage-v34.mjs` | Ops CLI | Low |
| `vitest.config.ts` | Test runner | Medium → fixed |
| `components/editor/EditorToolbar.tsx` | Shortcuts | Low |

### Critical Issues
| # | Issue | Impact on Developer | Fix |
|---|-------|-------------------|-----|
| 1 | `npm run quality` could not pass on a Windows checkout (bundle lint, CRLF shebangs, path separators, timeouts) | Every commit blocked or `--no-verify` tempted | F1–F4 |

### Recommendations
| # | Issue | Why | Fix |
|---|-------|-----|-----|
| 1 | `--help` ignored by the provisioning script | It prints the plan instead of usage | Parse flags; reject unknown ones |
| 2 | Shortcut hints hard-code `Control+` | Wrong on macOS, where Plate binds ⌘ | Platform-aware labels |
| 3 | Raw error text in the profile editor | Undebuggable for users, noisy for support | Code mapping |

### Nice-to-Haves
| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | Silence the `core.useBuiltinFSMonitor` deprecation hint | `git config core.fsmonitor true`; it prints on every git call |

### Error Message Audit
| Error Scenario | Current Message | What Developer Needs | Suggested Message |
|---------------|----------------|---------------------|-------------------|
| Shebang script imported under CRLF | `SyntaxError: Invalid or unexpected token` at the import line | Cause: line endings | Prevented by `.gitattributes` |
| Storage not configured | "Supabase artifact storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." | ✓ good | n/a |
| Bucket missing | Upstream text wrapped with the key | Next step | "Bucket researchwithme-artifacts not found. Run `npm run storage:provision:supabase -- --apply` or apply migration 20261117001400." |
| Profile save (non-unique error) | Raw Postgres message | Field and action | "Your website must start with https://" (per constraint) |
| Profile editing without Supabase | "Profile editing needs the Supabase connection, which is not configured in this environment." | ✓ good | n/a |

### Developer Journey
First use: clone on Windows → `npm run quality` used to fail in lint and tests for reasons unrelated to the code, and now passes. Daily: the provisioning script dry-runs by default (good) and prints a clear plan and next steps. Power use: editor shortcuts are exposed through `aria-keyshortcuts` and tooltips.

### Verdict Details
- Error Quality: CONCERNS
- Defaults & Config: PASS (`auto` provider; dry-run default)
- Keyboard Experience: PASS (arrow-key toolbar, 44px targets)
- Discoverability: PASS
- Workflow Integration: PASS (after F1–F4)

---

## 9. Performance Engineer

**Verdict**: APPROVE WITH CHANGES

### Plan Summary
New per-request DB work on dashboard loads; a heavier editor on writer routes; new storage round trips on export and render.

### Files Reviewed
| File | Performance Role | Risk |
|------|-----------------|------|
| `lib/dashboard/profile.ts` | Dashboard layout loader | Low |
| `supabase/migrations/…social_counts.sql` | Aggregate RPC and indexes | Low |
| `components/editor/PlateBodyEditor.tsx` | Keystroke hot path | Medium |
| `lib/v34/exports.ts`, `wave8-store.ts` | In-memory maps | Medium |

### Critical Issues
None.

### Recommendations
| # | Issue | File(s) | Why | Fix |
|---|-------|---------|-----|-----|
| 1 | Serial profile row → counters RPC | `lib/dashboard/profile.ts` | Two round trips on every dashboard hard load | `Promise.all` |
| 2 | Serialise per keystroke | `PlateBodyEditor.tsx` | O(doc) on long-form reviews | Debounce |
| 3 | Unbounded in-memory maps | `exports.ts:40`, `wave8-store.ts:181` | Grow for the isolate's lifetime | Bound or remove (read through to DB) |

### Nice-to-Haves
| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | Cache counters for about 60 s per user | They change slowly; saves an RPC per hard load |

### Resource Budget
| Resource | Current | After Plan | Concern? |
|----------|---------|-----------|----------|
| DB round trips per dashboard hard load | 0–1 | 2 (serial) | Minor |
| Event listeners added | Drawer: keydown (cleaned) | Same | No |
| Memory growth per hour | Maps per isolate | Same plus storage metadata | Minor (existing) |
| Startup impact | n/a | Plate behind `next/dynamic` | No |
| Bundle size impact | n/a | Editor only on `/write`, `/editor` | No |

### Hot Path Analysis
The keystroke path in the editor triggers a toolbar re-render (cheap) and a full Markdown serialise (the cost centre). The reader paths add no new per-scroll work. The counters RPC has supporting indexes (`v34_user_follows (followee_id, created_at desc)`, `v34_library_items (item_type, item_id)`).

### Verdict Details
- Memory Management: CONCERNS (existing maps)
- IPC / Network Efficiency: CONCERNS (serial queries)
- I/O Patterns: PASS
- Startup Impact: PASS
- Long-Session Stability: CONCERNS (editor on very long documents)

---

## 10. Accessibility Engineer

**Verdict**: APPROVE WITH CHANGES

### Plan Summary
New overlays (mobile drawer, editor dialog, link dialog, editor menu, bottom sheet), a toolbar with toggle buttons, an accessible form, and OAuth buttons.

### Files Reviewed
| File | A11y Role | Risk |
|------|----------|------|
| `components/layout/MobileNavDrawer.tsx` + `BlogHeader.tsx` | Modal navigation | High → fixed |
| `components/editor/EditorDialog.tsx`, `LinkDialog.tsx` | Modal dialogs | Low |
| `components/editor/EditorMenu.tsx` | Menu | Low |
| `components/layout/BottomSheet.tsx` | Modal sheet | Low |
| `components/dashboard/ProfileEditor.tsx` | Form | Low |
| `components/dashboard/DashboardTabs.tsx` | Navigation | Low |

### Critical Issues
| # | Issue | WCAG Criterion | File(s) | Impact | Fix |
|---|-------|---------------|---------|--------|-----|
| 1 | Drawer panel not focusable; focus stays on the trigger behind the modal | 2.4.3 Focus Order, 4.1.2 | `MobileNavDrawer.tsx` | No announcement that the dialog opened | `tabIndex={-1}` (F6) |

### Recommendations
| # | Issue | WCAG Criterion | Fix |
|---|-------|---------------|-----|
| 1 | `aria-keyshortcuts="Control+B"` on macOS | 4.1.2 (accurate name/description) | Platform-aware value |
| 2 | Header stays outside `inert` while the drawer is open | 2.4.3 | The Tab trap covers it; also mark the header's other controls `inert` for screen-reader virtual cursors |

### Nice-to-Haves
| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | E2E keyboard test: open drawer → focus inside → Escape → focus on toggle | Locks in F6; `v34-a11y-reflow.spec.ts` covers axe and the skip link but not this flow |

### Keyboard Navigation Walkthrough
| Step | Action | Expected Focus | Expected Announcement | Plan Handles? |
|------|--------|---------------|----------------------|---------------|
| 1 | Tab to hamburger, Enter | Drawer panel | "Navigation menu, dialog" | ✓ after F6 (was ✗) |
| 2 | Tab within drawer | Cycles links and the toggle | Link names | ✓ trap in BlogHeader |
| 3 | Escape | Hamburger toggle | "Open navigation menu, button" | ✓ |
| 4 | Editor: Tab into toolbar, arrow keys | Next/prev control | "Bold, toggle button, pressed" | ✓ `aria-pressed`, roving focus |
| 5 | Open link dialog, Escape | Returns to editor | "Insert link, dialog" | ✓ |
| 6 | Profile: submit with errors | First error via form alert | "Check the highlighted fields…" | ✓ `aria-invalid` + `aria-describedby` |
| 7 | Sign in: activate provider | Button disabled, label "Opening Google…" | Label change | ✓ |

### ARIA Checklist
| Element | Role | Label | States | Keyboard | Notes |
|---------|------|-------|--------|----------|-------|
| Mobile drawer | dialog, `aria-modal` | "Navigation menu" | n/a | Esc, Tab trap | Fixed focus target |
| Drawer close | button | "Close navigation menu" | n/a | Enter/Space | 44px target |
| Scrim | button, `aria-hidden`, `tabIndex -1` | n/a | n/a | n/a | Correctly hidden |
| EditorDialog | dialog, `aria-modal` | `aria-labelledby` | n/a | Esc, Tab trap | ✓ |
| EditorMenu | menu | `aria-label` | n/a | Esc, arrows | ✓ |
| Toolbar toggles | button | Visible label/title | `aria-pressed` | Arrows | ✓ |
| Dashboard tabs | nav list | link text | `aria-current="page"` | Tab | Correct (links, not ARIA tabs) |
| Profile fields | textbox | `<label>` | `aria-invalid`, `aria-describedby` | Tab | ✓ |
| Save status | status | n/a | live | n/a | ✓ |

### Verdict Details
- Screen Reader Compatibility: PASS (after F6)
- Keyboard Navigation: PASS
- Focus Management: PASS (after F6)
- Color Contrast: PASS (token pairs, checked by `tokens:check` contrast in the gate)
- Motion Sensitivity: PASS (`MotionConfig reducedMotion="user"`; `motion-safe:`/`motion-reduce:` variants)
