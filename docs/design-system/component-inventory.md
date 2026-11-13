# Component Inventory and Classification — Stage 0

> **2026-11-12:** shared primitives (`Text`, `Link`, `Card`, `Stack`, `Icon`, form controls) and the semantic-token rules are documented in [primitives.md](./primitives.md).

Classification legend (per brief): **Retain** · **Retokenize** · **Refactor** · **Wrap temporarily** · **Replace** · **Deprecate** · **Remove after migration**.
"Retokenized" = already migrated to πeme v3.1 token classes in `c522005` (amber brand → `brand`/indigo, stone → πeme neutral).

## App shell and navigation

| Component | Classification | Notes |
|---|---|---|
| `components/BlogHeader.tsx` | Retokenize → done; Refactor later | Sticky masthead; keep. Map to spec nav shell in later stage. |
| `components/BlogFooter.tsx` | Retokenize → done; Retain | Shared footer, newsletter inline. |
| `components/BrandLogo.tsx` | Retokenize → done; Retain | Wordmark uses πeme primary. |
| `components/PageState.tsx` | Refactor | loading/empty/error/404 → spec Feedback states (skeleton mirrors layout, empty state explains + one action). |

## Content and reading

| Component | Classification | Notes |
|---|---|---|
| `components/ArticleFeed.tsx`, `HomeFeed.tsx`, `FeaturedArticle.tsx` | Retokenized; Refactor → `SearchResult`/feed cards | Map to spec Source/Claim cards later. |
| `components/MarkdownBody.tsx` | Retokenized; Retain | Reading prose (`.reading-prose`, 72ch). |
| `components/ArticleInteractions.tsx`, `ReadingActions.tsx`, `ReadingProgress.tsx`, `PrintButton.tsx` | Retokenized; Retain | Print → spec §33 print/PDF. |
| `components/ArticleDiscussion.tsx` | Refactor → `ReviewThread` / Scholarly Dialogue | Comments today; add review/suggestion/decision states. |
| `components/NewsletterSignup.tsx` | Retokenized; Retain | Inline footer only. |

## Authors

| Component | Classification | Notes |
|---|---|---|
| `components/AuthorAvatar.tsx` | Retokenized; Retain | Uploaded profile photo, or a deterministic domain SVG fallback; no network calls. |
| `components/AuthorDirectory.tsx`, `AuthorArchive.tsx`, `AuthorProfileCard.tsx`, `AuthorSpotlight.tsx` | Retokenized; Retain/Refactor | Directory → FilterPanel + SearchResult mapping. |
| `components/AuthorImpactRadarChart.tsx` | Refactor → accessible chart | recharts radar; needs table alternative + keyboard access per spec §32 (data viz). |

## CMS / studio

| Component | Classification | Notes |
|---|---|---|
| `components/cms/DashboardShell.tsx`, `PostEditor.tsx`, `MarkdownEditor.tsx` | Retokenized; Refactor → editor package | Autosave exists; add annotations, citation anchoring, conflict states per spec §29. |
| `components/cms/StatusBadge.tsx` | Refactor → TrustAssessmentSummary | draft/published → lifecycle + trust dimensions (independent). |
| `components/cms/ConfirmDelete.tsx` | Retokenized; Retain | Inline two-step confirm (good pattern). |
| `components/cms/styles.ts` | Retokenize → component tokens | Shared class strings; move to token-mapped component classes. |
| `components/dashboard/ApplicationQueue.tsx`, `AuthorApplication.tsx` | Retokenized; Retain | Server-enforced approval flow preserved. |

## Media

| Component | Classification | Notes |
|---|---|---|
| `components/VideoEmbed.tsx` | Refactor → Remotion/Hyperframes player | Must consume generated tokens, captions/transcript, reduced/static modes per spec §10–14, §38. |

## Target components with no current equivalent (new, staged per migration plan)

`SourceCard`, `EvidenceCard` (first reference component), `ClaimCard`, `Citation` (component form of `/cite`), `TrustAssessmentSummary`, `ReviewThread`, `IntegrityNotice`, `AIProvenanceDisclosure`, `ResearchWorkspace`, `ProvenanceGraph` (+ list alternative), `DataTable`, `SearchResult`, `FilterPanel`, accessible primitives (Dialog, Sheet, Toast, Alert, Skeleton, EmptyState), command palette.
