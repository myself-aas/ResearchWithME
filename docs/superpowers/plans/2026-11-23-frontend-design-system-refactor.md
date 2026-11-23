# Frontend Design System Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring every frontend surface of ResearchWithME onto the single reme v3.1 / editorial-refresh design-system path — tokens → primitives → composites → domain surfaces — closing the duplication, undefined-token and copy-trust gaps in one migration, and adding the ethical habit-formation patterns (real defaults, real progress, value-first) validated by the 2026-11-23 video analysis — without regressing a11y, performance or the signed-out shell.

**Architecture:** Bottom-up, gate-first migration. Fix the token pipeline and alias drift first (everything compiles against it), consolidate the component layers (primitives vs `ui/` vs product components), then migrate surfaces in traffic-ranked waves, then add the engagement layer on top of proven primitives, and close with the release gate. Each phase produces a working, token-clean build; nothing is left half-migrated across phases.

**Tech Stack:** Next.js 15.5 App Router · React 19 · TypeScript (strict) · Tailwind CSS v4 (`@theme inline` in `app/globals.css`) · reme token pipeline (`tokens/src/*.json` → `npm run tokens:build` → `tokens/generated/tokens.css` + `lib/motion/tokens.ts` for JS-side motion) · `motion` (`LazyMotion` + `m`) · lucide-react · Radix primitives · Vitest + jsdom · Impeccable detector (`npm run impeccable:source`, `impeccable:url`) · Playwright e2e (`test/playwright.*.config.ts`).

**Spec:** `DESIGN.md` (reme v3.1 summary + component contract) · `docs/reme-design-system-v3.1.md` (normative spec) · `docs/editorial-refresh-2026-11-15.md` · `docs/design-system/*` (component inventory, primitives API, audits) · per-route briefs in `.impeccable/surfaces/` — plus the two intake inputs summarized in §1 of this plan. This plan argues from those documents; where they are silent, the decision is recorded inline in the task.

## Global Constraints

- Node ≥ 20.9; `npm ci` is the install path; `package-lock.json` is the only lockfile.
- Tailwind v4 only — **no `tailwind.config.*`**; the theme lives in `app/globals.css` `@theme inline`. Never edit `tokens/generated/tokens.css` by hand; change `tokens/src/*.json` and run `npm run tokens:build`.
- Colour comes from **semantic tokens only** (`text-ink`, `bg-surface`, `border-line`, `text-brand`…). Never raw palette families (`stone-*`, `red-*`, `white`, …) and never a utility naming an undefined token.
- **Colour never carries status alone** — pair with a text label (`DESIGN.md` §Component state contract).
- WCAG 2.2 AA; **44px minimum touch targets**; focus ring 2px/2px using the focus token (`#005BBF` light, `#ADC7FF` dark); `focus-visible` on every interactive element.
- Motion budgets: reveal 200ms · verify/archive 320ms · connect 480ms · synthesize ≤ 700ms; easings `standard/enter/exit/emphasize`; `prefers-reduced-motion: reduce` collapses all animation (`components/primitives` + `lib/motion` hooks + CSS media query) — nothing loops except a real progress indicator.
- Do-not list (enforced): gradient text, decorative glass/blur, nested cards, coloured `border-l/r` > 1px, hard offset shadows, monospace as costume, unicode glyphs as icons, kicker-above-heading patterns.
- **English-only** interface strings. CC BY 4.0 attribution surface stays intact.
- Primitives are server-safe **except** `Button`, `Input`, `Select`, `Textarea` (client, with built-in label/`aria-describedby`/error wiring).
- Signed-out visitors get **no engagement chrome** (session gate via `lib/supabase/use-session.ts`; fail closed — `is_editor()` RPC failure ⇒ `isEditor: false`).
- No confirmshaming, fake scarcity, fake progress, or unit-mismatched price anchoring anywhere in copy (see §1.3).
- Write routes re-check permission server-side; the client gate is display-only.
- Frequent commits; one task = one reviewable PR-sized change; `npm run quality` stays green at every task boundary.
- Tests live in `lib/**/__tests__` or `test/next/`; jsdom via `// @vitest-environment jsdom` pragma; mock `next/navigation`, `next/link` and `@/lib/supabase/use-session` with `vi.hoisted`.

## Review Focus

Ordered by likelihood of biting a real user; each line names the input/condition and the expected behavior, with the owning task and the test that pins it.

1. **Reduced-motion reader** on `/feed` or `/library` with an active streak or goal ring → meter is static, no looping pulse or spring animation. Owner: Task 9. Test: `lib/__tests__/engagement-streak.test.tsx` — mock `matchMedia('(prefers-reduced-motion: reduce)')` → `matches: true`, assert no animated indicator and `data-reduced="true"`.
2. **Anonymous visitor (or pre-hydration paint)** on any route rendering engagement chrome → SSR and first client render emit **zero** engagement DOM; a hydration-relevant mismatch never occurs. Owner: Task 12. Test: `lib/__tests__/mobile-bottom-nav-routes.test.tsx` (extended) — signed-out and `hydrated: false` both render `null`; `test/next/engagement-chrome.test.tsx` — SSR markup contains no engagement node, and `/` serves 200 without it.
3. **Fabricated momentum** — a new or disengaged reader sees a non-zero streak / non-zero "profile strength" / pre-filled 20% without any real qualifying event → every meter renders the honest 0/empty state with one relevant action. Owner: Tasks 10–11. Tests: `engagement-streak.test.tsx` (0 events ⇒ `0` + copy), `profile-strength.test.tsx` (each signal subset ⇒ exact honest percentage, never > computed).
4. **Confirmshame / fake scarcity copy** slipping into a diff ("I'll Risk It", "only 3 seats left", "we miss you") → conversion surfaces rejected at CI. Owner: Task 13. Test: `lib/__tests__/forbidden-copy.test.ts` — scans `components/**` and `emails/**` for banned patterns; failure blocks `npm run quality`.
5. **Undefined-token utility** (`bg-card`-class names absent from `@theme inline`) compiling to *no* CSS and silently transparent elements → alias parity enforced in CI. Owner: Task 2. Test: `tokens/scripts/check-shadcn-aliases.mjs` wired into `npm run tokens:check` — every `--color-*` name referenced anywhere must resolve transitively to a `--reme-*` definition present in `tokens/generated/tokens.css`.

