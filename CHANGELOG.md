# Changelog

All notable post-launch changes to ResearchWithMe are recorded here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- The mobile drawer's header now carries the "reme." wordmark instead of the word "Menu"; items are
  grouped under mono captions (Archive / Interactive / Elsewhere / Appearance) with the figure lab
  added, and the theme row is the generative theme switch — a segmented system/light/dark control
  (`show_theme_switch` in the figure registry) whose desktop-header and assistant-thread renderings
  are the same component bound to the same site state. `ThemeMenu` retired.
- The homepage gains four sections: Recently revised (essays with real `updated` dates), a live
  figure-lab spotlight (the registry's `WipeCompare` rendered in place, linking to `/lab`), an
  assistant teaser whose sample prompts derive from the archive (`suggestPrompts`, never hardcoded),
  and a "How this site is made" colophon strip. All sections are server-rendered and crawlable.

### Added
- The interactive-figure library and its constitution. `components/library/`
  holds seven reusable, data-driven learning figures — `WipeCompare`
  (drag-wipe comparison), `TradeoffPad` (2-D parameter drag with budget
  shading), `RacePlayback` (transport replay with live ranks), `LensPeek`
  (hover lens swapping the layer under it), `HotspotAtlas` (pinned annotations
  with keyboard tour), `AssumptionSwitches` (toggle assumptions, outcomes
  re-derive), and `SelfCheckQuiz` (answer-reveal self-check) — each with a
  declared interaction archetype, a fixture, and pure logic in `lib/figures/`
  under unit test. `lib/figures/registry.ts` is the single source of truth: the
  MDX component map, the assistant's generative `tools.by_name`, and figure
  routing all derive from it, so every figure (library and adopted) is
  maintained as generative UI by construction. `FIGURE_CONSTITUTION.md` fixes
  the twelve rules agents follow, enforced by `test/figure-constitution.test.ts`;
  two templates (`GENERATIVE_FIGURE_TEMPLATE`, `GENERATIVE_POST_LAYOUT`) and
  `npm run figures:new` scaffold the next figure and the next figure-bearing
  essay. `/lab` renders the whole registry live and is the pre-adoption proving
  ground. The Prithvi post remains the scoped prototype; its components stay
  post-local and are registered as adopted (result charts flagged legacy).
- Three interactive figures in the Prithvi-EO-2.0 essay, each with a distinct interaction pattern and
  each also wired as generative UI in `/assistant` (a routed tool call renders the same component in
  the thread): `MaskedPatchReconstructor` (ratio slider 0–90% → staggered un-mask reveal of the 6×10
  patch grid, deterministic via a seeded PRNG, with the 4×60=240-token readout), `SeasonScrubber`
  (a 12-month range input interpolating an illustrated NDVI field between five sampled keyframes,
  pretraining months Apr/Jun/Sep/Nov highlighted), and `CheckpointLadder` (listbox pill picker →
  animated width/left marker with payload cards for parameters, metadata training, and pretraining
  GPU cost). Facts live in the pure module `lib/post/prithvi.ts` (13 unit tests); figure routing in
  `lib/assistant/retrieval.ts` (5 tests). `AGENTS.md` §12 and §18.10 record the standing rule:
  every interactive post figure must server-render its initial state and must be maintained as
  generative UI, via `MessagePrimitive.Content components={{ tools: { by_name } }}` — the
  `makeAssistantToolUI` escape hatch is deprecated in assistant-ui 0.15.x.

### Changed
- Article hero made minimalist: title and one byline row (`By <author> · date · updated · reading
  time`) sit above the cover image; the dense furniture moved to more relevant places —
  `PostHeroBanner` retired in favour of `PostCover` (`hero` style → 21/9 frame), tag chips live at
  the article's end, the author card became the byline link, the description stays in metadata/JSON-LD,
  and the abstract-artwork cover no longer repeats the title.
- "reme." wordmark recoloured ("re" and "." in brand accent, "me" in ink — gradient rejected per the
  no-gradient-text rule) and bumped one size step; mobile search and menu icons are bare (no
  border/circle chrome).
- Mobile header carries only search and the menu trigger; theme and RSS moved into the drawer. The
  trigger icon is now Material Symbols' `view_cozy` (inline SVG, Apache-2.0) with a 90°-per-click
  rotation on the emphasize easing, `motion-reduce` safe. DESIGN.md's mobile-drawer section records it.

### Added
- `/assistant` thread sync to the author's Assistant Cloud project (assistant-ui's hosted backend,
  `proj_0k1j9pkb7977`). The publishable frontend URL lives in `NEXT_PUBLIC_ASSISTANT_BASE_URL`;
  the browser holds an anonymous, account-less identity (localStorage refresh token, 30 days) and
  threads, titles, and run reports persist for the author's dashboard. The model stays local —
  answers still come from the build-time index. Unset, the thread stays in-memory. `AGENTS.md`
  §15.8 and §18 record the decision; the assistant page and the privacy policy disclose it.
