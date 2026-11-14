# Navigation and Reader Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix skip navigation, compact controls, print attribution, citation recovery, and the reusable modal contract.

**Architecture:** Use real main landmarks, keep mobile navigation a disclosure, and move the generic modal to existing Radix. Constrain overlays by viewport/safe area; keep scientific context visible in print and clipboard recovery.

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

- Client navigation must leave exactly one usable main target (Task 1).
- Short landscape and 200% text must not strand menu/dock actions (Task 2).
- Print must retain editorial headers while suppressing site chrome (Task 3).
- Clipboard denied or absent must offer selectable text and no false success (Task 4).
- No-action modal content and a removed trigger must not leak focus or throw (Task 5).

---

## File and execution map

Files are listed per task below; `Create` means proposed, not already present. Tests and implementation stay in the repository's established folders. No global file reorganization. Commit steps are future implementation checkpoints, not commands executed during planning. Provision existing dependencies with authorized `npm ci` before red/green cycles; missing executables are BLOCKED, not a red regression test. Use the current branch for every commit.

### Task 1: One focusable main target and named account navigation

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/HomeFeed.tsx`
- Modify: `components/BlogHeader.tsx`
- Modify: `app/dashboard/layout.tsx`
- Create: `test/e2e/navigation-accessibility.spec.ts`

**Interfaces:** Produces document contract: one `<main id="main-content" tabIndex={-1}>`; site skip link targets it; sign-in link name always includes Sign in. Apply to every shell discovered in route inventory, including Pages HTML wrapper.

- [ ] **Step 1: Write failing regression `skip_link_bypasses_chrome_and_sign_in_is_named`.** Browser at 320/768/1024/1440: `expect(await page.locator("#main-content").count()).toBe(1)`; Tab to skip link, activate and assert main focused; at 768/1024 assert `getByRole("link", {name: "Sign in", exact: true})` is named/visible in its applicable navigation. Repeat after client navigation.

Assertion excerpt (inside the named test, using its fixtures):
```ts
await expect(page.locator("#main-content")).toHaveCount(1);
await expect(page.locator("main#main-content")).toBeFocused(); // after skip activation
```

- [ ] **Step 2: Verify red.** Run `npm run test:pages -- test/e2e/navigation-accessibility.spec.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Remove duplicate outer target, add target/focusability to the actual main in public/tool/studio shells. Keep one main per rendered composition, not nested mains. Name sign-in independently of responsive visual spans. Add exact affected shell paths to the task commit after inventory, not a broad repository rewrite.
- [ ] **Step 4: Verify green.** Run `npm run test:pages -- test/e2e/navigation-accessibility.spec.ts`; expected PASS. Check public, tool, directory, reader, error and locally testable studio shells; no auth bypass in production. Run existing content-page-layout tests.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: make skip navigation and sign in consistently accessible"` on the current branch. Do not push/deploy as part of this task.

### Task 2: Viewport-safe mobile menu and reading dock

**Files:**
- Modify: `components/BlogHeader.tsx`
- Modify: `components/reader/ReadingProgressDock.tsx`
- Modify: `app/post/[slug]/page.tsx`
- Modify: `cloudflare-pages/src/routes/post.tsx`
- Modify: `app/globals.css`
- Create: `test/e2e/compact-controls.spec.ts`

**Interfaces:** Consumes main contract. Produces bounded mobile disclosure and dock CSS variable `--reader-dock-clearance` scoped to the reader shell; measured dock height includes safe-area clearance. No modal semantics for the nav disclosure.

- [ ] **Step 1: Write failing regression `compact_controls_remain_reachable_without_obscuring_content`.** At 320x568 and 844x390 open menu; focus final link and assert its bounding box is within viewport and menu scrolls. Assert Escape returns focus to toggle and route navigation closes it. On reader assert dock bounds x>=0/right<=viewport and final content/focused action can scroll clear of dock; coarse-pointer action boxes >=44x44.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(dockBounds.x).toBeGreaterThanOrEqual(0);
expect(dockBounds.x + dockBounds.width).toBeLessThanOrEqual(viewportWidth);
```

- [ ] **Step 2: Verify red.** Run `npm run test:pages -- test/e2e/compact-controls.spec.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Bound menu by `100dvh` minus actual header/safe-area with internal overflow. Bound dock by viewport gutters; keep primary actions and use a labeled More disclosure for secondary ones. Use ResizeObserver/cleanup to publish actual dock clearance including bottom safe area, with a non-JS fallback; consume it in both reader shells.
- [ ] **Step 4: Verify green.** Run `npm run test:pages -- test/e2e/compact-controls.spec.ts`; expected PASS. Repeat at 200% enlarged text, reduced motion, and keyboard. Inspect menu active links/close-on-navigation. No global overflow-hidden to conceal a broken layout.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: bound mobile navigation and reader controls"` on the current branch. Do not push/deploy as part of this task.

### Task 3: Print attribution and truthful local-preference copy

**Files:**
- Modify: `app/globals.css`
- Modify: `components/BlogHeader.tsx`
- Modify: `components/BlogFooter.tsx`
- Modify: `components/NewsletterSignup.tsx`
- Create: `test/e2e/print-reader.spec.ts`
- Create: `lib/__tests__/newsletter-copy.test.tsx`

**Interfaces:** Produces explicit `data-site-chrome` print hook and preserved article header. Newsletter API/storage remain unchanged and no new consumer is added.

- [ ] **Step 1: Write failing regression `print_keeps_attribution_and_local_preferences_do_not_promise_mail`.** Print-media browser asserts article h1, byline/date/source and bibliography remain visible, site chrome/dock/forms hidden. Render newsletter and assert exact text “Save digest preferences” and “No emails are sent; preferences stay on this device.”; assert no Tuesday delivery/subscribed-success promise.

