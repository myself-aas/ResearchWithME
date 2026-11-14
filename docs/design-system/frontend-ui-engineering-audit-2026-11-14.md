# Frontend UI engineering audit

**Date:** 2026-11-14  
**Branch:** `arena/7c1641ff-researchwithme`  
**Scope:** repository-wide frontend design-system source audit; no implementation changes.

## Skill execution and supporting reference

Successfully ran exactly:

```sh
npx skills use "https://github.com/addyosmani/agent-skills" --skill "frontend-ui-engineering"
```

Exit **0**. Captured the complete output to `/tmp/rwm-frontend-ui-engineering.txt` and read it without truncation. Applied its component architecture, state ownership, semantic token, accessibility, responsive, interaction-state, and verification criteria as an audit, not as authorization to redesign.

The command output did not print a supporting-files path. Located the materialized skill at `/tmp/skills-use-eAMDPN/frontend-ui-engineering/SKILL.md`. Its `../../references/accessibility-checklist.md` resolves from that directory to `/tmp/references/accessibility-checklist.md`, which is absent. The materialized directory contains only SKILL.md. Rather than invent the checklist, located `references/accessibility-checklist.md` in the upstream repository tree using `gh api`, fetched its complete contents via the GitHub contents API, and read `/tmp/rwm-ui-accessibility-checklist.md`. The upstream repository layout places the skill under `skills/frontend-ui-engineering`, making that relative reference meaningful upstream.

No new framework, runner, checker, or dependency was installed. No live application, staging deployment, or Supabase data was accessed.

## Executive verdict

**The project has a credible scholarly visual language and substantial reusable infrastructure, but engineering conformance is not release-certified.** The priority is completing contracts and proving interactive behavior, not adopting a new visual style.

Keep the paper/ink/blue semantic identity, long-form serif reading, real citations, useful metadata, purpose-specific page families, and reduced-motion support. Fix broken component-token names, accessibility/state gaps, inconsistent author identity and media semantics, and misleading verification claims before extending the visual system.

### Scope and evidence boundaries

The cumulative review covers **187 TSX/CSS files / 22,895 lines**, including **28 App Router pages**, through inventory, scans, and representative detailed inspection across app/shared/Pages frontend. This pass additionally examined shared primitives, dialog/toast/table behavior, home-feed state, authentication patterns, release checks, accessibility tests, and responsive-test configuration. `.ts` factories under `lib/` must also be included in token-contract checks.

This is not exhaustive line-by-line review, visual certification, a legal accessibility opinion, or proof of production behavior. Earlier reports contain detailed findings that remain open:

- [System/token audit](audit-2026-11-14.md)
- [Taste/composition audit](taste-audit-2026-11-14.md)
- [General workflow review](../frontend-review-2026-11-14.md)
- [Web/mobile media audit](web-mobile-imagery-audit-2026-11-14.md)

## Reference-led design contract

No new layout or art direction is being implemented, so no external reference catalogue was required. Existing product artifacts were used as the reference evidence: `docs/design-system/page-layout-matrix.md`, `primitives.md`, the current route shells, and the earlier product/design review. Rendered reference screens were unavailable; source-based composition recommendations remain assumptions to validate visually.

| Screen family | Job and primary action | Required states | Responsive contract / reject |
|---|---|---|---|
| Discovery / category | Find and open a relevant review | Loading, authoritative empty, filtered empty, stale/offline, retry, saved/liked feedback | 1/2/3-column collections where space permits; reject gratuitous rails and concealed filter state |
| Reader / author archive | Understand authorship and inspect evidence/source | Missing media, missing author photo, restricted/unavailable evidence, copy success/failure | Readable prose with relevant rail only when it fits; reject cropped scientific evidence and duplicate chrome |
| Authentication / studio | Sign in, edit, and safely publish | Pending, field errors, permission denial, draft preservation, upload failure, conflict, success | Focused controls with reachable actions on short screens; reject silent data loss and permanent-looking blob URLs |