- `.mcp.json` with eight MCP servers (shadcn, GitHub, Figma, fetch, sequential thinking, DeepWiki,
  Brave search, Firecrawl), environment-variable placeholders only, plus `.agents/mcp/README.md` for
  the per-server instructions and `npm run check:mcp` to spawn each stdio server and handshake with it
  (verified here: shadcn 7 tools, sequential thinking 1, Firecrawl 28 keyless; Brave needs a key,
  remote servers need a login).
- `AGENTS.md` §17 states the MCP contract (untrusted output, no credentials, nothing publishes, local
  authority wins), and `test/mcp-config.test.ts` enforces the trio of config + contract + manual so a
  server cannot be added without documentation.

### Changed
- Search no longer inlines every essay's body into `/search`. Titles, descriptions, and tags stay in the
  page (so `?q=` is still server-rendered); full text moves to the static, `noindex`, cacheable
  `/search-index.json`, fetched when a reader focuses or types in the field. Index building and
  ranking live in `lib/search.ts` and are covered by `test/search.test.ts`.

### Added
- `predeploy` now refuses a `NEXT_PUBLIC_SITE_URL` whose host is not one of the Worker's routes in
  `wrangler.jsonc` (override with `ALLOW_FOREIGN_DOMAIN_DEPLOY=1`).
- CI asserts the served headers (crawl signal, HTML cache policy, HSTS) and the `/search-index.json`
  artifact, not only page bodies.

## [1.2.0] — 2026-11-24

Follow-up to the SEO audit: trust pages, copy fixes, caching, and the first paper review.

### Added
- `/contact` — the real channels (repository issues, GitHub profile, private security advisory) and what
  happens to a message. No form, because there is nothing to store it in.
- `/privacy` — no accounts, analytics, cookies, or third-party scripts; the one theme preference in
  `localStorage`; what Cloudflare necessarily logs at the edge. Linked from the footer and sitemap.
- First research-essay review: *Prithvi-EO-2.0: what the model adds, and what it hides* — 3D and
  metadata embeddings, the GEO-Bench claim, a metadata ablation plan, and the fine-tuning path.

### Changed
- Titles: the `| ResearchWithMe` suffix is dropped when a title already names the site or would exceed
  ~60 characters. Archive page renamed to "Essays on research and reproducible code".
- Meta descriptions rewritten to 150–160 characters on `/blog`, `/tags`, `/tags/[tag]`, `/search`,
  `/about`, `/contact`, `/privacy`, and both posts.
- Home page H1 now shares its query language with the title: "Research papers and open code, reviewed
  in public."
- Cache policy in `next.config.ts`: HTML `max-age=0, s-maxage=31536000, stale-while-revalidate=86400`;
  feeds and machine artifacts one hour; `/_next/static` immutable.
- `security.txt` and the contact page read their channels from `CONTACT` in `lib/site.ts`.

## [1.1.0] — 2026-11-24

The site adopts [`AGENTS.md`](./AGENTS.md) as an engineering contract: crawlable, parseable, citable,
operable. The rules are asserted against the built output by `npm run check:site`.

### Added
- `/blog` as the article tree, with one-hop permanent redirects from `/posts` and `/posts/:slug`.
- Machine-readable surface: `/feed.json` (JSON Feed 1.1), `/llms.txt`, `/.well-known/security.txt`,
  `/blog/<slug>/markdown`, and `/errors/<status>` (RFC 9457 `application/problem+json` or markdown,
  honoring `Accept`, with `retryable` and `Retry-After` only on 429/503).
