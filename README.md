# ResearchWithMe

An open-access scholarly publication: long-form reviews of published papers, reproducible repository teardowns, and a citation-first reading experience. Built with Next.js App Router, React 19, and Tailwind CSS v4.

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
| `/write` | Operate | Draft autosave, validation, preview, publish |

Unknown routes, render failures, and loading states have dedicated surfaces (`app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`, `app/loading.tsx`).

## Quality checks

```bash
npm run lint        # ESLint (Next core-web-vitals + TypeScript + jsx-a11y)
npm run typecheck   # tsc --noEmit
npm test            # Vitest: validation, slugging, ORCID checksum, citation formats
npm run build       # production build, types enforced
npm run impeccable:source   # Impeccable source detector over app/ and components/
npm run impeccable:url      # rendered detector against a running server
npm run quality     # lint + typecheck + test + source detector
```

For a rendered audit (requires a Chromium-based browser):

```bash
npx impeccable detect --viewport 390x844 http://localhost:3000
```

The current state is clean: 0 Impeccable findings in source and rendered scans at 1280×800, 390×844, and 320×720; 0 axe WCAG 2.1 A/AA violations on all 14 routes; CLS 0 and LCP under 400 ms on local runs. See [`docs/audit-2026-10-25.md`](./docs/audit-2026-10-25.md).

## Data and prototype behavior

- Article, comment, and submission records are JSON files under `data/`. Writes are atomic and fall back to bundled content when the filesystem is read-only.
- Contributor verification is a **local prototype**: it validates ORCID checksums, GitHub handle syntax, and academic email domains in the browser, then stores a session in `localStorage`. No credentials are sent to ORCID, GitHub, an institution, or Google.
- Newsletter preferences and reading lists are stored in the browser only; no email is sent.
- The research assistant answers from the local catalog. With `GEMINI_API_KEY` set it asks Gemini to summarize the same records; without a key it returns a deterministic cited answer.

Environment variables:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Optional. Enables model-written assistant answers. |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-2.5-flash`. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, sitemap, and robots. Defaults to `https://researchwith.me`. |

## Project layout

```
app/           routes, metadata files (sitemap, robots, manifest, OG image), API handlers
components/    shared UI: header/footer, feed, article islands, states
lib/           data, auth prototype, validation, citations, storage, rate limiting, SEO
data/          seed JSON records (runtime state for the prototype)
.impeccable/   detector config, surface briefs
.agents/       Impeccable skill and its launcher
docs/          audit report and project notes
```

`ResearchWith.me-main/` is a legacy WordPress theme kept for reference only; it is excluded from builds and linting.

## Fonts

Newsreader and Inter variable WOFF2 files are self-hosted in `app/fonts/` and loaded with `next/font/local` so the browser gets preloaded, size-adjusted faces with no layout shift. Both are licensed under the SIL Open Font License 1.1; the licence texts ship next to the files.

## Contributing

1. Read `PRODUCT.md` and `DESIGN.md` before changing a surface.
2. Keep the matching brief in `.impeccable/surfaces/` current.
3. Run `npm run quality` and re-run the rendered detector before opening a pull request.
