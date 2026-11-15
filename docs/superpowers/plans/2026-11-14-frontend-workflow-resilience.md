# Editor Assistant and Reference Component Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve user work, cancel stale assistant requests, and finish mobile/reference-component accessibility before broader adoption.

**Architecture:** Extract account-scoped draft persistence and abortable assistant request logic without replacing existing stores or server permissions. Reuse shared primitives and test-only fixtures for currently unintegrated workspace/graph components.

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

- Storage quota/denial and account changes must not leak or silently discard a draft (Task 1).
- Cancelled/timed-out older assistant work must not overwrite a newer question (Task 2).
- On-screen keyboard and validation errors must not hide the editor/search task or leave broken description IDs (Task 3).
- Collapsing a workspace region must preserve unsaved child state and relocate focus safely (Task 4).
- Zero/removed/9+ graph nodes must not throw, steal focus during render or overflow inaccessible bounds (Task 5).

---

## File and execution map

Files are listed per task below; `Create` means proposed, not already present. Tests and implementation stay in the repository's established folders. No global file reorganization. Commit steps are future implementation checkpoints, not commands executed during planning. Provision existing dependencies with authorized `npm ci` before red/green cycles; missing executables are BLOCKED, not a red regression test. Use the current branch for every commit.

### Task 1: Recoverable account-scoped drafts and canonical writer entry

**Files:**
- Create: `lib/cms/draft-recovery.ts`
- Modify: `components/cms/PostEditor.tsx`
- Modify: `components/cms/DashboardShell.tsx`
- Modify: `components/BlogHeader.tsx`
- Modify: `app/write/page.tsx`
- Create: `lib/__tests__/draft-recovery.test.ts`
- Create: `test/e2e/editor-recovery.spec.ts`

**Interfaces:** Produces `DraftSnapshot {version:1;accountId:string;postId:string;baseUpdatedAt:string|null;savedAt:string;fields:Record<string,unknown>}`, `draftRecoveryKey(accountId:string,postId:string):string`, `readDraft(storage:Storage,key:string):DraftSnapshot|null`, `writeDraft(storage:Storage,key:string,draft:DraftSnapshot):{ok:true}|{ok:false;reason:"quota"|"unavailable"}`. Use existing authenticated DashboardUser.id; do not key by public author slug.

- [ ] **Step 1: Write failing regression `draft_recovery_is_account_scoped_version_aware_and_quota_visible`.** Account A/post1 draft cannot restore into B or post2. Corrupt/version>1 payload ignored with nonfatal recovery notice; quota write returns failure and visible “Local draft could not be saved.” Newer server updatedAt conflicts offer restore-as-local-copy or discard, never overwrite server automatically. Browser edit/navigate/reload restores only after confirmation; logout clears in-memory recovery data and prevents pending debounce writing to another account.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(draftRecoveryKey("A", "post1")).not.toBe(draftRecoveryKey("B", "post1"));
expect(writeDraft(quotaDeniedStorage, key, snapshot)).toEqual({ ok: false, reason: "quota" });
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/draft-recovery.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Persist only known PostFormState fields after 750ms debounce; show saved-at/local-not-server status and storage warning. Keep server conflict detection and draft/publish permissions. Make approved writer links point to /dashboard/manage with explicit New article action; keep /write as a labeled local prototype with export/import confirmation, never automatic cross-account migration. Preserve unsaved draft through internal navigation by saving synchronously before route change, and offer explicit discard; do not rely on beforeunload. No sensitive draft analytics or unconditional cross-account scans.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/draft-recovery.test.ts`; expected PASS. Run editor-recovery browser cases for new/existing post, dirty internal link, beforeunload, server conflict, storage denial, logout/login and prototype migration. Long/oversized drafts must fail visibly without truncation. Inform users that local drafts remain on this device; provide per-current-account clear control.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "feat: recover account scoped editorial drafts"` on the current branch. Do not push/deploy as part of this task.

### Task 2: Abortable assistant with explicit freshness

**Files:**
- Create: `lib/use-assistant-request.ts`
- Modify: `components/AssistantPanel.tsx`
- Create: `lib/__tests__/assistant-request.test.tsx`
- Create: `test/e2e/assistant-resilience.spec.ts`