- JSON-LD `@id` graph: one `Person` (`/about#person`), one `WebSite`, `BlogPosting` per article with
  `wordCount` and a real `dateModified`, `BreadcrumbList`, `ProfilePage`, `CollectionPage` + `ItemList`,
  and `FAQPage` only where a FAQ is visible.
- `faq:` frontmatter, rendered on the page and mirrored into structured data.
- Visible breadcrumbs (`components/seo/Breadcrumbs.tsx`) built from the same array as their JSON-LD.
- `/search` renders results server-side for `?q=` and is hydrated afterwards, so search works without
  JavaScript.
- Per-crawler `robots.txt` groups (Googlebot, Bingbot, DuckDuckBot, Applebot, OAI-SearchBot, GPTBot,
  ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended) and a `Content-Signal` header that matches
  them.
- `npm run check:site` and `npm run verify`, wired into CI after the production build: headings,
  canonicals, unique metadata, JSON-LD, image dimensions, sitemap/page parity, orphans, feeds,
  artifacts, JS/CSS/font budgets.

### Changed
- Sitemap excludes tag archives with fewer than three posts and every `noindex` route; `lastmod` is the
  post's real revision date instead of the build date.
- Articles advertise `<link rel="alternate" type="text/markdown">`, and the shared metadata builder gives
  every page a 1200×630 card.
- Removed `meta keywords` and the `%s | reme` title template; titles now end in the full site name.
- Search is a `<form method="get" action="/search">`, so it submits without JavaScript.
- Typography is a single downloaded family (Plus Jakarta Sans); Inter and Newsreader are gone, and mono
  text uses the system stack.
- Article HTML ships with no animation runtime: the preloader, GSAP/Lenis smooth scroll, `motion`, and
  the route-transition wrapper were removed. `ReadingProgress` is a dependency-free scroll listener.

### Removed
- Dependencies `motion`, `gsap`, and `lenis`, along with `components/motion`, `components/preloader`, and
  `lib/motion`.
- `public/.well-known/security.txt` as a static file (now generated from `SITE.url`).

## [1.0.0] — 2026-11-24

The multi-author publishing platform becomes a single-author MDX blog. Git is the CMS.

### Added
- MDX content pipeline: `content/posts/*.mdx` is read from disk, validated with Zod
  (`lib/content/schema.ts`), and rendered with `next-mdx-remote` and the site's
  remark/rehype plugins. Frontmatter errors fail the build with the file name and field.
- Routes: `/` (lead essay, latest writing, topics), `/posts` (archive by year), `/posts/[slug]`,
  `/tags`, `/tags/[tag]`, `/search`, `/about`.
- Per-post table of contents generated from the MDX source, with scroll-spy highlighting, and a
  citation box with one-click copy.
- MDX components available without imports: `Callout`, `Figure`, `Video`, `KeyTakeaways`,
  `Sidenote`, plus a code block with syntax highlighting and a copy control.
- Build-time static generation for posts, tags, RSS, sitemap, and 1200×630 social cards.
- Client-side search over a generated index (Fuse.js), with `?q=` support and no network calls.
- `npm run new -- "Title"` scaffolds a dated draft post.
- Vitest suites for frontmatter validation, the loader (drafts, sorting, duplicate slugs, alt text),
  TOC extraction, and MDX compilation of every post in the repository.

### Changed
- The site is statically generated: post pages use `generateStaticParams` with
  `dynamicParams = false`, so unknown slugs are real 404s.
- `outputFileTracingIncludes` carries `content/` into the standalone/OpenNext bundle.
- The deploy guard now checks only the canonical origin (`NEXT_PUBLIC_SITE_URL`) instead of Supabase
  credentials.
- README, PRODUCT.md, DESIGN.md, and CLAUDE.md now describe the single-author site.
- Old URLs redirect: `/post/:slug` → `/posts/:slug`, `/feed` → `/posts`, `/category/:slug` → `/tags`,
  `/authors` and `/author/:id` → `/about`.