---

## 1. Inputs

### 1.1 Repo intake (skill: repo-intake-and-plan, 2026-11-23, `/home/user/ResearchWithME` @ `arena/8d2f962d-researchwithme`)

- **Structure:** 34 top-level files · 23 top-level dirs · 162 TS/TSX files under `components/` · **57 `app/**/page.tsx` routes** · 59 per-route Impeccable briefs (`.impeccable/surfaces/`).
- **Detected packaging files:** `README.md` only (no `requirements.txt`/`pyproject.toml`/`Dockerfile` — this is a Node app; CI installs with `npm ci`).
- **Signal dirs:** `scripts/`, `tools/`. High-value frontends docs: `DESIGN.md`, `docs/reme-design-system-v3.1.md`, `docs/design-system/` (token/component inventories, current-state and duplication audits, release gate), `docs/frontend-refactoring-plan-2026-11-15.md`, `docs/design/refactor-execution-plan.md`.
- **Documented commands (README §Run / §Quality checks):** `npm ci` · `npm run dev` · `npm run build && npm start` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run impeccable:source` · `npm run impeccable:url` · `npm run quality` · `npm run tokens:build` · `npm run tokens:check`.
- **Skill-extracted commands from README:** 4 shell-like blocks — `curl -i https://researchwith.me/.well-known/api-catalog`, `curl …isitagentready.com/api/scan`, `npm run typecheck`, `npx impeccable detect --viewport 390x844 http://localhost:3000` — all classified `other` (none are build/test/train entrypoints); categories `inference/evaluation/training` are **empty** (not a training repo). Per the skill's conservative rules, the "smallest trustworthy reproduction" here = the build/test/gate loop, not a paper reproduction.
- **Minimum trustworthy validation loop (adopted as Phase-0 gate and final gate):**
  `npm ci` → `npm run tokens:build && npm run tokens:check` → `npm run lint` → `npm run typecheck` → targeted `vitest` → `npm run build` → `npm run impeccable:source` (+ `impeccable:url` on a running server).
- **Known fast-fails (record, don't fix blindly):** `impeccable:source` and `tokens:check` are part of `npm run quality` and must pass before every merge; the Windows/OpenNext constraint for release builds stays out of scope (use CI/WSL).
- **Ambiguity / risk list:** (a) `tokens/generated/tokens.css` is hand-adjacent — edits belong in `tokens/src/*.json`; (b) `components/ui/` mixes shadcn-CLI stock with project composites; (c) two `Button` implementations coexist; (d) anonymous vs signed-in chrome now differs after this branch's `MobileBottomNav` gate; (e) raw `stone-*` usage (`--color-stone-*` are aliased to reme neutrals, so they *do* switch themes, but the usage-test forbids families outright — migrate, don't argue).

### 1.2 Codebase delta already applied on this branch (context, not tasks)

- `components/ui/bottom-nav-bar.tsx` (stock shadcn-pattern showcase, Home/Portfolio/Transactions/Messages/Rewards/Profile, `framer-motion`) added; `framer-motion@^14.14.0` installed; shadcn-compatible aliases added to `app/globals.css` `@theme inline`; smoke test `test/next/bottom-nav-bar.test.tsx`.
- `components/layout/MobileBottomNav.tsx` refactored — duplicated tab markup extracted to internal `BottomNavTab`, `cn()` throughout, **session gate**: `useSession()` ⇒ `null` when signed out or pre-hydration (covers writers/editors). Existing nav tests updated + signed-out coverage added.
- Consequences for this plan: stock `bottom-nav-bar.tsx` has **no consumers** and a wrong-domain item set → consolidation task (Task 3) decides its fate explicitly; aliases are currently hand-maintained → drift risk → Task 2.

### 1.3 Video analysis → requirements (2026-11-23)

