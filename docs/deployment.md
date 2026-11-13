# Deployment pipeline: GitHub → Cloudflare → Supabase

Everything needed to take a commit on GitHub and serve it at `https://researchwith.me`, from a
Workers runtime, with the editorial CMS in Supabase — plus every credential involved, where it comes
from, where it lives, and every webhook along the way.

This document is the long form. The short form is the *Deploy (Cloudflare Workers)* section of the
[README](../README.md).

- [0. What is live today](#0-what-is-live-today)
- [1. Architecture](#1-architecture)
- [2. Workers vs Pages](#2-workers-vs-pages)
- [3. Environments and where values live](#3-environments-and-where-values-live)
- [4. Complete credential inventory](#4-complete-credential-inventory)
- [5. Supabase setup, step by step](#5-supabase-setup-step-by-step)
- [6. Cloudflare setup, step by step](#6-cloudflare-setup-step-by-step)
- [7. Workers Builds (Cloudflare-native CI)](#7-workers-builds-cloudflare-native-ci)
- [8. GitHub Actions CI/CD](#8-github-actions-cicd)
- [9. Webhooks, step by step](#9-webhooks-step-by-step)
- [10. What happens on each event](#10-what-happens-on-each-event)
- [11. Verification and smoke tests](#11-verification-and-smoke-tests)
- [12. Rollback and recovery](#12-rollback-and-recovery)
- [13. Troubleshooting](#13-troubleshooting)
- [14. Plan limits and budget](#14-plan-limits-and-budget)
- [15. Choosing a single deployer](#15-choosing-a-single-deployer)
- [16. Disaster recovery: rebuilding from zero](#16-disaster-recovery-rebuilding-from-zero)
- [Appendix A. Local development](#appendix-a-local-development)
- [Appendix B. Command cheat sheet](#appendix-b-command-cheat-sheet)

---

## 0. What is live today

| Piece | State | Evidence |
| --- | --- | --- |
| Cloudflare Worker `researchwithme` | Deployed | production build `d313ff1a…`, version `144c6300…` |
| Custom domains | `researchwith.me` + `www.researchwith.me`, declared as `custom_domain` routes in `wrangler.jsonc` | last production deploy accepted them; site serves 200 |
| KV cache | `researchwithme-opennext-cache` = `8d2dc8f0b1bb4839962ae63df8296b31`, bound twice (`NEXT_INC_CACHE_KV`, `NEXT_TAG_CACHE_KV`) | `wrangler deploy --dry-run` resolves both |
| Worker Previews | Working | branch build `90662e61…` produced a preview URL |
| Workers Builds (dashboard CI) | Connected; build `npx @opennextjs/cloudflare build`, production deploy `npx wrangler deploy`, preview deploy `npx wrangler preview`; `scripts/check-production-env.mjs` runs first on either build command (`npm run build` or `npx @opennextjs/cloudflare build`) | check run `Workers Builds: researchwithme` passes |
| GitHub Actions `Quality` | On `main` | `.github/workflows/quality.yml` |
| GitHub Actions `Deploy` | **Removed** from `.github/workflows/` in `85465ce` (historical copy at `.agents/workflows/deploy.yml`); Cloudflare Workers Builds deploys | `scripts/build-next-or-worker.mjs` runs `scripts/check-production-env.mjs` first on the Workers CI path |
| Supabase | Project linked; eight migrations in `supabase/migrations/` | `docs/supabase-cms.md` |
| Revalidate webhook endpoint | Exists at `/api/revalidate`, optional workspace webhook to configure | `app/api/revalidate/route.ts` |

Two facts worth knowing before you change anything:

1. **`NEXT_PUBLIC_*` values are compiled into the bundle.** They are build inputs, not runtime
   configuration. Changing one means a rebuild and a redeploy; setting the same name as a Worker
   runtime variable does nothing.
2. **A Worker can only exist once per account/name pair, and a hostname can only belong to one
   thing.** Previews are branches of the deployed Worker; a `custom_domain` route claims the DNS
   record. Both produce distinctive errors when the precondition is missing (§13).

---

## 1. Architecture

```
                    ┌──────────────────────────────────────────────┐
  git push / PR ───▶│ GitHub: myself-aas/ResearchWithME            │
                    │                                              │
                    │  Actions: Quality  (lint, types, tests,      │
                    │                     build)  → check suite    │
                    │  Actions: Deploy   (preview + production)    │
                    └───────┬───────────────────────────┬──────────┘
                            │ GitHub App webhooks       │ workflow_run
                            ▼                           ▼
                ┌───────────────────────┐    ┌────────────────────────────┐
                │ Workers Builds (CF)   │    │ GitHub Actions deploy job  │
                │ build → wrangler      │    │ build → wrangler deploy    │
                └───────────┬───────────┘    └─────────────┬──────────────┘
                            │  same target: the Worker     │
                            ▼                              ▼
                ┌──────────────────────────────────────────────────────────┐
                │ Cloudflare Workers  ·  researchwithme                    │
                │  Next.js 15 + @opennextjs/cloudflare 1.20.14             │
                │  ASSETS (static) · NEXT_INC_CACHE_KV · NEXT_TAG_CACHE_KV │
                │  WORKER_SELF_REFERENCE (queue re-render)                 │
                │  routes: researchwith.me, www.researchwith.me            │
                └───────┬─────────────────────────────┬────────────────────┘
                        │ SQL over HTTPS (anon key)   │ POST /api/revalidate
                        ▼                             │  x-revalidate-secret
        ┌──────────────────────────────────┐          │
        │ Supabase  bxyjjbclaklzjxeumeat   │──────────┘  (database webhook)
        │  Postgres + RLS                  │
        │  Auth (email+password, Google;   │
        │   GitHub/ORCID as identity links)│
        │  Storage: blog-images (5 MB)     │
        │  Realtime: posts, comments       │
        └──────────────────────────────────┘
                        ▲
                        │ browser session cookie (PKCE), /auth/callback
                        │
                   reader / editor
```

### Runtime responsibilities

| Component | Owns | Does not own |
| --- | --- | --- |
| GitHub Actions `Quality` | lint, `tsc`, the Vitest suite, Impeccable detector, `next build` | deployments |
| Cloudflare Workers Builds | build + deploy on the dashboard path, previews per branch, check runs | tests |
| GitHub Actions `Deploy` (PR #5, removed in `85465ce`) | historical: production deploy after `Quality`, PR preview version | tests |
| Worker | SSR, route handlers, middleware, image optimizer, cache | persistence |
| Supabase | content, comments, auth, image storage, realtime fan-out | HTML |
| KV | OpenNext incremental cache + tag cache | anything that must be immediately consistent |

### Bindings declared in `wrangler.jsonc`

| Binding | Type | Value | Used for |
| --- | --- | --- | --- |
| `ASSETS` | Assets | `.open-next/assets` | static files, ISR fallbacks |
| `NEXT_INC_CACHE_KV` | KV | `8d2dc8f0b1bb4839962ae63df8296b31` | Next incremental cache |
| `NEXT_TAG_CACHE_KV` | KV | `8d2dc8f0b1bb4839962ae63df8296b31` | `revalidateTag` |
| `WORKER_SELF_REFERENCE` | Service | `researchwithme` | OpenNext queue → re-render |
| `NEXT_INC_CACHE_KV` (previews) | KV | same namespace | preview ISR |
| `NEXT_TAG_CACHE_KV` (previews) | KV | same namespace | preview tags |

Previews reuse the production namespace on purpose: OpenNext prefixes every key with the build id
(`incremental-cache/<buildId>/<hash>.cache`, `<buildId>/<tag>`), so preview and production entries
can never collide. They do share the free plan's 1,000 KV writes a day. To separate them, create a
second namespace (§6.6).

---

## 2. Workers vs Pages

This app **cannot** run as a static Cloudflare Pages export. It has middleware, route handlers,
`/auth/callback`, and an on-demand image optimizer, so it needs a server runtime. The supported path
for Next.js 15 on Cloudflare is a Worker through `@opennextjs/cloudflare` — which is what
`wrangler.jsonc` configures. `@cloudflare/next-on-pages` is deprecated; a Pages project building this
repository will keep failing.

A leftover Pages project matters for two practical reasons:

1. **A failing `Cloudflare Pages` check** appears on commits if the project is still connected to the
   repository.
2. **A hostname conflict**: if the Pages project has `researchwith.me` as a custom domain, the
   Worker's `custom_domain` route cannot claim it and `wrangler deploy` fails.

### 2.1 Check for a Pages project

```bash
npx wrangler pages project list
```

Dashboard equivalent: **Workers & Pages** → look for an entry of type *Pages* next to the Worker.

### 2.2 Free the hostname

1. **Workers & Pages** → *(the Pages project)* → **Custom domains** → remove `researchwith.me` and
   `www.researchwith.me`.
2. Wait for the DNS record to disappear: **DNS** → `researchwith.me` → no `CNAME …pages.dev` or
   `AAAA 100::` left behind by Pages.
3. Redeploy the Worker (Workers Builds → *Retry deployment*, or `npx wrangler deploy`).

### 2.3 Retire the project

```bash
# keep the project but stop the failing check
#   Workers & Pages → <project> → Settings → Builds → disconnect the Git repository
# or delete it outright (irreversible)
npx wrangler pages project delete <project-name>
```

Deleting the Pages project does not affect the Worker or its domains.

---

## 3. Environments and where values live

Three environments, three sets of values, one repository.

| Variable | Local (`npm run dev`) | PR preview | Production |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | production origin (canonical links must not point at a preview host) | `https://researchwith.me` |
| `NEXT_PUBLIC_SUPABASE_URL` | project URL | project URL | project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key | publishable key | publishable key |
| `REVALIDATE_SECRET` | any 32-byte hex | Worker secret | Worker secret |
| `GEMINI_API_KEY` | optional | Worker secret | Worker secret |
| `GEMINI_MODEL` | optional (`gemini-3.8-flash` default) | Worker var | Worker var |
| `HF_TOKEN`, `HF_SPACE_NAME` | optional | Worker secret | Worker secret |

### 3.1 Build-time vs runtime — the distinction that breaks deploys

| Kind | Examples | Where it must be set | Why |
| --- | --- | --- | --- |
| **Build-time / inlined** | every `NEXT_PUBLIC_*` | shell running `next build`, or the Workers Builds *build* variables, or GitHub Actions job `env` | Next.js substitutes the literal string into the client and server bundles |
| **Runtime var (not secret)** | `RESEND_TPL_*` (one per email scenario) | Worker variables in the dashboard, or set from `npm run email:template:sync` | read at request time; not confidential. Senders come from `lib/email/scenarios.ts`, not from env. See `docs/email-scenarios.md` |
| **Runtime secret** | `REVALIDATE_SECRET`, `GEMINI_API_KEY`, `HF_TOKEN`, `RESEND_API_KEY` | Worker secrets (`wrangler secret put` / dashboard *Settings → Variables and secrets*) | read at request time through `process.env` / `getCloudflareContext().env` |
| **Preview-only runtime** | the same secrets | `wrangler preview secret put`, or the preview *base config* | previews do not inherit the Worker's secrets |

Workers Builds therefore needs the `NEXT_PUBLIC_*` values as **build**
variables. The deploy guard (`npm run deploy-guard`) fails loudly when they are missing, because a
Worker built without them runs in unauthenticated local demo mode with a read-only filesystem.

---

## 4. Complete credential inventory

Nine values, three places to put them. None of these belong in a committed file — `.gitignore`
already excludes `.env*` except `.env.example`.

| # | Name | Secret? | Used by | Obtained from | Stored in |
| --- | --- | --- | --- | --- | --- |
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | no (public) | build, browser | Supabase → Project Settings → Data API | GitHub secret, `.env.local` |
| 2 | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no (public) | build, browser | Supabase → Project Settings → API Keys → *Publishable* | GitHub secret, `.env.local` |
| 3 | `NEXT_PUBLIC_SITE_URL` | no (public) | build | your own domain | GitHub secret, `.env.local` |
| 4 | `CLOUDFLARE_ACCOUNT_ID` | semi (identifier) | CI, wrangler | Cloudflare dashboard URL, or `npx wrangler whoami` | GitHub secret, Workers Builds env |
| 5 | `CLOUDFLARE_API_TOKEN` | **yes** | CI, wrangler | Cloudflare → My Profile → API Tokens | GitHub secret only |
| 6 | `REVALIDATE_SECRET` | **yes** | `/api/revalidate`, Supabase webhook | `openssl rand -hex 32` | Worker secret + Supabase webhook header |
| 7 | `GEMINI_API_KEY` | **yes** | `/api/research-assistant`, `/api/author-avatar` | Google AI Studio → API keys | Worker secret, `.env.local` |
| 8 | `GEMINI_MODEL` | no | same routes | model id you have access to | Worker var, `.env.local` |
| 9 | `HF_TOKEN`, `HF_SPACE_NAME` | token **yes**, space name no | `/api/generate` (video/cover generation) | Hugging Face → Settings → Access Tokens; the Space id (`owner/space`) | Worker secret / var |

Already present in the repository (confirm under **Settings → Secrets and variables → Actions**):
`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `HF_SPACE_NAME`,
`HF_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `REVALIDATE_SECRET`.

### 4.1 Where to put them, exactly

| Location | Path in the UI | Holds | Notes |
| --- | --- | --- | --- |
| GitHub repository secrets | Settings → Secrets and variables → **Actions** → *Secrets* | items 1–9 | masked in logs; available to every workflow |
| GitHub environment secrets | Settings → Environments → **production** → *Environment secrets* | optional, same names | only readable by jobs that declare `environment: production`; add required reviewers here for a manual gate |
| Cloudflare build variables | Workers & Pages → `researchwithme` → Settings → **Build** → *Variables and secrets* | `NEXT_PUBLIC_*` as plaintext, keys as secrets | consumed by Workers Builds only |
| Cloudflare Worker secrets | Workers & Pages → `researchwithme` → Settings → **Variables and secrets** (runtime) | `REVALIDATE_SECRET`, `GEMINI_API_KEY`, `HF_TOKEN` | available to the Worker at request time |
| Local machine | `.env.local` (git-ignored) | items 1–9 | copied from `.env.example` |

### 4.2 Supabase URL and publishable key

1. Supabase dashboard → your project → **Project Settings** → **Data API** → copy the *Project URL*
   (`https://<project-ref>.supabase.co`).
2. **Project Settings** → **API Keys** → copy the **Publishable key** (`sb_publishable_…`).
3. The legacy **anon** key still works — set it as `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead; the app
   reads either (`lib/supabase/config.ts`).

Both values are shipped to the browser by design; RLS is the security boundary. **Never** put the
`service_role` key anywhere in this repository.

### 4.3 Cloudflare account ID

```bash
npx wrangler whoami          # prints "Account ID" per account
```

Or read it from any dashboard URL: `dash.cloudflare.com/<account-id>/…`. For this deployment it is
`74d241df16b8aaa80914e3dbb6e16758`, and it is pinned in `wrangler.jsonc` as `account_id`.

### 4.4 Cloudflare API token

Dashboard → **My Profile** → **API Tokens** → **Create Token** → *Edit Cloudflare Workers* template,
then add DNS access (a custom domain needs a DNS record, not just a route).

| Scope | Permission | Needed for |
| --- | --- | --- |
| Account | Workers Scripts → **Edit** | `wrangler deploy`, versions, previews |
| Account | Workers KV Storage → **Edit** | cache namespace reads/writes at deploy time |
| Account | Account Settings → **Read** | resolving the account |
| Zone (`researchwith.me`) | Workers Routes → **Edit** | custom-domain routes |
| Zone (`researchwith.me`) | DNS → **Edit** | the `AAAA 100::` record behind a custom domain |
| Zone (`researchwith.me`) | Zone → **Read** | route/zone lookups |
| Account | Workers Tail → **Read** | optional, `wrangler tail` |

Verify before pasting it into GitHub:

```bash
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify | jq '.result.status'
# "active"
```

Store it as `CLOUDFLARE_API_TOKEN`. Rotate by creating a new token, updating the secret, then
deleting the old one — the Worker keeps running on its current deployment either way.

### 4.5 Revalidation secret

```bash
openssl rand -hex 32
```

Put the same value in two places: as the Worker secret `REVALIDATE_SECRET`
(`npx wrangler secret put REVALIDATE_SECRET`) and in the Supabase webhook's
`x-revalidate-secret` header (§9.3). The route compares SHA-256 digests with `timingSafeEqual`, so a
wrong-length guess leaks nothing. `MY_SECRET_TOKEN` is accepted as a fallback name for compatibility.
Rotate by setting the new Worker secret first, then editing the webhook — during the gap the webhook
returns `401` and only the webhook's cache eviction is affected.

### 4.6 Gemini and Hugging Face

- `GEMINI_API_KEY`: Google AI Studio → **Get API key** → create in the Cloud project you want billed.
  Used by `/api/research-assistant` and `/api/author-avatar`; absent, those routes degrade instead of
  failing the build.
- `GEMINI_MODEL`: optional; defaults to `gemini-3.8-flash`. Set it to a model your key can call.
- `HF_TOKEN` + `HF_SPACE_NAME`: Hugging Face → Settings → Access Tokens (fine-grained, *inference*
  scope is enough) and the Space identifier `owner/space-name` used by `/api/generate`.

These are runtime reads, so they belong to the Worker, not the build. Set all of them in one go:

```bash
# .dev.vars is git-ignored; one KEY=VALUE per line
npx wrangler secret bulk .dev.vars
```

---

## 5. Supabase setup, step by step

The data model, RLS policies, and the reasoning behind them are documented in
[`docs/supabase-cms.md`](./supabase-cms.md). This section is only the deployment-relevant path.

### 5.1 Create the project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** → pick the organisation,
   a region close to your readers (the Worker runs at the edge, Postgres does not), and a database
   password you store in a password manager.
2. Note the **project ref** — the `<ref>` in `https://<ref>.supabase.co`. This deployment uses
   `bxyjjbclaklzjxeumeat`.
3. Copy the Project URL and Publishable key into `.env.local` (§4.2).

### 5.2 Apply the migrations

```bash
supabase login
supabase link --project-ref <ref>
supabase db push           # applies supabase/migrations/*.sql in order
supabase migration list    # local vs remote parity check
```

If the CLI is unavailable, paste each file in `supabase/migrations/` into the SQL editor, in filename
order. Four migrations exist:

| File | Creates |
| --- | --- |
| `20261025000100_cms_schema.sql` | `posts`, `comments`, triggers, RLS, realtime publication |
| `20261025000200_cms_storage.sql` | `blog-images` bucket + storage policies |
| `20261025000300_cms_storage.sql` | storage follow-up (idempotent) |
| `20261028000100_editor_allowlist.sql` | `public.editors` + `public.is_editor()`, studio write policies |
| `20261108000100_consolidate_editor_allowlist.sql` | folds `editor_memberships` into `public.editors` |
| `20261108000200_post_artifacts.sql` | artifact columns on `posts` for the reproducible-metadata fields |
| `20261108000300_author_applications.sql` | `public.author_applications` + `apply_as_author()` / `review_author_application()` |
| `20261108000400_author_profiles.sql` | `public.profiles` — the author directory, replacing the hardcoded `AUTHORS` record |

The GitHub Supabase integration also runs a *Supabase Preview* check on pull requests. It fails with
`Remote migration versions not found in local migrations directory` when the remote history contains
versions that are not in `supabase/migrations/` — reconcile with
`supabase migration list --linked` and `supabase migration repair --status reverted <version>` rather
than deleting local files.

### 5.3 Grant studio access

An account alone grants nothing. After the editor signs in once:

```sql
insert into public.editors (user_id, note)
select id, 'editor' from auth.users where email = 'editor@example.org'
on conflict (user_id) do nothing;
```

### 5.4 Authentication

**Authentication → Sign In / Providers**: enable Email (password only — magic links are no longer
used) and Google. These are the two ways a reader signs in.

GitHub and the custom ORCID provider (identifier `orcid`, called as `custom:orcid`, issuer
`https://orcid.org`, scope `openid`) are configured as **identity links**, not sign-in methods: a
signed-in reader attaches one from `/dashboard/access` to apply as a writer. They must still be
enabled as providers with the same callback URL, but they do not need to appear in the sign-in UI.

Every provider's OAuth callback is the one Supabase prints — `https://<ref>.supabase.co/auth/v1/callback`
— not the site origin. The *site* origin is configured separately:

**Authentication → URL Configuration**

| Field | Value |
| --- | --- |
| Site URL | `https://researchwith.me` |
| Redirect URLs | `https://researchwith.me/auth/callback`, `https://www.researchwith.me/auth/callback`, `http://localhost:3000/auth/callback` |

A missing entry here produces `redirect_to is not allowed` from the provider or a silent bounce back
to `/login?error_description=…`.

### 5.5 Verify the CMS end to end

Sign in, save a draft, publish, confirm it appears on `/` and `/post/<slug>`, post and delete a
comment, revert to draft, confirm it disappears. If any step 403s while the SQL editor works, the
editor allowlist (§5.3) is the usual cause — the app gate and RLS both fail closed.

---

## 6. Cloudflare setup, step by step

### 6.1 Account and CLI

```bash
npx wrangler login            # browser flow, or export CLOUDFLARE_API_TOKEN
npx wrangler whoami           # confirms account + token scopes
```

### 6.2 KV namespace

```bash
npx wrangler kv namespace list
# researchwithme-opennext-cache → 8d2dc8f0b1bb4839962ae63df8296b31  (existing)
# create another if you want previews isolated:
npx wrangler kv namespace create researchwithme-opennext-cache-preview
```

The returned id goes into **both** `kv_namespaces` entries in `wrangler.jsonc` (the two OpenNext
caches use disjoint key prefixes, so one namespace is enough).

### 6.3 `wrangler.jsonc`, line by line

| Key | Meaning in this project |
| --- | --- |
| `main` | `.open-next/worker.js` — the OpenNext bundle entry |
| `name` | `researchwithme`; must match the Worker, and `WORKER_SELF_REFERENCE.service` |
| `account_id` | `74d241df16b8aaa80914e3dbb6e16758`; makes local and CI deploys hit the same account |
| `compatibility_date` | `2026-10-23` (run `npx wrangler types` after changing it) |
| `compatibility_flags` | `nodejs_compat` (Node built-ins), `global_fetch_strictly_public` (subrequest policy) |
| `assets` | serves `.open-next/assets` under the `ASSETS` binding |
| `routes` | `researchwith.me` and `www.researchwith.me` as `custom_domain: true` |
| `services` | self-reference used by OpenNext's cache queue |
| `kv_namespaces` | the two cache bindings |
| `previews.kv_namespaces` | the same two bindings again, because previews inherit nothing |
| `observability` | Workers Logs on |

`previews` deliberately contains **no** `routes`, **no** cron `triggers`, and **no** queue consumers:
routes and triggers target production only, and queue consumers cannot be previewed.

### 6.4 First deploy and the domain

```bash
npm run deploy-guard     # refuses without a working CMS build environment
npm run build:worker     # next build + OpenNext bundle
npx wrangler deploy      # creates the Worker if absent, applies routes, prints both hosts
```

`custom_domain: true` makes Wrangler create the proxied `AAAA 100::` records and the edge
certificate. If the hostname is still attached to a Pages project, this is where you see a conflict —
fix it in the Pages project (§2.2), not in `wrangler.jsonc`.

Verify DNS afterwards: **DNS → researchwith.me** should show `AAAA 100::` for `@` and `www`, both
proxied (orange cloud). SSL/TLS mode should be *Full (strict)* with *Always Use HTTPS* on; the
certificate is Cloudflare's Universal SSL and needs no action.

### 6.5 Runtime secrets

```bash
npx wrangler secret list
npx wrangler secret put REVALIDATE_SECRET
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put HF_TOKEN
# GEMINI_MODEL / HF_SPACE_NAME are plaintext vars — either
npx wrangler secret put HF_SPACE_NAME      # fine as a secret
# or add them as Worker variables in the dashboard
```

Secrets survive a deploy; they are per-Worker, not per-version.

### 6.6 Previews

```bash
npx wrangler preview --name feature-x      # name defaults to the current git branch
npx wrangler preview secret put REVALIDATE_SECRET --name feature-x
npx wrangler preview delete feature-x
```

Worker Previews are an open beta: a preview is a *branch of the deployed Worker*, so one production
deployment has to exist first. They inherit no bindings and no secrets — hence the `previews` block
and the `preview secret` commands. Service bindings are unsupported in previews, so a preview renders
and caches but cannot re-render itself through OpenNext's queue.

---

## 7. Workers Builds (Cloudflare-native CI)

This is the path that is live today.

### 7.1 Connect the repository

Once per project: **Workers & Pages** → `researchwithme` → **Settings** → **Build** → *Connect* →
authorize the **Cloudflare Workers and Pages** GitHub App for `myself-aas/ResearchWithME`. The app
subscribes to `push` and `pull_request` and reports back as a check run named
`Workers Builds: researchwithme`.

### 7.2 Settings that matter

| Setting | Value | Why |
| --- | --- | --- |
| Build command | `npx @opennextjs/cloudflare build` (or `npm run build`, `npm run build:worker`) | produces `.open-next/worker.js` + assets. `scripts/build-next-or-worker.mjs` runs `scripts/check-production-env.mjs` first on `WORKERS_CI`, for both `npm run build` and `npx @opennextjs/cloudflare build` (its inner `npm run build`) |
| Deploy command — production | `npx wrangler deploy` | a *production* deployment; previews branch from it |
| Deploy command — preview | `npx wrangler preview` | a branch of the Worker with its own URL |
| Production branch | `main` | everything else is a preview |
| Root directory | `/` | repository root |
| Build variables | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` | inlined at build time |
| Build secrets | `HF_TOKEN`, `HF_SPACE_NAME`, `GEMINI_API_KEY`, `GEMINI_MODEL` | same, for values that must be masked |

Leave the deploy commands at `wrangler preview` for production and the Worker never gains a
deployment; every branch then fails with *This Worker does not exist on your account* (§13).

### 7.3 What a build does

1. Clone the branch at the pushed SHA.
2. Install dependencies with `npm ci`. `package-lock.json` is the repository's only
   lockfile; the dashboard's default npm install reads it.
3. Build command → `.open-next/`.
4. Deploy command → `wrangler deploy` (production branch) or `wrangler preview` (anything else).
5. Report a check run with a link to the build, and for previews, to the preview URL.

Production requires the Worker, the KV namespace, and the account id — all of which are in
`wrangler.jsonc`, so no extra credentials are needed inside the dashboard build beyond the variables
above. (The dashboard is already authenticated as you.)

---

## 8. GitHub Actions CI/CD

Two workflows, deliberately separated: **Quality** judges the code, **Deploy** ships what Quality
passed.

### 8.1 `Quality` — on `main` today

`.github/workflows/quality.yml`, triggered on pushes to `main` and `arena/**` and on every pull
request:

| Step | Command |
| --- | --- |
| checkout | `actions/checkout@v4` |
| Node | `actions/setup-node@v4`, Node 22, npm cache |
| install | `npm ci` |
| lint | `npm run lint` |
| typecheck | `npm run typecheck` |
| tests | `npm test` (Vitest) |
| design detector | `npx impeccable detect app components` |
| build | `npm run build`, with `HF_SPACE_NAME` and `HF_TOKEN` from secrets |

It does not deploy, does not need Cloudflare credentials, and takes about two minutes. Do not edit it
to add deploys — that is what `deploy.yml` is for.

### 8.2 `Deploy` — designed on PR #5

> **Historical:** `deploy.yml` was removed from `.github/workflows/` in `85465ce` (copy at `.agents/workflows/deploy.yml`). Cloudflare Workers Builds is the deploy path; this section is kept for reference.

`.github/workflows/deploy.yml`:
`workflow_run` on **Quality → completed → main**, plus `pull_request` for previews and
`workflow_dispatch` for a manual production deploy.

| Job | Trigger | Does |
| --- | --- | --- |
| `preview` | `pull_request` (same-repo branches) | install → `deploy-guard` → `build:worker` → `wrangler preview --name pr-<n> --json` → comments the preview URL on the PR |
| `deploy` | `workflow_run` success on `main`, or manual dispatch | install → `deploy-guard` → `build:worker` → `wrangler deploy` → smoke test `/` and `/sitemap.xml` for 200 |

Details that are easy to get wrong:

- `workflow_run` **runs in the context of the default branch**, so the job checks out
  `github.event.workflow_run.head_sha` explicitly. Without that it deploys `main`'s tip *or* an older
  default-branch state, not the commit Quality approved.
- `workflow_run` only fires if the file exists **on the default branch**. A workflow that has only
  ever lived on a feature branch never triggers; `workflow_dispatch` is unavailable for the same
  reason.
- `concurrency: deploy-production` with `cancel-in-progress: false` serialises deploys instead of
  cancelling a half-finished upload.
- The preview job masks a missing token with a notice rather than a red check, so an unconfigured
  repository still validates that the branch builds.
- PR #5's workflow ran `npm run videos:manifest` and smoke-tested `/videos/hero.mp4`. Neither the
  script nor the film exists on `main`, so both steps were dropped from the merged workflow rather
  than shipped in a form that fails every deploy. If the hero film lands later, add them back.

### 8.3 Env wiring in the workflow

```yaml
env:
  NEXT_PUBLIC_SITE_URL: ${{ vars.NEXT_PUBLIC_SITE_URL || 'https://researchwith.me' }}
  NEXT_PUBLIC_SUPABASE_URL: ${{ vars.NEXT_PUBLIC_SUPABASE_URL || secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
  HF_SPACE_NAME: ${{ secrets.HF_SPACE_NAME }}
  HF_TOKEN: ${{ secrets.HF_TOKEN }}
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

`vars.X || secrets.X` lets you choose per value: a **variable** is readable and shows in logs (fine for
`NEXT_PUBLIC_*`, which are compiled into a public bundle anyway), a **secret** is masked (required for
tokens). Anything you set as a secret works everywhere; the fallback just removes the need to duplicate.

### 8.4 Adding the values (CLI and UI)

```bash
# secrets (masked)
gh secret set CLOUDFLARE_API_TOKEN      # paste when prompted
gh secret set CLOUDFLARE_ACCOUNT_ID --body 74d241df16b8aaa80914e3dbb6e16758
gh secret set REVALIDATE_SECRET

# variables (readable) — gh >= 2.32
gh variable set NEXT_PUBLIC_SITE_URL --body https://researchwith.me
gh variable set NEXT_PUBLIC_SUPABASE_URL --body https://<ref>.supabase.co
gh variable set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --body sb_publishable_…
```

UI equivalent: **Settings → Secrets and variables → Actions**, one tab each. Environment-scoped
values live under **Settings → Environments → production**; a job that declares
`environment: production` reads them and nothing else does.

### 8.5 Run it

```bash
gh workflow list
# gh workflow run Deploy        # historical: deploy.yml removed in 85465ce; use Workers Builds or `npm run deploy`
gh run watch $(gh run list --workflow=Quality --limit=1 --json databaseId --jq '.[0].databaseId')
gh pr checks <number>
```

---

## 9. Webhooks, step by step

Four connections carry this pipeline. Three are configured once; one is optional but recommended.

### 9.1 GitHub → Cloudflare (Workers Builds GitHub App)

This is the webhook that starts a Cloudflare build. It is not something you add by hand on GitHub —
Cloudflare installs its GitHub App and receives `push` and `pull_request` events.

1. **Workers & Pages** → `researchwithme` → **Settings** → **Build** → **Connect** (or *Manage* if a
   repository is already attached).
2. Choose **GitHub** → **Install & Authorize** → select `myself-aas/ResearchWithME`.
   Repository access can be *All repositories* or *Only select repositories*.
3. Pick the repository, the production branch (`main`), and the build/deploy commands (§7.2).
4. Save. Cloudflare immediately runs one build for the default branch.

Verify the connection:

- GitHub → **Settings → GitHub Apps** (repository level) or
  <https://github.com/settings/installations> shows the Cloudflare app with this repository.
- A push produces a check run:

```bash
gh api repos/myself-aas/ResearchWithME/commits/$(git rev-parse HEAD)/check-runs \
  --jq '.check_runs[] | {name, conclusion, details_url}'
# { "name": "Workers Builds: researchwithme", "conclusion": "success", … }
```

- `details_url` distinguishes the two kinds: `…/production/builds/<id>` (production) vs
  `…/production/previews/<branch>/builds/<id>` (a preview).

To disconnect: **Settings → Build → Disconnect**, or uninstall the app at
<https://github.com/settings/installations>. Removing the GitHub App stops builds and removes the
check run; it never deletes the deployed Worker.

Permissions the app requests are read-only on contents plus write on checks — it does not need access
to Actions secrets.

### 9.2 GitHub → GitHub Actions (`workflow_run`)

> **Historical:** `deploy.yml` was removed in `85465ce`; Workers Builds is the deploy path.

Not a webhook you configure — an event relationship between two workflows.

```yaml
on:
  workflow_run:
    workflows: ['Quality']
    types: [completed]
    branches: [main]
```

Rules and gotchas:

| Rule | Consequence |
| --- | --- |
| The workflow file must exist on the default branch | `deploy.yml` is on `main`, so previews and `workflow_dispatch` are active |
| The run is evaluated in default-branch context | check out `${{ github.event.workflow_run.head_sha }}` to deploy exactly what passed |
| `types: [completed]` includes failures | gate with `if: github.event.workflow_run.conclusion == 'success'` |
| Secrets are available | it runs on your repository's own token, not a fork's |
| A skipped Quality run still emits `completed` | treat `conclusion == 'success'` as the only green light |

Test it without a code change:

```bash
git commit --allow-empty -m "ci: verify deploy trigger" && git push origin main
gh run list --workflow=Deploy --limit 3
```

### 9.3 Supabase → Worker (`/api/revalidate`)

Optional but recommended: makes edits made **outside** the studio (SQL editor, table editor, another
service) evict the Worker's cached HTML. Studio writes already call `revalidatePath` directly.

1. Supabase dashboard → **Integrations** → **Webhooks** → **Create a new hook**.
2. Name: `revalidate-posts`. Table: `public.posts`. Events: `INSERT`, `UPDATE`, `DELETE`.
3. Type: **HTTP Request** → `POST` → URL `https://researchwith.me/api/revalidate`.
4. Method `POST`, headers:
   ```
   Content-Type: application/json
   x-revalidate-secret: <the REVALIDATE_SECRET value>
   ```
5. Save. Postgres creates a trigger over `pg_net`, so delivery is asynchronous and never blocks the
   write.

What it sends, and what the route does with it:

```jsonc
{ "type": "UPDATE", "table": "posts", "schema": "public",
  "record": { "slug": "inside-vllm-and-paged-attention", … }, "old_record": { … } }
```

| Response | Meaning |
| --- | --- |
| `200 {"revalidated":true,"paths":["/","/sitemap.xml","/post/<slug>"]}` | evicted |
| `401 {"error":"Invalid token."}` | header missing or mismatched |
| `429` | more than 60 calls a minute from one IP |
| `503 {"error":"Revalidation is not configured…"}` | `REVALIDATE_SECRET` is not set on the Worker |

Test without waiting for a database write:

```bash
curl -i -X POST https://researchwith.me/api/revalidate \
  -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -H "content-type: application/json" \
  -d '{"type":"UPDATE","table":"posts","record":{"slug":"inside-vllm-and-paged-attention"}}'
```

Delivery history lives in the database, not the dashboard:

```sql
select id, status_code, timed_out, error_msg, created
from net._http_response order by created desc limit 10;
```

The header is preferred over `?secret=` because query strings land in access logs. If you must keep
the secret out of the trigger definition entirely, create the webhook from SQL with `pg_net` reading
the value from Supabase Vault instead.

### 9.4 Supabase Auth → Worker (`/auth/callback`)

Every sign-in redirects to `https://researchwith.me/auth/callback?next=…`, which exchanges the PKCE
code server-side before middleware sees the request.

1. **Authentication → URL Configuration**: Site URL `https://researchwith.me`; Redirect URLs
   `https://researchwith.me/auth/callback`, `https://www.researchwith.me/auth/callback`,
   `http://localhost:3000/auth/callback`.
2. Per provider (Google/GitHub/ORCID), the provider's *own* callback is
   `https://<ref>.supabase.co/auth/v1/callback` — a very common mismatch.
3. Magic-link email template keeps `{{ .ConfirmationURL }}`; the app passes `redirect_to` through
   `next`.

A wrong allowlist entry shows up as `redirect_to is not allowed` from Supabase, or a sign-in that
lands on `/login` with `error_description` — never as a 500.

### 9.5 Optional: deploy notifications and required checks

- **Branch protection** for `main`: require `verify` (Quality) and `Workers Builds: researchwithme`
  (or `Deploy (production)` when Actions owns production) before merging. This is what turns the
  webhook fan-out into a gate rather than a report.
- **Slack/email on failure**: Settings → Notifications → *Actions* for workflow failures;
  Cloudflare → Notifications for Worker build failures.

---

## 10. What happens on each event

### Push to a feature branch

1. `Quality` runs (lint → typecheck → tests → detector → build). ~2 min.
2. Cloudflare's app receives the `push` and starts a build with the production-branch rules applied
   to a non-production branch → `npx wrangler preview`.
3. A preview URL appears: `<branch>-researchwithme.hazardnet.workers.dev`.
4. (Historical, `deploy.yml` removed in `85465ce`: its `preview` job also uploaded a version under the alias
   `pr-<n>` and commented the URL.)

### Pull request

1. `Quality` runs on the PR head.
2. Cloudflare builds a preview for the head branch (with `previews` bindings, no service bindings).
3. The PR shows three checks: `verify`, `Workers Builds: researchwithme`, plus `Supabase Preview`
   when the database integration is installed.

### Merge to `main`

1. `Quality` runs on `main`.
2. Cloudflare's production build runs `wrangler deploy` → new version → traffic moves immediately.
3. (Historical: with `deploy.yml` merged, a second `deploy` job ran after Quality and deployed again. The workflow was removed in `85465ce`, so Workers Builds is the only deployer.)
4. KV receives fresh entries under the new build id; old entries expire on their TTL.

### Manual deploy

```bash
npm run deploy-guard && npm run build:worker && npx wrangler deploy
# or: retry the build from Workers & Pages → researchwithme → Deployments (Workers Builds)
# or: npm run deploy   (predeploy runs the guard)
```

---

## 11. Verification and smoke tests

### 11.1 Local, before pushing

```bash
npm run quality            # lint, typecheck, tests, detector
npm run deploy-guard
npm run build:worker       # 299 assets, ~12.4 MiB raw / ~2.7 MiB gzip
npx wrangler deploy --dry-run   # config + bindings resolve, nothing uploaded
```

### 11.2 Post-deploy

```bash
curl -sI https://researchwith.me/ | head -12
curl -sI https://researchwith.me/sitemap.xml | head -5
curl -s https://researchwith.me/ | grep -o '<title>[^<]*</title>'
curl -s -o /dev/null -w '%{http_code}\n' https://www.researchwith.me/

npx wrangler deployments list --name researchwithme
npx wrangler versions list --name researchwithme
npx wrangler kv key list --namespace-id 8d2dc8f0b1bb4839962ae63df8296b31 --remote | head
```

Expected: `200` for both hosts, `server: cloudflare` and `cf-ray` headers, `<title>` from the built
bundle, a deployment whose id matches the latest build, and KV keys prefixed with the current build id
after the first request.

### 11.3 Deployment-scoped checks

```bash
gh run list --workflow=Quality --limit 5
gh pr checks <number>
gh api repos/myself-aas/ResearchWithME/commits/<sha>/check-runs --jq '.check_runs[] | "\(.name): \(.conclusion)"'
```

---

## 12. Rollback and recovery

| Goal | Do this |
| --- | --- |
| Undo the last production deploy | `npx wrangler rollback` (previous version) or `npx wrangler rollback <version-id>`; `npx wrangler versions list` shows ids |
| Ship the previous commit through CI | `git revert <sha> && git push` — Quality + Deploy redeploy it |
| Redeploy an exact version as production | `npx wrangler versions deploy <version-id>@100%` |
| Purge stale HTML | re-run the revalidate webhook, or wait: previews and production never share keys, and a rollback keeps its own build-id prefix |
| Detach a hostname fast | remove the `routes` entry and redeploy, or delete the custom domain in the dashboard (the Worker keeps running on `*.workers.dev`) |
| Worst case: Worker broken, need the old site | the previous version is still deployable by version id; nothing about a deploy deletes earlier versions |

KV is not a database: don't try to reconcile cache contents during an incident. Deploy the version
you trust; the cache repopulates on demand.

---

## 13. Troubleshooting

Real errors from this repository, in the order they tend to appear.

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Your Wrangler configuration is missing a 'previews' block` | preview deploy with no `previews` section | add `previews.kv_namespaces` (§6.3); previews inherit no bindings |
| `Preview creation failed: This Worker does not exist on your account` | no *production* deployment exists; previews branch from it | set the production deploy command to `npx wrangler deploy` and deploy once (§6.4) |
| Custom domain / hostname conflict on deploy | Pages project (or another Worker) still owns `researchwith.me` | remove the custom domain there (§2.2), redeploy |
| `deploy-guard` fails: *This build would ship without a working CMS* | `NEXT_PUBLIC_SUPABASE_*` missing or `NEXT_PUBLIC_SITE_URL` is localhost at build time | set build variables, rebuild; `ALLOW_DEMO_DEPLOY=1` only for a deliberate demo |
| CMS values set in the dashboard but the site is still in demo mode | they were added as Worker *runtime* variables, not build variables | add them to **Build → Variables** and redeploy |
| `/api/revalidate` returns `503` | `REVALIDATE_SECRET` not set on the Worker | `npx wrangler secret put REVALIDATE_SECRET` |
| `/api/revalidate` returns `401` | webhook header value ≠ Worker secret (or `?secret=` missing) | re-copy the header value; rotate both together |
| Sign-in bounces with `redirect_to is not allowed` | origin missing from Supabase redirect URLs | add `https://researchwith.me/auth/callback` |
| Studio 403s for a signed-in editor | account not in `public.editors` | insert the allowlist row (§5.3) |
| `npm ci` fails on a clean clone | `package-lock.json` out of sync with `package.json` | run `npm install --package-lock-only` and commit the lockfile |
| `build:worker` fails on Windows | OpenNext builds partly POSIX-only | use WSL or CI |
| Tailwind utilities missing after a build | stale `.next` | `npm run clean && npm run build:worker` |
| `Deploy` never triggers | Quality failed or was skipped, or the Cloudflare secrets are missing | check `conclusion == 'success'`; confirm `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` |
| Everything deploys twice | Workers Builds **and** Actions both own production | pick one (§15) |
| `Supabase Preview` red on a PR | remote migration history has versions missing locally | `supabase migration list --linked`, then `supabase migration repair` |
| Preview renders but stale content | previews have no service binding, so OpenNext's queue re-render can't run | expected; re-request the page |
| KV write quota exhausted (429s from the cache layer) | free plan allows 1,000 writes/day; previews share it | give previews their own namespace (§6.6), or reduce revalidation frequency |

---

## 14. Plan limits and budget

Current limits at the time of writing — check the vendor pages, they change.

| Service | Free-plan allowance | Where this project can hit it |
| --- | --- | --- |
| Workers | 100,000 requests/day, 10 ms CPU/request (paid: 30 s) | a static asset request also counts |
| Workers KV | 100,000 reads/day, 1,000 writes/day, 1 GB | ~33 cache entries per deploy; previews share the namespace |
| Cloudflare DNS/SSL | unlimited records, Universal SSL | none |
| Supabase | 500 MB database, 1 GB storage, 5 GB egress, 50k MAU, projects pause after ~1 week idle | image uploads, egress from `blog-images` |
| GitHub Actions | 2,000 minutes/month (private), unlimited (public) | Quality ~2 min, Deploy ~4 min |

`next/image` serves originals (no Images binding on the free plan), so image weight maps directly to
Worker egress when Supabase Storage is not used.

---

## 15. Choosing a single deployer

Both paths run `wrangler deploy` on `main`. Keep exactly one:

| | Workers Builds (dashboard) | GitHub Actions `deploy.yml` |
| --- | --- | --- |
| Trigger | push/PR webhooks from the Cloudflare GitHub App | `workflow_run` after Quality, plus manual |
| Runs tests first | no | yes (Quality gate) |
| Preview per PR | yes (`wrangler preview`) | yes (`wrangler preview --name pr-<n>`) |
| Secrets live in | Cloudflare dashboard | GitHub |
| Smoke test | no | yes |
| Package manager | npm | npm, matching Quality |

> **Historical:** the `deploy.yml` column above describes the removed workflow (`85465ce`); Workers Builds is the deploy path.

**Option A — Cloudflare owns production (current state).** Keep Workers Builds as is; merge
`deploy.yml` only in `workflow_dispatch` form, or drop it. Simplest, and the setup that is verified
working today.

**Option B — Actions owns production.** In Workers & Pages → Settings → Build, disable auto-build
(or disconnect the repository), and let `deploy.yml` own both previews and production. Then the
`previews` block still matters for any local `npx wrangler preview`.

Whichever you pick, never leave both enabled: the second deploy is not harmful, but it doubles the
build minutes, the KV write burst, and the chance that a rollback is immediately overwritten.

---

## 16. Disaster recovery: rebuilding from zero

New machine, new account, or a lost dashboard — the repository is the source of truth.

```bash
git clone https://github.com/myself-aas/ResearchWithME.git && cd ResearchWithME
npm ci
cp .env.example .env.local && $EDITOR .env.local        # §4.1
supabase link --project-ref <ref> && supabase db push   # §5.2
npx wrangler login
npx wrangler kv namespace list                          # reuse or create the namespace
$EDITOR wrangler.jsonc                                  # account_id, KV ids, routes
npm run deploy-guard && npm run build:worker && npx wrangler deploy
npx wrangler secret bulk .dev.vars                      # REVALIDATE_SECRET, GEMINI_API_KEY, HF_TOKEN
```

Then, in the dashboard: reconnect Workers Builds (§7.1), re-add the GitHub secrets (§8.4), re-create
the Supabase webhook (§9.3), and confirm the auth redirect URLs (§5.4).

Checklist to finish:

- [ ] `https://researchwith.me/` → 200, correct `<title>`
- [ ] `https://www.researchwith.me/` → 200
- [ ] `Workers Builds: researchwithme` green on `main`
- [ ] `Quality` green on `main`
- [ ] `/api/revalidate` returns 200 with the header, 401 without
- [ ] `/login` → provider → `/auth/callback` → `/dashboard` works and is gated
- [ ] publishing a post changes `/` without a redeploy
- [ ] `npx wrangler deployments list` shows the deployment you just made

---

## Appendix A. Local development

```bash
cp .env.example .env.local
npm ci
npm run dev            # next dev on 0.0.0.0:3000
npm run preview        # OpenNext build + workerd on :8787 — the closest thing to production
```

`.env.example` lists the nine values with no secrets. Local demo mode (no Supabase values) is a
review convenience: the studio is unauthenticated and writes to `data/cms-*.json`. Never deploy it.

Files that must stay out of git (already ignored): `.env*` except `.env.example`, `.dev.vars*`,
`.open-next/`, `.wrangler/`, `data/cms-posts.json`, `data/cms-comments.json`.

---

## Appendix B. Command cheat sheet

| Task | Command |
| --- | --- |
| Full quality gate | `npm run quality` |
| Production build only | `npm run build:worker` |
| Guard without building | `npm run deploy-guard` |
| Deploy from a checkout | `npm run deploy-guard && npm run build:worker && npx wrangler deploy` |
| Build + serve locally in workerd | `npm run preview` |
| Upload a version without promoting | `npm run upload` |
| Validate config offline | `npx wrangler deploy --dry-run` |
| List deployments / versions | `npx wrangler deployments list`, `npx wrangler versions list` |
| Roll back | `npx wrangler rollback [version-id]` |
| Tail production logs | `npx wrangler tail researchwithme` |
| Worker secrets | `npx wrangler secret list`, `npx wrangler secret put NAME` |
| Preview secrets | `npx wrangler preview secret put NAME --name <branch>` |
| KV keys | `npx wrangler kv key list --namespace-id 8d2dc8f0b1bb4839962ae63df8296b31 --remote` |
| Pages projects | `npx wrangler pages project list` |
| Regenerate binding types | `npm run cf-typegen` |
| Trigger a deploy manually | Retry the build in Workers Builds, or `npm run deploy` from a checkout |
| Watch the gate | `gh pr checks <n>`, `gh run list --workflow=Quality` |
</content>
