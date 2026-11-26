# Frontend Design System & Generative UI/UX Refactor Plan

> Historical v3.2 roadmap. The author-approved reme v4 Next.js adaptation now
> supersedes its palette and manifest guidance. See `DESIGN.md` and
> `docs/design/MIGRATION.md` for current implementation scope and gate status.

**Scope:** the entire `ResearchWithMe` frontend — header/footer chrome, home, blog,
article, tags/about/contact/privacy, `/assistant`, `/lab`, search, and the
interactive figure library — re-based onto `DESIGN.md` (`reme v3.2`) with the
assistant-ui generative-UI layout system integrated as a first-class,
token-governed surface.

**Authoritative sources (in priority order):**
1. `AGENTS.md` — SEO/AEO contract, budgets, MCP, `/assistant`, skills, figure library.
2. `DESIGN.md` (`reme v3.2`) — token authority, the "no blue / no hex / no forbidden
   patterns" rules, the figure-library contract.
3. `FIGURE_CONSTITUTION.md` — the 12 articles every figure obeys.
4. `.agents/skills/assistant-ui-docs/references/reme-generative-architecture.md` —
   the repo bridge to the vendored `assistant-ui/skills` (pinned in `skills-lock.json`).
5. The installed `@assistant-ui/react@0.15.38` — the API authority over any doc page.

**Standing constraint (Article 12):** a new archetype or a changed *visual design*
of a shipped figure is a PR that needs the author's sign-off. This plan is the
roadmap; the steps tagged **[APPROVAL]** must carry the uniqueness matrix in the PR.

---

## 0. Why now, and the shape of the change

PR #46 already moved the **homepage hero** and the **top navigation chrome**
(`SiteHeader`, `MobileMenu`, `SiteFooter`, `ThemeSwitch`, `SearchClient`,
`lib/site.ts`) and `app/globals.css` onto `reme v3.2`. The remaining surfaces are
still partially on the **legacy shadcn alias layer** (`bg-card`, `text-foreground`,
`text-primary`, `bg-background`, `border-border`, …) plus ad-hoc hex and raw
palettes. The audit below is the current state of *this* branch.

Three ambitions:
- **Token authority everywhere.** One vocabulary (`bg-canvas`, `bg-surface`,
  `text-ink`, `text-ink-secondary`, `border-line`, `bg-brand`, `text-on-primary`,
  `text-brand`, `bg-selection`, `bg-surface-subtle`) backed by `--reme-*`.
  No hex, no `stone-/gray-/neutral-/blue-`, no `bg-black`/`text-white` in JSX/CSS.
- **Generative UI as a system, not a bolt-on.** The `/assistant` thread and `/lab`
  render the *same* registry components the articles render, behind the *same*
  token classes, through the *same* allowlist — across two non-interchangeable
  spec shapes (see §4). The model stays local (§18).
- **Kill the forbidden patterns** (kickers, gradients, glass/blur, nested cards,
  hard shadows, `>1px` coloured borders, unicode glyph icons) on every inner route.

---

## 1. Current-state audit (grounded, this branch)

**1.1 Legacy shadcn alias classes still in use** (these resolve today only because
`tokens/generated/shadcn-aliases.css` shims them onto `--reme-*` — they are
*not* broken, but they violate the reme v3.2 vocabulary and must be migrated,
and the shim deleted once nothing references it):
- `app/blog/page.tsx` — `bg-gradient-to-br from-card via-card to-muted/60`,
  `backdrop-blur-sm`, `bg-card`, `text-foreground`, `text-muted-foreground`,
  `bg-primary`/`text-primary-foreground`, `bg-background`, `border-border`,
  `shadow-xs`, mono kicker `tracking-[0.16em]` "A research notebook" pill.
- `app/blog/[slug]/page.tsx` — author card `bg-gradient-to-br … to-muted/60`,
  `bg-card`, `text-foreground`, `text-muted-foreground`, `text-primary`,
  `bg-primary`, `border-border`, `outline-ring`; "More to explore" kicker
  (`tracking-[0.16em]`), "More topics" chip row.