Sources: `NHIq3HnokOI` (App Breakdown, 2026-11-13, "six-step framework": itch → lazy thumb → paved path → slot machine → bottomless pit → piggy bank) · `2TlIg3VokY8` (uxpeak, 2026-07-02, six principles: smart defaults · goal gradient · value-before-signup IKEA effect · loss aversion · contrast/anchoring), fact-checked against [cvols/ux-field-guide PR #3](https://github.com/cvols/ux-field-guide/pull/3) and [Langvardt, Fordham Law Review (PDF)](https://fordhamlawreview.org/wp-content/uploads/2019/10/Langvardt_October_A_4.pdf).

Verified takeaways, mapped to requirements:

| # | Finding | Requirement |
|---|---|---|
| R1 | Internal triggers beat notifications — bind product to a *feeling* (curiosity, being ahead). | Engagement notifications speak to the feeling, never "we miss you" (Task 14). |
| R2 | Core action ≤ 1 step; control in the thumb zone. | Sign-in → apply → publish flows audited for taps; `MobileBottomNav` stays the 1-thumb daily return surface (Task 12). |
| R3 | Defaults are persuasive at 58-study meta-analytic level; never default money/consent. | ContributeWizard + settings default to the commonest safe choice; anything irreversible/costly defaults off (Task 13). |
| R4 | Goal gradient works only for **real** progress (32-experiment meta-analysis: generic progress bars don't cut drop-off); LinkedIn meter never sits at 0 because real steps exist. | Profile-strength meter computed from real signals only; never fabricated (Task 11). |
| R5 | Value before signup — forced account walls cost ~18–19% of intent (Baymard). | Public artifacts stay readable without login; signup is invited, never interposed before value (audited in Tasks 12–13). |
| R6 | IKEA effect — users overvalue what they co-build. | Writer onboarding asks for one real artifact (ORCID/GitHub identity) before any "complete setup" nudge (Task 11). |
| R7 | Loss-aversion CTAs as shipped ("I'll Risk It") are confirmshaming; framing meta-analyses show no reliable lift. | Forbidden-copy guard in CI; CTAs state plain value (Task 13). |
| R8 | Variable-reward mechanics (slot machine/piggy bank) work but are the regulated/harmful end — loot-box scrutiny. | Only honest counters/streaks ship here; no randomized reward UI, no spin/gacha patterns (Global Constraints + Review Focus #3). |

Ethics gate: the platform is citation-first (`PRODUCT.md`, CC BY 4.0). Engagement exists to route readers to evidence, not to maximize session length. Any task that trades that away is rejected at review, whatever the metric shows.

### 1.4 Component & route inventory (what must migrate)

- `components/primitives/` — 15 exports (`Box, Text, Stack, Card(+ parts), Button, Divider, Badge, Input, Select, Textarea, Link, Icon, VisuallyHidden`) + `cx.ts` + `index.ts` (import from `@/components/primitives` only).
- `components/ui/` — `Alert, DataTable, Dialog, EmptyState, RouteSkeleton, Skeleton, Toast` (project composites) + `button.tsx` (**duplicate of `primitives/Button`**, cva-style) + `header-2.tsx` + `menu-toggle-icon.tsx` + `use-scroll.ts` + (this branch) `bottom-nav-bar.tsx`.
- `components/` — ~130 product components & directories (feed, reading, studio shell, editor, dashboard).
- `app/` — 57 routes + API handlers + metadata files; mobile chrome = `components/layout/MobileBottomNav.tsx` + `components/layout/MobileNavDrawer.tsx` (owned by `components/BlogHeader.tsx`).
- Motion: `lib/motion/tokens.ts` + `components/motion/` (`MotionScope`, `Pressable`, `LoadingState`, `MotionLab`…), canonical guide `docs/motion-system.md`.
- Design-token guard: `lib/__tests__/design-token-usage.test.ts` (raw-family ALLOW-list) — currently does **not** catch undefined-token utilities (gap; Task 2).

## 2. Non-goals

- No visual redesign of the editorial identity (palette, typography, radius/elevation) — that shipped as the 2026-11-15 refresh; this plan preserves it.
- No new dependencies beyond what ships today (`motion`, `lucide-react`, `framer-motion`, Radix, cva, recharts). Do not add `tailwind.config`, component libraries, or an icon set swap.
- No CMS/storage/auth architecture changes; no schema migrations; no `.env` value changes; no deploy mechanics (OpenNext/Wrangler untouched).
- No i18n reintroduction (English-only per README).
- No engagement mechanic that is not honest (no random rewards, no fake urgency, no guilt copy) — see Review Focus.
- No `components/ui/` purge beyond the explicit decisions in Tasks 2–4; no renames of `primitives/` exports.

## 3. File structure (created / modified, by task)

```
tokens/scripts/check-shadcn-aliases.mjs      [NEW] Task 2 — @theme alias↔reme parity check
tokens/scripts/build.mjs                     [MOD] Task 1 — emit shadcn aliases from source JSON, not hand-edited CSS
tokens/src/component.json                    [MOD] Task 1 — shadcn compatibility alias block (single source)
app/globals.css                              [MOD] Task 1 — aliases removed (now generated); [MOD] Task 17 docs
lib/__tests__/design-token-usage.test.ts     [MOD] Task 2 — forbid undefined-token utilities + alias parity
components/ui/bottom-nav-bar.tsx             [DEL] Task 3 — stock showcase; MobileBottomNav is canonical
test/next/bottom-nav-bar.test.tsx            [DEL] Task 3
components/ui/button.tsx                     [DEL] Task 4 — primitives/Button wins
components/primitives/Button.tsx             [MOD] Task 4 — add `loading` prop + `aria-busy` + spinner slot
components/primitives/Field.tsx              [NEW] Task 5 — label+control+error composite for Input/Select/Textarea
lib/__tests__/primitives-field.test.tsx      [NEW] Task 5
components/ui/{Alert,Dialog,Toast,DataTable}.tsx [MOD] Task 6 — consume primitives; drop local variant logic
components/ui/EmptyState.tsx + RouteSkeleton.tsx [MOD] Task 7 — loading/empty/error/disabled/success parity audit
lib/__tests__/ui-state-contract.test.tsx     [NEW] Task 7
components/engagement/ReadingStreak.tsx       [NEW] Task 9 — honest counter (signed-in only)
components/engagement/GoalRing.tsx            [NEW] Task 9 — reading goal, real progress only
components/engagement/ProfileStrength.tsx     [NEW] Task 10 — writer onboarding meter (real signals)
lib/engagement/signals.ts                    [NEW] Task 10 — pure signal→percentage mapping (unit-tested)
lib/engagement/copy.ts                       [NEW] Task 13 — CTA/empty-state strings (reviewed, single file)
components/v34/ContributeWizard.tsx          [MOD] Task 13 — honest defaults (visibility=draft, type=completion)
lib/__tests__/forbidden-copy.test.ts         [NEW] Task 13
lib/__tests__/profile-strength.test.ts       [NEW] Task 10/11
lib/__tests__/engagement-streak.test.tsx     [NEW] Task 9
components/layout/MobileBottomNav.tsx        [MOD] Task 12 — optional real-count badge slot (aria-label)
emails/*.tsx                              [MOD] Task 14 — feeling-speaks transactional+lifecycle copy; banned-phrase snapshot
lib/__tests__/notification-copy.test.ts    [NEW] Task 14
docs/design-system/migration-plan.md         [MOD] Task 17 — append execution waves + gates
docs/superpowers/plans/2026-11-23-frontend-design-system-refactor.md [this file]
```

## 4. Tasks

### Task 0: Baseline capture (no code)

**Files:** Create: `docs/design-system/baseline-2026-11-23/` (audit outputs, not a git-tracked fixture churn — ignore via existing docs conventions, do not commit large images).

- [ ] **Step 1: Capture machine baseline** — Run: `npm run tokens:build && npm run tokens:check && npm run lint && npm run typecheck && npm test` — Expected: all exit 0 (record exact pass/fail counts; if anything already fails on `main`, stop and record in `baseline-2026-11-23/KNOWN-RED.md` before touching code).
- [ ] **Step 2: Render baseline** — Run: `npm run build` — Expected: exit 0. Then `npm run impeccable:source` — Expected: 0 findings (or enumerate the known set).
- [ ] **Step 3: Commit the baseline note only** — `git add docs/design-system/baseline-2026-11-23 && git commit -m "docs(design-system): capture refactor baseline"`.

### Task 1: Token-pipeline shadcn aliases (single source of truth)

**Files:**
- Modify: `tokens/src/component.json` (add `shadcnAlias` object)
- Modify: `tokens/scripts/build.mjs:77-140` (emit alias block into generated CSS/TS)
- Modify: `app/globals.css` (remove the hand-added alias block added on this branch)
- Modify: `tokens/scripts/validate.mjs` (validate every alias target exists)

**Interfaces:**
- Produces: `tokens/generated/tokens.css` containing `--color-card: var(--color-surface); … --color-ring: var(--color-focus);` — exact same 15 aliases currently hand-listed in `app/globals.css`.
- Consumes: existing `resolved.component` object shape in `build.mjs`.

- [ ] **Step 1: Write the failing check** — extend `validate.mjs`: for each key in `component.shadcnAlias`, assert the target `--color-*` exists in the resolved semantic maps and in the generated CSS output; assert the alias name is not already defined in `tokens/generated/tokens.css` twice.
- [ ] **Step 2: Run to verify it fails** — Run: `npm run tokens:check` — Expected: FAIL (`shadcnAlias` missing).
- [ ] **Step 3: Move the 15 aliases verbatim** from `app/globals.css` `@theme inline` into `component.json` `shadcnAlias` (name → existing semantic alias, e.g. `"card": "surface"`, `"primary": "action-primary"`, `"muted-foreground": "text-secondary"`), extend `build.mjs` to emit them (CSS custom properties + the TS mirror), delete them from `app/globals.css`.
- [ ] **Step 4: Run full token suite** — Run: `npm run tokens:build && npm run tokens:check` — Expected: PASS, `git diff tokens/generated/tokens.css` shows byte-identical alias output to before the move.
- [ ] **Step 5: Commit** — `git add tokens app/globals.css && git commit -m "refactor(tokens): generate shadcn aliases from component tokens"`.

### Task 2: Close the undefined-token hole in CI

**Files:**
- Create: `tokens/scripts/check-shadcn-aliases.mjs`
- Modify: `package.json` (`tokens:check` := `validate && check-contrast && check-consumers && check-shadcn-aliases`)
- Modify: `lib/__tests__/design-token-usage.test.ts` (+ forbid utilities referencing undefined `--color-*`)

- [ ] **Step 1: Write the parity script test-first** — `check-shadcn-aliases.mjs` parses `app/globals.css` `@theme inline` block + `tokens/generated/tokens.css`; fails on any `var(--x)` whose `--x` is defined in neither; fails on any alias name referenced in TSX (regex over `components/**/*.{tsx,ts}` for `(bg|text|border|ring)-([a-z][a-z-]*)`) that resolves to no theme color. Exit 1 with file:line list.
- [ ] **Step 2: Run to verify it catches the regression class** — temporarily revert Task 1 (aliases only in globals.css, absent from generated output) → Run: `npm run tokens:check` — Expected: FAIL listing the alias names. Re-apply Task 1 → PASS.
- [ ] **Step 3: Extend `design-token-usage.test.ts`** — new `describe('undefined-token utilities')`: every `(bg|text|border|ring)-<name>` class in `components/` and `app/` must map to a `--color-<name>` present in the union of `@theme inline` and `tokens/generated/tokens.css`. Keep the existing RAW_FAMILY rule untouched.
- [ ] **Step 4: Run** — `npx vitest run lib/__tests__/design-token-usage.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "test(design-system): forbid undefined-token utilities; alias parity gate"`.

### Task 3: Remove the stock showcase; keep one canonical motion-pill pattern

**Files:**
- Delete: `components/ui/bottom-nav-bar.tsx`
- Delete: `test/next/bottom-nav-bar.test.tsx`
- Modify: `components/layout/MobileBottomNav.tsx` only if it references the deleted file (it must not — verify by grep)

**Rationale (spec R2, YAGNI):** the stock component duplicates the now-canonical session-gated `MobileBottomNav`, ships a wrong-domain item set, and has zero consumers. Its expandable-pill spring (MOBILE_LABEL_WIDTH) is documented in `docs/motion-system.md` already via the studio pressables; do not port it — 5 equal-grid tabs are the correct mobile ergonomics.

- [ ] **Step 1: Prove it's unused** — Run: `grep -rn "bottom-nav-bar" app components lib test --include="*.tsx" --include="*.ts"` — Expected: no matches outside the two files being deleted.
- [ ] **Step 2: Delete both files** — `git rm components/ui/bottom-nav-bar.tsx test/next/bottom-nav-bar.test.tsx`.
- [ ] **Step 3: Verify gates** — Run: `npm run typecheck && npx vitest run test/next lib/__tests__/mobile-bottom-nav-routes.test.tsx` — Expected: PASS.
- [ ] **Step 4: Commit** — `git commit -m "refactor(ui): drop unconsumed stock bottom-nav-bar showcase"`.

### Task 4: Consolidate `Button` onto `components/primitives/Button`

**Files:**
- Delete: `components/ui/button.tsx`
- Modify: `components/primitives/Button.tsx` (add `loading?: boolean`, wire `aria-busy`, `disabled` while loading, internal spinner via `Icon name="loader-2"` with `animate-spin` + `aria-hidden`)
- Modify: every importer of `@/components/ui/button` (`grep -rln "components/ui/button" app components lib`) — redirect to `@/components/primitives`
- Test: existing `lib/__tests__/**button*` suites + new loading case

**Interfaces:**
- Produces: `Button(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & { type?: 'button'|'submit'|'reset'; loading?: boolean; size?: 'sm'|'md'|'lg'|'icon'; variant?: 'primary'|'secondary'|'ghost'|'outline'|'destructive'|'link' }): JSX.Element` — exact prop names to be matched against the current primitives API before editing (`Read components/primitives/Button.tsx`); do not widen the variant set.

- [ ] **Step 1: Failing test for `loading`** — in `lib/__tests__/primitives-button.test.tsx` (create if absent): render `<Button loading>Save</Button>`; assert `aria-busy="true"`, `disabled`, spinner node present, label still announced (text not removed).
- [ ] **Step 2: Run red** — `npx vitest run lib/__tests__/primitives-button.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** `loading` in `primitives/Button.tsx` per Interfaces; rewrite importers (codemod allowed: `npx jscodeshift` not required if ≤ 30 files — prefer sed-like manual sweep per file with grep verification).
- [ ] **Step 4: Run green + suite** — `npx vitest run lib/__tests__` — Expected: PASS; `npm run lint && npm run typecheck` — PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "refactor(button): single canonical Button (primitives), add loading state"`.

### Task 5: `Field` composite — forms fail loudly and accessibly

**Files:**
- Create: `components/primitives/Field.tsx`
- Create: `lib/__tests__/primitives-field.test.tsx`
- Modify: `components/primitives/index.ts` (export `Field`)
- Modify: `components/v34/ContributeWizard.tsx`, `components/auth/LoginForm.tsx`, studio editor settings panels to consume `Field` (inventory via `grep -rl "aria-describedby" components`)

**Interfaces:**
- Produces: `Field({ id, label, error, hint, required, children, className }) => JSX.Element` — renders `<label htmlFor={id}>`, optional hint (`id={`${id}-hint`}`), error region `role="alert"` (`id={`${id}-error`}`); clones nothing — children receive wiring via explicit props from Input/Select/Textarea, which already accept `id`, `aria-invalid`, `aria-describedby`.

- [ ] **Step 1: Failing test** — render `<Field id="email" label="Email" error="Enter a valid email" required><Input id="email"/></Field>`; assert `role="alert"` present, `aria-describedby` on the control lists both hint+error ids, `required` marker is textual (not color-only).
- [ ] **Step 2: Red** — `npx vitest run lib/__tests__/primitives-field.test.tsx` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `Field` per Interfaces; wire the three consumer surfaces; delete their hand-rolled label/error blocks.
- [ ] **Step 4: Green** — `npx vitest run lib/__tests__/primitives-field.test.tsx` — Expected: PASS; then `npm run lint` — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(primitives): Field composite with described-by wiring"`.

### Task 6: `ui/` composites consume primitives — delete duplicated variant logic

**Files:** `components/ui/Alert.tsx` · `Dialog.tsx` · `Toast.tsx` · `DataTable.tsx` · `Skeleton.tsx` · `EmptyState.tsx` · `RouteSkeleton.tsx`

- [ ] **Step 1: Write `lib/__tests__/ui-primitives-ownership.test.ts`** — a source-scan test: `components/ui/*.tsx` must not contain hex literals (`#[0-9a-fA-F]{3,8}`), must not redeclare `buttonVariants`/`cva(` outside `primitives/`, and must import interactive elements from `@/components/primitives` (allowlist `ui/*` files that are interactive-only shells — `Dialog`/`Toast` portals may keep `role`/`aria` only).
- [ ] **Step 2: Red** — Expected: FAIL on at least `Toast.tsx` (hand-written icon buttons) and `DataTable.tsx` (local header styles).
- [ ] **Step 3: Refactor each file** — swap local buttons/inputs/empty states/skeletons for primitives; keep public prop APIs byte-identical (rename nothing; this is internal surgery). Add `// impeccable-disable-next-line` only with a written reason in the same line.
- [ ] **Step 4: Green** — `npx vitest run lib/__tests__/ui-primitives-ownership.test.ts lib/__tests__` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "refactor(ui): composites delegate visuals to primitives"`.

### Task 7: UI state contract audit — loading/empty/error/disabled/success parity

**Files:**
- Modify: `components/ui/EmptyState.tsx`, `RouteSkeleton.tsx`, `Skeleton.tsx`, `Toast.tsx`, `Alert.tsx`
- Modify: per-route loading states: `app/feed/loading.tsx` (if present; else create skeleton inside the page's client wrapper), `app/library/loading.tsx`, `app/author/[id]/loading.tsx`, `app/dashboard/(studio)/*/loading.tsx`
- Create: `lib/__tests__/ui-state-contract.test.tsx`

**Rules (DESIGN.md §Component state contract):** loading skeleton mirrors final layout; empty explains why + one relevant action; error names problem + recovery step; disabled explains how to enable; success is explicit. Status is never color-only.

- [ ] **Step 1: Failing parity test** — for each composite: render in each of loading/empty/error/disabled/success; assert (a) non-empty text content in every state, (b) exactly one focusable primary action where applicable, (c) role semantics: `status`/`alert` for transient feedback, `status` on skeleton root `aria-busy`.
- [ ] **Step 2: Red** — Expected: FAIL for `EmptyState` (no action slot in two variants) and `Toast` (no `role="status"` on success variant).
- [ ] **Step 3: Implement gaps**; add skeleton `aria-busy` + accessible name per surface.
- [ ] **Step 4: Green** — `npx vitest run lib/__tests__/ui-state-contract.test.tsx` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): full five-state contract on composites and route loading shells"`.

### Task 8: Engagement data honesty layer (`lib/engagement/signals.ts`)

**Files:**
- Create: `lib/engagement/signals.ts` (pure functions; no React, no I/O)
- Create: `lib/__tests__/signals.test.ts`
- Read first: `lib/supabase/use-session.ts` (identities, `providers`, `isEditor`) and `lib/dashboard/metrics.ts` (writer publishing trend) for real signal sources.

**Interfaces:**
- Produces: `type EngagementSignals = { emailVerified: boolean; identityLinked: boolean; applicationApproved: boolean; firstDraftSaved: boolean; firstSubmission: boolean; firstArticlePublished: boolean }`
- Produces: `function profileStrength(s: EngagementSignals): number` — weights `emailVerified: 15, identityLinked: 20, applicationApproved: 15, firstDraftSaved: 20, firstSubmission: 15, firstArticlePublished: 15`; returns integer; **never** adds phantom credit; `false…false` ⇒ `0`.
- Produces: `function nextStep(s: EngagementSignals): { label: string; href: string } | null` — the *single* lowest-weight incomplete step; `null` when complete.
- Produces: `function honestStreak(events: ReadonlyArray<{ day: string }>, today: string): number` — consecutive-day count ending today (UTC day); a gap breaks it to 0; future dates ignored; duplicates on one day count once.

- [ ] **Step 1: Failing tests** — table-driven: (a) all-false ⇒ 0 and `nextStep` = verify email; (b) every prefix combination ⇒ exact expected integer; (c) complete ⇒ 100 and `nextStep` null; (d) streak with 2-then-3-day events, gap day, today-missing, future-day — exact counts; (e) `honestStreak([], today)` ⇒ 0.
- [ ] **Step 2: Red** — Run: `npx vitest run lib/__tests__/signals.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the three functions exactly per Interfaces (no extra API).
- [ ] **Step 4: Green** — Run: same — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(engagement): honest signal math for streaks and onboarding strength"`.

### Task 9: `ReadingStreak` + `GoalRing` — visible momentum, zero fabrication

**Files:**
- Create: `components/engagement/ReadingStreak.tsx`, `components/engagement/GoalRing.tsx`
- Create: `lib/__tests__/engagement-streak.test.tsx`
- Modify: `app/dashboard/reading/page.tsx` (surface the streak; server component passes `events` + `today` as props), `app/feed/page.tsx` only if a first-class slot exists — **do not** invent new chrome in this task.

**Interfaces:**
- Consumes: `honestStreak(events, today)` from `@/lib/engagement/signals`.
- Produces: `ReadingStreak({ events, today, goalDays? }): JSX.Element | null` — `null` when signed out; shows `0` + one-line empty state ("Read your first review today") when no events; `role="status"`, `aria-label="Reading streak: N days"`; no animation loop; `data-reduced="true"` when `prefers-reduced-motion: reduce`.
- Produces: `GoalRing({ completed, target }): JSX.Element` — SVG arc showing `completed/target`; text anchor; hidden when `target <= 0`.

- [ ] **Step 1: Failing tests** — signed-out ⇒ renders `null`; 0 events ⇒ text contains "first"; 4-day streak ⇒ `aria-label="Reading streak: 4 days"`; reduced-motion mock ⇒ `data-reduced="true"` and no `animate-`/`motion` node with `loop`; ring 3/10 ⇒ `aria-valuenow="3"`.
- [ ] **Step 2: Red** — Run: `npx vitest run lib/__tests__/engagement-streak.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** both components (server-friendly wrappers; client only for the matchMedia hook), wire the reading dashboard section.
- [ ] **Step 4: Green** — Run: same — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(engagement): reading streak and goal ring (honest, signed-in only)"`.

### Task 10: `ProfileStrength` — writer onboarding momentum done truthfully

**Files:**
- Create: `components/engagement/ProfileStrength.tsx`
- Create: `lib/__tests__/profile-strength.test.tsx`
- Modify: `app/dashboard/access/page.tsx` (mount above the application form; signals from OAuth identities + application row), `app/dashboard/(studio)/writing/page.tsx` (mount in the empty-draft state with `nextStep` CTA)

**Interfaces:**
- Consumes: `profileStrength(s)`, `nextStep(s)` from `@/lib/engagement/signals`.
- Produces: `ProfileStrength({ signals }: { signals: EngagementSignals }): JSX.Element` — meter `0–100` (`role="meter"` or `role="progressbar"` with `aria-valuenow/min/max` and text label "Profile strength"), the single `nextStep` CTA, and a `data-complete` flag at 100 (copy switches to "You're publishable" + link to `/dashboard/(studio)/writing`).

- [ ] **Step 1: Failing test** — all-false ⇒ `0`, CTA = "Verify your email"; identityLinked only ⇒ `20`; complete set ⇒ `100`, `data-complete`, CTA absent; every intermediate prefix ⇒ exact `aria-valuenow` from the Task-8 weights; asserts **no** hardcoded `aria-valuenow` literals in source (`readFileSync` scan for `aria-valuenow={20}`-style literals outside the weights map).
- [ ] **Step 2: Red** — Run: `npx vitest run lib/__tests__/profile-strength.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** component + wire both insertion points; delete any copy implying phantom setup ("You're 20% set up!").
- [ ] **Step 4: Green** — Run: same — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(engagement): truthful profile-strength meter for writers"`.

### Task 11: Defaults & value-first audit (ContributeWizard + auth flows)

**Files:**
- Modify: `components/v34/ContributeWizard.tsx` (default `type="review"` (commonest), default `visibility="draft"`, never pre-checked publish/consent), `components/auth/LoginForm.tsx` (value-first copy above form: "Read open, citation-first reviews — sign in to request writer access or save drafts" — no interposed wall), `app/dashboard/access/page.tsx` (invite-after-value framing)
- Create: `lib/__tests__/value-first-flow.test.tsx`

**Interfaces:** none (string/default changes only; public props untouched).

- [ ] **Step 1: Failing assertions** — wizard initial state: visibility `draft`, publish checkbox `false`, no pre-checked identity consent; login page copy contains the value-first sentence and **not** the phrases "sign up to continue", "create an account to see", "required to view".
- [ ] **Step 2: Red** — Run: `npx vitest run lib/__tests__/value-first-flow.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the default + copy changes; keep every existing test contract (`v34-responsive-shell` wizard expectations updated only if they asserted old defaults — they do not).
- [ ] **Step 4: Green** — Run: same — Expected: PASS; plus `npx vitest run lib/__tests__/v34-responsive-shell.test.tsx` — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(ux): honest defaults and value-first signup framing"`.

### Task 12: `MobileBottomNav` — optional real-count badge, no fake novelty

**Files:**
- Modify: `components/layout/MobileBottomNav.tsx`
- Modify: `components/BlogHeader.tsx` (pass `newInLibrary={n | null}` from its existing server data sources; `null` hides the badge)
- Modify: `lib/__tests__/mobile-bottom-nav-routes.test.tsx` (extended), `test/next/engagement-chrome.test.tsx` (new SSR check)

**Interfaces:**
- `MobileBottomNavProps` gains **optional** `newInLibrary?: number | null` (existing props unchanged). `null`/`undefined`/`0` ⇒ no badge node at all. `n ≥ 1` ⇒ dot with `aria-label="Library: N new since your last visit"`; capped display `99+`; **no** unread-count invention — the number must come from the library's real "added since last ack" count (same source as the Library page badge, from `lib/persistence` local store when anonymous-eligible, but this component renders only for signed-in users anyway).

- [ ] **Step 1: Failing tests** — signed-in + `newInLibrary={3}` ⇒ node with `aria-label` containing "3 new"; `0`/`null`/undefined ⇒ no badge; signed-out ⇒ whole nav `null` (existing); SSR: `renderToString(<MobileBottomNav/>)` emits nothing when badge prop is absent (no hydration divergence).
- [ ] **Step 2: Red** — Run: `npx vitest run lib/__tests__/mobile-bottom-nav-routes.test.tsx` — Expected: FAIL on new cases.
- [ ] **Step 3: Implement** the optional prop + badge (reuse `bg-brand` dot idiom already used for the active indicator); wire `BlogHeader` with the real count (`null` when the data source is unavailable — never `0`-dressed-up as novelty).
- [ ] **Step 4: Green** — Run: same + `npx vitest run test/next/wave16-polish.test.ts lib/__tests__/chrome-duplication.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(nav): honest new-in-library badge on mobile nav"`.

### Task 13: Forbidden-copy guard (confirmshame, fake scarcity, unit-mismatched anchoring)

**Files:**
- Create: `lib/__tests__/forbidden-copy.test.ts`
- Create: `lib/engagement/copy.ts` (CTA/empty-state/error strings as exported constants — reviewed once here)
- Modify: consumers only where the guard fires (expected: a few marketing-adjacent strings in `components/AboutPage.tsx`, `components/ContactPage.tsx`, `emails/*`)

**The banned patterns (regex, case-insensitive):** `/\b(i'?ll risk it|risk it anyway|don't miss out|only \d+ (seats?|slots?|spots?|copies) left|selling fast|we miss you|we('ve)? missed you|last chance|never forget|before it's gone)\b/` — plus `/!{2,}/` in buttons, and "just \d+(\.\d+)?% of" percent-anchoring against a different unit (manual review checklist entry in the PR template instead — regex can't catch unit mismatch; the PR checklist does).

- [ ] **Step 1: Failing guard** — test scans `components/**/*.tsx` + `emails/**/*.tsx` + `app/**/*.tsx` for each pattern; asserts zero matches (allowlist `.test.` files and `lib/engagement/copy.ts` itself documenting the ban).
- [ ] **Step 2: Run to see what fires** — `npx vitest run lib/__tests__/forbidden-copy.test.ts` — Expected: FAIL listing every offending file:line — fix each by plain, honest copy (state the real reason or nothing).
- [ ] **Step 3: Green** — Re-run — Expected: PASS; `npm run quality` — PASS.
- [ ] **Step 4: Document the rule** — append to `DESIGN.md` §Do not: the three banned categories with one accepted example each.
- [ ] **Step 5: Commit** — `git commit -am "test(design-system): CI guard against confirmshame and fake scarcity copy"`.

### Task 14: Notification copy — speak to the feeling, never to the void (R1/R7)

**Files:**
- Modify: `emails/welcome.tsx` · `emails/verify-email.tsx` · `emails/password-reset.tsx` · `emails/security-alert.tsx` · `emails/support-reply.tsx` · `emails/_layout.tsx` (preheader slot)
- Create: `lib/__tests__/notification-copy.test.ts`
- Untouched: `lib/v34/notifications-safe.ts` (rendering-safety/dedupe layer — do not weaken its classification checks)

**Interfaces:**
- Each template renders via `@react-email/render`'s `render()` in the test. Every non-transactional template must contain ≥ 1 concrete value token (`{author}` rendered or real count text such as "new reviews") and zero Task-13 matches; transactional mail (auth, receipts, security alerts) is exempt from tone rules but still scanned for banned phrases; subject length ≤ 78 chars; preheader ≠ subject where a preheader exists.

- [ ] **Step 1: Failing snapshot/unit test** — iterate all email templates: assert (a) zero Task-13 matches, (b) at least one value token present in non-transactional templates, (c) subject length ≤ 78 chars, (d) preheader ≠ subject.
- [ ] **Step 2: Red** — Run: `npx vitest run lib/__tests__/notification-copy.test.ts` — Expected: FAIL on any re-engagement/weekly-digest wording (there is no shipped digest today; the guard prevents regressions).
- [ ] **Step 3: Rewrite offenders / add value slots** — e.g. "Your followed author published: {title}", "3 new reviews in your saved domains"; never "Come back to ResearchWithMe".
- [ ] **Step 4: Green** — Run: same — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(notifications): feeling-first, value-first copy with CI guard"`.

### Task 15: Migration waves — raw classes → semantic tokens, 162 components

**Files:** wave-by-wave sweeps over `components/` and `app/`; no new files.

**Waves (traffic order):** W1 public read (`feed`, `post`, `source`, `evidence`, `claim`, `authors`) → W2 library/search/cite → W3 assistant/tools → W4 dashboard (reading, access, account) → W5 studio (`dashboard/(studio)/*`, `/write`, `/contribute`, `components/v34/*`) → W6 marketing/docs/error surfaces.

**Per wave:**
- [ ] **Step 1: Detect** — `grep -rEn "(stone|red|orange|amber|emerald|teal|cyan|sky|blue|indigo|violet|purple|pink|rose|gray|zinc|neutral)-[0-9]" app components --include="*.tsx"` (raw families; aliases excluded) — expect hits outside ALLOW; list them.
- [ ] **Step 2: Replace mechanically** — map: palette text/bg/border → nearest semantic (`text-ink|text-ink-secondary|text-ink-muted|bg-surface|bg-surface-subtle|border-line|text-brand|text-trust-*`…). `white`/`#000` → `text-inverse`/`surface-inverse`. Verify: `npm run tokens:build` unchanged diff; `npx vitest run lib/__tests__/design-token-usage.test.ts` — PASS each wave.
- [ ] **Step 3: Visual smoke** — `npm run build` clean; `npx impeccable detect --viewport 390x844 http://localhost:3000/<route>` for each route in the wave — Expected: 0 findings; one screenshot per route stored in `docs/design-audits/2026-11-23-wave-<n>/` (ephemeral; do not commit images).
- [ ] **Step 4: Commit per wave** — `git commit -m "refactor(wave-<n>): semantic tokens on <surfaces>"`.
- [ ] **Step 5: Full gate at end of W6** — `npm run quality` — Expected: PASS.

### Task 16: `header-2.tsx` and `menu-toggle-icon.tsx` disposition

**Files:** `components/ui/header-2.tsx` · `components/ui/menu-toggle-icon.tsx` · `components/ui/use-scroll.ts` · `components/ui/index.ts` (create)

- [ ] **Step 1: Inventory usage** — `grep -rln "ui/header-2\|ui/menu-toggle-icon\|ui/use-scroll" app components` — record consumers.
- [ ] **Step 2: Decide with the data** — if any consumer exists: keep, restyle onto primitives per Task 6, add to `docs/design-system/component-inventory.md`. If none: delete all three (YAGNI; the live header is `components/BlogHeader.tsx`) — same `git rm` pattern as Task 3 with grep-proof first.
- [ ] **Step 3: `components/ui/` final shape** — Expected tree: `Alert DataTable Dialog EmptyState RouteSkeleton Skeleton Toast` + `index.ts` barrel (add one re-exporting the seven; keep names stable).
- [ ] **Step 4: Green** — `npm run lint && npm run typecheck && npx vitest run lib/__tests__` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "refactor(ui): resolve header-2; finalize ui composite set"`.

### Task 17: Docs, inventory and release gate

**Files:**
- Modify: `docs/design-system/migration-plan.md` (append "Execution 2026-11-23" with waves + gates), `docs/design-system/component-inventory.md`, `docs/design-system/primitives.md` (Field, Button.loading), `DESIGN.md` (§Do not additions), `docs/motion-system.md` (engagement components listed), `README.md` (Sign-in surfaces line: mobile nav is signed-in chrome)
- Modify: `scripts/check-budgets.mjs` only if LCP/CLS regressed in the wave (it must stay ≤ 400 ms LCP / 0 CLS locally; do not loosen budgets)

- [ ] **Step 1: Update every doc above** to match reality; delete stale "two Buttons" notes.
- [ ] **Step 2: Wire the final gate** — `npm run quality` must include `tokens:check` (now with `check-shadcn-aliases`) and both new guard tests; confirm `package.json`.
- [ ] **Step 3: Full verification** — Run: `npm run quality && npm run build` — Expected: PASS. Then `npm run preview` (or `npx next start -p 3000 -H 0.0.0.0`) and curl: `/`, `/feed`, `/library`, `/login` all 200; `curl -s / | grep -c "Mobile bottom navigation"` ⇒ `0` (signed-out shell); `npx impeccable detect --viewport 390x844 http://localhost:3000/feed` ⇒ 0 findings; `node --test test/webmcp.test.mjs test/dns-aid.test.mjs` (unaffected but confirm).
- [ ] **Step 4: CHANGELOG entry** — `CHANGELOG.md` under next version: token aliases generated, Button consolidation, Field, honest engagement layer, copy guard, waves W1–W6.
- [ ] **Step 5: Commit** — `git commit -m "docs(design-system): migration record; gate wired into quality"`.
- [ ] **Step 6: Tag the phase** — `git tag design-system-refactor/2026-11-23` (local only; no push without reviewer).

## 5. Verification gates

| Gate | Command | Pass condition |
|---|---|---|
| G0 intake | Task 0 baseline | recorded, `main`-equivalent reds known |
| G1 tokens | `npm run tokens:build && npm run tokens:check` | PASS; generated diff = alias move only |
| G2 unit | `npx vitest run lib/__tests__` | all PASS incl. new guards (Tasks 2,5,7,8,10,13,14) |
| G3 lint/type | `npm run lint && npm run typecheck` | clean; zero `no-explicit-any` |
| G4 build | `npm run build` | exit 0; 57 routes + middleware emitted |
| G5 source detector | `npm run impeccable:source` | 0 findings |
| G6 rendered | `npm run impeccable:url` (1280×800, 390×844, 320×720) | 0 findings each; CLS 0; LCP ≤ 400 ms local |
| G7 a11y | axe WCAG 2.1/2.2 A/AA on `/feed`, `/library`, `/dashboard/reading` | 0 violations |
| G8 e2e | `npm run test:e2e:v34` | green on chromium |
| G9 anonymous chrome | curl/`grep` signed-out `/`, `/feed` | no engagement chrome; `Mobile bottom navigation` absent |
| G10 perf budgets | `npm run budgets` | within budget; report attached to PR |

A phase is done only when its gate is green and committed. G5/G6 re-run at every wave end (Task 15) and once at Task 17.

## 6. Self-review (run against the spec)

1. **Spec coverage:** R1→Task 14 · R2→Tasks 3,4,12 · R3→Tasks 11,13 · R4→Tasks 8–10 · R5→Tasks 11,12 (+ public-read audit in 15/W1) · R6→Task 10 · R7→Tasks 13–14 · R8→Global Constraints + Review Focus #3–4 · DESIGN.md state contract→Tasks 5–7 · token-only rule→Tasks 1–2,15 · motion budgets→Global Constraints (spot-checked per wave) · a11y AA/44px→Tasks 5–7 · "no tailwind.config"→Tasks 1–2 (no config added anywhere). Gap closed inline: R5 demanded proof the *public* read path stays ungated — added as Task 15 Step 3 route check and G9.
2. **Step scan:** every step names one action + a runnable check; no "TBD/handle edge cases" lines; bodies appear only for algorithms the tests don't determine (weights map, streak loop — both fixed in Task 8 Interfaces verbatim).
3. **Type consistency:** `EngagementSignals`/`profileStrength`/`honestStreak`/`nextStep` names match across Tasks 8–12; `newInLibrary` prop name consistent in Task 12 interface/steps; `Field` API matches across Task 5 steps and consumers.
4. **Review Focus:** each of the five lines names its owning task and test; no line is untested.
5. **Proportion:** this plan is long because it covers 17 tasks across a 57-route app; each task's body is decisions, not transcripts — bodies were cut to signatures + assertions; test files are named with their assertions, not pre-written bodies, except Tasks 8–10 where the spec fixed exact weights/copy.

## 7. Execution

This plan is intentionally phase-gated: G1–G2 after Task 2, G4–G6 after Task 7, G2 after Tasks 9–14, G9–G10 at Task 17. Stop at any red gate, fix in the same task, do not carry debt across gates.
