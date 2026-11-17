# ResearchWithME v3.4 — Part VII §11 & Part VIII Acceptance Evidence Package

- **Master Plan Authority:** `ResearchWithME-master-refactor-development-plan-v3.4.md` (Parts I–VIII)
- **Canonical Reference Schema:** `ResearchWithME-v3.4-schema.prisma` (83 models, 87 enums)
- **Supabase Project Verified Live:** `bxyjjbclaklzjxeumeat` (`ap-northeast-1`, Postgres 17.11)
- **Decision Register:** `docs/adr/ADR-032-v34-canonical-decisions.md` (`ADR-032-01`–`ADR-032-13`)
- **Migration & Rollback Runbook:** `docs/runbooks/v34-migration-and-rollback-runbook.md`
- **Security Threat Model & Retention Policy:** `docs/security/v34-threat-model-and-retention-policy.md`

---

## A. Schema and Migration (`Part VIII §A`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| 83 models & 87 enums, zero `ResearchNote`, generic `Follow`, or canonical `KnowledgeRelationship` | **PASS** | `ResearchWithME-v3.4-schema.prisma` verified programmatically by `test/next/v34-wave10-completion.test.ts` |
| Intentional `onDelete` policies across all relations | **PASS** | `supabase/migrations/20261117000100`–`20261117000900` (`RESTRICT` on Evidence/Claims/SourceVersions referenced by published outputs, `CASCADE` on derived Graph/presentation links) |
| 100% SQL table & RLS coverage | **PASS** | **89/89 `v34_*` tables** live on `bxyjjbclaklzjxeumeat` with `rowsecurity = true` + 7 Part VII §3 `CHECK` constraints (`chk_v34_*`) |
| Idempotent, resumable dry-run backfill, checksum parity & quarantine report | **PASS** | `scripts/v34-backfill-reconcile.mjs --dry-run` + `test/next/v34-wave9-platform.test.ts` |
| Production masked-clone lock-budget rehearsal & 14-day post-cutover validation | **OPERATOR** | Runbook §2–§4 (`docs/runbooks/v34-migration-and-rollback-runbook.md`) |

## B. Canonical Object Behavior (`Part VIII §B`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| Normalized `ClaimEvidence` (`SUPPORTS`/`CONTRADICTS`/`QUALIFIES`), `ContributionEvidence`, `ContributionClaim` | **PASS** | `v34_claim_evidence`, `v34_contribution_evidence`, `v34_contribution_claims`; `app/claim/[id]/page.tsx`, `app/evidence/[id]/page.tsx`, `test/next/v34-routes.test.ts` |
| Contribution deletion does not delete canonical Evidence/Claims (`409` deletion guard) | **PASS** | `app/api/evidence/[id]/route.ts`, `app/api/claims/[id]/route.ts`, `test/next/v34-wave8-routes.test.ts` |
| Global deduplicated `ToolRepository` + `WorkspaceTool` + `ToolSourceLink` | **PASS** | `app/api/tools/import/route.ts`, `app/api/tools/[id]/sources/route.ts`, `app/tool/[slug]/page.tsx`, `test/next/v34-wave7-routes.test.ts` |
| Formal `Review` strictly separated from informal `Discussion` | **PASS** | `app/reviews/page.tsx`, `app/review/[id]/page.tsx`, `components/v34/PeerReviewSection.tsx`, `components/v34/DiscussionSection.tsx` |
| FK-backed Topic tables (`v34_source_topics`, `v34_contribution_topics`, `v34_claim_topics`, `v34_tool_topics`) & Follow tables | **PASS** | Migrations 5, 8 & 9 + `app/topics/page.tsx`, `app/topics/[slug]/page.tsx` |
| Rebuildable `GraphNode`/`GraphEdge` projection | **PASS** | `app/api/graph/rebuild/route.ts`, `components/v34/ProvenanceGraphExplorer.tsx` |

## C. API and Authorization (`Part VIII §C`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| 100% Part V §6 route parity (`174/174` routes, `246` OpenAPI 3.1 operations, `0` missing) | **PASS** | `lib/openapi.ts`, `lib/api-catalog.ts`, `test/contracts/baseline.test.ts`, `lib/__tests__/api-catalog.test.ts` |
| Server-side workspace & classification authorization (fail-closed `401`/`403`) | **PASS** | `lib/v34/http.ts`, `lib/v34/ai-governance.ts`, `scripts/verify-v34-live.mjs` |
| Idempotency replay guard + `409 Conflict` preserving client & server versions | **PASS** | `lib/v34/idempotency.ts`, `lib/persistence/sync-coordinator.ts`, `components/v34/ScholarlyEditorWorkspace.tsx` |
| Anonymous reviewer redaction across UI, API, logs, telemetry & notifications | **PASS** | `lib/v34/observability.ts`, `lib/v34/notifications-safe.ts`, `app/reviews/page.tsx`, `scripts/verify-v34-live.mjs` |
| Rate limiting on discussions, follows, search alerts, imports & graph rebuilds | **PASS** | `enforceRateLimit` in `lib/v34/http.ts` backed by `lib/rate-limit.ts` |

