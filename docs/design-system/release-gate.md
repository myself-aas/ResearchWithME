# reme v3.1 §44/§46 — Stable Release Gate Status

Machine-checkable items are enforced by `scripts/release-gate.mjs` (CI job
`release-gate`); latest machine manifest: `release-manifest.json` (same folder).
An unchecked release-blocking item prevents promotion to `stable`.

## Domain and integrity
- [x] Versioned schemas for canonical objects — `lib/schemas/scholarly.ts`, `lib/schemas/identifiers.ts` (tests: 312 passing)
- [x] Evidence resolves to source version + structured locator — `EvidenceCard`, `evidence.locator`
- [x] Trust dimensions independent and attributable — §23 `TrustAssessmentSummary` (not-assessed ≠ negative)
- [ ] Retraction/correction propagation end-to-end — `IntegrityNotice` + notice precedence done; full propagation E2E pending
- [x] AI citations resolved and checked against claims — §26 `AIValidation`/`publicationBlockers`
- [x] Human approval required for publishable AI output — `human-review-pending` blocker

## Privacy and permissions
- [x] Server authorization matches UI capability behavior — `can(permissions, capability)` gates + server-enforced routes (unchanged)
- [x] Restricted/embargoed cannot publish/export/render accidentally — `SourceCard` notice precedence + metadata hiding
- [x] Reviewer anonymity survives UI — `ReviewThread` anonymity handling
- [ ] Sensitive actions → immutable audit events — `AuditEvent` schema exists; server-side immutability E2E pending

## Design system
- [x] Anatomy/API/state/keyboard/responsive/test contracts — `docs/design-system/components/*.md` + tests
- [x] Component tokens for the stable set — `tokens/src/component.json`
- [x] No stable implementation references primitives directly — gate DS-4
- [ ] Storybook documentation complete — pending

## Accessibility and localization
- [x] axe-core WCAG A/AA passes on the component set — `lib/__tests__/a11y.test.ts` (0 violations)
- [ ] Keyboard/screen-reader critical flows — component-level pass; full-flow E2E pending
- [x] English and Bangla core flows — dictionaries + parity + provider/switcher wired; route-level `lang`/`dir`
- [x] RTL and mixed-script smoke tests — Arabic RTL verification + LTR isolation rules + tests
- [ ] Forced colors, 200% zoom, reflow, reduced motion manual pass — pending

## Resilience and motion
- [ ] Offline recovery E2E — `SyncState`/conflict model implemented; E2E pending
- [x] Conflicts preserve both versions — `resolveConflict` + `ConflictPanel`
- [x] Retries idempotent — unchanged server flows
- [x] Remotion/Hyperframes use generated tokens — gate VID-1 (0 hard-coded hex in compositions)
- [ ] Captions/transcripts/checksums retained in video outputs — pending
- [ ] Full/reduced/static video variants — pending
- [x] Security and performance budget gates — `scripts/check-budgets.mjs` in CI (§18)
