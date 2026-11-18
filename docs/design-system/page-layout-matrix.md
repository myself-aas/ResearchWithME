# Public Page Layout Matrix

This inventory records the intended page-family layouts for the Next.js app and the Cloudflare Pages target. Content remains the reason for each column: add a rail only when it contains useful navigation or verifiable facts. Do not expand long-form prose to fill the canvas, add generic dashboard cards, or duplicate navigation already supplied by the application shell.

Breakpoints follow the design-system layout scale. Collection cards use one column below `md`, two columns from `md` to below `xl`, and three columns at `xl` and wider. Reading columns remain capped at `48rem`. Rails stack after primary content on small screens and sit beside it only when both columns fit.

| Route | Page family | Layout | Justification / constraint |
| --- | --- | --- | --- |
| `/` | Discovery | Full-width feature and search controls; equal-weight article and category collections use 1 / 2 / 3 columns (`xl` for three). | Search, filters, editorial categories, and article cards are the primary task; no generic sidebar. |
| `/category/[slug]` | Filtered collection | Full-width controls and equal-weight article cards use 1 / 2 / 3 columns (`xl` for three). | Category context and search are already on-page. |
| `/papers` | Research archive | Full-width controls; results retain their own two-part article/context cards. | DOI, citation, license, and paper details are intrinsic to each record; no extra rail. |
| `/authors` | Directory | Full-width search/identifier controls; author cards use 1 / 2 / 3 columns (`xl` for three). | Equal-weight contributor cards; filters remain accessible above results. |
| `/editions` | Edition collection | Equal-weight edition cards use 1 / 2 / 3 columns (`xl` for three). | Editions are an even collection; no secondary facts rail is needed. |
| `/author/[id]` | Author archive | Author identity and current profile details span the page; archive and factual work summary form a two-column layout at `lg`, stacked below it. | The summary uses only counts/categories/latest works derived from this author's published articles; omit it when there are no works. |
| `/paper/[slug]` | Reader detail | Primary reading column plus one relevant paper-context sidebar at wide widths; stacked on small screens. | Preserve source metadata and `48rem` reading measure; no three-column reading. |
| `/post/[slug]` | Reader detail | Primary reading column plus one relevant article-context sidebar at wide widths; stacked on small screens. | Preserve citations/provenance and `48rem` reading measure. |
| `/about` | Long reference | Reading column plus section-navigation rail at `lg`; stacked below. | Rail links only to the four real document sections. |
| `/privacy` | Long reference | Reading column plus section-navigation rail at `lg`; stacked below. | Rail links only to the four real policy sections. |
| `/api-docs` | Developer reference | API operation content plus generated group navigation rail at `lg`; introduction remains full-width. | The rail maps to actual operation groups; code blocks scroll within their own bounds. |
| `/contact` | Focused form | Single-column form with readable measure. | Keep the contact task focused; no supplementary panel. |
| `/editorial-board` | Directory/reference | Existing member collection uses equal-weight cards; three columns only at `xl`; no invented metrics. | People and roles are the page's content. |
| `/assistant` | Focused tool | Existing conversation/workspace composition retained; side context belongs only where it supports the active assistant task. | Preserve the current focused research workflow; no unrelated rail. |
| `/bookmarks` | Personal collection | Single-column reading-list flow with responsive cards as currently defined. | The task is reviewing and managing saved items, not dashboard browsing. |
| `/cite` | Focused tool | Single-column citation task; any source/context area remains task-specific. | Do not add unrelated navigation or cards. |
| `/login` | Focused form | Single-column authentication flow. | Keep attention on sign-in. |
| `/write` | Focused editor | Editor canvas and its task-specific controls. | Do not add public-site rails to the writing workflow. |
| `/dashboard` | Editorial studio | Existing dashboard shell and navigation rail. | Do not create a second global sidebar. |
| `/dashboard/access` | Studio workflow | Existing shell plus focused access-management content. | Use only the studio's relevant navigation and controls. |
| `/dashboard/applications` | Studio workflow | Existing shell plus application review content. | Keep review actions near their records. |
| `/dashboard/comments` | Studio workflow | Existing shell plus comment moderation content. | Keep moderation task-specific. |
| `/dashboard/manage` | Studio workflow | Existing shell plus post-management content. | Preserve the existing studio structure. |
| `/dashboard/profile` | Studio workflow | Existing shell plus the profile form, grouped into identity, affiliation, links, and about. | Editing the caller's own directory row; no second sidebar and no metrics that a query did not return. |
| `/dashboard/edit/[id]` | Studio editor | Existing shell and focused editor canvas. | Editing remains a focused task. |
| `/articles` | Redirect | Redirects to the canonical discovery route. | No standalone page layout. |
| `/not-found` | Focused state | Single-column recovery message. | Offer relevant navigation without decorative panels. |
| `/error` | Focused state | Single-column recovery message. | Keep recovery action prominent. |
| `global-error` | Focused state | Minimal single-column recovery UI. | Must remain robust when application chrome fails. |

## Responsive verification contract

- Validate public Pages routes at 320, 768, 1024, 1440, and 1920 CSS px.
- Prevent document-level horizontal overflow at every tested width; code examples may scroll inside their own `<pre>` elements.
- Keep prose within `48rem` even on wide screens. At 200% zoom, rails and controls must reflow without clipping.
- Below `lg`, section navigation and author summaries follow the primary content in DOM/visual order. At `lg` and wider, they sit beside the main content without overlap.
- Forms, reading views, assistant tasks, and editorial workflows retain their focused page-family patterns.