- `app/opengraph-image.tsx`, `app/blog/[slug]/opengraph-image.tsx` — legacy
  `bg-card`/`text-foreground` (these are OG rasterisers; see §6).
- `components/post/{ArchiveExplorer,BenchmarkChart,FAQAccordion,MaskedPatchReconstructor,PipelineExplorer,PrithviExplorer,TocNav}.tsx`,
  `components/library/{FlowDiagram,HotspotAtlas,TradeoffPad}.tsx` — stray
  `border-border`/`bg-card`/`text-muted-foreground`.

**1.2 Raw hex / raw palette in components** (hard failures once the source scan in
§19 rule 5 lands):
- `components/post/PrithviExplorer.tsx` — 9 inline hex (`#87a883`, `#d3aa68`, …)
  and `slate-900`/`amber-200`/`amber-300`/`emerald-500` Tailwind palette classes.
- `lib/post/prithvi.ts` — 14 hex literals (month NDVI/land/field/water ramps).
- `components/post/SeasonScrubber.tsx` — `bg-black/35`, `text-white`, `border-white/25`, `backdrop-blur-sm`.

**1.3 Forbidden patterns on inner routes** (DESIGN.md "Do not"):
- Kickers/`eyebrow` above headings: `app/about` ("About"), `app/contact`
  ("Contact"), `app/privacy` ("Privacy"), `app/tags` ("N topics"),
  `app/tags/[tag]` ("Topic · N essays"), `app/blog` pill, `app/blog/[slug]`
  ("More to explore"), `ArchiveExplorer` ("Browse the notebook", "Latest essay"),
  `TocNav` ("Reading guide"), `FAQAccordion` ("Quick answers"),
  `AssistantThread` ("From the archive").
- Decorative gradients/halos/nested cards/blur: `app/blog` (gradient header +
  radial halo + `backdrop-blur-sm` stat cards), `app/blog/[slug]` (author card
  gradient), `BenchmarkChart`/`PipelineExplorer` (`bg-gradient-to-*`),
  `PostCover` (`bg-gradient-to`), `Sidenote` (`border-l-2` >1px).
- `app/lab/page.tsx` missing the `bg-canvas text-ink` root wrapper.

**1.4 Prototype figures not yet on the library** (grandfathered in
`FIGURE_CONSTITUTION.md`, exempt from Articles 2/4/6 letter but not spirit):
`PrithviExplorer`, `SeasonScrubber`, `MaskedPatchReconstructor`,
`CheckpointLadder`, `FloodResultsChart`, `PastisResultsChart`, plus unregistered
`BenchmarkChart` and `PipelineExplorer`.

**1.5 Governance drift:**
- `PRODUCT.md` still cites Plus Jakarta Sans + `#005BBF` cobalt (retired by `reme v3.2`).
- `AGENTS.md` §3 omitted `/assistant`, `/lab`, `/contact`, `/privacy`.
- `AGENTS.md` §18–§20, `.agents/skills/`, `templates/` documented only the legacy
  `tools.by_name` path, not `MessagePrimitive.GenerativeUI`,
  `@assistant-ui/generative-ui`, or `assistant-ui.com/llms.txt`.

---

## 2. Target architecture

```
                    ┌─────────────────────────────────────────┐
                    │  reme v3.2 token layer  (tokens/src → CSS)│
                    │  bg-canvas/bg-surface/text-ink/…  --reme-*│
                    └─────────────────────────────────────────┘
                                       │ every surface renders through these
        ┌──────────────────────────────┼───────────────────────────────┐
        │                              │                                │
   Articles (MDX)              /assistant thread                 /lab (showcase)
   mdxComponents            AssistantThread + GenerativeFigures  registry fixtures
        │                              │                                │
        └──────────────┬───────────────┴────────────────────────────────┘
                       ▼
          lib/figures/registry.ts  ← single source of truth
          (toolName, mdxName, archetype, defaults, keywords, component)
                       │  derives
        ┌──────────────┴───────────────┐
   MDX component map            thread tool-UI (by_name)  +  optional
   (components/mdx)             GenerativeFigures.tsx       GenerativeUI allowlist
                                                       (composed surfaces, §4)
```

