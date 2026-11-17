# ResearchWithME v3.4 Migration, Verification & Rollback Runbook

- **Applies To:** `ResearchWithME` v3.4 (`supabase/migrations/20261117000100`–`20261117000800`)
- **Primary Supabase Project:** `bxyjjbclaklzjxeumeat` (`ap-northeast-1`, Postgres 17)
- **Feature Flag Registry:** `lib/v34/feature-flags.ts`

---

## 1. Pre-Deployment Readiness Checklist

Run the automated release gate locally or in CI before promoting to production:

```bash
npm run tokens:check
npm run lint
npm run typecheck
npx vitest run
npm run impeccable:source
npm run worker:assistant:check
npm run build
npm run budgets
npm run release:gate
```

All 18+ checks in `scripts/release-gate.mjs` must exit `0`, and first-load client JS must remain `<= 200 KB` gzip.

---

## 2. Ordered Database Migrations (Zero-Downtime Additive)

All four v3.4 migrations are strictly additive (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, idempotent `DO $$ ... END $$` policy blocks) and never drop or destructively alter legacy `public.posts`, `public.authors`, or `public.comments` tables:

| Order | Migration File | Tables Added | Key Invariants |
| :--- | :--- | :---: | :--- |
| 1 | `20261117000100_v34_wave1_canonical_schema.sql` | 19 | Sources, Versions, IntegrityEvents, Evidence, Claims, ClaimEvidence, Contributions, Drafts, Library, Goals |
| 2 | `20261117000200_v34_wave2_collaboration_reviews.sql` | 10 | Workspaces, WorkspaceMembers, Projects, ProjectMembers, Milestones, ProjectObjects, Formal Reviews, Items, Rebuttals, Decisions |
| 3 | `20261117000300_v34_wave3_discussions_tools_os.sql` | 9 | Discussions, Comments, ToolRepositories, ToolSourceLinks, ProjectNotes, Notifications, AttentionItems, AssistantTasks, RecognitionEvents, Preferences |
| 4 | `20261117000400_v34_wave5_topics_collections_alerts_graph.sql` | 8 | Topics, TopicAssignments, WorkspaceTools, SavedSearches, CitationCollections, CitationCollectionItems (single-target CHECK), GraphNodes, GraphEdges (no-self-edge CHECK), GoalProgressEvents (`delta > 0` CHECK) + `paused_at`/`archived_at` on `v34_research_goals` |
| 5 | `20261117000500_v34_wave6_ai_provenance_exports_search.sql` | 4 | AI Provenance Ledger (`v34_ai_provenance_records`), Checksummed Scholarly Exports (`v34_scholarly_exports`), Immutable Contribution Versions (`v34_contribution_versions`), Workspace Invitations (`v34_workspace_invitations`), and PostgreSQL `tsvector` + `pg_trgm` GIN search indexes |
| 6 | `20261117000600_v34_wave7_devices_push_sync_profile.sql` | 5 | Registered Devices (`v34_user_devices`), Web Push Subscriptions (`v34_push_subscriptions`), Contributor Affiliations (`v34_user_affiliations`), Verified Expertise (`v34_user_expertise`), and Workspace Access Requests (`v34_workspace_access_requests`) |
| 7 | `20261117000700_v34_wave8_assessments_tasks_renders_ops.sql` | 11 | Evidence & Claim Assessments, Library Collections, Project Tasks, Assistant Sessions & Messages, Governed Remotion/Hyperframes Render Jobs, Device Sync Cursors, Transactional Outbox (`v34_outbox_events`), Audit Events (`v34_audit_events`), and Background Jobs (`v34_background_jobs`) |
| 8 | `20261117000800_v34_wave9_integrity_impacts_follows_annotations_ops.sql` | 11 | Integrity Impact Records, Source-Anchored Annotations (`VALID/DRIFTED/ORPHANED`), Cached Non-Vanity Profile Metrics, Explicit Follow Tables (no self-follow CHECK), Search Alerts, Notification & Webhook Deliveries, Normalized External Identifiers Index, and Legacy Relationship Quarantine |

### Post-Migration Database Verification SQL

Verify all 77 `v34_*` tables exist and have Row-Level Security enabled:

