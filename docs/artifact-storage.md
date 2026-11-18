# Artifact storage without a credit card

ResearchWithME stores two kinds of generated files outside Postgres:

| Artifact | Table | Producer |
| --- | --- | --- |
| Checksummed scholarly exports (BibTeX, CSL-JSON, JSON-LD, Markdown) | `v34_scholarly_exports` | `lib/v34/exports.ts` |
| Remotion / Hyperframes render manifests | `v34_render_jobs` | `lib/v34/wave8-store.ts` |

Wave 18 wired these to Cloudflare R2. **R2 requires a payment method on the
Cloudflare account even when usage stays inside the free allowance**, so a
deployment without a credit card cannot finish that step. R2 is now one of three
interchangeable backends, and the default is Supabase Storage, which never asks
for a card on the Free plan.

## What runs today

```
ARTIFACT_STORAGE_PROVIDER=auto   # auto | supabase | r2 | inline
        │
        ├─ SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL  → supabase  ✅ no card
        ├─ R2_ACCOUNT_ID + R2_BUCKET + keys                       → r2        💳 card required
        └─ nothing configured                                     → inline    (payload stays in Postgres)
```

| Code | Role |
| --- | --- |
| `lib/v34/supabase-storage.ts` | Supabase Storage REST calls: private upload, signed URL, delete |
| `lib/v34/artifact-storage.ts` | Provider resolution + `storeArtifact()` / `createArtifactSignedUrl()` facade |
| `lib/v34/r2-storage.ts` | Unchanged R2 SigV4 implementation (still selectable) |
| `supabase/migrations/20261117001400_v34_supabase_artifact_storage.sql` | Creates the private bucket and widens `storage_provider` |
| `scripts/provision-supabase-storage-v34.mjs` | Idempotent bucket provisioning via the Storage API |

Both storage paths return the same metadata: `provider`, `bucket`, `key`,
`checksumSha256`, `byteSize`, `signedUrl`, `signedUrlExpiresAt`. Objects live in
a **private** bucket and are downloaded through short-lived signed URLs
(15 minutes by default, 7 days maximum). No bucket is ever made public.

## Setup (5 minutes, no billing info)

1. **Get the secret key.** Supabase dashboard → *Project Settings → API Keys* →
   `service_role` (or a new secret key, `sb_secret_…`). Never expose it to the
   browser; it is a runtime-only Worker secret.
2. **Add the values** to `.env.local` (local) or the Worker secrets (production):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co   # already set
   SUPABASE_SERVICE_ROLE_KEY=<service-role-or-secret-key>
   SUPABASE_STORAGE_BUCKET=researchwithme-artifacts     # optional, this is the default
   ARTIFACT_STORAGE_PROVIDER=auto                       # optional, auto is the default
   ```

3. **Create the bucket** — pick one:

   ```bash
   # A. through the migration (also widens the storage_provider CHECK constraints)
   supabase db push --linked

   # B. through the provisioning script (idempotent, secret-safe)
   npm run storage:provision:supabase            # dry run: prints the plan
   npm run storage:provision:supabase -- --apply # create/update the bucket
   npm run storage:check:supabase                # verify it exists
   ```

4. **Set the Worker secret and deploy.**

   ```bash
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npm run env:check:v34     # expect subsystems.artifactStorage = LIVE_SUPABASE
   npm run deploy
   ```

5. **Verify.** Generate an export from `/library`, then:

   ```sql
   select storage_provider, storage_bucket, storage_key, signed_url_expires_at
     from public.v34_scholarly_exports
    order by created_at desc limit 5;
   ```

   `storage_provider` should read `supabase`, and the download route returns an
   `X-Signed-Download-Url` header pointing at
   `https://<ref>.supabase.co/storage/v1/object/sign/...`.

## Free-plan limits and why they are enough

| Supabase Free plan | Value | Why it is fine here |
| --- | --- | --- |
| Storage | 1 GB | exports are a few KB; render manifests are JSON manifests, not video |
| Egress | 5 GB / month | downloads are one-at-a-time, authenticated, and short-lived |
| Max object size | 50 MB (set by this repo) | guards against a runaway render upload |
| Payment method | **not required** | the whole point of this change |

If render *videos* ever need hosting, keep them in Supabase Storage at object
level and stream through signed URLs, or revisit R2/Backblaze once a card is
available — the facade means only an env change is required.

## Switching backends later

- `ARTIFACT_STORAGE_PROVIDER=supabase` — always Supabase; deploy fails loudly in
  the cutover audit (`MISCONFIGURED`) if the key is missing.
- `ARTIFACT_STORAGE_PROVIDER=r2` — always R2; needs the four `R2_*` values.
- `ARTIFACT_STORAGE_PROVIDER=inline` — no object storage; payloads stay in the
  database column (fine for text exports, not for anything large).

Existing rows keep the provider they were written with, so a switch is
non-destructive: old `r2` rows keep generating R2 URLs while they are still
reachable, new rows use the new backend. If a deployment must fully leave R2,
re-generate those exports (they are deterministic from the source record) so the
payload is stored again.

## Related

- ADR-033 (`docs/adr/ADR-033-supabase-sql-over-prisma.md`) — why Supabase is the
  system of record.
- `docs/deployment.md` §6.5 — Worker runtime secrets.