The thread today uses the **tool-UI path** (`generativeTools.by_name`). That is the
correct, supported mechanism for a widget tied to one routed figure and stays.
`MessagePrimitive.GenerativeUI` is added only as the **composed-surface forward
path** (§4) — when one answer must render a stack of registry components behind a
single `generative-ui` part.

---

## 3. Phased plan

### Phase A — Token authority (no visual redesign, pure vocabulary swap)
*Goal: eliminate hex, raw palettes, and the shadcn alias layer; delete the shim.*

- **A1. Canonical mapping table** (apply mechanically, file by file):
  | legacy | reme v3.2 |
  |---|---|
  | `bg-card` | `bg-surface` |
  | `text-foreground` | `text-ink` |
  | `text-muted-foreground` | `text-ink-secondary` |
  | `bg-primary` / `text-primary` / `text-primary-foreground` | `bg-brand` / `text-brand` / `text-on-primary` |
  | `bg-background` | `bg-canvas` |
  | `border-border` | `border-line` |
  | `bg-muted` / `bg-muted/60` | `bg-surface-subtle` |
  | `outline-ring` | `outline-focus` |
  | `shadow-xs` / `shadow-raised` / `shadow-floating` | keep only the reme `shadow-*` tokens (`DESIGN.md` raised/floating/dialog) |
- **A2. Delete `tokens/generated/shadcn-aliases.css`** (and its import) once the
  last `bg-card`/`text-foreground` reference is gone; add a `tokens:check`/lint
  guard so it can never return.
- **A3. Hex/palette purge** (1.2): move `PrithviExplorer` and `lib/post/prithvi.ts`
  colour ramps into `lib/figures/tones.ts` as **tone names**; replace `slate/amber/
  emerald` classes with semantic tokens; replace `SeasonScrubber` `bg-black/35`
  `text-white` `border-white/25` `backdrop-blur-sm` with `bg-selection/40`
  `text-on-selection` `border-line` (and drop the blur — or keep a token-gated
  `backdrop-blur-sm` only if reme adds one; it has not, so drop it). **[APPROVAL]**
  touches the Prithvi figures' visuals.
- **A4. Land the source scan** (`npm run quality` step) that fails on stray hex and
  raw-palette classes in `app/`, `components/`, `lib/`, `templates/`. (This is the
  test added in `test/skills-and-templates.test.ts`, extended to source.)

### Phase B — Kill forbidden patterns on inner routes
- **B1. Remove every kicker/eyebrow above a heading** (1.3): fold `About`,
  `Contact`, `Privacy`, `N topics`, `Topic · N essays`, "More to explore",
  "Reading guide", "Quick answers", "From the archive", "Browse the notebook",
  "Latest essay" into the heading line or the paragraph beneath it (or delete).
  Keep them out of `aria-labelledby` headings; use them only as the heading text
  itself when meaningful.
- **B2. Remove decorative gradients & halos:** `app/blog` header (flat `bg-surface`
  or `bg-canvas` + `border-line`), the radial halo circle, `backdrop-blur-sm`
  stat cards → solid `bg-surface`; `app/blog/[slug]` author card gradient →
  `bg-surface`; `BenchmarkChart`/`PipelineExplorer`/`PostCover` gradients → flat
  token surfaces.
- **B3. `Sidenote`** `border-l-2` → `border-l border-line` (1px). 
- **B4. `app/lab`** add the `bg-canvas text-ink` root wrapper (it is a crawlable
  page; the readable part must survive `curl`).