Do not copy generic skill examples literally: a spinner for a short button action is valid; every page does not need skeletons or a new server-state dependency. Inline styles used for dynamic state or token-backed properties are not automatically defects. A file over 200 lines is a review signal, not proof it must be split mechanically. Existing semantic native controls and tested Radix primitives are preferable to reimplementing APG behavior.

## Findings added or sharpened by this skill pass

**P1:** high-impact interaction/data correctness issue. **P2:** significant resilience, consistency, or verification gap. Exposure is stated to avoid treating dormant reference components as public-route failures.

### UIE-01 · P1 · Shared dialog semantics exceed its actual containment behavior

**Evidence:** `components/ui/Dialog.tsx` declares modal semantics and manually manages focus. Its Tab handler returns immediately when there are no focusable descendants; a panel focused with `tabIndex={-1}` then has no explicit Tab containment. The focusable selector does not filter hidden/inert elements. There is no background inertness, scroll lock, unique per-instance title/description ID, or built-in visible close control. The panel has no viewport-height cap or internal scrolling recipe.

The effect does attempt initial focus and restores focus on close, and Escape/backdrop dismissal exists; those are strengths, not proof of a complete modal pattern. The document-level Escape listener also needs nested-modal behavior testing.

**Impact:** zero-action content can allow focus escape, hidden descendants can disrupt focus movement, tall content may put controls out of reach, and simultaneous instances reuse label IDs. Actual behavior must be confirmed in a browser, particularly with animation exit timing.

**Exposure:** repository search found this shared primitive imported by tests, not a demonstrated public-route consumer. Existing Radix media dialogs are separate. Treat it as a reusable-contract blocker before adoption, not evidence that every current dialog is broken.

**Recommendation:** consolidate on the existing proven dialog dependency or implement full APG behavior, including focus containment for zero descendants, background isolation, safe dismissal, unique IDs, scroll containment, and restoration to a connected trigger.

**Acceptance:** mounted browser tests for no actions, hidden/disabled controls, Tab/Shift+Tab, Escape, nested dialogs, click-outside, removed trigger, long content, short landscape, zoom, and reduced motion.

### UIE-02 · P1 · Home-feed state does not accept a successful empty catalogue

**Evidence:** `components/HomeFeed.tsx:58–75` replaces posts only when `Array.isArray(data.articles) && data.articles.length > 0`. An HTTP-success response containing `articles: []` therefore cannot clear prior results. Non-OK responses and exceptions are silently ignored. Its comment says Next starts from bundled seed content, but `app/page.tsx` now passes server-resolved `initialPosts` too.

**Impact:** if the catalogue becomes empty after initial rendering, removed/unpublished items can remain visible in the client feed. A failed refresh is indistinguishable from a current result. This is a source-proven state transition problem, not a claim that production currently has an empty catalogue.

**Recommendation:** separate successful empty data from network failure and malformed payloads. Define an explicit freshness state (`loading`, `ready`, `stale`, `error`) and an approved fallback policy; treat `[]` as valid authoritative data. Update the stale comment and decide whether an unconditional mount refetch is necessary after SSR.

**Acceptance:** tests for successful empty response, nonempty replacement, malformed payload, server failure, unmount during request, and transition from populated to empty. Published content should not silently fall back to illustrative seed data unless the product explicitly permits and labels it.

### UIE-03 · P2 · Optimistic rollback has no user-visible failure state

**Evidence:** `HomeFeed.tsx:114–136` optimistically increments a like and sets local liked state. On request failure it correctly rolls back both, but exposes no error or retry feedback.

**Impact:** the count/heart can revert with no explanation, leaving readers unsure whether the action persisted. This is better than retaining a false success but still incomplete interaction feedback.

**Recommendation:** preserve rollback and add concise non-disruptive failure feedback with a retry option where useful. Review duplicate submissions, in-flight state, and request identity alongside the server contract; do not add React Query just to implement one action.

**Acceptance:** success, failure, retry, rapid activation, navigation/unmount, and screen-reader announcement tests. The exact-once server behavior was not audited here.

