# πeme (ResearchWithMe)

An open-access publication of long-form reviews: published papers taken apart, repositories read line by line, and every claim tied to something you can open. Built on the Next.js App Router with React 19 and Tailwind CSS v4, with a Supabase-backed article studio and a local demo adapter.

The interface follows the design system recorded in [`DESIGN.md`](./DESIGN.md) and uses the [Impeccable](https://impeccable.style) workflow and detector. Product context lives in [`PRODUCT.md`](./PRODUCT.md); per-route briefs live in [`.impeccable/surfaces/`](./.impeccable/surfaces).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Node 20.9 or newer. `next.config.ts` sets `output: 'standalone'`, so a production container can run `node .next/standalone/server.js`; `next start` is used for local verification.

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
| `/submit` | Operate | Manuscript intake with validation and failure recovery |
| `/verify` | Operate | Prototype contributor identity and permission model |
| `/write` | Operate | Prototype draft autosave, validation, preview, publish (local archive) |
| `/login` | Operate | Editor sign-in: password or magic link (Supabase), setup guide in demo mode |
| `/dashboard` | Operate | Article studio: new review with Markdown editor, cover library, takeaways |
| `/dashboard/manage` | Operate | Search, filter, publish or revert, delete, live status |
| `/dashboard/edit/[id]` | Operate | Edit a draft or published article |
| `/dashboard/comments` | Operate | Comment moderation with live updates |

Unknown routes and render failures have their own pages (`app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`). Loading states sit inside the studio pages: a global `loading.tsx` boundary would start streaming before a missing article could return a real 404.

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

Current state: no Impeccable findings in source, and none in rendered scans at 1280×800, 390×844, and 320×720; no axe WCAG 2.1 A/AA violations; CLS 0 and LCP under 400 ms on local runs. See [`docs/audit-2026-10-25.md`](./docs/audit-2026-10-25.md).

## Deploy (Cloudflare Workers)

Production runs on Cloudflare Workers through the [OpenNext adapter](https://opennext.js.org/cloudflare). The app needs a server (middleware, API routes, the OAuth callback), so it can't be served as a static Cloudflare Pages export.

```bash
npm run preview     # OpenNext build, then serve the Worker locally in workerd (:8787)
npm run deploy      # OpenNext build, then deploy with wrangler.jsonc
npm run upload      # OpenNext build, then upload a new version without promoting it
npm run cf-typegen  # regenerate cloudflare-env.d.ts after binding changes
```

- Runs on the Workers free plan. One KV namespace (`researchwithme-opennext-cache`) backs both the incremental cache and the tag cache, so studio `revalidatePath` calls refresh static routes such as `/sitemap.xml` without a redeploy. KV is eventually consistent, so a revalidation can take up to about 60 s to show. Each deploy writes about 33 cache entries, well within KV's free 1,000 writes a day. `next/image` serves original files because there is no Images binding.
- The namespace ID is set on both `kv_namespaces` entries in `wrangler.jsonc`. To move to another account, create a new namespace with `npx wrangler kv namespace create researchwithme-opennext-cache` and replace both IDs.
- `NEXT_PUBLIC_*` values are compiled into the build, so they must be set as **build** variables. Server-only values (`GEMINI_API_KEY`, `HF_TOKEN`, `REVALIDATE_SECRET`, …) are Worker **secrets**.
- The Worker filesystem is read-only and doesn't persist, so the local JSON fallback can't save anything there. Configure Supabase in production.
- OpenNext's build is only partly supported on Windows; use WSL or CI for release builds.

## Editorial CMS

The studio writes to Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured. Without them the same interface writes to `data/cms-posts.json` and `data/cms-comments.json`, so the project runs for review without cloud credentials.

- **Database, RLS, storage, realtime:** `supabase/migrations/` (idempotent SQL) with published-only public reads, authenticated editorial writes, append-only comments, a 5 MB public image bucket, and realtime replication.
- **One canonical reader:** published CMS articles are merged into `/`, `/post/[slug]`, the sitemap, and the author record. There is no duplicate `/blog` route.
- **Writes are server-mediated:** `/api/cms/*` validates, rate-limits, checks the request origin, and lets RLS enforce access a second time. No service-role key ships with the app.
- **Cache invalidation:** studio writes revalidate `/` and `/post/[slug]`; an optional Supabase webhook hits `/api/revalidate` with a timing-safe shared secret.
- **Auth:** Supabase email/password and magic links. Magic links return to `/login` to exchange the PKCE code. Accounts are created by an administrator; there is no public sign-up.

Full setup, the blueprint-to-code map, the data model, and the security notes are in [`docs/supabase-cms.md`](./docs/supabase-cms.md).

## Data and prototype behavior

- Bundled catalogue, browser reading list, newsletter preference, and submission receipt data remain local JSON or `localStorage`.
- Contributor verification on `/verify` is a **local prototype**: it validates ORCID checksums, GitHub handle syntax, and academic email domains in the browser, then stores a session in `localStorage`. No credentials are sent to ORCID, GitHub, an institution, or Google. Studio authentication is separate and real when Supabase is configured.
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

`ResearchWith.me-main/` is a legacy WordPress theme kept for reference only; it is excluded from builds and linting.

## Fonts

The journal is set in the Aptos family: Aptos Serif for headlines and reading copy, Aptos for interface chrome, Aptos Mono for code and data. Aptos is licensed by Microsoft, so this repository does not bundle it; the font stacks in `app/globals.css` use the copy installed on the reader's machine (it ships with Microsoft 365).

Readers without Aptos get Newsreader and Inter. Their variable WOFF2 files are self-hosted in `app/fonts/` and loaded with `next/font/local` so the browser gets preloaded, size-adjusted faces with no layout shift. Both are licensed under the SIL Open Font License 1.1; the licence texts ship next to the files. If you obtain a web-embedding licence for Aptos, add its WOFF2 files to `app/fonts/` and load them with `next/font/local` ahead of the fallbacks.

## Contributing

1. Read `PRODUCT.md` and `DESIGN.md` before changing a surface.
2. Keep the matching brief in `.impeccable/surfaces/` current.
3. Run `npm run quality` and re-run the rendered detector before opening a pull request.