## D. Product and Responsive UX (`Part VIII §D`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| 28 first-class v3.4 App Router pages + 15 Part I §26.2 `/dashboard/*` deep links + `.impeccable/surfaces/*` briefs | **PASS** | `app/{feed,search,topics,topics/[slug],contribute,editor,editor/[id],library,workspaces,workspaces/[slug],workspace/[id],projects,project/[id],sources,source/[id],evidence,evidence/[id],claims,claim/[id],reviews,review/[id],tools,tool/[slug],graph,research-os,contribution/[id],profile/[username],dashboard/[section]}` + `lib/v34/dashboard-routes.ts` |
| Personal Research OS (`Continue Working`, Attention Queue vs Notifications, interactive `Research Goals`, `Contribution Pipeline`, `Private Research Activity`, & Module Personalization) | **PASS** | `components/v34/ResearchOsClient.tsx`, `app/research-os/page.tsx`, `app/api/goals/*`, `app/api/dashboard/*` |
| ADR-032-02 shared Wizard (`ContributeWizard`) <-> multi-pane Scholarly MDX Workspace (`ScholarlyEditorWorkspace` with all 13 Part III §20.1 blocks, live `/` menu, Undo/Redo) | **PASS** | `components/v34/ContributeWizard.tsx`, `components/v34/ScholarlyEditorWorkspace.tsx`, `lib/v34/contracts.ts`, `test/next/v34-wave12-parity.test.ts` |
| Part III §16 Citation Builder (`APA`, `MLA`, `Chicago`, `IEEE`, `BibTeX`, `RIS`, `CSL-JSON`, inline short ref, LTR identifier normalization) & Part III §27 `ResponsiveDataTable` | **PASS** | `lib/citations.ts`, `components/CitationTool.tsx`, `components/v34/ResponsiveDataTable.tsx`, `app/sources/page.tsx` |
| ADR-032-11 mobile bottom nav (`Explore`, `Library`, `Contribute`, `AI`, `Profile`) + Drawer secondary links | **PASS** | `components/layout/MobileBottomNav.tsx`, `components/BlogHeader.tsx`, `lib/__tests__/v34-responsive-shell.test.tsx` |
| WCAG 2.1/2.2 AA axe-core + BottomSheet focus-trap + 320–1920px reflow matrix (26 v3.4 routes) | **PASS** | `lib/__tests__/v34-a11y-visual.test.tsx`, `test/e2e/v34-a11y-reflow.spec.ts` |
| Multilingual scholarly text (Bangla `বাংলা`, Arabic RTL, mixed-script) + LTR identifier isolation (`dir="ltr"`) | **PASS** | `lib/v34/identifiers.ts`, `lib/v34/mdx-security.ts`, `test/next/v34-wave10-completion.test.ts` |
| Classification-safe PWA Service Worker & automatic logout local wipe | **PASS** | `public/sw.js`, `components/v34/PwaLifecycleBridge.tsx`, `lib/persistence/logout-wipe.ts`, wired into `lib/supabase/use-session.ts` & `components/cms/DashboardShell.tsx` |

## E. Integrity and AI Governance (`Part VIII §E`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| 14-scheme canonical identifier normalizer (DOI, ORCID ISO 7064, PMID, PMCID, ISBN-10/13, ISSN, arXiv, ROR, RRID, Accession, SWHID, GitHub, GitLab, URL) | **PASS** | `lib/v34/identifiers.ts` + `test/next/v34-wave10-completion.test.ts` |
| MDX security allowlist sanitizer (Part V §16.2) enforced client & server | **PASS** | `lib/v34/mdx-security.ts`, `app/api/contributions/route.ts`, `components/v34/ScholarlyEditorWorkspace.tsx` |
| AI provenance ledger, `PROHIBITED_EXTERNAL_PROCESSING` on `CONFIDENTIAL`/`RESTRICTED`, human approval gate, publication blockers & retraction propagation | **PASS** | `lib/v34/ai-governance.ts`, `app/api/ai/{approve,reject,validate-citations,check-quotation,check-entailment}`, `app/api/contributions/[id]/publish/route.ts` |

## F & G. Performance, Reliability & Cutover (`Part VIII §F–§G`)

| Criterion | Status | Evidence Artifact |
| :--- | :---: | :--- |
| SSRF-safe Part V §11 Academic & Repository Resolver Waterfall + Part V §9 15-job Background Processor + STRIDE Threat Model & Retention Policy | **PASS** | `lib/v34/resolvers.ts`, `lib/v34/job-runner.ts`, `docs/security/v34-threat-model-and-retention-policy.md`, `test/next/v34-wave11-engines.test.ts` |
| Part VII §4 Dual-Read Fallback Telemetry & 14-day zero-fallback contract readiness gate | **PASS** | `lib/v34/dual-read.ts`, `test/next/v34-wave11-engines.test.ts` |
| First-load JS shell budget `<= 200 KB` gzip | **PASS** | `npm run budgets` (`<= 200 KB` gzip verified post-build) |
| Live API p95 SLOs (`<= 400ms` autosave, `<= 500ms` dashboard/tools/reviews, `<= 700ms` search) & 28 SSR/deep-link routes `200` | **PASS** | `scripts/verify-v34-live.mjs` (measured 2–5ms p95 on production Next.js server) |
| Automated release gate (`26/26` machine checks) & GitHub Actions CI (`quality.yml` + `v34-e2e-a11y` Playwright job) | **PASS** | `scripts/release-gate.mjs` -> `docs/design-system/release-manifest.json`, `.github/workflows/quality.yml` |
| 7-day zero-mismatch dual-write / 14-day zero-fallback window, PITR rehearsal & human owner sign-offs | **OPERATOR** | `docs/design-system/release-gate.md`, `docs/runbooks/v34-migration-and-rollback-runbook.md`, `docs/security/v34-threat-model-and-retention-policy.md` |
