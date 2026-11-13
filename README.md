# ResearchWithMe

An open-access research platform: long-form explanations of published papers, reproducible repository teardowns, and a citation-first reading experience. Built with Next.js App Router, React 19, and Tailwind CSS v4, with a Supabase-backed editorial studio and a local demo adapter.

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
| `/` | Persuade | Searchable article feed, field browser, featured review, contributor roster |
| `/post/[slug]` | Read | Server-rendered article with takeaways, artifact record, discussion, related reviews |
| `/papers` | Operate | Filterable paper archive with DOI and citation actions |
| `/paper/[slug]` | Read | Structured paper with abstract, methods, findings, references, publication record |
| `/authors`, `/author/[id]` | Operate / Read | Contributor directory and profile with verification record and archive |
| `/editions` | Operate | Quarterly compendiums with browser print-to-PDF |
| `/editorial-board` | Read | Editors and editorial standards |
| `/assistant` | Operate | Catalog-grounded research assistant with citations |
| `/cite` | Operate | APA, MLA, Chicago, IEEE, BibTeX, RIS citation builder |
| `/bookmarks` | Operate | Reading list with Markdown export and clear confirmation |
| `/login` | Operate | Sign in with email and password, or Google; setup guide in demo mode |
| `/dashboard/access` | Operate | Connect a GitHub or ORCID identity and apply to write |
| `/write` | Operate | Draft autosave, validation, preview, and publish through the CMS store |
| `/dashboard` | Operate | Studio: new article with Markdown editor, cover library, takeaways |
| `/dashboard/manage` | Operate | Search, filter, publish/revert, delete, live status |
| `/dashboard/edit/[id]` | Operate | Edit a draft or published article |
| `/dashboard/comments` | Operate | Comment moderation with realtime updates |

Unknown routes and render failures have dedicated surfaces (`app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`). Data-loading states live inside the studio pages: a global `loading.tsx` boundary would start streaming before a missing article could return a real 404.

## API discovery

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
- `NEXT_PUBLIC_*` values are compiled into the build. The checked-in `.env.production` supplies the public Supabase project URL and publishable key for production builds (including Worker previews); build environment variables or `.env.production.local` can override them. Never put a service-role key or other secrets in this file. Server-only values (`GEMINI_API_KEY`, `HF_TOKEN`, `REVALIDATE_SECRET`, …) are Worker **secrets**. Rebuild and redeploy after changing public values; Wrangler runtime bindings alone cannot update the browser bundle.
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

Environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional. Project URL; enables the Supabase CMS, auth, storage, and realtime. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional. Publishable key (`sb_publishable_…`); RLS protects every table. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted. |
| `REVALIDATE_SECRET` | Optional. Shared secret for the `/api/revalidate` webhook. |
| `GEMINI_API_KEY` | Optional. Enables model-written assistant answers. |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.8-flash`. |
| `HF_SPACE_NAME` | Optional. Private Hugging Face ZeroGPU Space serving Qwen 2.1 AVIF diffusion. |
| `HF_TOKEN` | Optional. Hugging Face user access token for private Space authorization. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, sitemap, robots, and origin checks. Defaults to `https://researchwith.me`. |

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

The interface follows the πeme v3.1 design system ([`docs/pieme-design-system-v3.1.md`](./docs/pieme-design-system-v3.1.md)): Newsreader for editorial reading, Inter for interface chrome, JetBrains Mono for code, DOIs, and metadata. Newsreader and Inter are self-hosted in `app/fonts/` and loaded with `next/font/local` so the browser gets preloaded, size-adjusted faces with no layout shift. Both are licensed under the SIL Open Font License 1.1; the licence texts ship next to the files. JetBrains Mono is requested by installed name only, with a system mono fallback — it is not bundled.

## Contributing

1. Read `PRODUCT.md` and `DESIGN.md` before changing a surface.
2. Keep the matching brief in `.impeccable/surfaces/` current.
3. Run `npm run quality` and re-run the rendered detector before opening a pull request.