### Removed
- Supabase: auth, database adapters, RLS migrations, storage, realtime, and all `NEXT_PUBLIC_SUPABASE_*`
  configuration.
- The editorial studio (`/dashboard`, `/write`, `/editor`), the writers directory, editorial board,
  applications, and contribution flows.
- Research-network surfaces (claims, evidence, sources, graph, projects, workspaces, reviews, tools,
  assistant, citations), their API routes, libraries, and tests.
- Transactional email, LinkedIn automation, the assistant/outbox Workers, API discovery documents
  (OpenAPI, MCP, A2A, OAuth metadata), WebMCP, Web Bot Auth, and the markdown-negotiation middleware.
- Dependency pruning: 355 packages removed, including Supabase, Plate, React Email, Resend, Gemini,
  Recharts, Lottie, and Playwright.

### Migrated
- Twelve repository-teardown drafts from `docs/articles/` were moved into `content/posts/` with
  frontmatter derived from their headers. They remain `draft: true` until their status is reviewed.

## [Unreleased]

### Added
- The `impeccable` design-review skill (pbakaus/impeccable v4.11.0, verbatim) installed into
  `.agents/skills/`, and the audit it produced: `UIUX-AUDIT.md` grades the frontend 17/20 (Good) —
  implementation integrity passes on the registry-derivation discipline, and it drove three fixes
  shipped in the same commit: `touch-action` on the drag surfaces (`WipeCompare`, `TradeoffPad`,
  `LensPeek` — pointer drags no longer lose to page scroll on touch) and removal of a dead
  acknowledge transition in the compact theme switch. Author decisions queued: the kicker/eyebrow
  pattern (the site's own DESIGN.md bans it; homepage sections and the hero eyebrow trip it), the
  pinned code-panel syntax palette, and a `/lab` JS budget gate.
- Honest engagement layer for writers. A profile-strength meter (`components/engagement/
  ProfileStrength.tsx`) shows on `/dashboard/access` and on the empty-draft state of
  `/dashboard/(studio)/writing`, computed from real signals (email confirmed, identity linked,
  application approved, first draft saved, first submission, first article published) with
  unit-tested weights; at 100 it says "You're publishable" instead of asking for more.
  `ReadingStreak` and `GoalRing` are built and tested but deliberately unmounted — no
  reading-events source or goal exists to feed them.
- Mobile bottom navigation gains an optional `newInLibrary` badge on the Library tab. It renders
  only when handed a real count of 1 or more (99+ cap, `aria-label` "Library: N new since your
  last visit"); `0`, `null` and an absent prop render no badge at all. No count source is wired
  yet — the badge lights up when one ships.
- `Field` (`components/primitives/Field.tsx`): accessible label + hint + error composite
  (ReactNode slots, textual "(required)" marker). `Button` now supports `loading`
  (`aria-busy`, spinner, disabled while busy).
- One `components/ui` barrel re-exporting the seven composites (Alert, DataTable, Dialog,
  EmptyState, RouteSkeleton, Skeleton, Toast).
- CI guards: `lib/__tests__/forbidden-copy.test.ts` (confirmshame, fake scarcity, win-back copy
  and `!!` in buttons), `lib/__tests__/notification-copy.test.ts` (scenario-registry emails
  scanned for banned phrases; non-transactional mail must name a concrete value; subjects ≤ 78
  chars; preheader ≠ subject), and `.github/PULL_REQUEST_TEMPLATE.md` carrying the unit-mismatch
  anchoring check regex cannot see. `lib/engagement/copy.ts` holds the reviewed strings.

### Changed
- Design-system refactor execution (2026-11-23). The raw-palette migration was verified complete:
  the only raw family left in `app/`/`components/` is the allowlisted modal scrim. Sign-in and
  session chrome now provably render nothing for signed-out visitors and nothing pre-hydration;
  humanizer copy was removed from the value-first framing of signup and the access page;
  ContributeWizard defaults are honest (no pre-filled topics/tags/AI provider, `aiHumanReviewed`
  starts false). See `docs/design-system/migration-plan.md` §Execution 2026-11-23.

### Removed
- Product storefront, checkout/payment webhooks, entitlement code, sales navigation,
  downloadable product bundles and their build/test pipeline. Account API keys,
  free usage allowance, profiles, and research publishing remain available.
- Payment-provider CSP allowances and deployment configuration. A forward database
  migration disables legacy billing access while preserving historical records;
  see `docs/commerce-retirement.md` for the deployment handoff.

### Changed
- Sign-in offers Google, LinkedIn, Discord, and email/password. LinkedIn uses
  Supabase's OpenID Connect provider (`linkedin_oidc`, scopes `openid profile
  email`), not the deprecated legacy connector; Discord uses `discord` with
  `openid identify email connections`. All three provider buttons carry their marks and an
  "Opening …" state. A disabled provider now explains itself instead of echoing
  the upstream error, and a signed-in reader landing on `/login` gets a "Go to
  your dashboard" action rather than only the writer application.
- Profiles are editable by their owner. `/dashboard/profile` (new Profile tab)
  edits name, `/author/` slug, role, institution, field, bio, ORCID, GitHub,
  website, Scholar, and directory visibility, with the photo card beside the
  form. `lib/profile/validation.ts` mirrors the database constraints, so a taken
  slug or a malformed ORCID is explained inline. The write is one upsert on the
  caller's own row under the existing owner-only policies; "Edit profile" now
  opens this page instead of the dead `/settings` link.
- Dashboard and account surfaces share one chrome: a social-style profile header
  (circular photo, name, role/affiliation/member-since, bio, edit/new-article
  actions) and a sticky, horizontally scrollable section switcher
  (Desk · My writing · My reading · Articles · Comments · Applications ·
  Account). The vertical sidebar is gone, and `/dashboard/account` no longer
  renders a second site header and footer inside the shell.
- The mobile navigation is now a right-side drawer covering roughly two-thirds of
  the viewport over a dimmed scrim, with a pinned account/sign-out footer,
  background scroll lock, Escape and focus-trap behaviour intact.
- One MDX editor for every studio: `components/editor/MdxEditor.tsx` backs the
  writer studio, the dashboard studio, and the scholarly workspace. The
  scholarly MDX pane is editable again (Apply to blocks / Revert) and
  `lib/v34/mdx-roundtrip.ts` folds it back into structured evidence, claim, and
  citation blocks losslessly.
- The writers directory always shows the editorial lead, and the known
  editor-in-chief resolves to a truthful minimal profile so the Editor page and
  `/author/myself-aas` no longer 404.
- `/editor` requires editor access and shows who is signed in plus human save
  states instead of raw sync enums.

### Added
- Google, LinkedIn, and Discord sign-in documentation:
  `docs/sign-in-providers.md` records the provider matrix, scopes, the verified
  Supabase configuration, the provider-console redirect URLs (including the
  warning that a Discord bot-install URL is not a sign-in URL), and the failure
  messages, and
  `docs/design-system/login-oauth-audit-2026-11-17.md` holds the review.
- Truthful profile counters. `supabase/migrations/20261117001500_v34_profile_social_counts.sql`
  adds the `v34_profile_social_counts(uuid)` aggregate (followers, saves
  received, published reviews) over the existing follow graph, library, and
  contribution tables, executable by signed-in users only and returning counts
  rather than identities. The profile header shows the three numbers when the
  aggregate succeeds and hides the strip entirely when it does not — a measured
  zero still renders as `0`. Applied to the live project.
- Artifact storage no longer requires Cloudflare R2. R2 asks for a payment
  method even on its free allowance, so scholarly exports and render manifests
  now default to **Supabase Storage** (private bucket, signed URLs, Free plan,
  no card). `lib/v34/artifact-storage.ts` resolves `supabase → r2 → inline`,
  overridable with `ARTIFACT_STORAGE_PROVIDER`; `supabase/migrations/20261117001400_v34_supabase_artifact_storage.sql`
  provisions the bucket and widens `storage_provider` to accept `supabase`; and
  `npm run storage:provision:supabase` (plus `--check`) provisions it through
  the Storage API. Setup and limits: `docs/artifact-storage.md`.
- Assistant API. The database migration is applied; the API answers `503`
  until the owner sets `API_BRIDGE_SECRET` and its digest row
  (`docs/assistant-api.md`, "Owner: deploy"):
  `POST /api/v1/assistant/answers` and `GET /api/v1/usage`, authenticated with
  API keys that are created and revoked on the account page; a burst limit per
  key on the Workers Rate Limiting binding with a KV fallback; an exact
  monthly allowance per account with idempotent retries, kept in Postgres
  (`supabase/migrations/20261114000200_api_keys.sql`); and the MCP tool
  `ask_archive`, which uses the same key and allowance. The database functions
  are gated by the API's own secret, `API_BRIDGE_SECRET`, separate from the
  billing one.
- A second Worker, `researchwithme-assistant` (`workers/assistant`), that makes
  the Assistant's model call and is reached only through a service binding.
  Its binding in `wrangler.jsonc` is commented out until that Worker is
  deployed, so the site answers in-process for now.
  `npm run worker:assistant:check` is now part of `npm run quality`.
- Design documents for the Assistant API: the spec with a capability map and
  an assessment of whether the API can be charged for
  (`docs/superpowers/specs/2026-11-14-assistant-api-spec.md`), the contract,
  diagrams and guides (`docs/assistant-api.md`), ADR-001 (`docs/decisions/`),
  and the implementation plan
  (`docs/superpowers/plans/2026-11-14-assistant-api.md`).
- Three overview dashboards, one per audience, designed with the
  `dashboard-designer` skill: `/dashboard/desk` (editors: applications
  awaiting a decision, stalled drafts, comments, publishing trend, coverage by
  discipline), `/dashboard/writing` (a writer's own byline: drafts and what
  each is missing, publishing trend, likes against the desk average) and
  `/dashboard/reading` (any signed-in account: reading list, new in the
  archive, writer application state). One period filter (4 / 12 / 52 weeks)
  drives every panel; every headline figure is compared with the previous
  period or a stated target. Metric maths lives in `lib/dashboard/metrics.ts`.
- Dashboard refinements from the `kpi-dashboard-design` skill: a "Needs
  attention" list under the headline figures (missed targets first, each
  linked to its fix), a "How this is counted" definition on every figure from
  one shared registry, card sparklines, a fifth process figure on the desk and
  writing dashboards (median days from first save to publication), and a
  comment-spike alert that uses the desk's own moving baseline.
- Dashboard sidebar is grouped into Overview and Studio (or Account for
  readers). Demo mode, whose studio is open, now shows the studio set.

### Removed
- Legacy paper archive (`/papers`, `/paper/[slug]`) and quarterly PDF editions
  (`/editions`) retired; routes now 404 and all nav/footer/API references
  removed.
- Seeded bundled corpus; article data now comes exclusively from the CMS
  (Supabase in production, JSON files in demo mode).
- Placeholder archives, ISSN `2994-0821`, and minted `10.5555/rwm.*` DOIs.
  The platform no longer claims a journal ISSN, DOI prefix, peer review
  status, or editorial board beyond the named editor-in-chief (Ashif Ahmed
  Shuvo).
- Bengali/Arabic i18n layer (`lib/i18n`, `components/i18n`,
  `cloudflare-pages/src/server/locale.ts`); site is English-only with
  `lang="en" dir="ltr"`.

### Changed
- Header simplified to three primary items (Home / Writers / Assistant),
  reading-list, search, theme toggle, and an adaptive sign-in / Write for
  us / Studio CTA that reflects signed-out, reader, and editor states.
- /editorial-board now renders `components/EditorPage.tsx` instead of a
  fictional multi-person board.
- `lib/search/catalog-index.ts` is articles+writers+pages only;
  CommandPalette uses hardcoded English strings.
- CC BY 4.0 remains the stated content licence.

### Added
- WebMCP tools (`public/webmcp.js`): `search_articles`, `list_categories`, and
  `get_article` registered on page load against `document.modelContext` and,
  for scanner shims and older preview builds, `navigator.modelContext`. All
  three are read-only and query the existing `/api/articles` endpoint. Served
  as a static asset from both the Next.js and Cloudflare Pages builds, with the
  registration scoped by an `AbortSignal` so tools unregister by aborting.
- English-only source detector (`lib/__tests__/english-only.test.ts`).
- Post-cleanup Supabase reconciliation migration
  (`supabase/migrations/20261113000200_reconcile_after_cleanup.sql`) and
  owner runbook (`supabase/MIGRATION-RECONCILE-2026-11-13.md`).
- Npm-only package-manager enforcement (`packageManager` + preinstall guard).
- Full-stack Impeccable audit report (`audit-report.md`, score 15/20).
- Lemon Squeezy billing: `/pricing` and `/dashboard/account` surfaces, a
  server-created checkout (`app/api/billing/checkout`), the signed webhook
  (`app/api/webhooks/lemonsqueezy`), and the entitlement read
  (`app/api/billing/entitlement`). Reading stays un-gated.
- Billing schema (`supabase/migrations/20261113000300_billing.sql`): customers,
  subscriptions, orders, and an idempotency log, written through one
  `SECURITY DEFINER` function guarded by a bridge secret — no service-role key.
- Lemon.js overlay loading on the two surfaces that sell, with the CSP allowance
  pinned by a test.
- Owner runbook for billing configuration and go-live (`docs/billing.md`).
- Auth.md agent-registration discovery: protected-resource metadata at
  `/.well-known/oauth-protected-resource`, an `agent_auth` block added to the
  authorization-server document only when the upstream server is reachable, and
  a `/auth.md` walkthrough that names the real RFC 7591 registration endpoint
  rather than inventing `/agent/auth`.
- CSP allowance for `@supabase/auth-js` on jsDelivr, scoped to the package path,
  so the Supabase OAuth consent flow is not blocked once that server is enabled.
- `/.well-known/openid-configuration`, answering from the same implementation as
  `/.well-known/oauth-authorization-server` so OIDC-first agents find the metadata.
- A captured-metadata fallback for OAuth discovery (`lib/oauth-metadata.ts`), so a
  failed upstream round-trip from the Worker no longer reports "no OAuth" about a
  working configuration. Responses state whether they are live or captured.

### Fixed
- OAuth discovery relayed upstream metadata only in theory: it fetched with
  `redirect: 'error'`, which the Workers runtime rejects outright, so every
  request threw before it was sent and the snapshot answered `200` in its place.
  The relayed document was therefore always a week-old capture, and nothing in
  the response distinguished that from a transient outage. It now uses
  `redirect: 'manual'`; a 3xx is a failed round-trip. Found by running the built
  worker, not the unit tests, which cannot see the constraint.
- The relay and the protected-resource metadata now share one loader
  (`loadDiscovery`): one fetch, one validation, so they cannot disagree about
  whether the authorization server is usable.
- OAuth protected-resource metadata now names the authorization server by the
  issuer it actually publishes, resolved at request time, instead of pointing
  `authorization_servers` at this origin. RFC 9728 §3.3 has clients reject
  metadata whose returned `issuer` differs from the identifier they requested,
  so the self-reference made the document — including the `agent_auth` block it
  was meant to deliver — unusable. Supabase serves RFC 8414 at the canonical
  path, so its issuer is its metadata location. The relay and the PRM now share
  one validator, and the array is empty rather than guessed when no issuer
  validates.
- Web Bot Auth directory responses are now signed, as Cloudflare requires:
  `tag="http-message-signatures-directory"` over `("@authority";req)`. Without
  the self-signature a copied JWKS proves nothing about who controls the host.
  The signature uses the serving host, so preview deployments sign correctly.
- `Signature-Agent` is emitted as a quoted structured string rather than the
  dictionary form `sig="…"`, and `signature-agent` is now covered by the
  signature. Cloudflare rejects both mistakes; a signer that produces headers a
  verifier refuses is worse than no signer.
- Dropped the unsupported `key` component parameter and renamed the signature
  label to `sig1`, matching Cloudflare's parser.
- The directory's `503` now logs its reason server-side, so a missing secret is
  distinguishable from a runtime without Ed25519 WebCrypto.

- Mobile search placeholder no longer references "DOI".
- About/Contact/Privacy/Error/Not-found copy aligned with the truthful
  product story.
- 676/677 Vitest tests pass; 0 TypeScript errors; 0 ESLint errors (one
  pre-existing `import/no-anonymous-default-export` warning in
  `open-next.config.ts`).
