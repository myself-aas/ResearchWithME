# ResearchWithME v3.4 Migration, Cloudflare Cutover, Verification & Rollback Runbook

- **Applies To:** `ResearchWithME` v3.4 (`supabase/migrations/20261117000100`–`20261117001300`)
- **Primary Supabase Project:** `bxyjjbclaklzjxeumeat` (`ap-northeast-1`, Postgres 17.11)
- **Cloudflare Account:** `74d241df16b8aaa80914e3dbb6e16758` (`researchwithme`, `researchwithme-assistant`, `researchwithme-outbox`)
- **Feature Flag Registry:** `lib/v34/feature-flags.ts` (`V34_FEED_ENABLED`, `V34_EDITOR_ENABLED`, `V34_REALTIME_ENABLED`, `V34_FLAG_*`)
- **Schema Governance ADR:** `docs/adr/ADR-033-supabase-sql-over-prisma.md`

---

## 1. Pre-Deployment Readiness Checklist

Run the automated quality & release gate locally or in CI before promoting to production:

```bash
npm run quality
npm run build
npm run budgets
npm run release:gate
node scripts/check-production-env.mjs --v34-cutover
```

All **32/32** checks in `scripts/release-gate.mjs` (`DS-1`–`PERF-1`, `V34-1`–`V34-20`) must exit `0`, both standalone Workers (`worker:assistant:check`, `worker:outbox:check`) must pass dry-run bundling, and first-load client JS must remain `<= 200 KB` gzip.

---

## 2. Ordered Database Migrations (Zero-Downtime Additive — Live on `bxyjjbclaklzjxeumeat`)

All 13 v3.4 migrations are strictly additive and never drop or destructively alter legacy `public.posts`, `public.authors`, or `public.comments` tables:

| Order | Migration File | Scope & Key Invariants |
| :--- | :--- | :--- |
| 1 | `20261117000100_v34_wave1_canonical_schema.sql` | 19 core tables: Sources, Versions, IntegrityEvents, Evidence, Claims, ClaimEvidence, Contributions, Drafts, Library, Goals |
| 2 | `20261117000200_v34_wave2_collaboration_reviews.sql` | 10 collaboration/review tables: Workspaces, Projects, Milestones, Reviews, Rebuttals, Decisions |
| 3 | `20261117000300_v34_wave3_discussions_tools_os.sql` | 9 Research OS & tools tables: Discussions, ToolRepositories, Notifications, AttentionItems, AssistantTasks, Recognition, Preferences |
| 4 | `20261117000400_v34_wave5_topics_collections_alerts_graph.sql` | 8 discovery/graph tables + CHECK constraints on single-target collection items, no-self-edge graph, positive goal delta |
| 5 | `20261117000500_v34_wave6_ai_provenance_exports_search.sql` | 4 governance/export tables: AI Provenance Ledger, Scholarly Exports, Contribution Versions, Workspace Invitations, FTS/trigram indexes |
| 6 | `20261117000600_v34_wave7_devices_push_sync_profile.sql` | 5 profile/device tables: Devices, Web Push Subscriptions, Affiliations, Expertise, Workspace Access Requests |
| 7 | `20261117000700_v34_wave8_assessments_tasks_renders_ops.sql` | 11 operational tables: Assessments, Render Jobs, Device Sync Cursors, Outbox Events, Audit Events, Background Jobs |
| 8 | `20261117000800_v34_wave9_integrity_impacts_follows_annotations_ops.sql` | 11 integrity/follow tables: Integrity Impacts, Anchored Annotations, Explicit Follows, Search Alerts, External Identifiers, Quarantine |
| 9 | `20261117000900_v34_wave10_complete_83_prisma_models_and_constraints.sql` | 12 tables completing 83/83 Prisma model coverage + 7 Part VII §3 CHECK constraints (`chk_v34_*`) |
| 10 | `20261117001000_v34_wave13_operational_indexes.sql` | 13 Wave 13 operational & FK indexes |
| 11 | `20261117001100_v34_wave17_atomic_rpc_and_search.sql` | 4 `SECURITY INVOKER` RPCs (`v34_autosave_draft_atomic`, `v34_idempotency_lookup`, `v34_idempotency_store`, `v34_unified_search`) + 12 GIN/trigram search indexes |
| 12 | `20261117001200_v34_wave18_async_delivery_storage_pagination.sql` | `v34_outbox_consumer_receipts` (90th RLS table), `FOR UPDATE SKIP LOCKED` outbox claim/ack/nack RPCs, `v34_reconcile_integrity_report()`, 10 cursor pagination indexes (`idx_v34_%_cursor`), `supabase_realtime` publication on `{v34_attention_items, v34_notifications}` |
| 13 | `20261117001300_v34_wave19_autosave_status_fix.sql` | Aligns `v34_autosave_draft_atomic` sync receipt status (`'SYNCED'`) & snapshot reason normalization (`'interval'`) with table CHECK constraints |

### Post-Migration Live Database Verification SQL

```sql
SELECT
  public.v34_reconcile_integrity_report() AS reconciliation,
  (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'v34_%' AND rowsecurity = true) AS rls_table_count,
  (SELECT count(*)::int FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_v34_%_cursor') AS cursor_index_count,
  (SELECT array_agg(tablename ORDER BY tablename) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename LIKE 'v34_%') AS realtime_tables;
```

