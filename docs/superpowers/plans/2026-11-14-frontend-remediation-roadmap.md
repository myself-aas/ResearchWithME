# Frontend Remediation Programme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn all frontend audit findings to date into prioritized, independently testable implementation work without changing the scholarly product identity.

**Architecture:** Six subsystem plans share one proposed acceptance specification. Implement correctness/accessibility repairs before aesthetic consolidation, then collect runtime evidence in both Next and Pages. No monolithic redesign, new framework, production migration, or deployment is authorized by this document.

**Tech Stack:** Next.js 15.5.28, React 19, TypeScript, Tailwind CSS v4, Supabase CMS adapters, existing Radix/Motion/Zustand, Vitest and Playwright.

**Spec:** [Frontend remediation scope and acceptance specification](../specs/2026-11-14-frontend-remediation.md). Read alongside the [README-first repository intake](2026-11-14-frontend-repo-intake.md), which records both successful skills, supporting paths, documented commands, classifications and risks.

## Global Constraints

- Work only on `arena/7c1641ff-researchwithme`; do not create, switch, or rename branches/worktrees in this Arena session.
- Preserve Next.js 15.5.28, React 19, Tailwind CSS v4, and Node >=20.9; use `package-lock.json` and `npm ci` when execution is authorized.
- No new production dependency is required; reuse Radix, Zustand, existing motion utilities, Vitest, and Playwright.
- English only. Do not restore removed localization or retired `/papers`, `/paper/[slug]`, or `/editions` routes.
- No production requests, Supabase writes, schema application, deployment, destructive cleanup, or email delivery setup without separate authorization.
- All other exact requirements in the linked specification apply; subsystem plans copy the full global requirements for isolated execution.

## Review Focus

- Source/markup checks must not masquerade as current runtime passes: recipes/release Task 4 owns evidence classification tests.
- Changes shared by Next/Pages must not fix only one target: recipes/release Tasks 4–5 own dual-runtime matrix/import tests.
- Old CMS rows and clients must keep rendering after additive schema work: media Tasks 3–5 own compatibility/variant tests.
- Unauthorized/cross-account/editor failure paths must preserve user work and server permissions: workflow Task 1 and media Task 2 own account/recovery/publish tests.
- Short viewports, zoom, keyboard, forced colors and reduced motion must preserve reachable actions: navigation Tasks 1–5 and workflow Tasks 3–5 own interactive coverage.

---

## Plans and dependencies

| Plan | Tasks | Scope | Dependencies |
|---|---:|---|---|
| [1. Tokens and theme](2026-11-14-frontend-tokens-theme.md) | 4 | Canonical component names, live aliases, domain contrast, light/dark/system lifecycle | First foundation; no schema dependency |
| [2. Navigation and reader](2026-11-14-frontend-navigation-reader.md) | 5 | Main targets/sign-in, viewport controls, print/local-preference copy, citation recovery, Radix dialog | Can start immediately; final visual checks after tokens |
| [3. Discovery state](2026-11-14-frontend-discovery-state.md) | 3 | Empty/fresh/stale catalogue, optimistic feedback, canonical applied filter URLs | Independent correctness work; shares HomeFeed with later composition |
| [4. Media integrity](2026-11-14-frontend-media-integrity.md) | 6 | Avatars, durable insertion, additive metadata, figure/video rendering, responsive candidates, decode/upload cleanup | Metadata writer rollout requires separately authorized additive migration; tasks ordered internally |
| [5. Workflow resilience](2026-11-14-frontend-workflow-resilience.md) | 5 | Draft recovery, assistant abort/timeout, mobile forms/editor/search, workspace state/toasts, graph bounds/focus | Fixture tasks use navigation Task 5 test host; coordinate PostEditor/MarkdownEditor with media |
| [6. Recipes and release](2026-11-14-frontend-recipes-release.md) | 5 | Primitive/motion/table contracts, brand renderers, composition/docs, honest gates, shared CSS | Foundation fixes first; composition requires owner visual review; shared CSS extraction last |

