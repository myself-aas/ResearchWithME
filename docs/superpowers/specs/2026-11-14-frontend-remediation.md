# Frontend remediation scope and acceptance specification

Status: proposed implementation scope for owner review; not authorization to deploy, migrate production, or change the product catalogue. Derived from the six frontend audits dated 2026-11-14. These decisions turn overlapping audit suggestions into a bounded implementation programme.

## Global requirements

- Work only on `arena/7c1641ff-researchwithme`; do not create, switch, or rename branches/worktrees in this Arena session.
- Preserve Next.js 15.5.28, React 19, Tailwind CSS v4, and Node >=20.9; use `package-lock.json` and `npm ci` when execution is authorized.
- No new production dependency is required; reuse Radix, Zustand, existing motion utilities, Vitest, and Playwright.
- English only. Do not restore removed localization or retired `/papers`, `/paper/[slug]`, or `/editions` routes.
- Keep light canvas `#FAF9F6`, surface `#F3F1EC`, ink `#121214`, secondary ink `#5C5C63`, and primary action `#1D4ED8`; retain the existing Obsidian dark palette.
- Keep Aptos/Aptos Serif/Aptos Mono as installed-name preferences, bundled fallbacks, and body-reading measure <=68ch. Keep useful scientific captions, citations, identifiers, units, and source attribution.
- Normal text contrast >=4.5:1; large text and non-text focus indicators >=3:1 where applicable. Verify composed/tinted states, not only base tokens.
- Responsive verification widths are 320, 768, 1024, and 1440 CSS px, plus 390px phone and short landscape. At 200% zoom, focused content/actions remain reachable without document-level horizontal overflow; technical tables/code may scroll locally.
- Full/reduced/static motion modes remain supported. Reduced motion removes travel/transform motion without hiding state feedback.
- No fabricated study results, contributor portraits, provenance, testimonials, or delivered-media claims. No new generated imagery is required.
- Reading, citations, bookmarks, and assistant access stay free. Preserve existing billing behaviour; catalogue expansion/pricing changes require a separate owner-approved product plan.
- No production requests, Supabase writes, schema application, deployment, destructive cleanup, or email delivery setup without separate authorization.
- Store rollback paths and backwards-compatible reads accompany additive media changes. Do not delete legacy asset fields or backfill invented metadata.
- A source scan, static markup snapshot, suite-presence check, or historical report is not current rendered conformance evidence.

## A. Tokens, theme, and primitives

A1. Emit component CSS names with exactly one `component` segment. Scan `.ts`, `.tsx`, `.css` in app/components/lib/Pages for unresolved `var(--reme-...)` consumers.

A2. Component CSS color aliases reference live semantic variables rather than resolved light hex values. Retain the exported literal token API used outside the browser; browser alias generation is a distinct responsibility. Radius/spacing aliases remain valid primitive references.

A3. Add contrast-safe domain foreground recipes: light Emerging `#155E75`, light Uncertain `#92400E`, dark Emerging `#67E8F9`, dark Uncertain `#FCD34D` (normal text >=4.5:1 on actual tinted surfaces) in both themes. These are proposed foreground-only choices; retain existing accent/tint colors and fail the gate if any actual composition still falls below threshold. Keep independent research labels and non-color meaning.

A4. Make `light | dark | system` selectable, persist `rwm-theme`, respond to system changes only in system mode, handle storage denial, and synchronize bootstrap/hydrated state. Preserve `resolveEffectiveTheme` compatibility.

A5. Text/control sizing and overrides have one documented recipe. Keep existing page-family distinctions; no mechanical mass styling or file splitting. Dynamic/token-backed inline styles are not prohibited.

## B. Navigation, reader, modal, and copy integrity

B1. Exactly one `main-content` target per document on the real focusable main landmark; skip activation bypasses chrome in public and studio shells in both runtimes.

B2. Sign-in retains an accessible name at all breakpoints. Mobile navigation stays an inline disclosure with Escape/close-on-route behavior, viewport-bounded scrolling, and a reachable toggle (not a gratuitous modal).

B3. Reading dock stays within viewport gutters and safe area, keeps primary actions >=44px on coarse pointers, and reserves actual dock clearance. Secondary actions may use a labeled More disclosure; do not reduce target size to fit.

B4. Print hides explicit site chrome, not all header elements. Title/byline/date/artifact/citations remain; dock/forms/navigation do not print.

B5. Clipboard failure exposes selectable citation text and an announced recovery message; success is never announced before the promise resolves.

