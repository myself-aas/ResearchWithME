# ResearchWithME v3.4 — Part VII §11 & Part VIII Acceptance Evidence Package

- **Master Plan Authority:** `ResearchWithME-master-refactor-development-plan-v3.4.md` (Parts I–VIII)
- **Canonical Reference Schema:** `ResearchWithME-v3.4-schema.prisma` (83 models, 87 enums)
- **Schema Governance Decision:** `docs/adr/ADR-033-supabase-sql-over-prisma.md` (ordered Supabase SQL migrations + Postgres RLS + Zod runtime contracts over Prisma ORM)
- **Supabase Project Verified Live:** `bxyjjbclaklzjxeumeat` (`ap-northeast-1`, Postgres 17.11 — Migrations 1–13 applied live)
- **Decision Register:** `docs/adr/ADR-032-v34-canonical-decisions.md` (`ADR-032-01`–`ADR-032-13`) & `docs/adr/ADR-033-supabase-sql-over-prisma.md`
- **Migration & Rollback Runbook:** `docs/runbooks/v34-migration-and-rollback-runbook.md`
- **Security Threat Model & Retention Policy:** `docs/security/v34-threat-model-and-retention-policy.md`

---

## A. Schema and Migration (`Part VIII §A`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| 83 models & 87 enums, zero `ResearchNote`, generic `Follow`, or canonical `KnowledgeRelationship`; formal SQL-over-Prisma governance ADR | **PASS** | `ResearchWithME-v3.4-schema.prisma` + `docs/adr/ADR-033-supabase-sql-over-prisma.md` + `test/next/v34-wave10-completion.test.ts` |
| Intentional `onDelete` policies across all relations | **PASS** | `supabase/migrations/20261117000100`–`20261117001300` (`RESTRICT` on Evidence/Claims/SourceVersions referenced by published outputs, `CASCADE` on derived Graph/presentation links) |
| 100% SQL table & RLS coverage + operational, FTS & keyset cursor indexes | **PASS** | **90/90 `v34_*` tables** live on `bxyjjbclaklzjxeumeat` (`rowsecurity = true`), **7** Part VII §3 `CHECK` constraints (`chk_v34_*`), **13** Wave 13 operational indexes, **12** Wave 17 GIN/trigram FTS indexes, **10** Wave 18 composite cursor indexes (`idx_v34_%_cursor`), and `supabase_realtime` publication on `{v34_attention_items, v34_notifications}` (`REPLICA IDENTITY FULL`) |
| Live transactional authenticated Postgres E2E RPC verification (zero residual rows) | **PASS** | Verified live on `bxyjjbclaklzjxeumeat` (`2026-11-17`): `v34_autosave_draft_atomic` (v1 -> v2 -> idempotent replay -> `409 DRAFT_CONFLICT`, fixed `v34_pending_mutations` `'SYNCED'` & `v34_draft_snapshots` `'interval'` CHECK constraints in Migration 13), `v34_idempotency_store`/`lookup`, `v34_claim_outbox_batch` -> `v34_nack_outbox_event` (`PENDING` -> `DEAD_LETTERED`) -> `v34_ack_outbox_event`, `v34_unified_search` |
| Live & dry-run SQL backfill reconciliation + zero orphans / invalid checksums | **PASS** | `scripts/v34-backfill-reconcile.mjs --dry-run` (`v34MigrationCount: 13`, `checksumParityPassed: true`, `privacySafeLog: true`) + live `public.v34_reconcile_integrity_report()` on `bxyjjbclaklzjxeumeat` (`status: "RECONCILED"`, 0 orphans, 0 invalid export/render checksums, 0 quarantined open) |
| Production masked-clone lock-budget rehearsal & 14-day post-cutover validation | **OPERATOR** | Runbook §2–§6 (`docs/runbooks/v34-migration-and-rollback-runbook.md`) |

## B. Canonical Object Behavior (`Part VIII §B`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| Normalized `ClaimEvidence` (`SUPPORTS`/`CONTRADICTS`/`QUALIFIES`), `ContributionEvidence`, `ContributionClaim` | **PASS** | `v34_claim_evidence`, `v34_contribution_evidence`, `v34_contribution_claims`; `app/claim/[id]/page.tsx`, `app/evidence/[id]/page.tsx`, `test/next/v34-routes.test.ts` |
| Contribution deletion does not delete canonical Evidence/Claims (`409` deletion guard) | **PASS** | `app/api/evidence/[id]/route.ts`, `app/api/claims/[id]/route.ts`, `test/next/v34-wave8-routes.test.ts` |
| Global deduplicated `ToolRepository` + `WorkspaceTool` + `ToolSourceLink` | **PASS** | `app/api/tools/import/route.ts`, `app/api/tools/[id]/sources/route.ts`, `app/tool/[slug]/page.tsx`, `test/next/v34-wave7-routes.test.ts` |
| Formal `Review` strictly separated from informal `Discussion` | **PASS** | `app/reviews/page.tsx`, `app/review/[id]/page.tsx`, `components/v34/PeerReviewSection.tsx`, `components/v34/DiscussionSection.tsx` |
| FK-backed Topic tables (`v34_source_topics`, `v34_contribution_topics`, `v34_claim_topics`, `v34_tool_topics`) & Follow tables | **PASS** | Migrations 5, 8 & 9 + `app/topics/page.tsx`, `app/topics/[slug]/page.tsx` |
| Rebuildable `GraphNode`/`GraphEdge` projection & 90/90 SQL table repositories | **PASS** | `app/api/graph/rebuild/route.ts`, `lib/v34/table-repositories.ts`, `lib/v34/sql-list-readers.ts`, `components/v34/ProvenanceGraphExplorer.tsx` |