### UIE-04 · P2 · Feed filter state is only partially shareable

**Evidence:** `HomeFeed` initializes search/category from server inputs but stores subsequent search and format changes in local state. Category navigation uses routes while in-place selection uses state. No URL serialization for active format/search changes appears in this component.

**Impact:** refresh, back/forward, and copied URLs need not reproduce what the reader sees. Not every transient input belongs in the URL, but applied discovery filters generally should have an explicit shareability policy.

**Recommendation:** distinguish draft text from applied filters; define one canonical URL contract and reset behavior. Prefer the router's existing facilities, not a new global store. Keep saved/liked preferences in their existing dedicated persisted store.

**Acceptance:** share, reload, back/forward, clear filters from a category route, encoded queries, and consistent Next/Pages behavior. Preserve cursor/focus while updating the URL.

### UIE-05 · P2 · Responsive table documentation promises an unimplemented mode

**Evidence:** `components/ui/DataTable.tsx` says rows collapse into records below `sm`; its implementation renders the same table inside `overflow-x-auto` at every size, with no record-mode markup or responsive switching. Header scopes, caption, numeric alignment, and “Not reported” for nullish values are useful existing behaviors.

**Recommendation:** decide whether semantic horizontal scrolling is the approved behavior (often appropriate for comparison data) and correct the contract, or implement an accessible record mode when row-wise reading is more useful. Test keyboard reachability of overflow and sticky-header interaction with the site shell. Avoid converting every scientific table into cards merely to match the comment.

**Acceptance:** 320px, long identifiers, missing values, many columns, 200% zoom, keyboard scrolling, caption announcement, and preserved header association. Current tests inspect markup, not the responsive promise.

### UIE-06 · P2 · Verification labels can be mistaken for stronger evidence

**Evidence:**

- `lib/__tests__/ui-primitives.test.ts` renders static markup and checks dialog attributes, not mounted focus containment or Escape/Tab behavior.
- `lib/__tests__/visual-regression.test.ts` explicitly snapshots markup/classes. These are not screenshot/pixel comparisons and cannot establish layout correctness.
- `lib/__tests__/a11y.test.ts` runs axe against static rendered scholarly components in JSDOM, using WCAG 2/2.1 tags; it does not certify current full-route interaction, actual computed contrast, or all WCAG 2.2 criteria.
- `scripts/release-gate.mjs` A11Y-1 checks that the test file contains `axe.run`; it does not execute the suite. PERF-1 checks that a budget script exists. These are structural gates, not current accessibility/performance results.
- Its DS-3 evidence string says all semantic pairs are ≥4.5:1, while the actual configured gate intentionally permits 3:1 for focus rings and does not cover every component combination.

**Recommendation:** label these checks precisely: markup snapshots, suite-presence check, configured contrast pairs, and budget-script presence. Link runtime results to the tested commit, route, state, viewport, and browser. Keep structural checks, but do not promote their results into conformance claims.

### UIE-07 · P2 · Design-system accessibility/release documents conflict with current code

**Evidence:** `accessibility-baseline.md` says no axe/e2e/i18n infrastructure exists; the repo has axe component tests and Playwright configuration. `release-gate.md` checks off Bangla/RTL dictionaries and provider wiring, whereas `scripts/release-gate.mjs` explicitly documents their removal and verifies English-only markup. These documents also quote historical test counts/results without establishing a current test run.

**Recommendation:** separate historical baseline from current measured status and planned capability. Name the authoritative product locale decision, tested commit/date, and scope. Do not restore localization or claim current passes just to make an old checklist true.

### UIE-08 · P2 · Complex component files warrant responsibility-based review

**Evidence:** a TSX inventory finds **31 files over 200 lines**. Examples: MotionLab 895, PostEditor 883, write page 825, dashboard overview primitives 574, article page 465, ArticleFeed 430, Pages post route 416, BlogHeader 411.

**Recommendation:** prioritize duplicated interaction/state logic, large forms, and shared Next/Pages presentation for extraction. Keep server authorization and data retrieval outside presentation where possible. Do not split merely to satisfy a line-count threshold or introduce prop-drilling abstractions. MotionLab is a diagnostic surface and may legitimately differ from production components.

