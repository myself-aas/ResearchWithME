# Frontend Tokens and Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair emitted tokens, live theme aliases, domain contrast, and system-mode behaviour without redesigning the product.

**Architecture:** Keep generated literals for non-browser consumers, but emit browser component aliases against live semantic CSS variables. Validate actual consumers including TypeScript style factories; centralize theme resolution shared by bootstrap and UI.

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

- Nested `.ts` style factories must not evade the CSS consumer scan (Task 1).
- Unknown component references fail generation instead of silently resolving to light literals (Task 2).
- Alpha-tinted badge surfaces must pass contrast after compositing, in both themes (Task 3).
- Blocked localStorage must not prevent a usable theme selector (Task 4).
- OS preference changes must affect system mode, never override an explicit choice (Task 4).

---

## File and execution map

Files are listed per task below; `Create` means proposed, not already present. Tests and implementation stay in the repository's established folders. No global file reorganization. Commit steps are future implementation checkpoints, not commands executed during planning. Provision existing dependencies with authorized `npm ci` before red/green cycles; missing executables are BLOCKED, not a red regression test. Use the current branch for every commit.

### Task 1: Canonical component names and consumer validation

**Files:**
- Modify: `tokens/scripts/build.mjs`
- Create: `tokens/scripts/check-consumers.mjs`
- Modify: `package.json`
- Modify: `lib/__tests__/tokens-pipeline.test.ts`
- Modify: `tokens/generated/tokens.css`

**Interfaces:** Consumes existing token tree and lib/scholarly CSS references. Produces CLI `node tokens/scripts/check-consumers.mjs` (exit 0 when all references are declared, 1 with path/name diagnostics otherwise), wired into `tokens:check`.

- [ ] **Step 1: Write failing regression `component_css_names_resolve_including_ts_factories`.** In tokens-pipeline tests assert `expect(css).toContain("--reme-component-source-card-background:")` and `expect(css).not.toContain("--reme-component-component-")`. Add temporary isolated scan fixtures with an unresolved reference in `.ts` and assert exit 1 plus file/name; declared alias fixtures exit 0. Scan app/components/lib/cloudflare-pages/src, excluding test fixtures/generated declarations as consumers.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(css).toContain("--reme-component-source-card-background:");
expect(css).not.toContain("--reme-component-component-");
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/tokens-pipeline.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Change the generator wrapper/prefix to emit one component segment. Implement consumer checking with a source-root argument usable by isolated tests; declarations include generated CSS and application CSS. Add the CLI to tokens:check. Regenerate all six existing tokens/generated outputs with `npm run tokens:build`; stage any actually changed outputs, never edit them by hand.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/tokens-pipeline.test.ts`; expected PASS. Run `npm run tokens:check` and rebuild twice; require no second-build diff. Missing variables must be zero, including the 15 previously found.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: repair component token names and validate consumers"` on the current branch. Do not push/deploy as part of this task.

### Task 2: Live semantic component aliases

**Files:**
- Modify: `tokens/scripts/build.mjs`
- Modify: `tokens/src/component.json`
- Modify: `lib/__tests__/tokens-pipeline.test.ts`
- Modify: `tokens/generated/tokens.css`

**Interfaces:** Consumes Task 1 canonical names. Produces CSS aliases such as `--reme-component-source-card-background: var(--reme-surface)` while preserving existing TypeScript/JSON exported literal shapes.

- [ ] **Step 1: Write failing regression `component_aliases_follow_semantics_not_light_literals`.** Assert `expect(css).toContain("--reme-component-source-card-background: var(--reme-surface)")`; assert generated JSON/TS component values still resolve. Add fixtures for non-color primitive radius and an unknown semantic reference: radius remains valid; unknown reference throws a named generator error.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(css).toContain("--reme-component-source-card-background: var(--reme-surface)");
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/tokens-pipeline.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Generate CSS component aliases from raw references separately from literal resolution: strip the `semantic.light` path into the semantic CSS variable name using the existing kebab mapping. Allow known primitive aliases for dimensions; fail unknown references. Do not recursively replace every literal token output with CSS var strings.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/tokens-pipeline.test.ts`; expected PASS. Rebuild and run token checks; in browser verify Source/Evidence/Claim computed background/text respond to light/dark without a reload. If these reference cards have no route, mount them in a test-only Playwright fixture, not a public demo route.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: keep component color aliases theme aware"` on the current branch. Do not push/deploy as part of this task.

### Task 3: Contrast-safe domain text recipes

