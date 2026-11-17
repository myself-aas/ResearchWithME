# ADR-032: ResearchWithME v3.4 Canonical Architecture Decisions (ADR-032-01 to ADR-032-13)

- **Status:** Accepted & Implemented
- **Date:** 2026-11-16
- **Branch:** `arena/d0437759-researchwithme` (PR #37 against `main`)
- **Authoritative Blueprint:** `ResearchWithME-master-refactor-development-plan-v3.4.md`

This Architecture Decision Record locks the thirteen canonical structural, domain, security, and operational decisions governing ResearchWithME v3.4. Every decision below is enforced both in Postgres SQL + Row-Level Security (`supabase/migrations/20261117000100`–`000400`) and in the Next.js / TypeScript domain layer (`lib/v34/**`).

---

## Decision Register

### ADR-032-01 — Supabase Postgres SQL + Strict RLS as Primary Persistence Layer
- **Decision:** All v3.4 tables live in `public.v34_*` via ordered, version-controlled SQL migrations (`supabase/migrations/20261117000100` through `20261117000400`, totaling 46 live RLS-protected tables on Supabase `bxyjjbclaklzjxeumeat`).
- **Invariant:** Every `v34_*` table enables `ROW LEVEL SECURITY`. Application code executes strictly with anon/user-scoped JWT clients (`getOptionalPublicSupabase` / authenticated `auth.actor.supabase`) — never service-role bypass in user paths.
- **Resilience:** Remote reads enforce a bounded `1,200 ms` timeout with a `30 s` circuit breaker (`lib/v34/supabase-sync.ts`) so transient database hiccups never block SSR or API p95 SLOs.

### ADR-032-02 — Normalized Canonical Relationships Over JSON Arrays
- **Decision:** Scholarly links (`v34_claim_evidence`, `v34_contribution_evidence`, `v34_contribution_claims`, `v34_topic_assignments`, `v34_workspace_tools`, `v34_tool_source_links`, `v34_project_objects`) are modeled as first-class relational join tables with explicit foreign keys and unique constraints rather than opaque JSON arrays.
- **Outcome:** Bidirectional provenance traversal, integrity impact propagation, and deterministic graph projection rebuilds operate with O(indexed join) fidelity.

### ADR-032-03 — Immutable Preserved Source Versions & Integrity Propagation
- **Decision:** Canonical sources (`v34_sources`) preserve immutable snapshots in `v34_source_versions` (`/api/sources/[id]/versions`). Retractions, corrections, and expressions of concern are recorded as append-only `v34_source_integrity_events` (`/api/sources/[id]/integrity-events`, editor-only).
- **Hard Publish Gate:** Recording a `retracted` integrity event immediately creates an `OPEN` high-severity `AttentionItem` (`propagateIntegrityEventToAttention`) and blocks publishing any dependent contribution with HTTP `422 UNREVIEWED_RETRACTION_IMPACT` until an explicit disposition is recorded.

### ADR-032-04 — AI-Suggested Provenance Edges Default to `PROPOSED`
- **Decision:** Any `ClaimEvidence` link (`SUPPORTS`, `CONTRADICTS`, `QUALIFIES`) created with `assertionMethod = 'AI_SUGGESTED'` is persisted with `status = 'PROPOSED'` and visually distinguished in list and graph views (`ProvenanceGraphExplorer.tsx`).
- **Outcome:** Machine suggestions never silently enter verified scholarly provenance; a human contributor must explicitly accept or reject via `PATCH /api/relationships`.

### ADR-032-05 — Strict Separation of Informal Discussions vs. Formal Peer Reviews
- **Decision:** Informal threaded scholarly discussions (`v34_discussions`, `v34_discussion_comments`, `/api/discussions`) and formal version-aware peer reviews (`v34_reviews`, `v34_review_items`, `v34_review_rebuttals`, `v34_review_decisions`, `/api/reviews`) use distinct tables, distinct APIs, and distinct UI surfaces.
- **Invariants:**
  - Formal rebuttals must link to existing `review_item_ids` in the same review.
  - Anonymous reviewers have `reviewerId`, `authorId`, and `reviewerHandle` completely redacted (`null` / `'Anonymous Reviewer'`) in all API responses (`sanitizeReviewForAnonymity`).
  - Comments in informal discussions never alter formal peer-review decision state.

### ADR-032-06 — Workspace-Bound Project Membership & Roles
- **Decision:** Projects (`v34_projects`) belong to a Workspace (`v34_workspaces`). Adding a user to a project (`POST /api/projects/[id]/members`) or managing `WorkspaceTool` links (`POST/DELETE /api/workspaces/[id]/tools`) enforces active workspace membership (`v34_is_workspace_member` / `WORKSPACE_MEMBERSHIP_REQUIRED` HTTP 403).

### ADR-032-07 — Global Deduplicated `ToolRepository` vs. `WorkspaceTool` & Immutable `Source`
- **Decision:** Open-source research tools are stored globally once in `v34_tool_repositories` (deduplicated by `canonical_repo_key`) with timestamped repository observations (`observed_at`, stars, forks, latest tag). Workspaces link to global tools via `v34_workspace_tools` rather than cloning records. Citing a tool links to an immutable software `v34_sources` release via `v34_tool_source_links`.

### ADR-032-08 — Strict Separation of Notifications, Mandatory Attention, and Optional AI Assistant Tasks
- **Decision:** Three separate personal queues exist:
  1. `v34_notifications` — chronological read/unread event history; reading a notification never resolves an attention item.
  2. `v34_attention_items` — mandatory action queue (`OPEN | ACKNOWLEDGED | RESOLVED | DISMISSED`).
  3. `v34_assistant_tasks` — optional AI suggestions that never enter `v34_attention_items` until explicitly promoted by the researcher (`POST /api/assistant-tasks/[id]/promote`).

### ADR-032-09 — Event-Fact Scholarly Recognition Without Composite Vanity Scores
- **Decision:** `v34_recognition_events` records auditable scholarly recognition facts (`REFERENCED_CONTRIBUTION`, `HELPFUL_REVIEW`, `EVIDENCE_REUSED`, `CORRECTION_ACCEPTED`, `REPLICATION_VERIFIED`, `REVIEW_COMPLETED`). Self-recognition is rejected (`400`), editor reversals remove invalidated events from derived summaries, and no composite karma/leaderboard score is ever exposed.

### ADR-032-10 — Calm Research Goals With Lifecycle & Audited Progress Events
- **Decision:** Personal Research Goals (`v34_research_goals`) support explicit lifecycle states (`ACTIVE | PAUSED | COMPLETED | EXPIRED | ARCHIVED`) via `/api/goals/[id]/{pause,resume,archive}`. Progress updates are recorded as append-only positive deltas in `v34_goal_progress_events` (`CHECK (delta > 0)`), automatically completing goals on reaching `target_value` while prohibiting resumes or increments on archived goals.

### ADR-032-11 — First-Class FK-Backed Topic Taxonomy & Single-Target Citation Collection Items
- **Decision:** `v34_topics` and `v34_topic_assignments` replace ad-hoc string tags with a canonical kebab-case taxonomy exposed at `/topics` and `/api/topics`.
- **Single-Target Check:** `v34_citation_collection_items` enforces both at the Zod layer (`AddCitationCollectionItemInputSchema`) and via Postgres `CHECK` constraint `v34_citation_item_exactly_one_target` that every item targets **exactly one** of `source_id`, `contribution_id`, or `evidence_id`.

### ADR-032-12 — Derived & Deterministically Rebuildable Graph Read Projection
- **Decision:** `v34_graph_nodes` and `v34_graph_edges` are purely derived read projections with DB-level `CHECK (from_node_id <> to_node_id)` preventing self-edges. `POST /api/graph/rebuild` drops and deterministically reconstructs the projection strictly from canonical tables without data loss.

### ADR-032-13 — Retryable Write Idempotency, Offline-First Draft Recovery, and Feature-Flagged Cutover
- **Decision:** All retryable write endpoints honor the `Idempotency-Key` header (`lib/v34/idempotency.ts`, returning cached responses with `X-Idempotency-Replayed: true`). Research drafts persist across 3 layers (IndexedDB + optimistic server concurrency + history snapshots). Every v3.4 capability is gated behind environment-overridable rollout flags (`lib/v34/feature-flags.ts`) to support instant zero-redeploy rollback.