Expected: `reconciliation.status = 'RECONCILED'`, `0` orphans, `0` invalid checksums, `rls_table_count = 90`, `cursor_index_count = 10`, `realtime_tables = {v34_attention_items, v34_notifications}`.

### Live & Dry-Run Backfill Reconciliation

```bash
# Dry-run (safe offline/CI check)
node scripts/v34-backfill-reconcile.mjs --dry-run

# Live reconciliation against production Supabase (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
node scripts/v34-backfill-reconcile.mjs --live
```

---

## 3. Production Cloudflare Provisioning & Secrets Cutover (Wave 19 Operator Steps)

Run from a Cloudflare-authenticated operator shell (`npx wrangler login` or `export CLOUDFLARE_API_TOKEN=...`):

### Step 3.1 — Generate VAPID Keys & Cron Secret (if not already provisioned)

```bash
node scripts/provision-cloudflare-v34.mjs --generate-vapid
```

Export the generated `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, along with your Cloudflare R2 (`R2_ACCOUNT_ID`, `R2_BUCKET=researchwithme-artifacts`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`), `RESEND_API_KEY`, `OTEL_EXPORTER_OTLP_ENDPOINT`, and `SENTRY_DSN` into your shell environment (never commit them).

### Step 3.2 — Dry-Run Plan & Audit Secret Readiness

```bash
npm run cloudflare:provision:dry
npm run env:check:v34
```

### Step 3.3 — Provision R2 Bucket, Queues, Secrets & Deploy Outbox Worker

```bash
# Creates R2 bucket `researchwithme-artifacts`, Queues `researchwithme-outbox` + `researchwithme-outbox-dlq`,
# uploads all populated secrets over stdin to `researchwithme` & `workers/outbox`, and deploys `workers/outbox`.
node scripts/provision-cloudflare-v34.mjs --apply --deploy-workers
```

Also ensure `workers/assistant/` is deployed with `GEMINI_API_KEY`:

```bash
npm run worker:assistant:deploy
```

### Step 3.4 — Staged Feature-Flag Rollout & Live Authenticated Smoke Check

1. Run live SQL reconciliation:
   ```bash
   node scripts/v34-backfill-reconcile.mjs --live
   ```
2. Verify staged flags (`V34_FEED_ENABLED`, `V34_EDITOR_ENABLED`, `V34_REALTIME_ENABLED`) on the PR #37 Cloudflare preview URL first.
3. Run the live SSR + SLO verifier and authenticated cutover verifier against the preview / production origin:
   ```bash
   BASE_URL=https://<preview-or-prod-origin> npm run verify:v34:live
   BASE_URL=https://<preview-or-prod-origin> node scripts/verify-v34-cutover.mjs \
     --cookie "<authenticated-supabase-cookie>" \
     --cron-secret "$CRON_SECRET"
   ```
4. Complete the remaining human sign-off items in `docs/design-system/release-gate.md`, then merge PR #37 into `main`.

---

## 4. Instant Feature-Flag Kill Switches (No Redeploy Required)

Any v3.4 surface can be paused independently by setting the corresponding environment variable to `false` in Cloudflare Worker runtime settings:

| Feature Flag | Environment Variable(s) | Effect When `false` |
| :--- | :--- | :--- |
| `contribution-feed-v1` | `V34_FEED_ENABLED` / `V34_FLAG_CONTRIBUTION_FEED` | Disables v3.4 contribution feed surface |
| `scholarly-editor-v1` | `V34_EDITOR_ENABLED` / `V34_FLAG_SCHOLARLY_EDITOR` | Disables v3.4 scholarly MDX editor workspace |
| `realtime-private-v1` | `V34_REALTIME_ENABLED` / `V34_FLAG_REALTIME` | Disables Supabase Realtime private notification/attention subscriptions |
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
1. Toggle affected `V34_*_ENABLED` / `V34_FLAG_*` environment variable(s) to `false`.
2. Legacy editorial routes (`/`, `/articles`, `/post/[slug]`, `/authors`, `/assistant`, `/api/articles`) remain completely intact and unaffected.

### Level 2 — Application Rollback (< 5 minutes)
1. Re-deploy the prior production release commit (`027c746bbbdf3f7a3871c0a7e2b4ecaadec066c9`).
2. Leave additive `v34_*` tables in place (zero breaking impact on legacy queries; preserves any user data written during canary traffic).

### Level 3 — Graph Projection Rebuild (Derived State)
1. `POST /api/graph/rebuild` (authenticated) or click **Rebuild projection** on `/graph`.
2. Confirm `"rebuilt": true` and zero self-edges (`from_node_id <> to_node_id`).

---

## 6. Post-Deploy Production Manual Steps (Operator Checklist)

1. Execute `node scripts/provision-cloudflare-v34.mjs --apply --deploy-workers` (R2 bucket, Queues, secrets, `workers/outbox` deploy).
2. Deploy `workers/assistant/` with `GEMINI_API_KEY`.
3. Seed `private.linkedin_settings` row and configure LinkedIn OAuth / cron secrets + Supabase Database Webhook on `public.posts` -> `/api/webhooks/article-published`.
4. Run `node scripts/v34-backfill-reconcile.mjs --live` and `node scripts/verify-v34-cutover.mjs` against production `https://researchwith.me`.
5. Complete human accessibility (NVDA/VoiceOver/TalkBack/Forced Colors/200% zoom), design-system sign-off, and PITR restore drill in `docs/design-system/release-gate.md`.
