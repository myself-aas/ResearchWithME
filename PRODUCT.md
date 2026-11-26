# Product

## Platform

web

## Owner

A single author: **Ashif Ahmed Shuvo**. There are no contributor accounts, no editorial board, and no
reader sign-in.

## Users

Researchers, engineers, and curious readers who want a close reading of a paper or an open-source
repository — someone who would rather have the caveat and the reproduction command than a summary of
the abstract.

## Product Purpose

ResearchWithMe publishes long-form essays about research and code. A post exists to answer a question
the abstract cannot: does the benchmark reproduce, where does the repository hide its complexity, which
claims survive a closer read. The site is the archive of those answers.

## Positioning

Not a publisher, not a news feed, not a developer blog with a newsletter funnel. A personal research
notebook made public: one writer, a durable archive, no paywall, no accounts, no algorithmic ordering.
The publishing pipeline is git, and every post has a public history.

## Operating Context

Readers arrive from search, RSS, a direct link, or a citation. They read on a phone in a queue and on a
desktop with the paper open beside the essay. They need readable typography, a table of contents, code
they can copy, citable metadata, and a way to find the rest of the archive by topic.

## Capabilities and Constraints

- MDX posts in `content/posts/`, validated at build time; invalid frontmatter fails the build.
- Static rendering for every page. No runtime database, no auth, no write path.
- Full-text client-side search over an index generated from the posts.
- RSS 2.0, a sitemap, per-post social cards, and `BlogPosting` structured data.
- Tags rather than a single category, so one essay can sit under several topics.
- Drafts render locally and are excluded from production.
- No comments, likes, bookmarks, or reading accounts: the archive is read-only.

## Brand Commitments

- Name: ResearchWithMe; wordmark `reme.`
- Voice: precise, restrained, evidence-first. Claims name their limits.
- Typography: self-hosted Newsreader for editorial headings and Inter for interface/body;
  system monospace for metadata/code. The landing roman subsets cover weights 400–600.
- Palette: reme v4 warm paper canvas, solid surfaces, near-black ink/controls, and
  semantic status/series roles from `src/design/color.manifest.ts`, with a dark theme.
- Design architecture: nine typed manifests generate the landing system. The approved
  adaptation preserves Next.js/Tailwind 4; legacy inner routes migrate incrementally.
- Content licence: CC BY 4.0.

## Evidence on Hand

- One published essay and a migrated set of repository teardowns by the author, kept as drafts until
  their status is reviewed.
- Real dates, reading times computed from the files, and tag counts computed from the archive.

## Product Principles

1. The writing is the product. Chrome stays quiet and the reading column is the widest thing on the page.
2. Verifiability over polish. Every claim can carry a link; reproduction steps are shown, not summarised.
3. Static and durable. Content that can be a file should be a file; output that can be prerendered is.
4. Accessible precision. WCAG AA contrast, visible focus, keyboard navigation, reduced-motion support,
   and no horizontal scrolling down to 320px.

## Implementation Status

- Next.js 15 App Router with React Server Components; posts compiled from MDX at build time.
- `lib/content/` owns schema validation, loading, sorting, tags, related posts, reading time, and the
  search index.
- Cloudflare Workers via the OpenNext adapter; `scripts/check-production-env.mjs` guards the canonical
  origin before deploy.
- The previous multi-author features (studio, Supabase auth, draft editor, authors directory, citation
  builder, research graph) were removed in the 1.0 refactor.

## Accessibility & Inclusion

- WCAG 2.1 AA contrast for body text and UI.
- Full keyboard navigation with visible focus rings and semantic landmarks.
- Reflow without horizontal scrolling down to 320px.
- Reduced-motion preferences remove travel and transform motion while preserving state feedback.
- Every cover image requires alt text; figures are captioned; no status is conveyed by colour alone.


## v4.1 research UI integration

The author-requested v4.1 upgrade keeps Next/React and the existing publishing
model. Typed manifests now include a nine-widget, host-validated research UI
catalog. Archive answers still quote published essays; the catalog does not
author new research claims. Assistant conversations are memory-only, with no
cloud sync or model fallback. Local inference is unavailable until real licensed
weights and an engine are supplied and validated. Full locale routes, dispatch,
strict isolation and all-site migration are tracked, not claimed complete, in
`docs/design/AUDIT-v4.1.md`.