- **B5.** No new unicode glyph icons anywhere; existing `lucide-react` usage stays.

### Phase C — Figure library consolidation (FIGURE_CONSTITUTION.md)
- **C1. Migrate the prototype figures** (1.4) onto `components/library/` + `FigureChrome`
  + `lib/figures/tones.ts`, losing the grandfather exemption when an essay next
  touches them. `PrithviExplorer` → `StageSelector` library archetype;
  `SeasonScrubber`/`MaskedPatchReconstructor`/`CheckpointLadder` already have
  library analogues or become them; `FloodResultsChart`/`PastisResultsChart`
  → `DatasetBars` (collapse the duplicate `dataset-switcher-bars` pair — Article 1
  uniqueness). **[APPROVAL]** each migration shows the uniqueness matrix.
- **C2. Register `BenchmarkChart` and `PipelineExplorer`** (currently unregistered)
  or fold them into existing archetypes; an unregistered figure is a constitution
  failure.
- **C3. `routeFigure` stays registry-driven** (keywords/defaults on the entry);
  extend `test/assistant-retrieval.test.ts` for every new/changed routing keyword.

### Phase D — Generative-UI primitive migration (0.15.x)
*Like-for-like; functionally equivalent; needs an author's quick visual check, not
Article 12 approval.*
- **D1.** `AssistantThread.tsx`: `MessagePrimitive.Content` → `MessagePrimitive.Parts`
  (per-part render callback: `text`→`MessagePartPrimitive.Text`, `tool-call`→
  `part.toolUI ?? <ToolFallback/>`, `reasoning`→`<details>`, `source`→link,
  `generative-ui`→`MessagePrimitive.GenerativeUI`). Keep `generativeTools.by_name`
  reachable through the `tool-call` branch.
- **D2.** `ThreadPrimitive.Empty`/every `.If` → `AuiIf condition={(s)=>s.thread.isEmpty}`
  etc.; `ComposerPrimitive.If running` → `AuiIf`.
- **D3.** Verify `generative-ui` skill's `GroupedParts`/`groupPartByType` still uses
  `"standalone-tool-call"` (not the removed `"mcp-app"`).
- **D4.** Keep the `LocalRuntime` `run` contract (cumulative yields, `abortSignal`
  at every await) — unchanged.

### Phase E — Composed-surface forward path (OPTIONAL, only if a backend emits parts)
- **E1.** Add `templates/GENERATIVE_UI_SURFACE_TEMPLATE.tsx.tmpl` (already created)
  for a `GenerativeUIComponentRegistry` allowlist + `Fallback` behind one
  `generative-ui` part. Stack registry components (Sources, ComparisonCard,
  Chart, …) — never `present`-shaped nodes.
- **E2.** The allowlist is the **only** security boundary on *which* components
  render (no `eval`, no dynamic import). Treat every allowlisted component's props
  as untrusted: no `dangerouslySetInnerHTML` from props, reject `javascript:` URLs.

### Phase F — Assistant chrome & authoring model
- **F1.** If a figure ever needs a *frontend tool* (not the `routeFigure`→`by_name`
  path), author it with the `tools` skill's `"use generative"` model
  (`defineToolkit`, `withAui({ aui: { backendless: true } })` because no server
  route imports the toolkit, `AuiConfig({ tools: Tools({ toolkit }) })`). **Do not
  install `@assistant-ui/generative-ui`** (`present`/`JSONGenerativeUI`) — there is
  no model service, so the model never composes layouts; that dependency bump
  (zod 4, generative-frame) is out of scope.

### Phase G — Governance & docs (this PR already advances most of this)
- **G1.** `PRODUCT.md` → drop Plus Jakarta Sans + `#005BBF`; align typography and
  palette with `reme v3.2` (Newsreader + Inter + tomato brand, no blue).
