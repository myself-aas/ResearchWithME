# Discovery State and Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make catalogue freshness, likes, and URL filters truthful and reproducible.

**Architecture:** Extract only discovery request/filter responsibilities from HomeFeed. Keep persisted reader preferences in Zustand and canonical filters in router URLs; use native request/AbortController APIs rather than a new server-state library.

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

- Successful empty results must replace populated SSR data (Task 1).
- A late older fetch must not overwrite a newer retry or unmounted component (Task 1).
- Rapid duplicate likes and failed retry must not corrupt counts (Task 2).
- Unknown format/category and encoded query input must canonicalize predictably (Task 3).
- Back/forward and reload must restore applied filters without destroying draft cursor state (Task 3).

---

## File and execution map

Files are listed per task below; `Create` means proposed, not already present. Tests and implementation stay in the repository's established folders. No global file reorganization. Commit steps are future implementation checkpoints, not commands executed during planning. Provision existing dependencies with authorized `npm ci` before red/green cycles; missing executables are BLOCKED, not a red regression test. Use the current branch for every commit.

### Task 1: Authoritative catalogue and freshness states

**Files:**
- Create: `lib/use-feed-articles.ts`
- Modify: `components/HomeFeed.tsx`
- Create: `lib/__tests__/home-feed-state.test.tsx`

**Interfaces:** Produces `useFeedArticles(initialPosts: BlogPost[]): {posts: BlogPost[]; freshness: "loading"|"ready"|"stale"|"error"; retry:()=>void; setPosts: React.Dispatch<React.SetStateAction<BlogPost[]>>}`. HomeFeed owns existing preference/filter composition; request hook owns fetch identity and cancellation.

- [ ] **Step 1: Write failing regression `empty_response_is_authoritative_and_late_responses_are_ignored`.** Mount with one real fixture post, resolve `{articles: []}` and assert posts=[]/ready. Reject refresh and assert original data retained/stale with retry; malformed articles field is stale, not empty. Resolve retry before first request and assert the older response cannot win; unmount and assert AbortSignal aborted.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(result.current.posts).toEqual([]);
expect(result.current.freshness).toBe("ready"); // successful articles: []
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/home-feed-state.test.tsx`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Accept every array including empty, validate array item shape via existing frontend article contract, expose visible stale/retry feedback, and cancel superseded/unmounted work. Preserve an intentional initial fallback only when no SSR data was supplied. Correct the stale Next-versus-Pages comment.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/home-feed-state.test.tsx`; expected PASS. Run the component tests and browser route with intercepted 200-empty/500/malformed/retry responses. No seed injection after a valid authoritative empty catalogue.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: model feed freshness and authoritative empty data"` on the current branch. Do not push/deploy as part of this task.

### Task 2: Accessible optimistic like feedback

**Files:**
- Create: `lib/use-article-likes.ts`
- Modify: `components/HomeFeed.tsx`
- Modify: `components/ArticleFeed.tsx`
- Create: `lib/__tests__/article-like-feedback.test.tsx`

**Interfaces:** Consumes Task 1 setPosts and existing preference actions. Produces `useArticleLikes({likedPostIds,setPostLiked,setPosts}): {like:(postId:string)=>Promise<void>; pendingIds:ReadonlySet<string>; error:string|null; retry:()=>Promise<void>}`; use existing BlogPost and preference-action types rather than redefining them.

- [ ] **Step 1: Write failing regression `failed_like_rolls_back_once_and_retry_has_visible_state`.** With likes=3, rapid double activate sends one PATCH and shows 4 while pending. Reject => count=3, local liked=false, live error shown; retry success =>4/liked=true/error=null. Already-liked activation sends no request. Assert no decrement of unrelated/newer article data.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(patchRequests).toHaveLength(1); // two rapid activations
expect(currentPost.likes).toBe(3); // rejected request rolls back exactly once
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/article-like-feedback.test.tsx`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Keep per-ID in-flight guards using a ref plus render state, rollback only the mutation owned by that request, and expose a polite retry message. Disable only the pending article action; do not alter existing server PATCH authentication/counting semantics.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/article-like-feedback.test.tsx`; expected PASS. Test network denial and retry by keyboard. Confirm accessible names include the article context and do not announce false success during optimistic pending state.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: add recoverable optimistic like feedback"` on the current branch. Do not push/deploy as part of this task.

### Task 3: Canonical applied filter URLs

**Files:**
- Create: `lib/feed-filters.ts`
- Modify: `components/HomeFeed.tsx`
- Modify: `components/BlogHero.tsx`
- Modify: `components/BlogHeader.tsx`
- Modify: `app/page.tsx`
- Modify: `app/category/[slug]/page.tsx`
- Modify: `cloudflare-pages/src/server/loaders/public.ts`
- Create: `lib/__tests__/feed-filters.test.ts`
- Create: `test/e2e/feed-filters.spec.ts`

**Interfaces:** Produces `FeedFilters {category:string; search:string; format:string}`, `parseFeedFilters(pathname:string, query:URLSearchParams):FeedFilters`, `buildFeedUrl(filters:FeedFilters):string`. Defaults category/format All and search empty; unknown format=>All, unknown category route remains 404 by existing routing.

- [ ] **Step 1: Write failing regression `applied_filters_round_trip_and_navigation_restores_them`.** Assert buildFeedUrl({category:"All",search:"a+b & β",format:"All"}) uses URLSearchParams encoding and parse restores it. Assert default keys omitted, unsupported format resets All, and category path preserved. Browser submit search/format, copy/reload URL, back/forward and clear; assert identical results/controls and no per-keystroke history entries.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(parseFeedFilters("/", new URLSearchParams("search=a%2Bb+%26+%CE%B2"))).toEqual({ category: "All", search: "a+b & β", format: "All" });
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/feed-filters.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Initialize both runtimes from one parser. Keep draft input separate; submit search on Enter/button and commit category/format immediately with canonical URLs. Use router navigation instead of history patches; update Pages route adapters/compat only where they supply props. Keep search focus/cursor stable and route validation authoritative.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/feed-filters.test.ts`; expected PASS. Run `npm run test:pages -- test/e2e/feed-filters.spec.ts`; extend Next/Pages parity to encoded filters. Existing legacy category redirects remain, retired routes do not reappear.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "feat: make applied discovery filters shareable"` on the current branch. Do not push/deploy as part of this task.

## Completion gate

- [ ] Run `npm run lint`, `npm run typecheck`, and `npm test`; record real results and blockers.
- [ ] Verify the task-specific browser cases with `npm run test:pages` when the existing browser/runtime is available. Read its config: it builds locally with blank public Supabase settings. Do not substitute production or authorized staging without approval.
- [ ] Keep unchanged UI screenshot comparisons strict; require owner review for deliberate visual changes.
- [ ] Report exactly which spec IDs were delivered, tests run, tests blocked, residual risks, and commit IDs. No blanket WCAG or runtime-parity pass from unit results.

## Self-review

Checked requirement coverage, file responsibilities, interface names, five review-focus conditions, and red/green commands. Every focus condition has an owning test below; global cross-system evidence is owned by the governance plan. Requirements outside this plan are mapped in the programme index, not implicitly dropped. Execution must stop on incompatible product/schema decisions rather than improvising them.
