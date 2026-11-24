# ResearchWithMe

A single-author blog by **Ashif Ahmed Shuvo**: long-form essays on research papers, open-source code, and
the craft of reproducible work. Every essay is an MDX file committed to this repository. The build
renders the pages, the archive, the search index, the RSS feed, and the social cards from those files.

Built with Next.js 15 (App Router, React Server Components), React 19, Tailwind CSS v4, and
[`next-mdx-remote`](https://github.com/hashicorp/next-mdx-remote). No database, no accounts, no admin
panel: git is the CMS.

## Write a post

```bash
npm run new -- "How I read a benchmark"          # draft, dated today
npm run new -- "How I read a benchmark" --publish
```

That creates `content/posts/how-i-read-a-benchmark.mdx`. Edit it, then:

```bash
git add content/posts/how-i-read-a-benchmark.mdx
git commit -m "Publish: how I read a benchmark"
git push
```

The [authoring guide](./content/README.md) covers frontmatter fields, the MDX components
(`Callout`, `Figure`, `Video`, `KeyTakeaways`, `Sidenote`), drafts, images, and what each field
generates. An invalid file fails the build with its file name and field instead of vanishing.

## Run it

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build && npm start
```

Node 20.9 or newer. `package-lock.json` is the only lockfile and CI installs with `npm ci`.
`next.config.ts` sets `output: 'standalone'` because the OpenNext adapter bundles from
`.next/standalone`. `next start` still serves the build for verification (it prints a warning about
standalone mode), but the closest thing to the deployed app is:

```bash
npm run build && npm run serve   # copies static/ + public/ into .next/standalone, then serves it
```

Running `node .next/standalone/server.js` on its own serves HTML but no styles, scripts, images, or
fonts — standalone output does not include them, because a CDN normally does.

## Routes

| Route | What it does |
| --- | --- |
| `/` | Lead essay, latest writing, and topic links |
| `/blog` | Archive, grouped by year, with every tag |
| `/blog/[slug]` | The essay: MDX body, table of contents, citation box, related posts, social card |
| `/tags`, `/tags/[tag]` | Topic index and per-topic archives |
| `/search` | Search, server-rendered for `?q=` and refined in the browser |
| `/about` | Who writes this, what gets published, how the site is built |
| `/contact` | How to reach the writer, and what happens to a message |
| `/privacy` | What is stored (one theme preference) and what is not |
| `/rss.xml` | RSS 2.0 feed (also served at `/feed.xml`) |
| `/feed.json` | JSON Feed 1.1 |
| `/llms.txt` | Machine index of every essay, with links to the markdown form |
| `/blog/[slug]/markdown` | The same essay as markdown, advertised from the page head |
| `/sitemap.xml`, `/robots.txt` | Generated from the same content |
| `/errors/[status]`, `/.well-known/security.txt` | Machine-readable errors and the security contact |

Old URLs redirect in one hop: `/posts` and `/posts/:slug` → `/blog`, `/post/:slug` → `/blog/:slug`,
`/feed` → `/blog`, `/category/:slug` → `/tags`, `/authors` and `/author/:id` → `/about`.

## How content becomes pages

```
content/posts/*.mdx
        │
        ▼
lib/content/posts.ts ── fs read + gray-matter + Zod validation
        │               reading time, slug, tags, related posts, archive
        ▼
app/blog/[slug]/page.tsx ── generateStaticParams + MdxContent
        │                     remark-gfm → rehype-slug → autolink → highlight
        ▼
static HTML + RSC payload, RSS, sitemap, search index, OG image
```

- **Validation** — `lib/content/schema.ts` is strict about frontmatter: unknown keys, missing alt text
  on a cover, a bad slug, or a malformed date stop the build with a useful message.
- **Drafts** — `draft: true` renders in development with a **Draft** badge and is excluded from
  production builds.
- **Static output** — post pages, tag pages, OG images, RSS, and the sitemap are generated at build
  time. `dynamicParams = false` means an unknown slug is a real 404.
- **Bundling** — `outputFileTracingIncludes` carries `content/` into the standalone/OpenNext bundle,
  so the Worker can read the same files the build did.

## MDX

Components are available in every post without an import:

```mdx
<KeyTakeaways>
- The claim is narrower than the abstract suggests.
</KeyTakeaways>

<Callout tone="tip" title="Worth knowing">
  Tones: note, tip, warning, danger.
</Callout>

<Figure
  src="/images/folio-process.jpeg"
  alt="A whiteboard sketch of a module graph."
  width={800}
  height={533}
  caption="Caption text."
/>
```

Markdown also gives GFM tables, footnotes, fenced code blocks with syntax highlighting and a copy
button, blockquotes, and heading anchors. Headings feed the sticky table of contents automatically.

## SEO, AEO, and AI readiness

[`AGENTS.md`](./AGENTS.md) is the contract: crawlable → parseable → citable → operable. In practice that
means one `<h1>` and one canonical per page, unique titles and descriptions, an answer-first opening
paragraph, real citations, a JSON-LD graph resolved by `@id`, explicit `robots.txt` groups for search
and AI crawlers, a sitemap generated from the content collection, RSS plus JSON Feed, `llms.txt`,
`security.txt`, markdown representations of every essay, and RFC 9457 errors that honor `Accept`.

Two things are deliberately outside the repository:

- **Markdown for Agents** is a Cloudflare zone setting (Speed → Optimization → Content optimization).
  It serves `text/markdown` on the canonical URL; the site's own `/blog/<slug>/markdown` route keeps the
  advertised alternate honest either way.
- **`Content-Signal`** is sent by the origin (`next.config.ts`) and mirrored by `robots.txt`, so the
  policy is stated once and obeyed in both places.

`npm run check:site` asserts the contract against the built output — headings, canonicals, unique
titles, JSON-LD, image dimensions, sitemap ↔ page parity, orphans, feeds, artifacts, and budgets.

## Quality checks

```bash
npm run lint        # ESLint (Next core-web-vitals + TypeScript + jsx-a11y)
npm run typecheck   # tsc --noEmit
npm test            # Vitest: schema, loader, TOC, and MDX compilation of every post
npm run build       # production build, types enforced
npm run check:site  # the AGENTS.md definition of done, against .next artifacts
npm run quality     # tokens + lint + typecheck + test
npm run verify      # build + check:site
```

The test suite compiles **every** post in `content/posts/` with the same remark/rehype plugins the site
uses, so a broken component or malformed MDX fails CI even when the post is a draft.

## Deploy (Cloudflare Workers)

Production runs on Cloudflare Workers through the [OpenNext adapter](https://opennext.js.org/cloudflare).

```bash
npm run preview     # OpenNext build, then serve the Worker locally
npm run deploy      # OpenNext build, then deploy with wrangler.jsonc
npm run upload      # build and upload a version without promoting it
```

- `scripts/check-production-env.mjs` runs before `deploy`/`upload` and refuses to ship a build whose
  `NEXT_PUBLIC_SITE_URL` is missing, non-HTTPS, or still pointing at localhost.
- `NEXT_PUBLIC_SITE_URL` is compiled into metadata, canonical links, JSON-LD, the sitemap, and RSS.
  It defaults to `https://researchwith.me`; `.env.production` pins the production origin.
- CI builds run `npm run build` on Cloudflare Workers Builds: production on `main`, previews on every
  other branch.
- `wrangler.jsonc` claims `researchwith.me` and `www.researchwith.me` as custom domains. A hostname can
  belong to only one thing, so remove an old Pages custom domain before the first deploy.

## Project layout

```
app/                 routes, metadata files, RSS, sitemap, OG images
components/
  layout/            site header, footer, theme control
  post/              post cards, cover, table of contents, citation box
  mdx/               MDX component map, code block, renderer
  search/            search input and result list (hydrated)
  seo/               visible breadcrumbs
content/
  posts/*.mdx        the blog
  README.md          authoring guide
lib/
  content/           schema, loader, TOC, slugs, types, formatting
  seo/               metadata builders and the JSON-LD graph
  site.ts            site + author identity
tokens/              design tokens (source of truth for the theme)
scripts/             post scaffolder, deploy guard, build wrapper, site checks
test/                Vitest suites
```

`DESIGN.md` records the design system, `PRODUCT.md` what the site is and who it is for, and `AGENTS.md`
the SEO/AEO/GEO rules that every change has to pass.

## History

This repository previously ran a multi-author research platform: an editorial studio, Supabase auth,
a draft editor, author directories, a citation builder, and a research-network graph. The 1.0 refactor
replaced all of that with the MDX blog described above. The design system, typography, reading
experience, and Cloudflare deployment were kept. See [`CHANGELOG.md`](./CHANGELOG.md).