B6. Shared Dialog preserves its public `open/onClose/title/description/children` API, uses the existing Radix dialog implementation, unique labels, close control, correct focus return, background isolation, and bounded scrolling. Reference-component exposure remains accurately labeled.

B7. Newsletter local preferences must say “Save digest preferences” and “No emails are sent; preferences stay on this device.” Do not introduce a mail backend or imply subscription delivery. Preserve dormant status if there is no consumer.

## C. Discovery and interaction state

C1. A successful `articles: []` response clears old results. Malformed or failed requests retain known data with visible stale/retry status; no replacement by illustrative seed data after a server result. Ignore late/unmounted/older responses.

C2. Likes preserve rollback and show accessible failure/retry feedback; one in-flight request per article. Server authorization/count semantics stay unchanged.

C3. Applied search/category/format filters are reconstructible from canonical URLs in Next and Pages. Use `search` and `format` query keys; category remains `/category/[slug]`. Omit empty/default values. Keep draft typing separate from a submitted search, support Enter/explicit submit, back/forward, reload, and clear filters.

## D. Media and identity

D1. Reuse AuthorAvatar everywhere rather than printing a URL. Preserve the existing `Author.avatar` API for now; distinguish recognized profile URLs from legacy initials in one adapter. Keep rounded-square display, align crop preview/copy, and provide a stable failed-request fallback. Nearby author-name text makes the avatar decorative in bylines.

D2. Failed editor uploads never return blob URLs as persistent success. Preserve draft text and offer retry. Server-side publish validation rejects image destinations with `blob:` or temporary local references, including raw HTML images; local draft previews may remain temporary but cannot publish.

D3. Add optional, backwards-compatible `media` metadata to CMS/blog models and a nullable `posts.media` JSONB column. Proposed shape:

```ts
type ImagePurpose = 'decorative' | 'editorial-cover' | 'evidence-figure';
interface MediaAsset {
  src: string;
  purpose: ImagePurpose;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  sourceUrl?: string;
  license?: string;
  credit?: string;
  focalPoint?: { x: number; y: number }; // normalized 0..1, covers only
  variants?: Array<{ src: string; width: number; height: number }>;
}
interface VideoAsset {
  src: string;
  poster?: string;
  captions: Array<{ src: string; language: string; label: string }>;
  transcript?: string;
}
interface ArticleMedia {
  cover?: MediaAsset;
  inline: Record<string, MediaAsset>; // keys are literal markdown image destinations
  video?: VideoAsset;
}
```

Require positive finite dimensions, safe URL policy, alt for informative assets, empty alt for decorative assets, bounded text, valid focal points/variants. Keep `coverImage`/`cover_image` for old clients: legacy reads still render; new writes keep it equal to `media.cover.src` when a cover record exists. Reject conflicting new values. Existing covers do not automatically become described scientific figures. Legacy uploads without structured dimensions remain renderable and are listed for content review.

D4. Preserve explicit `alt=""`; do not invent descriptions from filenames. New evidence assets render uncropped with caption/source/credit and a meaningful alternative. Structured dimensions reserve space. Use approved metadata alt when present; otherwise preserve authored markdown alt. Unknown legacy semantics are a content-review issue, not permission to synthesize descriptions.

D5. Render video only from an explicit `media.video` record, never a constructed per-slug URL. With no verified assets supplied, omit the slot. Do not retain autogenerated captions unrelated to a real asset. Explainers are user-initiated with controls, poster and preload="none" or "metadata"; do not autoplay them. Any future ambient mode needs pause and reduced-motion/data policy before adoption.

D6. Share candidate selection between Next/Pages; use actual variant metadata. Keep the existing 800px cover variant and primary image compatibility, avoid nonexistent variant URLs for legacy assets, and preserve DPR-aware source selection. Evidence diagrams are not crop-safe covers. Source resolution, not artificial upscaling, governs sharpness.

D7. Preserve JPEG-only crop input <=512KiB, current crop/output/byte policies, and general inline upload types. Add preflight JPEG dimensions and a maximum 16,777,216 decoded pixels / 8192px edge before full canvas allocation. These are proposed conservative product limits, not device memory guarantees. Reject malformed headers and decoder dimension mismatches; retain cancellation, cleanup, no-upscale, and WebP/JPEG fallback.

D8. Cover upload failure removes only objects created by that attempt, best-effort, preserving the original error. A primary URL is not returned until required variants exist. Never delete previously published assets during error recovery.