**Interfaces:** Produces `useAssistantRequest({timeoutMs?:number}): {status:"idle"|"loading"|"success"|"cancelled"|"error";answer:string|null;citations:AssistantCitation[];error:string|null;run:(query:string)=>Promise<void>;cancel:()=>void}`; export AssistantCitation matching existing id/title/author/category. Default timeoutMs=60000. Existing /api/research-assistant JSON contract unchanged.

- [ ] **Step 1: Write failing regression `assistant_cancel_timeout_and_supersession_preserve_question`.** Fake timers: timeout at 60000ms aborts signal, status error and retry shown; cancel=>cancelled without generic error. Start A/cancel/start B, resolve A late and assert only B renders. Unmount aborts. Keep typed question/scope and retry payload. SSR initialArticles including [] must not be replaced by seed; when absent, cancelable catalogue fetch accepts successful [].

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(firstSignal.aborted).toBe(true);
expect(result.current.answer).toBe("answer B"); // late answer A ignored
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/assistant-request.test.tsx`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Own AbortController/request ID/timer cleanup in hook. Add labeled Cancel while loading and explicit timeout/cancel feedback, preserve query and citation validation. Skip duplicate catalogue fetch when initialArticles was provided; missing-prop fetch uses explicit loading/stale/error policy matching discovery without importing like/filter logic. Ignore late responses; do not extend backend timeouts or change model/provider contracts.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/assistant-request.test.tsx`; expected PASS. Run browser cancel/retry/offline/timeout and query-scope cases with API interception. Server cancellation is best effort; frontend cancellation is not proof of stopped provider billing. No live model calls required.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: cancel stale assistant work and preserve retry context"` on the current branch. Do not push/deploy as part of this task.

### Task 3: Mobile entry controls editor labeling and search viewport

**Files:**
- Modify: `components/primitives/Input.tsx`
- Modify: `components/cms/styles.ts`
- Modify: `components/cms/MarkdownEditor.tsx`
- Modify: `components/search/CommandPalette.tsx`
- Modify: `components/cms/DashboardShell.tsx`
- Modify: `app/globals.css`
- Modify: `cloudflare-pages/src/globals.css`
- Create: `lib/__tests__/input-editor-labels.test.tsx`
- Create: `test/e2e/mobile-entry.spec.ts`

**Interfaces:** Preserves Input and MarkdownEditor public props. Produces actual labeled contenteditable textbox using MDXEditor supported contentEditable props/DOM binding, with stable label/hint/error IDs. Compact fields use text-base below sm and text-sm at sm+; placeholder semantic role replaces forced stone override.

- [ ] **Step 1: Write failing regression `mobile_inputs_have_valid_descriptions_and_reachable_toolbar`.** Render Input hint+error and assert every aria-describedby ID exists; suppressed hint ID omitted. Mounted editor textbox has accessible name Article body, invalid/error association and visible focus. Browser 320px/short landscape: editable text 16px, toolbar reachable via grouping/scroll, search results scroll within dvh bound, last studio navigation link reachable. Repeat with error and keyboard-height reduction.

Assertion excerpt (inside the named test, using its fixtures):
```ts
for (const id of input.getAttribute("aria-describedby").split(/\s+/)) {
  expect(document.getElementById(id)).not.toBeNull();
}
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/input-editor-labels.test.tsx`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Keep Input hint rendered or omit hintId when error hides it; retain external describedBy IDs. Bind editor label to actual editable surface, not an absent ID. Bound command palette against dynamic viewport and preserve existing Radix focus behavior; group/scroll toolbar with keyboard access. Keep studio section navigation a compact disclosure with current section and all destinations, sticky offset below actual header. Replace placeholder important override with semantic role in both runtime styles.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/input-editor-labels.test.tsx`; expected PASS. Run mobile-entry browser tests plus actual Safari/phone focus-zoom manual check; preserve browser zoom, autocomplete and full keyboard formatting. Static input class assertions alone do not prove Safari behavior.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: improve mobile editor search and form accessibility"` on the current branch. Do not push/deploy as part of this task.

### Task 4: State-preserving workspace and bounded toast

**Files:**
- Modify: `components/workspace/ResearchWorkspace.tsx`
- Modify: `components/ui/Toast.tsx`
- Modify: `lib/__tests__/workspace.test.ts`
- Modify: `lib/__tests__/ui-primitives.test.ts`
- Create: `test/e2e/workspace-state.spec.ts`
- Modify: `test/fixtures/ui-dialog.tsx`

