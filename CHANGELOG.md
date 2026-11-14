# Changelog

All notable post-launch changes to ResearchWithMe are recorded here. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
- Mobile search placeholder no longer references "DOI".
- About/Contact/Privacy/Error/Not-found copy aligned with the truthful
  product story.
- 676/677 Vitest tests pass; 0 TypeScript errors; 0 ESLint errors (one
  pre-existing `import/no-anonymous-default-export` warning in
  `open-next.config.ts`).