D9. Use renderer-safe approved brand tokens for social/icon/email styling; provide real font payload or document an intentional supported fallback. Inspect long titles/symbols and maskable safe zones before claiming visual parity.

## E. Recipes, composition, and evidence

E1. DataTable keeps semantic horizontal scrolling (not a new mobile card mode); document it honestly, expose a keyboard-reachable named scroll region, preserve captions/header associations and null-versus-zero distinction.

E2. Consolidate approved Text/Button/Card/layout recipes incrementally. Remove specificity patches only with computed-style coverage. Use the existing motion source of truth in CSS/JS; keep data values static, state feedback legible, and OS preferences respected.

E3. Keep a content-first discovery page: title/purpose/search then an actual review before secondary promotions/orientation layers. Preserve useful category browsing and legitimate equal-weight collections. Replace generic photos only with authorized relevant assets; where unavailable, use a truthful typographic cover, not fabricated scientific imagery. Styling beyond the specified palette requires visual owner review.

E4. Reconcile normative/current docs, surface briefs, release gate, locale claims, and catalogue copy against actual current code. Preserve historical findings as dated records. Retired routes stay retired. Draft catalogue PRDs do not override live catalogue configuration or authorize new pricing.

E5. Gate evidence distinguishes execution from presence. Add runtime keyboard/axe/viewport/print/failure-state tests using existing infrastructure. Keep markup snapshots but label them correctly. Visual parity targets active routes at the required widths. Report commit/browser/viewport/theme/state and failed/skipped checks; never regenerate screenshots just to suppress unexplained differences.

E6. Extract duplicated shared CSS into `styles/frontend.css`, retaining runtime-specific setup in each entry stylesheet. Preserve Tailwind import order/source scanning, relative asset paths, font initialization and generated semantic tokens. Require parity/computed-style tests before removing global specificity patches.

## F. Workflow resilience and reference-library adoption

F1. Studio drafts are recoverable by authenticated account/post, debounce 750ms, show local saved-at status, and survive internal navigation. Storage denial/quota is visible; malformed/future versions do not restore; server-version conflicts require confirmation. No cross-account restoration, implicit publish, or silent prototype migration. Approved writer navigation points to the working studio; local `/write` remains clearly labeled and exportable.

F2. Assistant requests are abortable, cancellable and time out after 60000ms with retry; preserve question/scope and ignore late responses. Cleanup timers/controllers on supersession/unmount. If server supplied initialArticles (including []), do not duplicate mount fetch; otherwise model catalogue freshness explicitly. Frontend cancellation is not proof provider work/billing stopped.

F3. Phone entry text is 16px (`text-base sm:text-sm`), zoom remains enabled, and Input describedBy IDs name real rendered elements. Editor actual contenteditable receives label/hint/error associations, toolbar is keyboard-reachable, search uses dynamic viewport bounds, and compact studio navigation preserves every destination. Replace forced placeholder utilities with a semantic role.

F4. Reference ResearchWorkspace adds client boundary and keeps collapsed child state mounted/hidden, moving focus to the toggle before hiding active descendants. Toast bounds respect viewport/safe area and long tokens; critical instructions remain persistent outside disappearing toasts.

F5. Reference ProvenanceGraph has empty/dynamic-data-safe post-commit focus, valid pressed-button view selection, computed bounds fitting 9+ nodes, and a keyboard-reachable relationship table/text equivalent. Do not claim these currently low-exposure components affect every public route.

## Rollout and boundaries

Tokens, navigation, discovery, media, and governance are separate plans. Prioritize A1–A3, B1–B6, C1, D1/D2/D5 before aesthetic work. Additive schema deployment precedes new metadata writers; old readers remain supported. Apply no migration from this planning session. Full screen-reader/forced-colors/low-memory device checks require human/browser evidence.

Large-file extraction beyond touched responsibilities, localization restoration, analytics, real newsletter delivery, pricing/catalogue expansion, broad chart redesign, new image services, paid infrastructure, and fabricated assets are excluded.

## Evidence sources

`docs/frontend-review-2026-11-14.md`; `docs/design-system/audit-2026-11-14.md`; `taste-audit-2026-11-14.md`; `web-mobile-imagery-audit-2026-11-14.md`; `frontend-ui-engineering-audit-2026-11-14.md`; `design-taste-v1-audit-2026-11-14.md`. Read these for original evidence/exposure; use this spec for the proposed bounded behaviour. Disagreements with owner requirements must be resolved before implementation, not silently inferred.
