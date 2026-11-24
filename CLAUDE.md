# ResearchWithMe — Agent Instructions

## Project overview

A single-author blog. Essays on research papers and open-source code are written as MDX files in
`content/posts/` and statically rendered by Next.js 15 (App Router, RSC), React 19, and Tailwind CSS
v4. There is no database, no auth, and no admin UI — git is the CMS.

Read `PRODUCT.md` and `DESIGN.md` before touching a UI surface, and `content/README.md` before
changing anything about the frontmatter contract.

## Quality gate (must pass before any commit or PR)

```bash
npm run quality          # tokens + lint + typecheck + test
npm run build            # production build, types enforced
```

Individual commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run tokens:build`.

Tests compile every post in `content/posts/` with the site's MDX plugins. If you change the component
map or the remark/rehype pipeline, that suite is what proves the existing posts still render.

## Content rules

- Posts live in `content/posts/<slug>.mdx`; the file name is the URL slug.
- Frontmatter is validated by `lib/content/schema.ts` (Zod, strict). Never loosen it to make a typo
  pass — fix the post.
- A cover image requires `coverAlt`. Descriptions are 20–280 characters.
- `draft: true` is development-only; production builds exclude it.
- Add posts with `npm run new -- "Title"` rather than hand-copying a skeleton.
- MDX components available without imports: `Callout`, `Figure`, `Video`, `KeyTakeaways`, `Sidenote`
  (see `components/mdx/mdx-components.tsx`).

## File conventions

- Routes under `app/`; shared UI under `components/`; content loading and validation under
  `lib/content/`.
- `lib/content/posts.ts` is server-only (`import 'server-only'`). Client components take types from
  `lib/content/types.ts` and formatting helpers from `lib/content/format.ts`.
- Pages that render posts stay statically generated: `generateStaticParams` + `dynamicParams = false`.
  Do not introduce `cookies()`, `headers()`, or `searchParams` into them without a reason.
- Design tokens live in `tokens/`; use semantic Tailwind roles (`bg-canvas`, `text-ink`,
  `border-line`, `text-brand`), not raw palette values.

## Motion system

All interface motion is governed by `lib/motion/tokens.ts` (durations and easings only — no ad-hoc
numbers) and the primitives in `components/motion/`. Never render `initial={{ opacity: 0 }}` on
content that must exist without JavaScript; use `Reveal`, which arms only below the fold.

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Never commit `.env.local` or secrets. The tracked `.env.production` contains only the public
  canonical origin.
- Run `npm run quality` and resolve all findings before opening a PR.
