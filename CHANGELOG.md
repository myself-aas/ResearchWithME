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

### Fixed
- Mobile search placeholder no longer references "DOI".
- About/Contact/Privacy/Error/Not-found copy aligned with the truthful
  product story.
- 676/677 Vitest tests pass; 0 TypeScript errors; 0 ESLint errors (one
  pre-existing `import/no-anonymous-default-export` warning in
  `open-next.config.ts`).
