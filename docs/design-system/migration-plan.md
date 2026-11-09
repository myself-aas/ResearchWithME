# Migration Plan — πeme v3.1 (adapted from spec §43 delivery sequence)

Incremental migration only; no destructive rewrites; legacy removed only after consumers migrate and tests pass.

## Stage 0 — Audit (this stage) ✅

Six docs under `docs/design-system/` (this directory). Component classification in `component-inventory.md`.

## Stage 1 — Schemas, tokens, themes, test utilities (NEXT — safe, additive)

- `tokens/src/*.json` single source → `tokens/scripts/build.mjs` → `dist/` CSS/SCSS/TS/JSON + Remotion/Hyperframes outputs; `validate.mjs` (refs, cycles, dark completeness, primitive leakage in component tokens); `check-contrast.mjs` (WCAG AA fail). Wire into `npm run quality`.
- `globals.css` re-pointed at generated `:root`/`.dark` vars (aliases in `@theme inline` reference them).
- `lib/schemas/scholarly.ts`: runtime-validated types per spec §22 (ScholarlyObjectBase, ExternalIdentifier + normalizers, Source, SourceVersion, Evidence, Claim, KnowledgeRelationship, IntegrityEvent, AuditEvent…) with unit tests.
- `lib/tokens/contrast.ts` shared contrast util; `test/` helpers for token/axe fixtures.

## Stage 2 — Accessible primitives

Dialog, Sheet, Alert, Toast, Skeleton, EmptyState, command palette, form primitives — token-mapped, keyboard/focus contracts, tests. Wrap existing modal-less patterns; do not remove `ConfirmDelete` until replaced.

## Stage 3 — Scholarly components

`EvidenceCard` first (reference component), then `SourceCard`, `ClaimCard`, `Citation`, `TrustAssessmentSummary`, `ReviewThread`, `IntegrityNotice`, `AIProvenanceDisclosure`. Map CMS posts → Source-shaped cards incrementally.

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