**Acceptance:** refactors preserve routes, server/client boundaries, draft state, focus restoration, permission behavior, and real tests. No architecture refactor was made during this audit.

## Existing high-priority findings remain open

These are detailed in the linked audits, not newly discovered here:

1. **15 generated component-variable mismatches**, due to a duplicated `component` prefix; fix emitted names and test `.ts` style factories as consumers.
2. Theme aliases resolving fixed light literals; domain badge contrast gaps outside the 22-pair gate.
3. Tablet sign-in accessible-name gap at `md` through below `xl`.
4. Profile photo URLs rendered as text by directory/spotlight despite an image-aware avatar component.
5. Unbacked video slots, temporary editor blob URLs after upload failure, and silent citation-copy failure.
6. Missing figure semantics/provenance, inconsistent cover crops/variants, and incomplete multi-variant upload cleanup.
7. Divergent brand/type/control recipes across documentation, browser, and generated social/email output.

Fix those contracts before changing the scholarly visual direction. No criterion in this skill requires replacing serif text, deleting scientific captions, increasing shadows, or forcing uniform cards across every task.

## Verification performed this turn

| Project command/check | Actual outcome |
|---|---|
| Requested skill command | **PASS**, exit 0; full output read |
| Upstream accessibility checklist | Retrieved and read completely after detecting missing local support file |
| `npm run tokens:check` | **PASS**, token validator plus 22 configured contrast pairs |
| `npm run lint` | **Could not start**, exit 127: `eslint: not found` |
| `npm run typecheck` | **Could not start**, exit 127: `tsc: not found` |
| `npm test` | **Could not start**, exit 127: `vitest: not found` |
| Large-component inventory | 31 TSX files >200 lines; review signal only |
| Source/test/config inspection | Completed for the scope described above |

Dependencies are absent. Following the skill, no toolchain was installed just for verification. Build and browser-dependent commands were not attempted. The release-gate script was inspected but not run: it regenerates outputs/manifest and its structural checks would not replace unavailable runtime evidence.

### Skill verification checklist disposition

- Console-clean rendering: **not verified**.
- Keyboard traversal/APG and screen-reader behavior: **source reviewed, not verified in a browser**.
- Responsive 320/768/1024/1440px: **contract reviewed, not rendered/tested**.
- Loading/empty/error/success/permission states: **source reviewed; gaps above; no blanket pass**.
- Design-system adherence: **partial, known token/theme/recipe defects**.
- Rendered final UI finish gate: **not performed; no UI built or browser running**.
- Browser axe/devtools warnings: **not checked**.

No screenshot, Lighthouse, performance, full WCAG conformance, or production readiness claim follows from this report.

## Remediation and release evidence plan

1. **Contract repairs:** component tokens/theme aliases, domain contrast, named navigation, authoritative empty catalogue, media/identity correctness.
2. **Interaction robustness:** reusable modal APG behavior, visible rollback/error feedback, shareable applied filters, accessible forms and short-viewport overlays.
3. **Documentation truth:** align responsive table promises, locale scope, baseline history, and release evidence labels with actual code and measured checks.
4. **Focused architecture:** extract complex editor/navigation/state responsibilities only where behavior tests protect them; preserve working primitives and server boundaries.
5. **Authorized runtime verification:** use existing lint/typecheck/Vitest/Playwright tooling when dependencies are provisioned. Test discovery, reader, directory, login, saved items, and studio at 320/768/1024/1440px; both themes, reduced motion, keyboard, screen reader, zoom, forced colors, and loading/error/empty/permission states.
6. **Visual sign-off:** inspect real content, longest titles, dense tables, scientific labels, unavailable images, and Next/Pages parity. Record browser, viewport, commit, and screenshots rather than treating markup snapshots as visual proof.

**Deliverable:** source audit and recommendations only. Application, package, generated token, database, environment, and deployment files were not changed.
