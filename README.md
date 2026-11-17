# ResearchWithMe

An open-access review platform: long-form article reviews, reproducible repository teardowns, and a citation-first reading experience. Built with Next.js App Router, React 19, and Tailwind CSS v4, with a Supabase-backed editorial studio and a local demo adapter.

- Interface language: English only (Bengali/Arabic i18n was removed in 2026-11).
- Identifiers: the platform issues no periodical identifier number, book identifier, or resolver prefix of its own; every review links out to its primary artifact (a resolver identifier, preprint, tagged release, etc.) rather than minting handles.
- Editor: Ashif Ahmed Shuvo is the sole editor-in-chief. Articles are published under CC BY 4.0.

The interface follows the design system recorded in [`DESIGN.md`](./DESIGN.md) and uses the [Impeccable](https://impeccable.style) workflow and detector. Product context lives in [`PRODUCT.md`](./PRODUCT.md); per-route briefs live in [`.impeccable/surfaces/`](./.impeccable/surfaces).

## Run it

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build && npm start
```

Node 20.9 or newer. `package-lock.json` is the only lockfile, and CI installs with `npm ci`. `next.config.ts` sets `output: 'standalone'`, so a production container can run `node .next/standalone/server.js`; `next start` is used for local verification.

## Routes

| Route | Mode | What it does |
| --- | --- | --- |
| `/` | Persuade | Searchable article feed, category browser, featured review, writer roster |
| `/post/[slug]` | Read | Server-rendered article with key takeaways, reviewed-artifact record, discussion, cite tool |
| `/authors`, `/author/[id]` | Operate / Read | Writer directory and profile with public ORCID/GitHub attribution and article archive |
| `/editorial-board` | Read | Editor-in-chief and editorial policy |
| `/assistant` | Operate | Catalog-grounded research assistant with inline citations |
| `/cite` | Operate | APA, MLA, Chicago, IEEE, BibTeX, RIS citation builder |
| `/bookmarks` | Operate | Reading list with Markdown export and clear confirmation |
| `/pricing` | Persuade | The two paid products and what stays free; checkout through the Lemon Squeezy overlay |
| `/dashboard/account` | Operate | Your plan, status, purchases, and anything still on sale |
| `/about` / `/contact` / `/privacy` | Read | Mission, contact channels, reader privacy policy |
| `/login` | Operate | Email / OAuth sign-in; demo-mode setup guide when Supabase is not configured |
| `/dashboard/access` | Operate | Connect an ORCID or GitHub identity and apply to write |
| `/write` | Operate | Autosaved draft editor, preview, and publish through the CMS store (editor access) |
| `/dashboard` | Operate | Studio landing: drafts, published articles, applications |
| `/dashboard/reading` | Operate | Reader dashboard: reading list, new in the archive, application state |
| `/dashboard/(studio)/desk` | Operate | Editor dashboard: queues, stalled drafts, publishing trend, coverage |
| `/dashboard/(studio)/writing` | Operate | Writer dashboard: own drafts, publishing trend, reader response |
| `/dashboard/(studio)/manage` | Operate | Search, filter, publish/revert, delete, live status |
| `/dashboard/(studio)/edit/[id]` | Operate | Edit a draft or published article |
| `/dashboard/(studio)/comments` | Operate | Comment moderation with realtime updates |

The `/write` body uses the open-source Plate editor. Its visual mode supports basic formatting, headings, lists, quotes, links and code. Switch to Markdown mode to edit images, tables and other advanced syntax. Existing drafts that cannot be safely round-tripped in visual mode open in Markdown mode without conversion. Autosave and publishing continue to use Markdown; the dashboard editor remains separate.

Retired routes (`/papers`, `/paper/[slug]`, `/editions`) return 404; their surface briefs are kept under `.impeccable/surfaces/` with `status: retired` for history but no code serves them.

Unknown routes and render failures have dedicated surfaces (`app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`). Data-loading states live inside the studio pages: a global `loading.tsx` boundary would start streaming before a missing article could return a real 404.

## API discovery

Agent authentication is published, not implied: [`/auth.md`](https://researchwith.me/auth.md) is the walkthrough, [`/.well-known/oauth-protected-resource`](https://researchwith.me/.well-known/oauth-protected-resource) is the RFC 9728 protected-resource document, and [`/.well-known/oauth-authorization-server`](https://researchwith.me/.well-known/oauth-authorization-server) (also served at [`/.well-known/openid-configuration`](https://researchwith.me/.well-known/openid-configuration)) relays Supabase's authorization-server metadata plus an Auth.md `agent_auth` block. The relay falls back to a captured copy of that document when the round-trip fails, and labels which it served. No ResearchWithMe API validates a bearer token, so the documents say so and advertise no scopes. See [`docs/oauth-discovery.md`](./docs/oauth-discovery.md).

In the browser, [`public/webmcp.js`](./public/webmcp.js) registers three read-only tools — `search_articles`, `list_categories`, `get_article` — with WebMCP on page load, so an in-tab agent queries the archive instead of scraping it. It registers into both `document.modelContext` (the specification) and `navigator.modelContext` (older preview builds and scanner shims), and does nothing in the browsers that lack the API. See [`docs/webmcp.md`](./docs/webmcp.md).

Outbound bot requests identify themselves with [Web Bot Auth](https://datatracker.ietf.org/wg/webbotauth/about/): [`/.well-known/http-message-signatures-directory`](https://researchwith.me/.well-known/http-message-signatures-directory) serves the Ed25519 JWKS and signs that response over its own authority, and `lib/web-bot-auth.ts` signs each request with `Signature-Agent`, `Signature-Input`, and `Signature` headers. The endpoint returns 503 until a signing key is provisioned — it never advertises a key nobody holds. See [`docs/web-bot-auth.md`](./docs/web-bot-auth.md).

The [API catalog](https://researchwith.me/.well-known/api-catalog) follows RFC 9727 and lists the archive, assistant, and editorial route groups. Its `service-desc` links point to the [OpenAPI 3.1 document](https://researchwith.me/openapi.json), and `service-doc` links point to the [API reference](https://researchwith.me/api-docs). Editor, signed-in, and webhook-secret requirements are documented per operation; publishing the catalog does not grant access. There is no advertised health endpoint.

After deploying, verify discovery with:

```bash
curl -i https://researchwith.me/.well-known/api-catalog
curl -sS https://isitagentready.com/api/scan \
  -H 'Content-Type: application/json' \
  --data '{"url":"https://researchwith.me"}' | jq '.checks.discovery.apiCatalog.status'
```

The scan should report `"pass"`. When adding or changing an `app/api` route, update `lib/openapi.ts` and the applicable group in `lib/api-catalog.ts`; the catalog coverage test checks for missing paths and methods.

## Quality checks

```bash
npm run lint        # ESLint (Next core-web-vitals + TypeScript + jsx-a11y)
npm run typecheck   # tsc --noEmit
npm test            # Vitest: validation, CMS schema/mapping, both storage adapters, ORCID, citations
npm run build       # production build, types enforced
npm run impeccable:source   # Impeccable source detector over app/ and components/
npm run impeccable:url      # rendered detector against a running server
npm run quality     # lint + typecheck + test + source detector
```

For a rendered audit (requires a Chromium-based browser):

```bash
npx impeccable detect --viewport 390x844 http://localhost:3000
```

The public surfaces are clean: 0 Impeccable findings in source and rendered scans at 1280×800, 390×844, and 320×720; 0 axe WCAG 2.1 A/AA violations; CLS 0 and LCP under 400 ms on local runs. See [`docs/audit-2026-10-25.md`](./docs/audit-2026-10-25.md).

## Deploy (Cloudflare Workers)

Production runs on Cloudflare Workers through the [OpenNext adapter](https://opennext.js.org/cloudflare). The app needs a server (middleware, API routes, the OAuth callback), so it can't be served as a static Cloudflare Pages export.

The long form — every credential with where it comes from and where it is stored, both CI paths, all four webhooks, verification, rollback, and troubleshooting — is [`docs/deployment.md`](docs/deployment.md).

```bash
npm run preview     # OpenNext build, then serve the Worker locally in workerd (:8787)
npm run deploy      # OpenNext build, then deploy with wrangler.jsonc
npm run upload      # OpenNext build, then upload a new version without promoting it
npm run cf-typegen  # regenerate cloudflare-env.d.ts after binding changes
```

- Runs on the Workers free plan. One KV namespace (`researchwithme-opennext-cache`) backs both the incremental cache and the tag cache, so studio `revalidatePath` calls refresh static routes such as `/sitemap.xml` without a redeploy. KV is eventually consistent, so a revalidation can take up to about 60 s to show. Each deploy writes about 33 cache entries, well within KV's free 1,000 writes a day. `next/image` serves original files because there is no Images binding.
- The namespace ID is set on both `kv_namespaces` entries in `wrangler.jsonc`. To move to another account, create a new namespace with `npx wrangler kv namespace create researchwithme-opennext-cache` and replace both IDs.
- Deploys run through Cloudflare Workers Builds: `main` deploys to production and every other branch gets a preview. There is no GitHub deploy workflow (removed in `85465ce`). The Workers CI build runs `scripts/check-production-env.mjs` first, on both `npm run build` and `npx @opennextjs/cloudflare build` (which calls `npm run build` internally), and fails if the public Supabase values are missing.
- `NEXT_PUBLIC_*` values are compiled into the build. The checked-in `.env.production` supplies the public Supabase project URL and publishable key for production builds (including Worker previews); build environment variables or `.env.production.local` can override them. Never put a service-role key or other secrets in this file. Server-only values (`GEMINI_API_KEY`, `REVALIDATE_SECRET`, …) are Worker **secrets**. Rebuild and redeploy after changing public values; Wrangler runtime bindings alone cannot update the browser bundle.
- The Worker filesystem is read-only and doesn't persist, so the local JSON fallback can't save anything there. Configure Supabase in production.
- `npm run deploy` and `npm run upload` refuse to build when `NEXT_PUBLIC_SUPABASE_URL` or the publishable key is missing, or when `NEXT_PUBLIC_SITE_URL` still points at localhost: a Worker built that way serves the studio unauthenticated and cannot save a draft. `ALLOW_DEMO_DEPLOY=1` overrides the guard on purpose. Run the same check alone with `npm run deploy-guard`.
- `wrangler.jsonc` names the account and claims both hostnames — `researchwith.me` and `www.researchwith.me` — as custom domains, so a local `wrangler deploy` and a dashboard build land in the same Worker and own the same hostnames. `www` serves the same Worker rather than redirecting; canonical links stay on the apex through `NEXT_PUBLIC_SITE_URL`. A hostname can belong to only one thing: while an old Pages project still lists `researchwith.me`, the deploy stops with a domain conflict, and the fix is to remove the custom domain there, not to edit this file.
- OpenNext's build is only partly supported on Windows; use WSL or CI for release builds.

### Cloudflare build settings

Workers & Pages → `researchwithme` → Settings → Builds:

| Setting | Value |
| --- | --- |
| Build command | `npx @opennextjs/cloudflare build` |
| Deploy command (production) | `npx wrangler deploy` |
| Deploy command (preview) | `npx wrangler preview` |
| Production branch | `main` |
| Root directory | `/` |

If the production deploy command is left at `npx wrangler preview`, `main` only ever produces previews: the Worker never gains a production deployment, and every branch keeps failing with `Preview creation failed: This Worker does not exist on your account` — previews branch *from* the deployed Worker. Workers Builds is the deploy path: production on `main`, previews on every other branch. There is no GitHub deploy workflow (removed in `85465ce`). The environment guard (`scripts/check-production-env.mjs`) runs first whichever build command is configured, `npm run build` or `npx @opennextjs/cloudflare build`.

### First production deployment

Worker Previews branch off the *deployed* Worker, so nothing previews until one production deployment exists. When the Worker has never been deployed — or the dashboard build has only ever run `wrangler preview` — do it once from a checkout:

```bash
npm run deploy-guard     # stops if the production CMS values are missing
npm run build:worker     # next build, then the OpenNext bundle
npx wrangler deploy      # creates the Worker and its first production deployment
```

`wrangler deploy` creates the Worker when it does not exist, so this works even if every dashboard build has failed so far. The Worker now has a production deployment, and both hostnames are claimed by the `routes` block in `wrangler.jsonc`: a deploy creates the proxied `AAAA 100::` records and the edge certificate, so the same command is also how you re-claim the domain after a hostname change.

### Worker Previews

Cloudflare's build for this project runs two commands: `npx @opennextjs/cloudflare build`, then `npx wrangler deploy` on the production branch and `npx wrangler preview` everywhere else. `wrangler preview` (open beta) creates a *preview* of the Worker — a branch of it with its own URL — instead of touching production.

- A preview does not inherit the Worker's bindings. `wrangler.jsonc` therefore repeats the two KV bindings under `previews`, and a preview deploy without that block fails with ``Your Wrangler configuration is missing a `previews` block``.
- Those preview bindings name the production namespace on purpose. OpenNext prefixes every key with the build id (`incremental-cache/<buildId>/<hash>.cache`, `<buildId>/<tag>`), so preview entries are unreachable from production and the reverse — sharing the namespace cannot serve a preview's HTML to a reader. The two do share the free plan's 1,000 KV writes a day, so a busy preview eats into the production write budget. To separate them: `npx wrangler kv namespace create researchwithme-opennext-cache-preview`, then put that id in the `previews.kv_namespaces` entries (production keeps `8d2dc8f0…`).
- Service bindings are not supported in previews, which is why `WORKER_SELF_REFERENCE` is not listed there. A preview renders and caches normally; it just cannot re-render itself through OpenNext's queue the way production does.
- Previews branch off the **deployed** Worker, so one successful production deployment has to exist first. Until it does, `wrangler preview` fails with `Preview creation failed: This Worker does not exist on your account` — even when the Worker and its versions are there. `npx wrangler deploy` (or `npm run deploy`) creates it; Cloudflare's build does the same on the production branch.
- Worker secrets are not inherited either. `npx wrangler preview secret put <NAME> --name <branch>` sets one for a preview (the name defaults to the branch); without it a preview runs with whatever the build had compiled in.

## Editorial CMS

The studio writes to Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured. Without them the same interface writes to `data/cms-posts.json` and `data/cms-comments.json`, which keeps the project runnable for review without cloud credentials.

- **Database, RLS, storage, realtime:** `supabase/migrations/` (idempotent SQL) with published-only public reads, authenticated editorial writes, append-only comments, a 5 MB public image bucket, and realtime replication.
- **One canonical reader:** published CMS articles are merged into `/`, `/post/[slug]`, the sitemap, and the author record. There is no duplicate `/blog` route.
- **Writes are server-mediated:** `/api/cms/*` validates, rate-limits, checks the request origin, and lets RLS enforce access a second time. No service-role key ships with the app.
- **Cache invalidation:** studio writes revalidate `/` and `/post/[slug]`; an optional Supabase webhook hits `/api/revalidate` with a timing-safe shared secret.
- **Auth:** Supabase email/password and Google. Both return through `/auth/callback`, which exchanges the PKCE code server-side. Publishing access comes from `public.editors` alone; a reader applies from `/dashboard/access` and an editor approves it.

Full setup, the blueprint-to-code map, the data model, and the security notes are in [`docs/supabase-cms.md`](./docs/supabase-cms.md).

## Data and prototype behavior

- Bundled catalogue, browser reading list, and newsletter preference remain local JSON or `localStorage`.
- There is no open manuscript intake: the platform publishes explanations written by approved writers. A reader applies at `/dashboard/access` (GitHub or ORCID identity), an editor approves, and the writer publishes through `/write` and the studio.
- Writer access is a real, server-enforced decision: an applicant connects GitHub or ORCID with Supabase `linkIdentity`, an editor approves the row in `public.author_applications`, and approval writes the `public.editors` entry. There is no browser-side role and nothing is stored in `localStorage`.
- The research assistant answers from the local catalog. With `GEMINI_API_KEY` set it asks Gemini to summarize the same records; without a key it returns a deterministic cited answer.
- The Assistant API (`/api/v1/assistant/answers`, API keys, burst limit, monthly allowance, MCP tool `ask_archive`) is shipped but not switched on. It needs `supabase/migrations/20261114000200_api_keys.sql` (applied to production on 2026-11-14), its own `API_BRIDGE_SECRET` (Worker secret plus a digest row in `private.api_settings`; not the billing secret), and, optionally, the `researchwithme-assistant` Worker (`npm run worker:assistant:deploy`, then uncomment the `ASSISTANT` binding in `wrangler.jsonc`). Without the bridge secret or the migration the API answers `503`. See [`docs/assistant-api.md`](./docs/assistant-api.md).

Environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional. Project URL; enables the Supabase CMS, auth, storage, and realtime. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional. Publishable key (`sb_publishable_…`); RLS protects every table. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted. |
| `REVALIDATE_SECRET` | Optional. Shared secret for the `/api/revalidate` webhook. |
| `GEMINI_API_KEY` | Optional. Enables model-written assistant answers. |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.8-flash`. |
| `API_BRIDGE_SECRET` | Optional. Secret. Required for the Assistant API; its SHA-256 digest is stored in `private.api_settings`. See `docs/assistant-api.md`, "Owner: deploy". |
| `API_FREE_MONTHLY_REQUESTS` | Optional. Assistant API answers included per account per UTC month. Defaults to `100`. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, sitemap, robots, and origin checks. Defaults to `https://researchwith.me`. |
| `LEMONSQUEEZY_API_KEY` | Optional. Secret. Creates checkouts. Without it `/api/billing/checkout` answers `503`. |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Optional. Secret. Verifies webhook signatures; without it every delivery is refused. |
| `BILLING_BRIDGE_SECRET` | Optional. Secret. Also stored (as a SHA-256 digest) in `private.billing_settings`; see `docs/billing.md` §3. |
| `LEMONSQUEEZY_STORE_ID` | Optional. Store the checkouts belong to. |
| `LEMONSQUEEZY_VARIANT_TEARDOWN` | Optional. Variant for the $19 teardown product. |
| `LEMONSQUEEZY_VARIANT_STAT_TABLES` | Optional. Variant for the $5 Statistical Table Generator. |
| `LEMONSQUEEZY_TEST_MODE` | Optional. `1` marks checkouts and stored rows as test data; leave unset in production. |

## Project layout

```
app/           routes, metadata files (sitemap, robots, manifest, OG image), API handlers
components/    shared UI, studio shell, Markdown editor, auth form
lib/           data access, CMS adapters, Supabase clients, validation, citations, SEO
lib/cms/       schema, mapping, local + Supabase stores, client hooks
lib/supabase/  config, browser/server/public clients, storage upload
supabase/      SQL migrations and setup notes
middleware.ts  session refresh and studio route protection
data/          seed JSON records (runtime state for the local adapters)
.impeccable/   detector config, surface briefs
.agents/       Impeccable skill and its launcher
docs/          audit report, CMS guide, project notes
```


## Fonts

The canonical brand typography uses self-hosted **Plus Jakarta Sans** (`public/fonts/plus-jakarta-sans-variable.woff2`, SIL Open Font License 1.1) for editorial reading, display headlines, and interface chrome, paired with **Aptos Mono** / **JetBrains Mono** for code, cited-work identifiers, and metadata. Self-hosted **Newsreader** and **Inter** (`app/fonts/`, loaded via `next/font/local` with SIL OFL 1.1 licenses alongside the files) provide zero-CDN editorial fallbacks. The cool neutral `#F8F9FA` canvas and `#005BBF` cobalt palette are defined in `tokens/src/*.json` and compiled by `npm run tokens:build`.

## Contributing

1. Read `PRODUCT.md` and `DESIGN.md` before changing a surface.
2. Keep the matching brief in `.impeccable/surfaces/` current.
3. Run `npm run quality` and re-run the rendered detector before opening a pull request.