**Interfaces:** Preserves WorkspaceRegion/ResearchWorkspaceProps and Toast APIs. Add use client boundary; collapsed region children stay mounted with hidden/inert exclusion. Reuse test-only Vite fixture host from navigation plan for interactive specimens; none become public routes.

- [ ] **Step 1: Write failing regression `workspace_collapse_preserves_unsaved_child_state_and_focus`.** Mount child input, type unsaved text, collapse/expand and assert value unchanged and child not remounted. If focus is inside collapsing region, toggle receives focus before hiding; hidden descendants absent from tab sequence. Toast long DOI/token at 320px stays inside inline safe-area gutters; essential recovery never relies on auto-dismiss toast.

Assertion excerpt (inside the named test, using its fixtures):
```ts
await expect(page.getByRole("textbox", { name: "Local note" })).toHaveValue("unsaved"); // collapse then expand
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/workspace.test.ts lib/__tests__/ui-primitives.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Keep children in DOM under controlled hidden wrapper, associate toggle via aria-controls and deterministic unique IDs, and handle focus after commit. Bound toast region with inline insets/max-width, safe-area bottom and overflow-wrap:anywhere. Preserve noncritical polite announcements/no focus theft. Update comments to match actual contracts.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/workspace.test.ts lib/__tests__/ui-primitives.test.ts`; expected PASS. Run workspace-state browser spec in fixture host at 320/1440 and zoom. Component exposure is reference-library only unless a route consumer is demonstrated; do not claim a shipped whole-site state-loss fix.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: preserve workspace state and contain notifications"` on the current branch. Do not push/deploy as part of this task.

### Task 5: Safe graph focus and adaptive bounds

**Files:**
- Modify: `components/graph/ProvenanceGraph.tsx`
- Modify: `lib/scholarly/graph.ts`
- Create: `lib/__tests__/provenance-graph.test.ts`
- Create: `test/e2e/provenance-graph.spec.ts`
- Modify: `test/fixtures/ui-dialog.tsx`

**Interfaces:** Preserves ProvenanceGraphProps/onInspect(ObjectId). Produces `graphViewBox(nodeCount:number):{x:number;y:number;width:number;height:number}` derived from existing node spacing and padding. View-mode selectors become ordinary aria-pressed buttons, not incomplete tabs.

- [ ] **Step 1: Write failing regression `graph_empty_removed_and_many_nodes_preserve_keyboard_safety`.** Test zero nodes + Enter/Space no throw; 12 nodes all positions inside graphViewBox; removing focused node clamps focus to an existing node only after commit, no render-phase focus. Arrow keys select valid indices, Enter inspects correct ID. Browser list/table keyboard-scrolls at 320px and graph switch returns focus to a labeled control/list safely; text equivalent remains available.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(() => emptyGraphList.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))).not.toThrow();
expect(bounds.width).toBeGreaterThanOrEqual(rightmostNodeX + nodeWidth);
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/provenance-graph.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Guard empty selections, move roving focus to effect, track/clamp current ID across dataset changes and compute graph bounds from existing positions. Keep labeled direct/inferred relationships and canonical text equivalent; wrap table in named keyboard-scroll region. Use pressed-state view controls instead of inventing tabs/panels. Keep graph opt-in on phones.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/provenance-graph.test.ts`; expected PASS. Run graph browser fixture with 0/1/9/12 nodes, long identifiers, dynamic deletion, reduced/static motion, zoom and screen reader manual pass. Do not remove list/table equivalent to make graph fit.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: make provenance graph bounds and keyboard focus safe"` on the current branch. Do not push/deploy as part of this task.

## Completion gate

- [ ] Run `npm run lint`, `npm run typecheck`, and `npm test`; record real results and blockers.
- [ ] Verify the task-specific browser cases with `npm run test:pages` when the existing browser/runtime is available. Read its config: it builds locally with blank public Supabase settings. Do not substitute production or authorized staging without approval.
- [ ] Keep unchanged UI screenshot comparisons strict; require owner review for deliberate visual changes.
- [ ] Report exactly which spec IDs were delivered, tests run, tests blocked, residual risks, and commit IDs. No blanket WCAG or runtime-parity pass from unit results.

## Self-review

Checked requirement coverage, file responsibilities, interface names, five review-focus conditions, and red/green commands. Every focus condition has an owning test below; global cross-system evidence is owned by the governance plan. Requirements outside this plan are mapped in the programme index, not implicitly dropped. Execution must stop on incompatible product/schema decisions rather than improvising them.