Assertion excerpt (inside the named test, using its fixtures):
```ts
await page.emulateMedia({ media: "print" });
await expect(page.locator("article h1")).toBeVisible();
await expect(page.locator("[data-site-chrome]").first()).toBeHidden();
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/newsletter-copy.test.tsx`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Replace blanket header/footer print selectors with explicit chrome hooks and local interactive selectors. Preserve source links/captions and avoid URL expansion duplicating already visible DOI text. Change dormant newsletter copy only, preserving local preferences and no runtime mail calls.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/newsletter-copy.test.tsx`; expected PASS. Run `npm run test:pages -- test/e2e/print-reader.spec.ts` and inspect a PDF manually for page breaks, long URLs and captions. Document newsletter as dormant if no consumer exists.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: preserve print attribution and clarify local preferences"` on the current branch. Do not push/deploy as part of this task.

### Task 4: Recoverable citation clipboard feedback

**Files:**
- Modify: `components/reader/InlineCitationPopover.tsx`
- Modify: `lib/__tests__/reader-popovers.test.tsx`
- Modify: `test/e2e/reader-tools.spec.ts`

**Interfaces:** Preserves `InlineCitationPopoverProps`. Produces internal `idle | copying | copied | error` state per active action and selectable generated citation text on failure; citation-generation signatures unchanged.

- [ ] **Step 1: Write failing regression `clipboard_failure_preserves_citation_and_never_announces_copied`.** Mock rejected/absent clipboard; activate APA and assert announced “Could not copy. Select and copy the citation below.” plus selectable exact buildCitation output, and no Copied status. Resolve success and assert only then Copied; unmount before timer completion and ensure cleanup.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(container.querySelector('textarea[aria-label="Citation"]').value).toBe(expectedCitation);
expect(container.textContent).not.toContain("Copied"); // rejected clipboard fixture
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/reader-popovers.test.tsx`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Add polite feedback and a readonly text area labeled “Citation”/manual-copy path; reset feedback on source/action change and clean timers. Preserve Radix focus behavior, external DOI links and citation content; no deprecated silent execCommand fallback.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/reader-popovers.test.tsx`; expected PASS. Run reader-tools browser test with clipboard denied and keyboard-only selection; success is announced once and retry is possible.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: expose citation copy failure and recovery"` on the current branch. Do not push/deploy as part of this task.

### Task 5: APG-complete reusable dialog

**Files:**
- Modify: `components/ui/Dialog.tsx`
- Modify: `lib/__tests__/ui-primitives.test.ts`
- Create: `test/e2e/dialog-accessibility.spec.ts`
- Create: `test/fixtures/ui-dialog.tsx`
- Create: `test/fixtures/dialog.html`
- Create: `test/fixtures/vite.config.ts`
- Modify: `test/playwright.config.ts`

**Interfaces:** Keeps `DialogProps {open:boolean; onClose:()=>void; title:string; description?:string; children?:ReactNode}`. Uses installed @radix-ui/react-dialog; test fixture is loaded only by test tooling, never a public production route.

- [ ] **Step 1: Write failing regression `dialog_contains_focus_for_zero_actions_and_restores_safely`.** Browser cases: no child actions, hidden/disabled child, nested dialogs, disconnected trigger, long content. Assert Tab/Shift+Tab stay in topmost modal, Escape closes only it, unique label IDs, background inertness, and close button is reachable at 320px/short landscape. Update old static fixed-ID assertions to semantic label associations.

Assertion excerpt (inside the named test, using its fixtures):
```ts
await expect(page.getByRole("dialog", { name: "Delete draft" })).toBeVisible();
await expect(page.getByRole("button", { name: "Close dialog" })).toBeFocused(); // zero-child-actions fixture
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/ui-primitives.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Replace manual selectors/document listeners with controlled Radix Root/Portal/Overlay/Content/Title/Description/Close. Keep house tokens and reduced/static motion behavior; cap panel block size and allow internal scrolling. Provide visible labeled close. Serve `test/fixtures/dialog.html` mounting ui-dialog.tsx via the installed Vite. Add test/fixtures/vite.config.ts with repository-root alias `@`, React JSX support, test-only root, and 0.0.0.0:8790 binding; add its startup as a second Playwright webServer entry. The dialog spec navigates that isolated fixture server, not the production app; remove all production-route assumptions.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/ui-primitives.test.ts`; expected PASS. Run dialog-accessibility browser tests through the test fixture; fixture server/config are owned by this task and reused by later component browser cases. Do not claim focus correctness from renderToStaticMarkup.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: delegate shared dialog accessibility to radix"` on the current branch. Do not push/deploy as part of this task.

## Completion gate

- [ ] Run `npm run lint`, `npm run typecheck`, and `npm test`; record real results and blockers.
- [ ] Verify the task-specific browser cases with `npm run test:pages` when the existing browser/runtime is available. Read its config: it builds locally with blank public Supabase settings. Do not substitute production or authorized staging without approval.
- [ ] Keep unchanged UI screenshot comparisons strict; require owner review for deliberate visual changes.
- [ ] Report exactly which spec IDs were delivered, tests run, tests blocked, residual risks, and commit IDs. No blanket WCAG or runtime-parity pass from unit results.

## Self-review

Checked requirement coverage, file responsibilities, interface names, five review-focus conditions, and red/green commands. Every focus condition has an owning test below; global cross-system evidence is owned by the governance plan. Requirements outside this plan are mapped in the programme index, not implicitly dropped. Execution must stop on incompatible product/schema decisions rather than improvising them.
