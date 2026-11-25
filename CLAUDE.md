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
npm run check:site       # AGENTS.md definition of done, against .next artifacts
```

`AGENTS.md` is the SEO/AEO/GEO contract and is not optional: a change that violates it is not done,
even if it builds. `check:site` fails on duplicate titles, a missing canonical, a second `<h1>`, an
orphan page, JSON-LD that does not resolve, an outbound-citation shortfall, or a budget overrun.

Individual commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run tokens:build`.

Tests compile every post in `content/posts/` with the site's MDX plugins. If you change the component
map or the remark/rehype pipeline, that suite is what proves the existing posts still render.

## Content rules

- Posts live in `content/posts/<slug>.mdx`; the file name is the URL slug and the page is served at
  `/blog/<slug>` (`PostMeta.href`), never at `/posts/...`.
- Frontmatter is validated by `lib/content/schema.ts` (Zod, strict). Never loosen it to make a typo
  pass — fix the post.
- A cover image requires `coverAlt`. Descriptions are 20–280 characters.
- `draft: true` is development-only; production builds exclude it.
- Add posts with `npm run new -- "Title"` rather than hand-copying a skeleton.
- MDX components available without imports: `Callout`, `Figure`, `Video`, `KeyTakeaways`, `Sidenote`
  (see `components/mdx/mdx-components.tsx`). `<Figure>` requires `width` and `height`.
- Every post opens with a 40–60 word answer paragraph, links at least three primary sources and at
  least three internal pages, and starts its headings at `##`.

## File conventions

- Routes under `app/`; shared UI under `components/`; content loading and validation under
  `lib/content/`.
- `lib/content/posts.ts` is server-only (`import 'server-only'`). Client components take types from
  `lib/content/types.ts` and formatting helpers from `lib/content/format.ts`.
- Pages that render posts stay statically generated: `generateStaticParams` + `dynamicParams = false`.
  Do not introduce `cookies()`, `headers()`, or `searchParams` into them without a reason. The two
  exceptions are `/search`, which reads `?q=` so results are in the HTML without JavaScript, and
  `/assistant`, which ships a client-side chat island (see below).
- Design tokens live in `tokens/`; use semantic Tailwind roles (`bg-canvas`, `text-ink`,
  `border-line`, `text-brand`), not raw palette values. `app/globals.css` carries no hex colors:
  the semantic roles reference the generated `--reme-*` layer, so both the ThemeMenu's explicit
  light/dark classes and the OS preference flip every role at once.

## The assistant (`/assistant`)

A browser-side retrieval chat on assistant-ui (`@assistant-ui/react`). The reasoning lives in
`lib/assistant/retrieval.ts` (pure, tested by `test/assistant-retrieval.test.ts`); the runtime and
primitives stay inside `components/assistant/AssistantThread.tsx`. Never import assistant-ui from
a component an article page renders — its JavaScript is quarantined to that route (`AGENTS.md` §9,
§18). Answers quote the archive and link to it; do not add a model service, an API key, or any
network request beyond the cached `/search-index.json` fetch.

## Agent skills

`.agents/skills/` holds SKILL.md instruction packages (index in `.agents/skills/README.md`), and
`.claude/commands/treeflow.md` is the branch → PR → CI flow entry point. A skill is a procedure,
not an exemption: `AGENTS.md` outranks any skill, and `test/mcp-config.test.ts` plus
`npm run check:mcp` keep the `.mcp.json` wiring honest (`AGENTS.md` §17–§19).

## Motion

There is no animation runtime and no preloader. CSS transitions and one `requestAnimationFrame`
reading-progress bar are the whole budget; `prefers-reduced-motion` is honoured in `globals.css`.
Do not reintroduce a client-side motion library on the article path — it costs LCP and the JS budget in
`AGENTS.md` §9.

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Never commit `.env.local` or secrets. The tracked `.env.production` contains only the public
  canonical origin.
- Run `npm run quality`, `npm run build`, and `npm run check:site` before opening a PR.