**Files:**
- Modify: `tokens/src/semantic-light.json`
- Modify: `tokens/src/semantic-dark.json`
- Modify: `tokens/scripts/check-contrast.mjs`
- Modify: `lib/scholarly/trust.ts`
- Modify: `app/globals.css`
- Modify: `lib/__tests__/tokens-pipeline.test.ts`
- Modify: `DESIGN.md`

**Interfaces:** Consumes live semantic aliases. Produces `domainText.emerging` and `domainText.uncertain` semantic roles and matching `--color-domain-text-*` aliases, used for text separately from status accents.

- [ ] **Step 1: Write failing regression `domain_text_passes_on_composited_badge_backgrounds`.** For both actual light/dark tinted badge backgrounds compute contrast after alpha compositing; assert `expect(ratio).toBeGreaterThanOrEqual(4.5)`. Assert visible research labels are unchanged. Pin a previously failing light fixture so the gate cannot drop these pairs silently.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(ratio).toBeGreaterThanOrEqual(4.5); // each composed foreground/surface in both themes
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/tokens-pipeline.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Find every Emerging/Uncertain text consumer, retain labels/icons and existing tint/accent semantics, and replace only foreground roles. Use exact proposed foreground values: light Emerging #155E75, light Uncertain #92400E, dark Emerging #67E8F9, dark Uncertain #FCD34D. Record them in DESIGN.md with regenerated outputs and verify all composed ratios; if a composition fails, stop for foreground/surface review rather than weaken the threshold. Extend gate pairs to include actual compositions.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/tokens-pipeline.test.ts`; expected PASS. Run tokens:build/tokens:check and inspect both themes, focus and disabled states. Do not round a failing ratio up or apply large-text thresholds to metadata.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: add accessible domain badge foregrounds"` on the current branch. Do not push/deploy as part of this task.

### Task 4: Complete system-theme lifecycle

**Files:**
- Create: `lib/theme.ts`
- Modify: `components/ThemeToggle.tsx`
- Modify: `app/layout.tsx`
- Modify: `lib/__tests__/theme-typography.test.tsx`
- Create: `test/e2e/theme.spec.ts`

**Interfaces:** Produces `ThemePreference = "light" | "dark" | "system"`, `THEME_STORAGE_KEY = "rwm-theme"`, `resolveEffectiveTheme(pref, prefersDark): "light" | "dark"` in lib/theme.ts. Re-export existing ThemeToggle symbols for compatibility. Bootstrap and UI share the same validation/resolution rules.

- [ ] **Step 1: Write failing regression `theme_system_choice_reacts_without_overriding_explicit_choice`.** Test `expect(resolveEffectiveTheme("system", true)).toBe("dark")`; mount selector with localStorage throwing and assert it remains operable. Browser: select system, emulate dark then light and assert classes update; select dark then emulate light and assert dark remains. Reload explicit choice and assert no hydrated mismatch.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(resolveEffectiveTheme("system", true)).toBe("dark");
expect(resolveEffectiveTheme("light", true)).toBe("light");
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/theme-typography.test.tsx`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Use a labeled native select with Light/Dark/System, listener cleanup, safe storage reads/writes and media-query listener only when relevant. Update pre-paint bootstrap in layout using matching resolution, without weakening CSP. Retain effective-theme screen-reader labels and reduced-motion behavior.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/theme-typography.test.tsx`; expected PASS. Run `npm run test:pages -- test/e2e/theme.spec.ts` and check blocked-storage + system-change cases. Test Pages shell/bootstrap separately if it owns initial HTML theme classes.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: support persistent system theme selection"` on the current branch. Do not push/deploy as part of this task.

## Completion gate

- [ ] Run `npm run lint`, `npm run typecheck`, and `npm test`; record real results and blockers.
- [ ] Verify the task-specific browser cases with `npm run test:pages` when the existing browser/runtime is available. Read its config: it builds locally with blank public Supabase settings. Do not substitute production or authorized staging without approval.
- [ ] Keep unchanged UI screenshot comparisons strict; require owner review for deliberate visual changes.
- [ ] Report exactly which spec IDs were delivered, tests run, tests blocked, residual risks, and commit IDs. No blanket WCAG or runtime-parity pass from unit results.

## Self-review

Checked requirement coverage, file responsibilities, interface names, five review-focus conditions, and red/green commands. Every focus condition has an owning test below; global cross-system evidence is owned by the governance plan. Requirements outside this plan are mapped in the programme index, not implicitly dropped. Execution must stop on incompatible product/schema decisions rather than improvising them.
