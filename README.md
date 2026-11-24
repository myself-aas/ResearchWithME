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
standalone mode); `node .next/standalone/server.js` is the standalone entry point.

## Routes

| Route | What it does |
| --- | --- |
| `/` | Lead essay, latest writing, and topic links |
| `/posts` | Archive, grouped by year, with every tag |
| `/posts/[slug]` | The essay: MDX body, table of contents, citation box, related posts, social card |
| `/tags`, `/tags/[tag]` | Topic index and per-topic archives |
| `/search` | Instant client-side search over a build-time index |
| `/about` | Who writes this, what gets published, how the site is built |
| `/rss.xml` | RSS 2.0 feed (also served at `/feed.xml`) |
| `/sitemap.xml`, `/robots.txt` | Generated from the same content |

Old multi-author URLs redirect: `/post/:slug` → `/posts/:slug`, `/feed` → `/posts`,
`/category/:slug` → `/tags`, `/authors` and `/author/:id` → `/about`.

## How content becomes pages

```
content/posts/*.mdx
        │
        ▼
lib/content/posts.ts ── fs read + gray-matter + Zod validation
        │               reading time, slug, tags, related posts, archive
        ▼
app/posts/[slug]/page.tsx ── generateStaticParams + MdxContent
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

<Figure src="/images/folio-process.jpeg" alt="A whiteboard sketch." caption="Caption text." />
```

Markdown also gives GFM tables, footnotes, fenced code blocks with syntax highlighting and a copy
button, blockquotes, and heading anchors. Headings feed the sticky table of contents automatically.

## SEO and distribution

- Per-post metadata, canonical URLs, Open Graph and Twitter cards, and `BlogPosting` JSON-LD.
- Dynamic 1200×630 social cards rendered from each post's title, date, author, and tags.
- RSS 2.0 with categories, plus a sitemap covering every post and tag page.
- Optional `canonical` frontmatter when a piece was first published elsewhere.

## Quality checks

```bash
npm run lint        # ESLint (Next core-web-vitals + TypeScript + jsx-a11y)
npm run typecheck   # tsc --noEmit
npm test            # Vitest: schema, loader, TOC, and MDX compilation of every post
npm run build       # production build, types enforced
npm run quality     # tokens + lint + typecheck + test
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
  search/            client-side search
  motion/            motion primitives (design system)
content/
  posts/*.mdx        the blog
  README.md          authoring guide
lib/
  content/           schema, loader, TOC, slugs, types, formatting
  seo/               JSON-LD
  site.ts            site + author identity
tokens/              design tokens (source of truth for the theme)
scripts/             post scaffolder, deploy guard, build wrapper
test/                Vitest suites
```

`DESIGN.md` records the design system; `PRODUCT.md` records what the site is and who it is for.

## History

This repository previously ran a multi-author research platform: an editorial studio, Supabase auth,
a draft editor, author directories, a citation builder, and a research-network graph. The 1.0 refactor
replaced all of that with the MDX blog described above. The design system, typography, reading
experience, and Cloudflare deployment were kept. See [`CHANGELOG.md`](./CHANGELOG.md).
