# reme v3.4 §44/§46 — Stable Release Gate Status

Machine-checkable items are enforced by `scripts/release-gate.mjs` (CI job
`release-gate`); latest machine manifest: `release-manifest.json` (`32/32` checks: `DS-1`–`PERF-1`, `V34-1`–`V34-20`).
Full Part VII §11 / Part VIII acceptance dossier: `docs/v34-acceptance-evidence.md`.
Schema governance ADR: `docs/adr/ADR-033-supabase-sql-over-prisma.md`.
Security threat model & retention policy: `docs/security/v34-threat-model-and-retention-policy.md`.
Migration, Cloudflare cutover & rollback runbook: `docs/runbooks/v34-migration-and-rollback-runbook.md`.

An unchecked release-blocking item prevents promotion to `stable`.

## Domain and integrity
- [x] Versioned schemas for canonical objects — `lib/schemas/scholarly.ts`, `lib/v34/contracts.ts`, `lib/v34/identifiers.ts` (83 Prisma models / 90 live RLS-enabled `v34_*` SQL tables across Migrations 1–13; ADR-033)
- [x] Evidence resolves to source version + structured locator — `EvidenceCard`, `evidence.locator`, `v34_evidence`
- [x] Trust dimensions independent and attributable — §23 `TrustAssessmentSummary` (not-assessed ≠ negative)
- [x] Retraction/correction propagation end-to-end — `IntegrityNotice`, `v34_integrity_events`, `v34_integrity_impacts`, `attention` propagation, and `V34-5` / `V34-15` automated checks
- [x] AI citations resolved and checked against claims — `/api/ai/{validate-citations,check-quotation,check-entailment}` & `publicationBlockers`
- [x] Human approval required for publishable AI output — `human-review-pending` blocker + `/api/ai/{approve,reject}`

## Privacy, persistence, and permissions
- [x] Server authorization matches UI capability behavior — centralized `authorize()` (`lib/v34/authz.ts`), fail-closed `401`/`403`/`503` strict persistence, `90/90` RLS tables, `164/164` rate-limited API routes
- [x] Restricted/embargoed cannot publish/export/render accidentally — `PROHIBITED_EXTERNAL_PROCESSING` AI guard, classification pre-filtered FTS (`v34_unified_search`), classification-safe previews, `SourceCard` notice precedence
- [x] Reviewer anonymity survives UI, APIs, logs, OTLP traces, Sentry envelopes & notifications — `lib/v34/observability.ts`, `lib/v34/telemetry-export.ts`, `app/reviews/page.tsx`, `scripts/verify-v34-live.mjs`
- [x] Sensitive actions → immutable audit events & durable outbox — `v34_audit_events`, `v34_outbox_events`, `v34_outbox_consumer_receipts`, `lib/v34/outbox-worker.ts`, `workers/outbox/*`

## Design system
- [x] Anatomy/API/state/keyboard/responsive/test contracts — `docs/design-system/components/*.md`, `.impeccable/surfaces/*`, `components/v34/ResponsiveDataTable.tsx`
- [x] Component tokens for the stable set — `tokens/src/component.json` (`tokens:check` passes; 0 unresolved refs across 584 source files)
- [x] No stable implementation references primitives directly — gate `DS-4` & `V34-2` (`npm run impeccable:source` 0 violations across 403 files)
- [ ] Human design-system owner sign-off & optional Storybook catalog review — operator sign-off pending

## Accessibility and localization
- [x] axe-core WCAG A/AA passes on the component set — `lib/__tests__/a11y.test.ts` + `lib/__tests__/v34-a11y-visual.test.tsx` (0 violations)
- [x] Playwright 26-route reflow (320–1920px) & axe E2E suite wired into GitHub Actions CI — `test/e2e/v34-a11y-reflow.spec.ts` & `.github/workflows/quality.yml`
- [x] Multilingual scholarly text (Bangla `বাংলা`, Arabic RTL, mixed-script) + LTR identifier isolation (`dir="ltr"`) — `test/next/v34-wave10-completion.test.ts`
- [ ] Manual NVDA / VoiceOver / TalkBack / Forced Colors / 200% zoom human accessibility sign-off — operator sign-off pending

## Resilience, async platform, motion, and cutover
- [x] Atomic Postgres draft autosave (`v34_autosave_draft_atomic` live-verified on `bxyjjbclaklzjxeumeat`), 409 conflict preservation, durable idempotency, SW Background Sync (`rwm-editor-autosave-sync`), & automatic logout local wipe
- [x] Durable outbox worker + DLQ + Cloudflare Queues/Cron (`workers/outbox`, `0.88 KiB` gzip), canonical cursor pagination across 11 list APIs, VAPID Web Push + Resend Digest + Supabase Realtime, R2 signed export/render storage, & OTel/Sentry export
- [x] Remotion/Hyperframes use generated tokens + governed human-approval render pipeline backed by R2 signed storage — gate `VID-1`, `/api/renders/*`
- [x] Security threat model, SSRF resolver allowlist, non-suppressible integrity/security alerts, scale benchmarks (10k citations / 5k graph nodes / 100 annotations), & performance budget gates (`<= 200 KB` gzip)
- [x] Executable Cloudflare provisioning CLI (`scripts/provision-cloudflare-v34.mjs`), live SQL integrity reconciliation (`v34_reconcile_integrity_report` = `RECONCILED`), `--v34-cutover` env audit, & cutover smoke verifier (`scripts/verify-v34-cutover.mjs`)
- [ ] External Cloudflare R2/Queues/secrets provisioning, `workers/outbox` production deploy, live authenticated production smoke check, 7-day/14-day cutover window, PITR restore drill & final human owner sign-off before merging PR #37 — external production operator steps pending
