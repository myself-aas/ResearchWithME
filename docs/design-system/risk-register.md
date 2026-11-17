# Risk Register — reme v3.1 migration (ten highest-risk issues first)

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R-01 | Dual lockfiles (`bun.lock` vs stale `package-lock.json`); `npm ci` fails out of sync | Broken installs for contributors/CI | High (already observed) | Canonical = `bun install --frozen-lockfile`; regenerate or remove `package-lock.json`; document in README |
| R-02 | No CI workflows despite README referencing a Deploy workflow — spec-mandated token/contrast/a11y gates can't run automatically | Regressions land unnoticed | High | Add `.github/workflows/quality.yml` (lint+typecheck+test+tokens:check) and deploy workflow in stage 7 |
| R-03 | Token source split between `globals.css` literals and email `palette` — drift risk | Inconsistent brand across surfaces | Medium | Stage 1 single JSON source + generated outputs + sync test |
| R-04 | Scholarly schemas (Evidence/Claim/trust) are new domain code; wrong validation could corrupt research-integrity semantics | High severity if wrong | Medium | §22 validators with strict runtime rejection + unit tests; EvidenceCard reference implementation; never last-write-wins |
| R-05 | Authorization must remain server-enforced; UI refactor must not leak RLS/service-key assumptions into client | Security | Low (current design is server-mediated) | Keep `/api/*` mediation; add permission tests; never ship service-role key |
| R-06 | Retraction/correction propagation touches posts/comments data — data-loss risk if mishandled | High | Medium | Idempotent workflows, preserve original versions, migration-tested on copies; block publication on unresolved impact |
| R-07 | `stone-*` utilities alias reme neutral — future rename could break 100+ class strings | Medium | Medium | Keep alias until stage 6; codemod then; sync test guards values |
| R-08 | No i18n/RTL today; adding Bangla + RTL later can break layout (logical props not audited) | Medium | High when added | Use CSS logical properties from stage 2; pseudo-localization (35% expansion) tests before Bangla ships |
| R-09 | Performance budgets (≤200KB gzip shell, LCP/INP/CLS) unenforced; new components (graph/editor/video) are heavy | Perf regression | Medium | Route-level code splitting, virtualization >200 rows, budget checks in CI (stage 7) |
| R-10 | AI-assisted features (assistant, cover generator) lack provenance disclosure/approval records per spec §26 | Research-integrity / trust | Medium | AIProvenanceDisclosure component + server-side approval records before publication blockers enforced |
| R-11 | Untrusted MDX injection or arbitrary JSX expressions in user-authored contributions | High (Stored XSS) | Medium | Allowlisted `ALLOWED_MDX_COMPONENTS` + `validateAndSanitizeMdx` enforced client & server (`HTTP 400`) — `lib/v34/mdx-security.ts` |
| R-12 | External AI provider receives `CONFIDENTIAL` or `RESTRICTED` workspace content | Critical (Data Exfiltration) | Low | Fail-closed `PROHIBITED_EXTERNAL_PROCESSING` policy in `lib/v34/ai-governance.ts` restricting to isolated verifiers only |
| R-13 | SSRF via external academic/repository metadata resolvers | High (Internal Network Access) | Low | Strict HTTPS + explicit host allowlist (`ALLOWED_RESOLVER_HOSTS`) in `lib/v34/resolvers.ts` rejecting loopback/private/metadata IPs |
| R-14 | Shared-device private draft leakage in IndexedDB or PWA caches after logout | High (Privacy) | Medium | Network-only SW exclusions (`public/sw.js`) + automatic `performLogoutLocalWipe` wired in `use-session.ts` & `DashboardShell.tsx` |
| R-15 | Premature drop of legacy tables before zero-fallback cutover | High (Data Loss) | Low | Staged 10-migration SQL sequence, `v34-backfill-reconcile.mjs` checksum parity + quarantine, and 14-day zero-fallback gate (`lib/v34/dual-read.ts`) |
| R-16 | Suppression of critical retraction or security alerts via quiet hours or digest settings | High (Integrity) | Low | Mandatory non-suppressible `integrity_alert` & `security_alert` channels enforced in `lib/v34/notifications-safe.ts` |

## Component → target mapping (summary)

Full table in `component-inventory.md`. Headline mappings: `ArticleDiscussion` → `ReviewThread`; `StatusBadge` → `TrustAssessmentSummary`; `AuthorImpactRadarChart` → accessible chart + table; `PostEditor/MarkdownEditor` → editor package; `VideoEmbed` → token-driven Remotion/Hyperframes player; CMS post cards → `SourceCard`/`ClaimCard`; `/cite` → `Citation` component; `/papers` + `/authors` → `SearchResult`/`FilterPanel`.

## Proposed architecture (non-monorepo adaptation of spec §16/§39)

```
tokens/            src/*.json + scripts/{build,validate,check-contrast}.mjs + dist/   (≈ packages/tokens)
lib/schemas/       scholarly.ts (+ identifiers.ts)                                    (≈ packages/schemas)
lib/tokens/        contrast.ts + re-export of tokens/dist/tokens.ts                   (≈ packages/tokens TS)
components/ui/     accessible primitives (stage 2)                                    (≈ packages/react)
components/graph/  ProvenanceGraph + list alternative (stage 4)                       (≈ packages/graph)
components/editor/ scholarly editor wrappers (stage 4)                               (≈ packages/editor)
videos/* + lib/video/  Remotion/Hyperframes token consumers (stage 5)                 (≈ packages/remotion, hyperframes)
test/ + lib/__tests__/  testing utilities incl. axe fixtures                          (≈ packages/testing)
docs/design-system/ this audit + specs                                                (≈ packages/docs)
```

## First reference migration

**EvidenceCard** (spec-named reference component): new `components/scholarly/EvidenceCard.tsx` built on `lib/schemas/scholarly.ts` Evidence validator, token-mapped via component aliases (`evidenceCard.*`), with full state support (loading, unresolved, restricted, embargoed, corrected, retracted), keyboard + screen-reader contract, and unit tests. CMS discussion cards migrate to it in stage 3.
