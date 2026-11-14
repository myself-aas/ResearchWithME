# ADR-001: Assistant API runs behind the site Worker, calls a dedicated Worker, and limits in two layers

## Status

Proposed. Implemented in the repository on 2026-11-14 on the spec's default
values; the owner has not yet confirmed the limits, the reuse of the billing
bridge secret, or the second Worker, and nothing is deployed. Change this to
Accepted when the owner confirms.

## Date

2026-11-14

## Context

The Assistant today is one anonymous route, `POST /api/research-assistant`,
limited to 12 requests per minute per IP by a fixed-window counter in Workers
KV (`lib/rate-limit-core.ts`). The owner wants a public API with rate
limiting that triggers Cloudflare Workers for the Assistant, usable from MCP,
and wants to know whether it can be charged for.

Constraints found in the repository:

- The site already deploys as one Worker (`researchwithme`) through OpenNext,
  with a `wrangler.jsonc`, a KV namespace and a self-reference service binding.
- There is no `service_role` credential anywhere. Privileged database writes
  go through `security definer` functions gated by a shared secret
  (`public.billing_secret_matches`, `apply_billing_event`).
- The KV limiter reads then writes, so two concurrent requests can both pass.
  That is acceptable for abuse control and wrong for anything that is counted
  against an allowance or paid for.
- Cloudflare's documentation for the Workers Rate Limiting binding states that
  it is counted per Cloudflare location, that the period must be 10 or 60
  seconds, that `limit()` returns only `{ success }`, and that it is
  "permissive, eventually consistent, and intentionally designed to not be
  used as an accurate accounting system".

## Decision

1. **The public API is a set of Next.js route handlers under `/api/v1/` in the
   existing site Worker.** Authentication, limits, metering and retrieval from
   the catalogue happen there.
2. **The model call runs in a second Worker, `researchwithme-assistant`,
   reached through a service binding with an RPC entrypoint.** It has no public
   route. It receives the question and the retrieved article records, and
   returns the answer. It holds the model key. When the binding is absent
   (`next dev`, unit tests) the same function runs in-process.
3. **Two limiters, for two jobs.**
   - Burst: the Workers Rate Limiting binding, keyed by API key id, 30 per 60
     seconds. Fast, approximate, no storage. Falls back to the existing KV
     limiter when the binding is missing.
   - Allowance: a monthly count in Postgres, incremented inside the same SQL
     function that claims the request. Exact, because it is one transaction.
4. **Idempotency lives in the same ledger row.** A unique constraint on
   `(key_id, idempotency_key)` makes the claim atomic. A repeat with the same
   body returns the stored response; with a different body, `422`; while the
   first is still running, `409`.
5. **Keys are stored as SHA-256 hashes** with a visible prefix for
   identification. The raw key is shown once.
6. **The ledger functions reuse the billing bridge secret** rather than
   introduce a second one. This is the part most open to challenge; see
   Consequences.

## Alternatives considered

### Everything in the site Worker, no second Worker

- Pros: no new deployment, no binding, smallest change.
- Cons: the model key stays in the Worker that also serves every page; the
  model path cannot be deployed, rolled back or profiled on its own.
- Not chosen because the owner asked for the API to trigger a Worker. If that
  requirement is dropped, this is the simpler design and M4 can be skipped
  without touching M1 to M3.

### A standalone API Worker on `api.researchwith.me`

- Pros: clean separation, could use a small router and the binding directly.
- Cons: the catalogue loader, Supabase session handling and the key
  management page would have to be duplicated or called back over HTTP; a new
  hostname needs CORS and cookie decisions.
- Rejected for V1. Listed as out of scope in the spec.

### Durable Object per key for exact rate limiting

- Pros: exact counts, no eventual consistency.
- Cons: a new stateful component, and the exact number that matters (the
  allowance) is already in Postgres.
- Rejected: exactness is needed for the allowance, not for the burst limit.

### KV for the allowance

- Rejected: read-then-write is not atomic, and KV is eventually consistent.

### Queue and poll (`202 Accepted`)

- Pros: survives slow model calls.
- Cons: the model timeout is 20 seconds and there is a catalogue fallback, so
  a synchronous reply always arrives; polling doubles the client's work.
- Deferred until there is a request type that outlives a request.

### Prisma for the new tables

- Rejected: the repository uses Supabase clients and SQL functions under
  row-level security; a second access path would bypass that model.

## Consequences

- A second Worker must be deployed before the site Worker, because the site's
  service binding names it. The plan orders the deploys.
- Burst limiting will let more than 30 requests through in some minutes. The
  API reference says so. Nothing that costs money depends on it.
- Every API answer costs one Postgres round trip to claim and one to
  complete. At the expected volume that is acceptable; if latency matters
  later, Hyperdrive is the documented option.
- Reusing the bridge secret means one secret rotation covers both billing
  events and API metering, and a leak exposes both. A separate secret is a
  five-line change in the migration and one more Worker secret.
- `lib/agent-auth.ts` says the API accepts no bearer tokens. After M3 it
  accepts API keys, still not OAuth tokens. That text and `/auth.md` must be
  updated in the same change so the published statement stays true.
- The catalogue is retrieved in the site Worker and sent to the Assistant
  Worker with each call (at most four article records). The Assistant Worker
  never reads the database.
