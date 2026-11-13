# Migration Plan — reme v3.1 (adapted from spec §43 delivery sequence)

Incremental migration only; no destructive rewrites; legacy removed only after consumers migrate and tests pass.

## Stage 0 — Audit (this stage) ✅

Six docs under `docs/design-system/` (this directory). Component classification in `component-inventory.md`.

## Stage 1 — Schemas, tokens, themes, test utilities (NEXT — safe, additive)

- `tokens/src/*.json` single source → `tokens/scripts/build.mjs` → `dist/` CSS/SCSS/TS/JSON + Remotion/Hyperframes outputs; `validate.mjs` (refs, cycles, dark completeness, primitive leakage in component tokens); `check-contrast.mjs` (WCAG AA fail). Wire into `npm run quality`.
- `globals.css` re-pointed at generated `:root`/`.dark` vars (aliases in `@theme inline` reference them).
- `lib/schemas/scholarly.ts`: runtime-validated types per spec §22 (ScholarlyObjectBase, ExternalIdentifier + normalizers, Source, SourceVersion, Evidence, Claim, KnowledgeRelationship, IntegrityEvent, AuditEvent…) with unit tests.
- `lib/tokens/contrast.ts` shared contrast util; `test/` helpers for token/axe fixtures.

## Stage 2 — Accessible primitives ✅ (in progress → landed in stage-2 commit)

Landed: `components/ui/{Dialog,Alert,Toast,Skeleton,EmptyState}.tsx` — token-mapped, keyboard/focus contracts, SSR-safe, tested via `renderToStaticMarkup` (`lib/__tests__/ui-primitives.test.ts`; vitest now uses the automatic JSX runtime). Remaining in this stage: Sheet, command palette, form primitives. Do not remove `ConfirmDelete` until replaced.

## Stage 3 — Scholarly components (started)

Landed: `EvidenceCard` (reference component, `docs/design-system/components/evidence-card.md`), `SourceCard`, `ClaimCard`, `TrustAssessmentSummary` (contracts in `docs/design-system/components/source-claim-trust-cards.md`), plus the §23 trust model in `lib/schemas/scholarly.ts` + `lib/scholarly/trust.ts` (dimensions independent, not-assessed ≠ negative). Landed: `Citation`, `ReviewThread`, `IntegrityNotice`, `AIProvenanceDisclosure`, `ProvenanceGraph` (+ keyboard-accessible list alternative) — contracts in `docs/design-system/components/dialogue-integrity-graph.md`. Landed (stage 4 + infrastructure): `ResearchWorkspace` (Sources/Synthesis/Inspector, 12-col grid, collapsible without focus loss), `DataTable` (sticky header, units in headers, tabular numerals, "Not reported" never zero), `SearchResult` + `FilterPanel` with the four labeled search modes (lexical / exact-identifier / semantic / AI-expanded, AI results always marked), i18n core (`lib/i18n/`: BCP 47, en+bn dictionaries with parity, RTL-verified Arabic, pseudo-localization ≥35%, Intl formatting), axe-core suite (`lib/__tests__/a11y.test.ts`, jsdom) — 0 violations on all scholarly components, and CI `.github/workflows/quality.yml` running the token/contrast/a11y gates (closes R-02).

Landed (final plan items): route-level i18n wiring (LocaleProvider + LocaleSwitcher in BlogHeader, `reme-locale` cookie → `lib/i18n/server.ts`, `<html lang dir>`, Bangla/Arabic script font stacks in globals.css, LTR isolation for identifiers in RTL), editor annotations + conflict states (§29 `AnnotationAnchor` revalidation — broken anchors marked unresolved, never relocated; §34 `ConflictPanel` preserves both versions + mandatory rationale), Remotion/Hyperframes token consumers (`tokens.video.json`/`.css` generated, all `videos/**/*.html` tokenized — 0 hard-coded hex, gate VID-1), visual regression (11 vitest snapshots over the stable set), performance budgets (`scripts/check-budgets.mjs` measures the true shell from app-build-manifest — 199.7 KB gzip ≤ 200 KB, in CI), and the §44/§46 release gate (`scripts/release-gate.mjs` — 12/12 machine checks pass, manifest in `docs/design-system/release-manifest.json`, human sign-off checklist in `docs/design-system/release-gate.md`, CI job added).

Remaining (human/E2E, tracked in release-gate.md): retraction propagation E2E, immutable audit-event E2E, Storybook docs, full keyboard/SR flow pass, forced-colors/200%-zoom/reflow manual pass, offline E2E, video captions/transcripts/static variants.

## Stage 4 — Workspace workflows

ResearchWorkspace regions, ProvenanceGraph (+ list alternative, keyboard nav), DataTable, SearchResult/FilterPanel, editor annotations + conflict states, search modes (lexical/exact-identifier/semantic/AI-expanded).

## Stage 5 — Video renderers

Remotion + Hyperframes packages consuming generated tokens; captions/transcripts/checksums; reduced/static modes; render provenance.

## Stage 6 — Legacy migration and removal

Codemods for `stone-*` → neutral naming, deprecation warnings, remove wrapped legacy after consumers migrated.

## Stage 7 — Final audits and release evidence

axe 2.2 AA suite, visual regression, i18n (English + Bangla + RTL Arabic verification), performance budgets in CI, release gate per spec §44.

## Rollback

Each stage is additive and committed separately on the arena branch; rollback = revert the stage commit. Tokens stay backward-compatible via aliases (`brand`, `stone-*`) until stage 6.