**Total: 28 independently reviewable tasks.** Each task contains exact existing/proposed files, interfaces, a named regression and assertion excerpt, red/green commands, implementation decisions and a future commit checkpoint. Proposed test files do not exist yet; their assertions are contracts, not reports of passing tests. Mount hooks/components with the repository's existing React DOM/createRoot/act patterns; do not add a new testing library just to copy assertion syntax.

### Recommended execution order

- [ ] **Wave 0: Review and provision.** Approve proposed spec decisions, choose execution method, provision existing locked dependencies and browser/runtime as available. Record blocked tooling instead of disguising it as failing behavioural tests.
- [ ] **Wave 1: Immediate correctness.** Tokens Tasks 1–3; navigation Tasks 1–4; discovery Task 1; media Tasks 1–2. Add video omission from media Task 4 only together with its actual metadata/read contract, not a fabricated registry.
- [ ] **Wave 2: State and resilience.** Tokens Task 4; navigation Task 5; discovery Tasks 2–3; workflow Tasks 1–3; media Tasks 3–6. Keep changes to shared HomeFeed/PostEditor/layout files sequentially reviewed.
- [ ] **Wave 3: Reusable contracts.** Workflow Tasks 4–5 and recipes Task 1. Conditional library components need test fixtures, not unrequested public routes.
- [ ] **Wave 4: Visual integration.** Recipes Tasks 2–3; inspect actual screenshots/long content before accepting hierarchy or asset changes.
- [ ] **Wave 5: Release evidence.** Recipes Tasks 4–5, full targeted/regression matrix, then owner sign-off. Local evidence alone does not authorize deployment.

Wave order is priority guidance, not permission to cherry-pick an incomplete task. A task includes its regression and acceptance tests. Each subsystem may finish independently; do not execute later tasks that consume interfaces not yet delivered.

## Finding coverage map

Audit IDs refer to the delivered reports linked by the spec. Equivalent findings across audits are consolidated rather than counted as separate defects.

| Original finding(s) | Owning plan/task |
|---|---|
| General 1; T-01; DS navigation | Navigation 1: main/skip/name |
| General 2–3; T-10 | Navigation 2; workflow 3: dock/menu/search/studio viewport bounds |
| General 4; WM-03 editor | Media 2: durable uploads/publish guard |
| General 5 | Navigation 3: print attribution |
| General 6; T-11 newsletter | Navigation 3: truthful local-only preferences |
| Mobile input sizing/description IDs/editor label/toolbar/placeholder | Workflow 3; recipes 1: explicit controls/semantic placeholder |
| General draft recovery/writer confusion | Workflow 1: version-aware recovery/canonical working writer path |
| General assistant cancellation/catalogue duplication | Workflow 2; discovery 1 |
| General workspace collapse/state | Workflow 4 |
| General graph overflow/focus/semantics | Workflow 5 |
| General toast bounds | Workflow 4 |
| General duplicated CSS | Recipes 5 |
| DS-01; T-04 | Tokens 1: emitted names and consumer scan |
| DS-02 | Tokens 2: live aliases |
| DS-03 | Tokens 3: composed domain contrast |
| DS-04; T-11 product-copy drift | Recipes 3: one current design/product documentation contract |
| DS-05/06/07; T-07 | Recipes 1/5; workflow 3: type/control/override/placeholder/shared-CSS contracts |
| DS-08; T-09 | Recipes 1/4: generated motion adapter, suppressed-motion and benchmark evidence |
| DS-09 | Tokens 4: full theme lifecycle |
| DS-10; WM-10 | Recipes 2/4/5: cross-channel renderer tokens and dual-runtime proof |
| DS-11; T-12; UIE-06/07 | Recipes 3/4: accurate historical/current documentation and evidence classification |
| DS-12; T-05/06/08 | Recipes 3: actual research first, purposeful families, truthful covers |
| T-02; WM-03 video | Media 3/4: explicit verified video, no unconditional slot |
| T-03 | Navigation 4: citation copy recovery |
| WM-01/09 | Media 1: consistent avatars/mask/fallback |
| WM-02/05/06 | Media 3/4/5: semantic records, uncropped evidence, dimensions and actual sources |
| WM-04 | Media 5: shared candidate construction |
| WM-07/08 | Media 6: input preflight and attempted-upload cleanup |
| UIE-01 | Navigation 5: complete shared modal |
| UIE-02/03/04 | Discovery 1/2/3: authoritative empty/rollback feedback/URL filters |
| UIE-05 | Recipes 1: truthful semantic table scrolling |
| UIE-08 | Bounded extraction only in discovery/workflow/media tasks; blanket file-size refactor explicitly deferred |
| v1 skill verification / unavailable imagegen skills | No implementation requirement invented; underlying findings covered above |