## C. API, Persistence & Authorization (`Part VIII §C`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| 100% Part V §6 + Wave 18 async cron route parity (`164/164` documented OpenAPI 3.1 paths, `100%` rate-limited) | **PASS** | `lib/openapi.ts`, `lib/api-catalog.ts`, `app/api/cron/outbox-drain/route.ts`, `test/contracts/baseline.test.ts`, `lib/__tests__/api-catalog.test.ts` |
| Strict fail-closed persistence & centralized server-side workspace/classification `authorize()` (`401`/`403`/`503`) | **PASS** | `lib/v34/supabase-sync.ts`, `lib/v34/authz.ts`, `lib/v34/http.ts`, `test/next/v34-wave17-persistence-security.test.ts` |
| Atomic Postgres autosave, durable idempotency replay guard (`v34_idempotency_keys`) & `409 Conflict` preserving client + server versions | **PASS** | `v34_autosave_draft_atomic` (Migrations 11 & 13), `lib/v34/idempotency.ts`, `lib/persistence/sync-coordinator.ts`, `components/v34/ScholarlyEditorWorkspace.tsx` |
| Canonical Base64URL keyset cursor pagination (`cursor`, `limit`, `nextCursor`, `hasMore`, `total`) + SQL-backed list readers across all 11 primary list APIs | **PASS** | `lib/v34/pagination.ts`, `lib/v34/sql-list-readers.ts`, `app/api/{contributions,sources,evidence,claims,tools,projects,workspaces,reviews,notifications,attention,feed}/route.ts`, `test/next/v34-wave18-async-ops.test.ts` |
| Anonymous reviewer redaction across UI, API, logs, OTLP traces, Sentry envelopes & notifications | **PASS** | `lib/v34/observability.ts`, `lib/v34/telemetry-export.ts`, `lib/v34/notifications-safe.ts`, `app/reviews/page.tsx`, `scripts/verify-v34-live.mjs` |

## D. Product, Delivery & Responsive UX (`Part VIII §D`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| 28 first-class v3.4 App Router pages + 15 Part I §26.2 `/dashboard/*` deep links + `.impeccable/surfaces/*` briefs + legacy-to-v3.4 home/post/author/write cohesion bridges | **PASS** | `app/{feed,search,topics,topics/[slug],contribute,editor,editor/[id],library,workspaces,workspaces/[slug],workspace/[id],projects,project/[id],sources,source/[id],evidence,evidence/[id],claims,claim/[id],reviews,review/[id],tools,tool/[slug],graph,research-os,contribution/[id],profile/[username],dashboard/[section]}`, `components/v34/ResearchNetworkBridge.tsx`, `test/next/v34-wave14-cohesion.test.ts` |
| Personal Research OS with live RLS-filtered Supabase Realtime subscriptions (`v34_notifications`, `v34_attention_items`), separated Attention Queue vs Notifications, interactive Goals, Pipeline & Move up/down Personalization | **PASS** | `lib/v34/realtime-client.ts`, `components/v34/ResearchOsClient.tsx`, `app/research-os/page.tsx`, `app/api/dashboard/*` |
| Shared Wizard (`ContributeWizard` with 8 locator kinds) <-> multi-pane Scholarly MDX Workspace (`ScholarlyEditorWorkspace` with 13 blocks, `/` menu, Undo/Redo, pending-sync counter) | **PASS** | `components/v34/ContributeWizard.tsx`, `components/v34/ScholarlyEditorWorkspace.tsx`, `test/next/v34-wave12-parity.test.ts`, `test/next/v34-wave15-normative.test.ts` |
| Postgres FTS/trigram unified search (`v34_unified_search`) with classification pre-filtering, Citation Builder (7 formats incl. CSL-JSON), & `ResponsiveDataTable` | **PASS** | `lib/v34/search.ts`, `lib/citations.ts`, `components/v34/SearchClient.tsx`, `components/v34/ResponsiveDataTable.tsx` |
| ADR-032-11 mobile bottom nav + focus-trapped inert-background Drawer + WCAG 2.1/2.2 AA axe-core + 26-route 320–1920px Playwright reflow matrix | **PASS** | `components/layout/MobileBottomNav.tsx`, `components/BlogHeader.tsx`, `lib/__tests__/v34-a11y-visual.test.tsx`, `test/e2e/v34-a11y-reflow.spec.ts` |
| Classification-safe PWA Service Worker (`rwm-v34-shell-v2`) with Background Sync (`rwm-editor-autosave-sync`), VAPID `push`/`notificationclick` & automatic logout local wipe | **PASS** | `public/sw.js`, `components/v34/PwaLifecycleBridge.tsx`, `lib/persistence/{editor-db,sync-coordinator,logout-wipe}.ts` |
| Multilingual scholarly text (Bangla `বাংলা`, Arabic RTL, mixed-script) + LTR identifier isolation (`dir="ltr"`) | **PASS** | `lib/v34/identifiers.ts`, `lib/v34/mdx-security.ts`, `test/next/v34-wave10-completion.test.ts` |