- **G2.** `AGENTS.md` §3 (add `/assistant`, `/lab`, `/contact`, `/privacy`),
  §12 (token enforcement), §17 (llms.txt + `r.assistant-ui.com` read-only via
  `shadcn` MCP), §18 (generative-UI spec shapes + security), §19 (`skills-lock.json`
  + llms.txt), §20 (the three templates).
- **G3.** `.agents/skills/README.md` rows for the 5 vendored skills + the bridge doc
  (done); `.agents/mcp/README.md` `shadcn`/`assistant-ui` sections updated (done);
  `CLAUDE.md` skills + assistant sections updated (done).
- **G4.** Templates `GENERATIVE_FIGURE_TEMPLATE`, `GENERATIVE_POST_LAYOUT` improved;
  `GENERATIVE_UI_SURFACE_TEMPLATE` added (done). All token-only, hex/blue-free.

---

## 4. The two generative-UI spec shapes (must not interchange)

| | `present` / `JSONGenerativeUI` | primitive `MessagePrimitive.GenerativeUI` |
|---|---|---|
| Discriminator | `$type` (flat, beside props) | `component` (nested in node) |
| Producer | the model, via `present` | a backend emitting a `generative-ui` part |
| Converters | Slack/Teams/A2UI accept this | none |

This site uses **neither for the library** — figures render via `by_name` tool-UI.
The primitive shape is the *only* one we adopt, and only for composed surfaces
(§E). A `present`-shaped tree will not render through `MessagePrimitive.GenerativeUI`.

---

## 5. Security boundary (both paths)

- The allowlist bounds **which** components render: no `eval`, no dynamic import.
- It does **not** bound the **props** a component receives. Never forward
  agent/tool-supplied props into `dangerouslySetInnerHTML`; validate/reject
  `href`/`src` (`javascript:` URLs rejected). The `assistant-ui` MCP server answers
  API questions; it never decides product rules (§17 rule 1).

---

## 6. Edge cases & allowed literals

- **OG rasterisers** (`app/opengraph-image.tsx`, `app/blog/[slug]/opengraph-image.tsx`)
  cannot read CSS variables; they import `semanticLight` from the generated token
  module. Keep them pinned to the light set, tracked to `DESIGN.md`'s literals
  clause — do **not** "fix" them onto the alias shim; migrate the literal to the
  generated token import if present.
- **Brand icons** (`favicon.svg`, `icon.svg`, `*.png`) are artwork, not UI; the
  tomato `#C93D0C` is the one allowed literal there.
- **Code panel** is pinned by `code-*` tokens present identically in both semantic
  sets (blue-free, contrast-gated). Leave it; it is a deliberate token decision.

---

## 7. Rollout & verification gates

Each phase merges only when green:
```bash
npm run quality   # tokens:build + lint + typecheck + test (incl. the new skills/templates contract)
npm run build
npm run check:site
npm run verify    # build + check:site
```
- The figure constitution suite (`test/figure-constitution.test.ts`) and
  `test/post-figures.test.ts` must stay red-free through C.
- `test/skills-and-templates.test.ts` (new) asserts `.agents/skills/README.md`
  completeness, `skills-lock.json` paths, relative links in `SKILL.md`, and
  hex/blue-free `templates/*.tmpl`.
- No `INP`/`LCP`/JS-budget regression on the article path (§9): assistant-ui stays
  quarantined to `/assistant`; the article path never imports it.

---

## 8. Definition of done

- Zero `bg-card`/`text-foreground`/shadcn-alias classes in the repo; shim deleted.
- Zero hex/raw-palette literals in `app/`, `components/`, `lib/`, `templates/`.
- Zero kickers, gradients, glass/blur, nested cards, `>1px` coloured borders on any
  route.
- Every figure renders identically (tokens + component) in MDX, `/lab`, and the
  thread; registry is the single source of truth.
- `/assistant` migrated to `MessagePrimitive.Parts` + `AuiIf`, same behaviour.
- Governance docs, `skills-lock.json`, the three templates, and the MCP/llms.txt
  references are current; `npm run verify` is green.