## Verification and release boundaries

Expected implementation sequence per task: write regression → observe behavioural failure → implement minimally → targeted pass → inspect diff → commit on the existing branch. Do not manufacture a red result from an absent runner.

Before completion run existing lint/typecheck/Vitest, token generation/validation/consumer checks, active Next build and Pages build, then the appropriate browser projects against both runtimes. Existing `test:pages` starts Pages only; recipes Task 4 must add and name a Next browser project before claiming shared-runtime coverage. Tests use local deterministic data and mocked failures, not real user content or live uploads.

Matrix: 320/390/768/1024/1440px; short landscape; light/dark/system; full/reduced/static motion; keyboard and screen-reader critical flows; 200% zoom/forced colors; loading/empty/error/success/permission/offline; print; missing image/variant; long scientific title/DOI/table; denied clipboard/storage; failed save/upload; account switch; cancellation/timeout. Treat actual Safari focus/phone-memory/screen-reader checks as pending until performed.

Performance targets from the earlier audit are LCP <=2.5s and CLS <=0.1, with INP <=200ms where field evidence is available. Lab timings are not field INP certification. Benchmark native scrolling versus the existing Lenis reader loop before deciding whether to remove it; retain native scrolling in reduced/static modes and do not add effects to improve a synthetic score.

## Rollback and rollout

- Ordinary frontend changes revert by task commit, preserving fixes not involved in the rollback.
- Media schema is additive/nullable; deploy/apply only with separate authorization before new metadata writers. App rollback disables new writers while preserving the column and recorded metadata; no destructive down migration by default.
- Local draft recovery format is versioned; unreadable future formats do not overwrite current server/draft state.
- Failed cover uploads clean only objects created in that attempt. No audit-driven bulk object deletion.
- Keep image input restrictions until safe conversion is explicitly approved; no new image service or media provider needed.
- No email subscription system, new billing product, localization restoration, fabricated scientific assets or production deployment is included.

## Self-review result

- Coverage: every actionable finding in the five substantive audits is mapped; the repeated unavailable-skill verification adds no fictitious requirement.
- Boundaries: six plans have meaningful independently testable outcomes; shared-file and schema dependencies are explicit.
- Interfaces: preserved public APIs and new names/shapes are stated; metadata schema is shared, not independently invented by each runtime.
- Tests: all five review-focus conditions map to owning tasks; failed/skipped/unavailable checks are never called passes.
- Paths: checked existing modification targets; paths created by an earlier task are identified as such. No implementation or test suite was executed for this planning deliverable.

## Execution handoff

Please review the scope, especially proposed media metadata/limits, explicit filter submission, local draft retention, and content hierarchy. Choose **Subagent-driven** (where supported, independent implementer/reviewer per task) or **Native** (implementation in this session using executing-plans, with independent final review where available).

Recommended: **Subagent-driven where supported**, because 28 tasks span schema compatibility, two runtimes, accessibility and persistent user work. This environment's actual delegation/review capabilities must be checked before promising independent agents. Neither method is selected or started by this document.
