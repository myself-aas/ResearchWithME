# Frontend design-system audit: requested v1 skill and current-state verification

**Date:** 2026-11-14  
**Branch:** `arena/7c1641ff-researchwithme`  
**Disposition:** source audit only; unavailable skill; no application changes.

## Requested command and complete output

Executed exactly:

```sh
npx skills use "https://github.com/leonxlnx/taste-skill" --skill "design-taste-frontend-v1"
```

Redirected output to `/tmp/rwm-design-taste-v1-skill.txt` and read it completely:

```text
[SKILLS_USE_NO_MATCHING_SKILL] No matching skill found for: design-taste-frontend-v1
╰▶ fix: Available skills:
  - design-taste-frontend
```

Exit status: **1**. No instructions or supporting-files directory were returned, so no skill-relative paths could be resolved and no instructions from this named skill could be followed. The existing `design-taste-frontend` audit is a different, previously completed review, not a successful execution of this request's v1 skill.

## Audit coverage and evidence index

The current checkout has no tracked application changes since the preceding reviews. Rather than duplicate their detailed findings, this verification consolidates the repository-wide review and identifies the evidence to use:

| Layer | Detailed report |
|---|---|
| General frontend workflows, responsive layouts, navigation, recovery | [General frontend review](../frontend-review-2026-11-14.md) |
| Specifications, tokens, typography, primitives, theme, contrast, governance | [Design-system source audit](audit-2026-11-14.md) |
| Editorial identity, composition, density, copy, motion, route-family recommendations | [Completed available taste-skill audit](taste-audit-2026-11-14.md) |
| Media semantics, author identity, responsive image sources, uploads, social/icon branding | [Web/mobile imagery audit](web-mobile-imagery-audit-2026-11-14.md) |

Reconfirmed this turn: **187 TSX/CSS frontend files, 22,895 lines, 28 App Router pages**, across `app/`, `components/`, and `cloudflare-pages/src/`. Token-consumer verification additionally included `.ts` style factories in `lib/`. These inventories support repository-wide coverage, not exhaustive line-by-line inspection or rendered-state certification. Prior detailed inspections remain the basis for findings not explicitly rechecked below.

## Verdict

**Keep the scholarly editorial direction; repair system contracts before adding visual treatments.** The reading measure, citations, provenance, and semantic research states are the distinctive product features. Replacing them with a generic marketing template would not address the current failures.

### Prioritized findings

| Priority | Finding | Evidence and action |
|---|---|---|
| P1 | Component tokens do not match consumers | Reconfirmed generator double-prefixes component names. Source/Evidence/Claim style factories request 15 names absent from generated CSS. Repair the generator and add emitted-name coverage. |
| P1 | Passing base contrast checks omit failing component compositions | Prior audit calculated light Emerging/Uncertain badge text at 2.92/2.56:1. Add dedicated domain foreground/surface pairs and test them; do not interpret today's gate pass as whole-site accessibility approval. |
| P1 | Tablet sign-in loses its accessible name | Rechecked `BlogHeader.tsx`: desktop group appears at `md`, label is hidden until `xl`. Supply a stable accessible name independent of visible text. See taste report for icon evidence. |
| P1 | Uploaded author photos are inconsistently represented | Rechecked raw `{author.avatar}` in directory/spotlight; profile mapping supplies URLs. Use an image-aware identity component and an explicit URL/initials contract. |
| P1 | Media publication and recovery contracts are incomplete | Prior reviews trace unconditional unpublished video paths and failed editor uploads becoming temporary blob URLs. Gate publication on persistent media and provide visible recovery. |
| P1/P2 | Scientific image alternatives and context are under-modeled | Rechecked `MarkdownBody` uses `alt?.trim()` before a filename fallback; explicit decorative empty alt is not preserved. Add media purpose, meaningful alternatives, attribution, and uncropped evidence-figure treatment. |
| P2 | Theme aliases and brand documentation drift | Component values resolve to light literals; browser, social, email, normative spec, and token recipes need reconciliation. See system/media reports for scope. |
| P2 | Responsive, motion, and component recipes need consolidation | Reuse route-family layouts, consistent controls/type, accessible overlays, reduced-motion recipes, and source selection shared across Next/Pages. Verify visually before declaring parity. |
| P2 | Success/failure feedback needs consistency | Citation copying, media uploading, image failure, and multi-variant upload cleanup need explicit recoverable states. Retain existing working crop controls and profile rollback. |

Priorities are audit triage, not evidence that every reference component is used on a public route. Confirm exposure before assigning release blockers.

## Checks performed this turn

- **PASS:** `node tokens/scripts/validate.mjs` — token references resolve, no cycles, selected dark keys complete.
- **PASS:** `node tokens/scripts/check-contrast.mjs` — all **22 configured** light/dark pairs pass.
- **FAIL:** source-to-generated CSS token contract — **15 undefined component variables** when scanning `.ts`, `.tsx`, and `.css` in app/components/lib/Pages source against generated declarations.
- **Inventory confirmed:** 187 frontend TSX/CSS files / 22,895 lines / 28 App Router pages.
- **Application changes:** none; tracked diff empty at verification time.

A narrower scan limited to frontend `.tsx`/`.css` returned zero missing names because the faulty references live in `lib/scholarly/*.ts`. The expanded scan is the meaningful contract check. Future automation must include style factories, not only JSX and stylesheets.

Dependencies are absent (`node_modules` not installed). No build, lint, typecheck, Vitest, browser, screenshot, axe, authenticated, performance, or deployed behavior tests were run. No new skill finish gate was supplied or run. The earlier available skill's `GATE: OFF` remains historical, not a new result or a pass. No live services or database were accessed.

## Recommended implementation and sign-off order

1. Fix emitted component variables, theme-aware aliases, and domain text contrast; extend token tests beyond JSON reference resolution.
2. Repair accessible navigation names, identity rendering, missing media publication checks, and user-visible failure states.
3. Consolidate type/control/layout/media contracts across reader, directory, account, studio, and commerce route families.
4. Reconcile documentation and non-browser brand renderers with approved tokens.
5. Run build/typecheck/lint/tests, then browser checks at phone/tablet/desktop, light/dark, reduced motion, zoom, keyboard, failure/loading/empty states, and Next/Pages parity.

**Completion boundary:** independent audit verification is delivered. Applying `design-taste-frontend-v1` remains blocked because the requested skill does not exist in the command's available list. No substitute skill instructions were invented.