```sql
SELECT count(*) AS total_v34_tables,
       count(*) FILTER (WHERE c.relrowsecurity) AS rls_enabled_tables
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
WHERE t.table_schema = 'public'
  AND t.table_name LIKE 'v34_%';
```

Expected: `total_v34_tables = 77`, `rls_enabled_tables = 77`.

### Dry-Run Backfill & Reconciliation Check

```bash
node scripts/v34-backfill-reconcile.mjs --dry-run
```

Verifies `ResearchNote` SHA-256 checksum parity, `ToolRepository` host/owner/name deduplication, and `KnowledgeRelationship` normalization vs explicit quarantine without logging titles, bodies, or reviewer identities.

---

## 3. Graph Read Projection Rebuild Procedure

Because `v34_graph_nodes` and `v34_graph_edges` are purely derived projections, rebuild them after any bulk backfill or schema migration:

1. Via authenticated HTTP API:
   ```bash
   curl -X POST https://<domain>/api/graph/rebuild \
     -H "Cookie: <session-cookie>"
   ```
2. Or from the `/graph` UI by clicking **Rebuild projection**.
3. Confirm response returns `"rebuilt": true`, non-zero `nodeCount`/`edgeCount`, and zero self-edges (`from_node_id <> to_node_id`).

---

## 4. Instant Feature-Flag Kill Switches (No Redeploy Required)

Any v3.4 surface can be paused independently by setting the corresponding environment variable to `false` in Cloudflare / Vercel / hosting runtime settings:

| Feature Flag | Environment Variable | Effect When `false` |
| :--- | :--- | :--- |
| `v34-normalized-relations` | `V34_FLAG_NORMALIZED_RELATIONS` | Disables normalized relationship writes |
| `v34-discussions` | `V34_FLAG_DISCUSSIONS` | Disables informal discussion threads |
| `v34-goals` | `V34_FLAG_GOALS` | Disables personal goal writes |
| `v34-global-tools` | `V34_FLAG_GLOBAL_TOOLS` | Disables global tool repository registry |
| `v34-graph-projection` | `V34_FLAG_GRAPH_PROJECTION` | Returns `{ projection: null, flagDisabled: true }` on `/api/graph/rebuild` |
| `v34-citation-collections` | `V34_FLAG_CITATION_COLLECTIONS` | Returns empty list with `flagDisabled: true` on `/api/citation-collections` |
| `v34-saved-searches` | `V34_FLAG_SAVED_SEARCHES` | Returns empty list with `flagDisabled: true` on `/api/search/saved` |
| `v34-topics-taxonomy` | `V34_FLAG_TOPICS_TAXONOMY` | Returns empty list with `flagDisabled: true` on `/api/topics` |

---

## 5. Rollback Procedure

### Level 1 — Fast Feature-Flag Rollback (< 2 minutes, zero data loss)
1. Toggle affected `V34_FLAG_*` environment variable(s) to `false`.
2. Legacy editorial routes (`/`, `/articles`, `/post/[slug]`, `/authors`, `/assistant`, `/api/articles`) remain completely intact and unaffected.

### Level 2 — Application Rollback (< 5 minutes)
1. Re-deploy the prior production release commit (`027c746bbbdf3f7a3871c0a7e2b4ecaadec066c9`).
2. Leave additive `v34_*` tables in place (zero breaking impact on legacy queries; preserves any user data written during canary traffic).

### Level 3 — Full Non-Production Schema Tear-Down (Staging / Sandbox Only)
Never run destructive drops in production without a verified snapshot backup. In staging, `v34_*` tables may be dropped in reverse migration order (`20261117000400` -> `000300` -> `000200` -> `000100`) because zero legacy tables hold foreign keys pointing into `v34_*`.

---

## 6. Post-Deploy Production Manual Steps (Operator Checklist)

1. Deploy `workers/assistant/` first with `GEMINI_API_KEY` secret configured.
2. Seed `private.linkedin_settings` row and configure LinkedIn OAuth / cron secrets in Cloudflare Workers.
3. Configure the Supabase Database Webhook on `public.posts` pointing to `/api/webhooks/article-published` with matching HMAC secret.
4. Run `npm run verify:v34:live` against the deployed preview/staging origin to verify 100% SSR, API contract, and p95 latency SLOs.
