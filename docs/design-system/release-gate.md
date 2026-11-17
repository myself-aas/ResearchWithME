# reme v3.4 §44/§46 — Stable Release Gate Status

Machine-checkable items are enforced by `scripts/release-gate.mjs` (CI job
`release-gate`); latest machine manifest: `release-manifest.json` (`29/29` checks).
Full Part VII §11 / Part VIII acceptance dossier: `docs/v34-acceptance-evidence.md`.
Security threat model & retention policy: `docs/security/v34-threat-model-and-retention-policy.md`.
Migration & rollback runbook: `docs/runbooks/v34-migration-and-rollback-runbook.md`.

An unchecked release-blocking item prevents promotion to `stable`.

## Domain and integrity
- [x] Versioned schemas for canonical objects — `lib/schemas/scholarly.ts`, `lib/v34/contracts.ts`, `lib/v34/identifiers.ts` (83 Prisma models / 89 live RLS-enabled `v34_*` SQL tables)
- [x] Evidence resolves to source version + structured locator — `EvidenceCard`, `evidence.locator`, `v34_evidence`
- [x] Trust dimensions independent and attributable — §23 `TrustAssessmentSummary` (not-assessed ≠ negative)
- [x] Retraction/correction propagation end-to-end — `IntegrityNotice`, `v34_integrity_events`, `v34_integrity_impacts`, `attention` propagation, and `V34-5` / `V34-15` automated checks
- [x] AI citations resolved and checked against claims — `/api/ai/{validate-citations,check-quotation,check-entailment}` & `publicationBlockers`
- [x] Human approval required for publishable AI output — `human-review-pending` blocker + `/api/ai/{approve,reject}`

## Privacy and permissions
- [x] Server authorization matches UI capability behavior — `can(permissions, capability)`, fail-closed `401`/`403` routes, `89/89` RLS tables
- [x] Restricted/embargoed cannot publish/export/render accidentally — `PROHIBITED_EXTERNAL_PROCESSING` AI guard, classification-safe previews, `SourceCard` notice precedence
- [x] Reviewer anonymity survives UI, APIs, logs, telemetry & notifications — `lib/v34/observability.ts`, `app/reviews/page.tsx`, `scripts/verify-v34-live.mjs`
- [x] Sensitive actions → immutable audit events — `v34_audit_events` + `lib/v34/outbox.ts` + `lib/v34/job-runner.ts`

## Design system
- [x] Anatomy/API/state/keyboard/responsive/test contracts — `docs/design-system/components/*.md`, `.impeccable/surfaces/*`, `components/v34/ResponsiveDataTable.tsx`
- [x] Component tokens for the stable set — `tokens/src/component.json` (`tokens:check` passes)
- [x] No stable implementation references primitives directly — gate `DS-4` & `V34-2`
- [ ] Human design-system owner sign-off & optional Storybook catalog review — operator sign-off pending

## Accessibility and localization
- [x] axe-core WCAG A/AA passes on the component set — `lib/__tests__/a11y.test.ts` + `lib/__tests__/v34-a11y-visual.test.tsx` (0 violations)
- [x] Playwright 26-route reflow (320–1920px) & axe E2E suite wired into GitHub Actions CI — `test/e2e/v34-a11y-reflow.spec.ts` & `.github/workflows/quality.yml`
- [x] Multilingual scholarly text (Bangla `বাংলা`, Arabic RTL, mixed-script) + LTR identifier isolation (`dir="ltr"`) — `test/next/v34-wave10-completion.test.ts`
- [ ] Manual NVDA / VoiceOver / TalkBack / Forced Colors / 200% zoom human accessibility sign-off — operator sign-off pending

## Resilience, motion, and cutover
- [x] Offline draft persistence, 409 conflict preservation, idempotent retries & automatic logout local wipe — `lib/persistence/{editor-db,sync-coordinator,logout-wipe}.ts`
- [x] Remotion/Hyperframes use generated tokens + governed human-approval render pipeline — gate `VID-1` & `/api/renders/*`
- [x] Security threat model, SSRF resolver allowlist, non-suppressible integrity/security alerts & performance budget gates (`<= 200 KB` gzip) — `scripts/check-budgets.mjs`, `docs/security/v34-threat-model-and-retention-policy.md`
- [x] Scale benchmarks verified (10k citations, 5k graph nodes, 100 concurrent annotations) — `test/next/v34-scale-stress.test.ts`
- [ ] Production masked-clone backfill rehearsal, 7-day zero-mismatch dual-write / 14-day zero-fallback window, PITR restore drill & final human owner sign-off — external production operator steps pending
