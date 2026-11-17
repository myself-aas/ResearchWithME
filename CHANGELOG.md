# Changelog

All notable post-launch changes to ResearchWithMe are recorded here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- Sign-in offers Google, LinkedIn, and email/password. LinkedIn uses Supabase's
  OpenID Connect provider (`linkedin_oidc`, scopes `openid profile email`), not
  the deprecated legacy connector; both provider buttons carry their marks and
  an "Opening …" state. A disabled provider now explains itself instead of
  echoing the upstream error, and a signed-in reader landing on `/login` gets a
  "Go to your dashboard" action rather than only the writer application.
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
- LinkedIn and Google sign-in documentation: `docs/sign-in-providers.md` records
  the provider matrix, scopes, the verified Supabase configuration, the
  provider-console redirect URL, and the failure messages, and
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
