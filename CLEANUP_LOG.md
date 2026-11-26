# Codebase cleanup log

Date: 2026-11-26
Baseline: `95b724f` on `arena/bc10f80d-researchwithme`
Scope: behavior-preserving hygiene, with author opt-in to reviewed dead-code removal.

## Review and backup

Before removal, Knip candidates were checked against tracked source, imports,
MDX registration, templates, documentation, and Git history. All affected files
were recently edited; the author's explicit choice of **Remove confirmed dead
code** authorized individually reviewed removal instead of the skill's default
recent-code deferral. This is not permission for automatic pruning or removal
of intentional extension contracts.

A pre-deletion archive was created at
`artifacts/codebase-cleanup/backup_2026-11-26/authored-code.tar.gz`, with the
baseline SHA beside it. The archive contains the tracked app, component, library,
script, design, test, token, and template files before removal. It is ignored by
Git and is a **session-local backup**, not a durable off-machine backup.
Tracked originals can also be retrieved from the baseline commit above.

## Removed implementations and declarations

| File | Removed code | Reference/history review |
| --- | --- | --- |
| `lib/content/format.ts` | `formatYear`, `daysBetween`, and `DAY` | No call sites in application, tests, templates, MDX, or docs. Existing date/reading-time formatters are unchanged. |
| `lib/content/posts.ts` | `getPostMetaBySlug`, `getArchive` | No consumers or dynamic registrations. `/blog` renders using existing published-post queries, not these helpers; its route is retained. |
| `lib/content/types.ts` | `ArchiveYear` | Used only by the removed `getArchive` implementation. |
| `lib/figures/hotspots.ts` | `clampPoint` | No consumer; the figure's actual layout/interaction paths are unchanged. This does not add or remove clamping in a rendered figure. |
| `lib/seo.ts` | `SITE_NAME` | Unused alias; the authoritative `SITE.name` and every metadata path remain unchanged. |
| `scripts/design/system.ts` | `Tier` | No type consumers. Runtime tier definitions and generator output are unchanged. |

Five function implementations removed; no files, pages, articles, tests,
assets, or dependency packages deleted.

## Removed redundant exports; implementations retained

| Module | Now internal or no longer redundantly re-exported |
| --- | --- |
| `lib/content/posts.ts` | Re-exports of `POSTS_DIR`, `LoadOptions`, `tagToSlug`; `SiteStats` interface made internal. The canonical slug module remains public and in use. |
| `lib/content/load.ts` | `POSTS_DIR` and `LoadOptions` stay available to the loader internally. Loader functions and options semantics are unchanged. |
| `lib/content/schema.ts` | Redundant `SLUG_PATTERN` export; schema still validates slugs with the same regex. |
| `lib/content/toc.ts` | Unconsumed `slugifyHeading` alias; TOC and shared slugger implementations are unchanged. |
| `lib/theme.ts` | `resolveEffectiveTheme` stays internal, including its function-to-string bootstrap use. |
| `lib/figures/tones.ts` | `TONE_RAMP` stays internal to `shadeFor`; palettes and rendered tones are unchanged. |
| `lib/assistant/genui-schema.ts` | `statusState` stays internal to widget validation. |
| `scripts/design/system.ts` | `luminance`, `contrast`, `mix`, `derivedStates` stay internal to the generator; raw contrast validation and canonical fixture precision are unchanged. |
| `scripts/design/production-server.mjs` | `stopServer` stays internal to the managed-server lifecycle. |
| `src/design/locales.ts` | `en`, `bn` stay internal; the complete public `locales` catalog is unchanged. |

## Explicitly retained

- Published and draft MDX, dynamic component registrations, OpenNext config,
  generated token/design/content files, and Vitest's computed-alias stubs.
- Manifest-defined extension primitives, figure registry helpers, MDX component
  exports, and exported component/result interfaces. Their contracts remain
  useful independently of today's direct import graph.
- All frontend/runtime dependencies; no forced security upgrades or replacement
  libraries were introduced.
- Existing styles and formatting conventions: ESLint's safe fix made no changes,
  and the authored source already had no trailing-whitespace/newline defects.
- No behavior, architecture, route, content, accessibility, or budget changes.

See [CLEANUP_REPORT.md](CLEANUP_REPORT.md) for measurements, analyzer limitations,
and validation results.
