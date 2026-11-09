# EvidenceCard — component contract (πeme v3.1 §27.2)

Status: **beta** (first reference component, stage 3 entry). Implementation: `components/scholarly/EvidenceCard.tsx`; presentation logic: `lib/scholarly/evidence-card.ts`; schemas: `lib/schemas/scholarly.ts`.

- **Purpose:** one piece of evidence with exact source location, source, extractor/AI label, and trust state — traceable in one interaction.
- **Anatomy:** notice (retraction/embargo first) → type/status line → statement → locator → assessment summary → limitation → AI disclosure → actions → details.
- **Variants:** default · compact · comparison · read-only · archived. **Density:** compact / comfortable / spacious (spacing only).
- **States:** loading (aria-labelled Skeleton) · ready · unresolved · restricted · embargoed · corrected · retracted · error (role="alert"). Precedence implemented in `resolveEvidenceState`: retracted > corrected > embargoed > restricted > unresolved > ready.
- **Props/events:** `EvidenceCardProps` per §27.2 — evidence, source, sourceVersion, variant, density, permissions, selected, onInspect/onAddSupport/onAddContradiction/onRequestReview/onCopyWithCitation.
- **Keyboard:** native buttons only; card itself not focusable. **Focus:** visible 2px focus token ring on actions.
- **Screen reader:** `<article aria-label>` derived from evidence + source (never status alone); alerts announce via role; restricted/embargoed bodies are hidden, not just styled.
- **Responsive:** full-width on mobile; actions wrap. **Localization:** all copy via plain strings today; i18n slots land with the Bangla/RTL stage.
- **Permissions:** classification + server-issued `PermissionDecision[]`; read denial hides the body.
- **Token mapping:** `component.evidenceCard.*` aliases (generated) + semantic tokens; no primitive literals.
- **Tests:** `lib/__tests__/evidence-card.test.ts` (state precedence, calibrated copy, rendering incl. retraction notice ordering, AI disclosure).
- **Migration:** CMS discussion/claim cards adopt this in stage 3; legacy `StatusBadge` maps to TrustAssessmentSummary later.
