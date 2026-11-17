# ADR-033: Ordered Supabase Postgres SQL Migrations + RLS + Zod Contracts Over Prisma ORM

- **Status:** Accepted
- **Date:** 2026-11-17
- **Deciders:** ResearchWithME Architecture & Platform Team
- **Supersedes / Clarifies:** Schema-governance note from Master Refactor Plan v3.4 (`Prisma` vs `Supabase SQL`)
- **Related ADRs:** `docs/adr/ADR-032-v34-canonical-decisions.md`

---

## 1. Context

`ResearchWithME-master-refactor-development-plan-v3.4.md` originally noted Prisma ORM as a potential schema tool alongside Supabase Postgres. During Waves 1–18 of the v3.4 build, ResearchWithME targets:

1. **Cloudflare Workers + OpenNext Edge Deployment** (`wrangler.jsonc`, Free-Plan 3 MiB compressed bundle ceiling, `nodejs_compat`).
2. **Defense-in-Depth Row-Level Security (RLS)** enforced directly inside Postgres per authenticated Supabase JWT (`auth.uid()`), across 90 `v34_*` tables and 156+ explicit RLS policies.
3. **Atomic Multi-Table PL/pgSQL RPCs** (`SECURITY INVOKER`) for optimistic draft autosave + snapshot history (`v34_autosave_draft_atomic`), durable idempotency (`v34_idempotency_lookup` / `v34_idempotency_store`), Postgres FTS/trigram unified search (`v34_unified_search`), and `FOR UPDATE SKIP LOCKED` transactional outbox draining (`v34_claim_outbox_batch` / `v34_ack_outbox_event` / `v34_nack_outbox_event`).

Adopting Prisma on Cloudflare Workers introduces mandatory Prisma Accelerate / Driver Adapter indirection, multi-megabyte query engine / WASM overhead against the 3 MiB compressed Worker ceiling, loss of native per-JWT Supabase RLS without custom transaction-local `SET LOCAL request.jwt.claims` boilerplate, and weak ergonomics for custom Postgres GIN/trigram/tsvector indexes, `REPLICA IDENTITY FULL` Realtime publications, and `FOR UPDATE SKIP LOCKED` PL/pgSQL RPCs.

---

## 2. Decision

**ResearchWithME v3.4 standardizes exclusively on ordered, versioned Supabase Postgres SQL migrations (`supabase/migrations/20261117000100` through `20261117001200+`) paired with Row-Level Security, `SECURITY INVOKER` Postgres RPCs, and strict Zod runtime contracts (`lib/v34/*contracts.ts`) instead of Prisma ORM.**

### Governance & Drift Controls

1. **Single Source of Truth for Schema:** Every schema change MUST land as an ordered, idempotent SQL migration under `supabase/migrations/` and be applied via Supabase migrations (`create_migration` / `supabase db push`). Ad-hoc console edits are prohibited.
2. **Mandatory RLS on Every Table:** Every `v34_*` table MUST enable `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` with explicit fail-closed policies before merge.
3. **Zero Unused Tables:** Every `v34_*` table declared in `supabase/migrations/` MUST be wired in `lib/v34/` (verified automatically by `V34-18` in `scripts/release-gate.mjs` and `test/next/v34-wave17-persistence-security.test.ts` — currently **90/90** tables wired).
4. **Runtime & Type Validation:** All API inputs and domain boundaries are validated with Zod (`lib/v34/*contracts.ts`), TypeScript `strict` checking (`tsc --noEmit`), and fail-closed persistence wrappers (`lib/v34/supabase-sync.ts`).
5. **Backfill & Integrity Reconciliation:** All legacy-to-v3.4 migrations run through `scripts/v34-backfill-reconcile.mjs` (`--dry-run` and `--live` via `v34_reconcile_integrity_report()`) verifying zero orphaned links and 100% SHA-256 checksum parity without logging private research prose or PII.
6. **Rollback Discipline:** Every migration follows expand-and-contract semantics (additive columns/indexes/RPCs first; destructive drops deferred until after soak and reconciliation verification).

---

## 3. Consequences

### Positive
- **Zero Worker bundle bloat:** Keeps `.open-next/worker.js` comfortably within Cloudflare's 3 MiB compressed script limit with zero Prisma WASM/binary runtime overhead.
- **Native Postgres capabilities:** First-class support for `pg_trgm`, `tsvector` GIN FTS, `FOR UPDATE SKIP LOCKED` outbox leasing, `supabase_realtime` RLS-filtered publications, and atomic PL/pgSQL RPCs.
- **True defense in depth:** Authorization is enforced twice — first in centralized `lib/v34/authz.ts` (`authorize(actor, capability, resource)`) and second in Postgres RLS policies via the user's Supabase JWT.

### Trade-offs & Mitigations
- **No generated Prisma client:** Mitigated by typed repositories (`lib/v34/table-repositories.ts`, `lib/v34/sql-list-readers.ts`), Zod contract schemas, and automated contract + release-gate suites (`V34-1` through `V34-19`).
- **Manual SQL migration authoring:** Mitigated by mandatory live-migration verification against Supabase (`bxyjjbclaklzjxeumeat`) and `v34_reconcile_integrity_report()` integrity auditing.
