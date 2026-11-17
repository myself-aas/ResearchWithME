# ResearchWithME v3.4 — Security Threat Model, Privacy Boundaries & Data Retention Policy

- **Plan Authority:** Master Plan Part V §15, §16.1–§16.3, §17, §18.17 & Part VII §7
- **Applies To:** Web App, API Routes, Scholarly MDX Editor, Offline PWA/IndexedDB, AI Governance Pipeline, Academic Resolvers, and Governed Render Jobs

---

## 1. STRIDE Threat Model & Enforced Controls

| Threat Vector | Target Surface | Mitigation Implemented | Code / Verification Proof |
| :--- | :--- | :--- | :--- |
| **Spoofing / Session Hijack** | Auth, API Mutations, Post-Auth Redirects | Supabase HTTP-only SameSite cookies, strict `safeNextPath` open-redirect blocking, `resolvePostAuthDestination` allowlist, server-side `requireContributor` fail-closed `401`/`403` | `app/auth/callback/route.ts`, `lib/v34/landing.ts`, `lib/v34/http.ts`, `lib/__tests__/auth-callback.test.ts` |
| **Tampering (Stored XSS / Unsafe MDX)** | Contribution MDX, Evidence Quotes, Editor Canvas | Allowlisted MDX component sanitizer rejecting `<script>`, `<iframe>`, `javascript:` URIs, inline event handlers, arbitrary imports/expressions; enforced both live in workspace & server-side (`HTTP 400`) | `lib/v34/mdx-security.ts`, `app/api/contributions/route.ts`, `components/v34/ScholarlyEditorWorkspace.tsx`, `test/next/v34-wave9-platform.test.ts` |
| **Repudiation / Silent Overwrite** | Draft Autosave, AI Edits, Account Deletion | Immutable `v34_audit_events`, optimistic concurrency `409 Conflict` preserving both client & server snapshots, SHA-256 export checksums (`X-Content-SHA256`), idempotency keys | `lib/persistence/sync-coordinator.ts`, `lib/v34/idempotency.ts`, `lib/v34/outbox.ts`, `app/api/exports/[id]/download/route.ts` |
| **Information Disclosure (Anonymous Reviewers & Private Content)** | Formal Reviews, Notifications, Logs, PWA Caches, Shared Devices | Anonymous reviewer masking in UI/API/logs/telemetry; classification-safe generic push previews; `public/sw.js` strictly network-only for `/api/*`, `/dashboard`, `/settings`, `/workspace*`, `/research-os`; automatic IndexedDB/Cache/Push wipe on sign-out | `lib/v34/observability.ts`, `lib/v34/notifications-safe.ts`, `public/sw.js`, `lib/persistence/logout-wipe.ts`, `lib/supabase/use-session.ts`, `components/cms/DashboardShell.tsx` |
| **Information Disclosure (External AI Exfiltration)** | Assistant Sessions, Citation/Entailment Checks | `CONFIDENTIAL` and `RESTRICTED` workspaces fail closed with `PROHIBITED_EXTERNAL_PROCESSING` unless routed exclusively to approved isolated verifiers | `lib/v34/ai-governance.ts`, `app/api/assistant/sessions/[id]/messages/route.ts`, `test/next/v34-wave8-routes.test.ts` |
| **SSRF (Server-Side Request Forgery)** | Academic & Repository Resolvers | Strict HTTPS + explicit host allowlist (`api.crossref.org`, `api.openalex.org`, `eutils.ncbi.nlm.nih.gov`, `export.arxiv.org`, `api.datacite.org`, `api.unpaywall.org`, `api.github.com`, `gitlab.com`) rejecting private/loopback/metadata IPs | `lib/v34/resolvers.ts`, `test/next/v34-wave11-engines.test.ts` |
| **Denial of Service / Abuse** | Discussions, Imports, Search Alerts, Topics, Graph Rebuilds | Distributed rate limiting via Cloudflare native Rate Limiter / KV / memory store (`enforceRateLimit`) + request body size validation via Zod schemas | `lib/rate-limit.ts`, `lib/v34/http.ts`, `lib/__tests__/rate-limit.test.ts` |
| **Elevation of Privilege (Cross-Tenant / RLS Bypass)** | PostgreSQL Tables, Renders, Sole-Owner Workspaces | **89/89 `v34_*` tables** enforce Row-Level Security (`rowsecurity = true`), sole-owner removal guard, human approval gate on governed Remotion/Hyperframes renders | `supabase/migrations/20261117000100`–`900`, `app/api/workspaces/[id]/members/[userId]/route.ts`, `app/api/renders/*` |

---

## 2. Web, MDX & Render Isolation Controls (Part V §16.1–§16.3)

- **Web Controls (`§16.1`):** Strict CSP headers (`lib/__tests__/auth-csp.test.ts`, `lib/__tests__/billing-csp.test.ts`), `frame-ancestors` policy, `SameSite=Lax` auth cookies, Zod input validation, rate limiting, safe internal-only redirects, and zero secret exposure in client bundles or logs.
- **MDX Controls (`§16.2`):** Deterministic serializer (`serializeResearchDocumentToMdx`) + allowlist validator (`validateAndSanitizeMdx`) capping document/block lengths and forbidding arbitrary imports, JS expressions, or raw HTML handlers.
- **Render Controls (`§16.3`):** Token-checksummed (`tokens.video.json`) Remotion/Hyperframes jobs carry SHA-256 input digests, zero client credentials, and require explicit human approval before publication.

---

## 3. Data Retention, Backup & Recovery Policy (Part V §17)

| Data Class | Retention Window | Deletion / Privacy Rule |
| :--- | :--- | :--- |
| **Audit Events (`v34_audit_events`)** | 7 years (policy-defined multi-year) | Append-only; never stores raw confidential excerpts or reviewer PII |
| **Published Contribution Versions (`v34_contribution_versions`)** | Indefinite (scholarly record) | Immutable unless legally removed; author account deletion uses privacy tombstone preserving provenance |
| **Draft Snapshots (`v34_draft_snapshots`)** | Rolling 90 days + explicit user milestones | User-deletable; local IndexedDB wiped automatically on sign-out |
| **Pending Mutations (`v34_pending_mutations`)** | 14 days post-sync | Purged by `retention.cleanup` job after confirmed sync & conflict window |
| **Notification Deliveries (`v34_notification_deliveries`)** | 30 days operational | Classification-safe generic previews only |
| **Analytics & Daily Impact (`v34_contribution_impact_daily`)** | Minimized aggregate counts | Never stores composite vanity reputation scores or user tracking profiles |
| **Deleted Accounts (`/api/me` `DELETE`)** | Immediate revocation + 30-day hard purge of private PII | Tombstones public attribution references where scholarly citations must survive |

### Backup & Recovery Targets

- **RPO:** `<= 15 minutes` (encrypted Supabase PostgreSQL WAL + point-in-time recovery).
- **RTO:** `<= 4 hours` (documented rollback & restore procedure in `docs/runbooks/v34-migration-and-rollback-runbook.md`).
- **Critical Local Draft Recovery:** Immediate from local IndexedDB (`EditorDatabase`) when device is available; wiped cleanly upon explicit sign-out (`performLogoutLocalWipe`).
- **Restore Rehearsal Cadence:** Quarterly masked-staging restore + checksum verification drill recorded by SRE/Release Owner.