## E. Integrity and AI Governance (`Part VIII §E`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| 14-scheme canonical identifier normalizer (DOI, ORCID ISO 7064, PMID, PMCID, ISBN-10/13, ISSN, arXiv, ROR, RRID, Accession, SWHID, GitHub, GitLab, URL) | **PASS** | `lib/v34/identifiers.ts`, `test/next/v34-wave10-completion.test.ts` |
| MDX security allowlist sanitizer (Part V §16.2) enforced client & server | **PASS** | `lib/v34/mdx-security.ts`, `app/api/contributions/route.ts`, `components/v34/ScholarlyEditorWorkspace.tsx` |
| AI provenance ledger, `PROHIBITED_EXTERNAL_PROCESSING` on `CONFIDENTIAL`/`RESTRICTED`, human approval gate, publication blockers & retraction propagation | **PASS** | `lib/v34/ai-governance.ts`, `app/api/ai/{approve,reject,validate-citations,check-quotation,check-entailment}`, `app/api/contributions/[id]/publish/route.ts` |

## F & G. Async Platform, Storage, Observability & Cutover (`Part VIII §F–§G`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| Durable transactional outbox worker (`FOR UPDATE SKIP LOCKED`, idempotent consumer receipts, exponential backoff + DLQ) + dedicated Cloudflare Queues/Cron Worker (`0.88 KiB` gzip) | **PASS** | `lib/v34/outbox-worker.ts`, `app/api/cron/outbox-drain/route.ts`, `workers/outbox/*`, `npm run worker:outbox:check`, `test/next/v34-wave18-async-ops.test.ts` |
| Live delivery providers: ES256 VAPID Web Push (404/410 auto-revocation), classification-safe Resend digests, & Supabase Realtime private fan-out | **PASS** | `lib/v34/delivery.ts`, `lib/v34/job-runner.ts`, `lib/v34/realtime-client.ts`, `test/next/v34-wave18-async-ops.test.ts` |
| Cloudflare R2 SigV4 signed storage for checksummed scholarly exports (`v34_scholarly_exports`) and Remotion/Hyperframes renders (`v34_render_jobs`) with inline fallback | **PASS** | `lib/v34/r2-storage.ts`, `lib/v34/exports.ts`, `lib/v34/wave8-store.ts`, `app/api/exports/*`, `app/api/renders/[id]/route.ts` |
| Zero-bloat Edge-safe OTLP/HTTP JSON trace export + redacted Sentry Envelope capture (`X-Request-Id` / `X-Trace-Id`) | **PASS** | `lib/v34/telemetry-export.ts`, `lib/v34/http.ts`, `middleware.ts`, `test/next/v34-wave18-async-ops.test.ts` |
| Executable Cloudflare provisioning CLI (`R2`, `Queues`, redacted secret upload, P-256 VAPID generator), `--v34-cutover` env audit, staged rollout flags (`V34_FEED_ENABLED`, `V34_EDITOR_ENABLED`, `V34_REALTIME_ENABLED`), & live cutover verifier | **PASS** | `scripts/provision-cloudflare-v34.mjs`, `scripts/check-production-env.mjs`, `scripts/verify-v34-cutover.mjs`, `lib/v34/feature-flags.ts`, `test/next/v34-wave19-cutover-readiness.test.ts` |
| Automated release gate (`32/32` machine checks), `167/167` Vitest suites, `$Impeccable` source audit (`0` violations), live preview audit (`verify-v34-live.mjs` + `verify-v34-cutover.mjs`), & 6/6 GitHub Actions + Cloudflare Workers Builds CI | **PASS** | `scripts/release-gate.mjs` -> `docs/design-system/release-manifest.json`, `.github/workflows/quality.yml` |
| External Cloudflare R2/Queues/secrets provisioning, `workers/outbox` deploy, manual human accessibility/design-system sign-off, 7-day/14-day cutover window & PR #37 merge to `main` | **OPERATOR** | `docs/design-system/release-gate.md`, `docs/runbooks/v34-migration-and-rollback-runbook.md` §6 |
