# ResearchWithMe — Page Tree Structure

Generated from `app/**/page.tsx` and `app/**/layout.tsx` files.

---

## Root Layout (`app/layout.tsx`)

**Global Providers & Shell**
- `MotionModeProvider` — motion system runtime
- `MotionScope` — lazy motion feature bundle
- `RouteTransition` — page transitions
- Theme init script (inline)
- WebMCP script (deferred)
- Skip-to-main-content link
- **Metadata:**
  - `title.default`: "ResearchWithMe"
  - `title.template`: `%s | reme`
  - `applicationName`: "ResearchWithMe"
  - `siteName`: "reme"
  - Icons: favicon.ico, favicon.svg, favicon-32x32.png, favicon-16x16.png, apple-touch-icon.png
  - Theme color: semanticLight.canvas / semanticDark.canvas

**Grid/Columns:** Single column, full-width (`min-h-screen flex flex-col`)

---

## Public Pages

### `/` — Home (`app/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** 
- Single column feed (`HomeFeed` renders as single column)
- Authors sidebar rendered conditionally (not a separate column in this view)

**Sections:**
1. JSON-LD Website schema (when no search)
2. `HomeFeed` component
   - Initial category: "All"
   - Initial search from query params
   - Authors from `getCachedPublishedAuthors()`
   - Posts from `getCachedFeedArticles()`
**Metadata:** Dynamic based on search/category params
**Redirects:** Legacy `?category=` → `/category/{slug}`

### `/post/[slug]` — Article (`app/post/[slug]/page.tsx`)
**Layout:** `app/post/[slug]/layout.tsx` (if exists) → Root layout
**Grid/Columns:**
- **Desktop (lg+):** Two-column grid `lg:grid-cols-[minmax(0,1fr)_19rem]` with `lg:gap-12`
  - Main article: `min-w-0` (flexible, takes remaining space)
  - Aside: Fixed `19rem` width, `lg:sticky lg:top-24`
- **Mobile/Tablet:** Single column, aside stacks below main content

**Sections:**
1. JSON-LD Article schema
2. `ReadingProgress` bar (full-width, fixed top)
3. `ArticleSmoothScroll` (wrapper)
4. `BlogHeader` (full-width)
5. **Main Article Area (grid):**
   - **Main Column (`min-w-0`):**
     - Breadcrumb (Index → Category → Article)
     - Header: category badge, title, subtitle, author, date, read time
     - Author byline with `SpecialistBadgePopover`
     - `ArticleInteractions` (likes)
     - Cover image figure (`aspect-[16/9]`, `rounded-2xl`)
     - Key takeaways section (`rounded-2xl border border-line bg-surface p-5`)
     - Body: `MarkdownBody` (if `bodyMarkdown`) or `reading-prose` with inline citations
     - Reviewed artifact card (if present) — `Card` with `InlineCitationPopover`
     - Tags (flex wrap gap-2)
     - `AuthorProfileCard` (compact)
     - `ArticleServiceNote`
     - `ReadingProgressDock` (inline)
     - `DeferredDiscussion` (comments)
     - Related reviews section (grid of links)
   - **Aside Column (`19rem`, sticky):**
     - Citation card (APA/MLA/Chicago/BibTeX/RIS) — `Card` with `InlineCitationPopover`
     - Archival record card (URL, licence, column, format, published) — `Card` with `dl`
     - `WorkflowDisclosure` (publication) — `Card`
     - Verification note card — `Card`
6. `BlogFooter` (full-width)
**Metadata:** Dynamic from article data

### `/category/[slug]` — Category Feed (`app/category/[slug]/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column feed (same as Home, filtered by category)
**Sections:**
1. `HomeFeed` with `initialCategory` set
**Static Params:** All categories from `CATEGORIES`
**Metadata:** Dynamic from category

### `/authors` — Writers Directory (`app/authors/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, centered (`mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8`)
- Authors rendered in a grid: `grid gap-10 pt-12 md:grid-cols-2 lg:grid-cols-4`
- Each author card spans full width on mobile, 1/2 on md, 1/4 on lg

**Sections:**
1. `AuthorsDirectoryPage` with authors from `listPublishedAuthors()`
**Metadata:** "Writers" page

### `/author/[id]` — Author Profile (`app/author/[id]/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, max-width `max-w-5xl` (`mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12`)
- Profile card: Full width
- Articles list: Single column (`AuthorArchiveLayout`)

**Sections:**
1. JSON-LD Person schema
2. `BlogHeader`
3. Breadcrumb (Platform → Authors → Author)
4. `AuthorProfileCard` with metrics (full width)
5. `AuthorArchiveLayout` with articles (single column)
6. `BlogFooter`
**Metadata:** Dynamic from author data

### `/assistant` — Research Assistant (`app/assistant/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, full-width (`AssistantPanel` handles its own internal layout)
**Sections:**
1. `AssistantPanel` with initial articles

### `/cite` — Citation Builder (`app/cite/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, full-width (`CitationTool` handles internal layout)
**Sections:**
1. `CitationTool` with initial articles
**Metadata:** Dynamic based on `?article=` param

### `/bookmarks` — Reading List (`app/bookmarks/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, full-width (`BookmarksPanel` handles internal layout)
**Sections:**
1. `BookmarksPanel` with initial articles

### `/contact` — Contact (`app/contact/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, full-width (`ContactPage` handles internal layout)
**Sections:**
1. JSON-LD ContactPage schema
2. `ContactPage` component

### `/about` — About (`app/about/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, full-width (`AboutPage` handles internal layout)
**Sections:**
1. JSON-LD AboutPage schema
2. `AboutPage` component

### `/editorial-board` — Editorial Board (`app/editorial-board/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, full-width (`EditorPage` handles internal layout)
**Sections:**
1. `EditorPage` component

### `/login` — Sign In (`app/login/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** 
- Desktop (lg+): Two-column grid `lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-16`
  - Left: Hero + feature list (flex-1)
  - Right: `LoginForm` (fixed 24rem width)
- Mobile: Single column stack

**Sections:**
1. `BlogHeader`
2. Hero: "Write, review, and publish" (left column)
3. Feature list (editor, verified bylines, moderation queue) (left column)
4. `LoginForm` component (right column on lg+, below on mobile)
5. `BlogFooter`
**Metadata:** Robots noindex/nofollow

### `/privacy` — Privacy Policy (`app/privacy/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, full-width (`PrivacyPage` handles internal layout)
**Sections:**
1. `PrivacyPage` component

### `/settings` — Settings (`app/settings/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, full-width (`SettingsPage` handles internal layout)
**Sections:**
1. `SettingsPage` component
**Metadata:** Robots noindex/nofollow

### `/motion` — Motion Lab (`app/motion/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, max-width `max-w-7xl` (`mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-10 sm:px-6 lg:px-8`)
**Sections:**
1. `BlogHeader`
2. Breadcrumb (single row)
3. Header: "Motion that explains, never decorates" (full width)
4. `MotionLab` component (full width)
5. `BlogFooter`
**Metadata:** Robots noindex/follow

### `/api-docs` — API Reference (`app/api-docs/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, full-width (`ApiDocsReference` handles internal layout)
**Sections:**
1. `ApiDocsReference` component

---

## Dashboard Pages (Reader)

### `/dashboard/reading` — My Reading (`app/dashboard/reading/page.tsx`)
**Layout:** `app/dashboard/layout.tsx` (if exists) → Root layout
**Grid/Columns:**
- `DashboardHeader`: Full width
- `KpiGrid`: 3 columns (`columns={3}`)
- Main content: `grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-5`
  - `ReadNextPanel`: `lg:col-span-3`
  - Coverage `Panel` with `RankedBars`: `lg:col-span-2`
- `NewArticlesPanel`: Full width
- `DashboardFooter`: Full width

**Sections:**
1. `DashboardHeader` with period selector
2. `KpiGrid` (3 columns):
   - `ReadingListKpi`
   - New articles KPI (with sparkline)
   - Account access KPI (status label + action)
3. Grid (5 columns on lg):
   - `ReadNextPanel` (lg:col-span-3)
   - Coverage `Panel` with `RankedBars` (lg:col-span-2)
4. `NewArticlesPanel` (scroll-mt-6)
5. `DashboardFooter`
**Metadata:** Robots noindex/nofollow/nocache

### `/dashboard/account` — Your Account (`app/dashboard/account/page.tsx`)
**Layout:** Shared dashboard shell
**Sections:** Free API keys and monthly usage; profile, writer identity, and settings links.
**Failure states:** Key loading and usage fail independently; profile links remain available.
**Metadata:** Robots noindex/nofollow/nocache

### `/dashboard/access` — Apply to Write (`app/dashboard/access/page.tsx`)
**Layout:** Root layout
**Grid/Columns:** Single column, max-width `max-w-3xl` (`mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10`)
- Header: Full width
- Profile photo card: Full width (if profile exists)
- `AuthorApplication`: Full width

**Sections:**
1. Header: "Apply to write"
2. Profile photo card (if profile exists)
3. `AuthorApplication` component with applications list
4. `PageState` if Supabase not configured
**Metadata:** Robots noindex/nofollow/nocache

---

## Dashboard Pages (Studio/Editor)

### `/dashboard` — Editorial Studio Home (`app/dashboard/(studio)/page.tsx`)
**Layout:** `app/dashboard/(studio)/layout.tsx` (editor gate)
**Grid/Columns:** Single column, full-width (`PostEditor` handles internal layout)
**Sections:**
1. `PostEditor` mode="create"

### `/dashboard/writing` — My Writing (`app/dashboard/(studio)/writing/page.tsx`)
**Layout:** `app/dashboard/(studio)/layout.tsx`
**Grid/Columns:**
- `DashboardHeader`: Full width
- `KpiGrid`: 5 columns (`columns={5}`)
- Alerts: Full width
- Drafts `Panel`: Full width
- Grid (5 columns on lg): `grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-5`
  - Publishing trend `Panel` with `TrendChart`: `lg:col-span-3`
  - Top articles `Panel` with `RankedBars`: `lg:col-span-2`
- Published articles `Panel`: Full width
- `DashboardFooter`: Full width

**Sections:**
1. `DashboardHeader` with period selector
2. `KpiGrid` (5 columns):
   - Drafts in progress (lead, wide)
   - Published (with sparkline)
   - Lead time (median days)
   - Likes per article (vs desk average)
   - Comments (with sparkline)
3. `Alerts` from `writerAlerts`
4. Drafts `Panel` with `DetailTable` (scroll-mt-6)
5. Grid (5 columns on lg):
   - Publishing trend `Panel` with `TrendChart` (lg:col-span-3)
   - Top articles `Panel` with `RankedBars` (lg:col-span-2)
6. Published articles `Panel` with `DetailTable`
7. `DashboardFooter`

### `/dashboard/manage` — Manage Articles (`app/dashboard/(studio)/manage/page.tsx`)
**Layout:** `app/dashboard/(studio)/layout.tsx`
**Client Component**
**Grid/Columns:** Single column, full-width
- Header: `flex flex-wrap items-end justify-between gap-4`
- Filter bar: `flex flex-wrap items-end justify-between gap-4`
  - Search input: `w-full max-w-sm`
  - Status filter tabs: `inline-flex rounded-md border border-border-strong bg-surface-raised p-0.5`
  - Live updates indicator: inline
- Articles table: `ul divide-y divide-line rounded-lg border border-line bg-surface-raised`
  - Each row: `grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start`
    - Left: Title, status, meta (flex-1)
    - Right: Actions (View, Edit, Publish/Revert, Delete)

**Sections:**
1. Header with "New article" button
2. Notice/error banners
3. Filter bar:
   - Search input
   - Status filter tabs (All/Drafts/Published) with counts
   - Live updates indicator
4. Loading skeleton
5. Empty state (no articles)
6. Articles table:
   - Title (link to edit)
   - StatusBadge
   - Featured badge
   - Slug, author, category, updated date
   - Actions: View (if published), Edit, Publish/Revert, Delete (ConfirmDelete)
7. `WorkflowDisclosure` (publication)

### `/dashboard/edit/[id]` — Edit Article (`app/dashboard/(studio)/edit/[id]/page.tsx`)
**Layout:** `app/dashboard/(studio)/layout.tsx`
**Client Component**
**Grid/Columns:** Single column, full-width (`PostEditor` handles internal layout)
**Sections:**
1. Loading skeleton
2. Error state with retry
3. `PostEditor` mode="edit" with initialPost
4. `WorkflowDisclosure` (collaboration)

### `/dashboard/desk` — Desk Overview (`app/dashboard/(studio)/desk/page.tsx`)
**Layout:** `app/dashboard/(studio)/layout.tsx`
**Grid/Columns:**
- `DashboardHeader`: Full width
- `KpiGrid`: 5 columns (`columns={5}`)
- `Alerts`: Full width
- Grid (5 columns on lg): `grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-5`
  - Publishing trend `Panel` with `TrendChart`: `lg:col-span-3`
  - Coverage `Panel` with `RankedBars`: `lg:col-span-2`
- Drafts `Panel`: Full width (scroll-mt-6)
- Grid (1fr): `grid grid-cols-1 gap-y-10`
  - Writers `Panel` with `DetailTable`
  - Pending applications `Panel` with `DetailTable` (with action link)
- `DashboardFooter`: Full width

**Sections:**
1. `DashboardHeader` with period selector
2. `KpiGrid` (5 columns):
   - Applications awaiting decision (lead, wide)
   - Published (with sparkline)
   - Stalled drafts
   - Lead time
   - Comments
3. `Alerts` from `deskAlerts`
4. Grid (5 columns on lg):
   - Publishing trend `Panel` with `TrendChart` (lg:col-span-3)
   - Coverage `Panel` with `RankedBars` (lg:col-span-2)
5. Drafts `Panel` with `DetailTable` (scroll-mt-6)
4. Grid (1fr):
   - Writers `Panel` with `DetailTable`
   - Pending applications `Panel` with `DetailTable` (with action link)
5. `DashboardFooter`

### `/dashboard/comments` — Comments Moderation (`app/dashboard/(studio)/comments/page.tsx`)
**Layout:** `app/dashboard/(studio)/layout.tsx`
**Client Component**
**Grid/Columns:** Single column, full-width
- Header: `flex flex-wrap items-end justify-between gap-4`
- Filter bar: Search input (`w-full max-w-sm`) + Live updates indicator
- Comments list: `ul divide-y divide-line rounded-lg border border-line bg-surface-raised`
  - Each comment: `grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start`
    - Left: Author, role, date, post title link, content
    - Right: Delete (ConfirmDelete)

**Sections:**
1. Header with comment count
2. Notice/error banners
3. Filter bar with search input
4. Loading skeleton
5. Empty state
6. Comments list:
   - Author name, role, date
   - Post title link
   - Content
   - Delete (ConfirmDelete)
6. `WorkflowDisclosure` (collaboration)

### `/dashboard/applications` — Writer Applications (`app/dashboard/(studio)/applications/page.tsx`)
**Layout:** `app/dashboard/(studio)/layout.tsx`
**Grid/Columns:** Single column, max-width `max-w-4xl` (`mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10`)
- Header: Full width
- `ApplicationQueue`: Full width (renders table internally)

**Sections:**
1. Header: "Writer applications"
2. `ApplicationQueue` component with applications list

---

## Write Page (Prototype)

### `/write` — Writer Studio Prototype (`app/write/page.tsx`)
**Layout:** Root layout
**Client Component**
**Grid/Columns:** Single column, max-width `max-w-5xl` (`mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-10`)
- Form fields: Mostly single column, some `sm:grid-cols-2` (Category/Author, Format/Artifact URL+Meta)
- Preview tab: Single column article layout

**Sections:**
1. `BlogHeader`
2. Header with:
   - Title "Writer studio"
   - User name + save status
   - Tab switcher (Write/Preview) — `flex rounded-md border border-border-strong bg-surface-raised p-1`
   - Discard draft button (if restored)
3. Error banner
4. **Editor Tab (form):**
   - Article fieldset: Title, Subtitle, Category/Author (sm:grid-cols-2), Format/Artifact (sm:grid-cols-2), Summary
   - Artifact fieldset (conditional): Type, Identifier, Title, URL/Meta (sm:grid-cols-2)
   - Cover image fieldset: Upload banner (if Supabase), crop dialog, remove
   - Body fieldset: `PlateBodyEditor`, read time, char count
   - Takeaways fieldset: List with add/remove (numbered)
   - Tags input
   - Submit bar: Save status, Publish button
   - Note about publishing status
5. **Preview Tab:**
   - Category, format, read time
   - Title, subtitle, author
   - Cover image
   - Summary
   - Key takeaways
   - MarkdownBody (or placeholder)
   - Tags
6. `WorkflowDisclosure` (methodology)
7. `BlogFooter`

---

## Layout Hierarchy

```
app/layout.tsx (Root) — Single column, full-width
├── app/page.tsx (Home) — Single column feed
├── app/post/[slug]/page.tsx (Article) — 2-col lg (main + sticky aside)
├── app/category/[slug]/page.tsx (Category) — Single column feed
├── app/authors/page.tsx (Writers) — Grid: 1col mobile, 2col md, 4col lg
├── app/author/[id]/page.tsx (Author) — Single column, max-w-5xl
├── app/assistant/page.tsx (Assistant) — Single column
├── app/cite/page.tsx (Citation) — Single column
├── app/bookmarks/page.tsx (Bookmarks) — Single column
├── app/contact/page.tsx (Contact) — Single column
├── app/about/page.tsx (About) — Single column
├── app/editorial-board/page.tsx (Editorial) — Single column
├── app/login/page.tsx (Login) — 2-col lg (hero + form), 1col mobile
├── app/privacy/page.tsx (Privacy) — Single column
├── app/settings/page.tsx (Settings) — Single column
├── app/motion/page.tsx (Motion Lab) — Single column, max-w-7xl
├── app/api-docs/page.tsx (API Docs) — Single column
├── app/write/page.tsx (Write Prototype) — Single column max-w-5xl, form fields sm:grid-cols-2
├── app/dashboard/
│   ├── layout.tsx (if exists) — Single column
│   ├── reading/page.tsx (My Reading) — KpiGrid 3col, content 5col lg (3+2)
│   ├── account/page.tsx (Account) — Single column max-w-4xl, plan 3col, buy 2col
│   ├── access/page.tsx (Apply to Write) — Single column max-w-3xl
│   └── (studio)/
│       ├── layout.tsx (Editor Gate) — Single column
│       ├── page.tsx (New Article) — Single column
│       ├── writing/page.tsx (My Writing) — KpiGrid 5col, content 5col lg (3+2)
│       ├── manage/page.tsx (Manage Articles) — Single column, table grid 2col sm
│       ├── edit/[id]/page.tsx (Edit Article) — Single column
│       ├── desk/page.tsx (Desk Overview) — KpiGrid 5col, content 5col lg (3+2), bottom 1fr
│       ├── comments/page.tsx (Comments) — Single column, list grid 2col sm
│       └── applications/page.tsx (Applications) — Single column max-w-4xl
```

---

## Key Components by Page

| Page | Key Components | Grid/Columns |
|------|----------------|--------------|
| Home | `HomeFeed`, `getCachedFeedArticles`, `getCachedPublishedAuthors` | Single column |
| Article | `BlogHeader`, `BlogFooter`, `MarkdownBody`, `ArticleInteractions`, `DeferredDiscussion`, `ReadingProgressDock`, `AuthorProfileCard`, `WorkflowDisclosure` | 2-col lg (main + sticky aside) |
| Category | `HomeFeed` | Single column |
| Authors | `AuthorsDirectoryPage` | Grid: 1col mobile, 2col md, 4col lg |
| Author | `AuthorProfileCard`, `AuthorArchiveLayout`, `BlogHeader`, `BlogFooter` | Single column max-w-5xl |
| Assistant | `AssistantPanel` | Single column |
| Cite | `CitationTool` | Single column |
| Bookmarks | `BookmarksPanel` | Single column |
| Login | `LoginForm`, `BlogHeader`, `BlogFooter` | 2-col lg (hero + form), 1col mobile |
| Write | `PostEditor` (via `PlateBodyEditor`), `LazyImageCropDialog`, `BlogHeader`, `BlogFooter` | Single column max-w-5xl, form fields sm:grid-cols-2 |
| Dashboard Reading | `DashboardHeader`, `KpiGrid`, `ReadingListKpi`, `ReadNextPanel`, `DashboardFooter` | KpiGrid 3col, content 5col lg (3+2) |
| Dashboard Account | `ApiKeys` | Single column max-w-4xl, free API access and profile |
| Dashboard Access | `AuthorApplication`, `ProfilePhotoCard`, `PageState` | Single column max-w-3xl |
| Studio New | `PostEditor` | Single column |
| Studio Writing | `DashboardHeader`, `KpiGrid`, `Alerts`, `DetailTable`, `RankedBars`, `TrendChart`, `DashboardFooter` | KpiGrid 5col, content 5col lg (3+2) |
| Studio Manage | `StatusBadge`, `ConfirmDelete`, `useCmsPosts`, `WorkflowDisclosure` | Single column, table grid 2col sm |
| Studio Edit | `PostEditor`, `WorkflowDisclosure` | Single column |
| Studio Desk | `DashboardHeader`, `KpiGrid`, `Alerts`, `DetailTable`, `RankedBars`, `TrendChart`, `DashboardFooter` | KpiGrid 5col, content 5col lg (3+2), bottom 1fr |
| Studio Comments | `ConfirmDelete`, `useCmsComments`, `WorkflowDisclosure` | Single column, list grid 2col sm |
| Studio Applications | `ApplicationQueue`, `PageState` | Single column max-w-4xl |

---

## Metadata Patterns

| Page Type | Title Pattern | Template | Grid/Columns |
|-----------|---------------|----------|--------------|
| Home | "ResearchWithMe" | `%s | reme` | Single column |
| Article | `{article.title}` | `%s | reme` | 2-col lg (main + sticky aside) |
| Category | `{category} Reviews & Teardowns` | `%s | reme` | Single column |
| Authors | "Writers" | `%s | reme` | Grid: 1col mobile, 2col md, 4col lg |
| Author | `{author.name} — Specialist Reviews` | `%s | reme` | Single column max-w-5xl |
| Assistant | (no metadata export) | — | Single column |
| Cite | "Citation Builder — BibTeX, RIS & APA" or `Cite: {label}` | `%s | reme` | Single column |
| Dashboard | Various | `%s | reme` | Various (see Dashboard section) |
| Studio | Various | `%s | reme` | Various (see Studio section) |

---

## Navigation Structure

```
Header (BlogHeader) — Full width, sticky top
├── Logo (BrandLogo: "reme.") — Left
├── Primary Nav (lg+) — Center
│   ├── Home (/)
│   ├── Writers (/authors)
│   ├── Assistant (/assistant)
├── Search (⌘K) — Right
├── Bookmarks (/bookmarks) — Right
├── Auth/Write CTA — Right
│   ├── Signed in: Account, Write (if editor), Sign out
│   └── Signed out: Sign in, Write for us
└── Mobile Menu (hamburger) — Right
    ├── Search
    ├── Primary Nav
    ├── Secondary Nav (Tools)
    │   ├── Reading list (/bookmarks)
    │   ├── Cite (/cite)
    │   ├── Settings (/settings)
    │   ├── Editor (/editorial-board)
    │   └── Write for us (/dashboard/access or /write)
    └── User Menu (if signed in)

Footer (BlogFooter) — Full width, grid: 1col mobile, 2col md, 4col lg
├── BrandLogo + description — lg:col-span-2
├── Topics (categories) — Single column
├── Explore (10 links) — Single column
└── Bottom bar — Flex row sm:flex-row
    ├── "ResearchWithMe (reme) · Edited by Ashif Ahmed Shuvo"
    ├── Settings, Assistant, Motion system
```

---

## API Routes (Reference)

```
/api/cms/posts (GET, POST)
/api/cms/posts/[id] (GET, PATCH, DELETE)
/api/cms/comments (GET, POST)
/api/cms/comments/[id] (DELETE)
/api/webhooks/article-published (POST)
/api/v1/assistant/answers (POST)
/api/v1/usage (GET)
/api/account/api-keys (GET, POST)
/api/account/api-keys/[keyId] (DELETE)
/api/a2a (POST)
/api/revalidate (POST)
/api/cron/linkedin-batch (GET)
/api/admin/linkedin/auth (GET)
/api/admin/linkedin/callback (GET)
/api/admin/linkedin/post (POST)
/api/admin/linkedin/status (GET)
/api/dashboard/applications (GET, POST)
/api/dashboard/applications/[id] (POST)
/api/articles (GET)
/api/articles/[id] (GET, PATCH)
/api/authors (GET)
/api/authors/[id] (GET)
/api/comments (GET, POST)
```

---

## File-Based Routing Summary

| Route | File | Layout | Grid/Columns |
|-------|------|--------|--------------|
| `/` | `app/page.tsx` | Root | Single column feed |
| `/post/[slug]` | `app/post/[slug]/page.tsx` | Root | 2-col lg (main + sticky aside) |
| `/category/[slug]` | `app/category/[slug]/page.tsx` | Root | Single column feed |
| `/authors` | `app/authors/page.tsx` | Root | Grid: 1col mobile, 2col md, 4col lg |
| `/author/[id]` | `app/author/[id]/page.tsx` | Root | Single column max-w-5xl |
| `/assistant` | `app/assistant/page.tsx` | Root | Single column |
| `/cite` | `app/cite/page.tsx` | Root | Single column |
| `/bookmarks` | `app/bookmarks/page.tsx` | Root | Single column |
| `/contact` | `app/contact/page.tsx` | Root | Single column |
| `/about` | `app/about/page.tsx` | Root | Single column |
| `/editorial-board` | `app/editorial-board/page.tsx` | Root | Single column |
| `/login` | `app/login/page.tsx` | Root | 2-col lg (hero + form), 1col mobile |
| `/privacy` | `app/privacy/page.tsx` | Root | Single column |
| `/settings` | `app/settings/page.tsx` | Root | Single column |
| `/motion` | `app/motion/page.tsx` | Root | Single column max-w-7xl |
| `/api-docs` | `app/api-docs/page.tsx` | Root | Single column |
| `/write` | `app/write/page.tsx` | Root | Single column max-w-5xl, form fields sm:grid-cols-2 |
| `/dashboard/reading` | `app/dashboard/reading/page.tsx` | Dashboard | KpiGrid 3col, content 5col lg (3+2) |
| `/dashboard/account` | `app/dashboard/account/page.tsx` | Dashboard | Single column max-w-4xl, plan 3col, buy 2col |
| `/dashboard/access` | `app/dashboard/access/page.tsx` | Dashboard | Single column max-w-3xl |
| `/dashboard` | `app/dashboard/(studio)/page.tsx` | Studio | Single column |
| `/dashboard/writing` | `app/dashboard/(studio)/writing/page.tsx` | Studio | KpiGrid 5col, content 5col lg (3+2) |
| `/dashboard/manage` | `app/dashboard/(studio)/manage/page.tsx` | Studio | Single column, table grid 2col sm |
| `/dashboard/edit/[id]` | `app/dashboard/(studio)/edit/[id]/page.tsx` | Studio | Single column |
| `/dashboard/desk` | `app/dashboard/(studio)/desk/page.tsx` | Studio | KpiGrid 5col, content 5col lg (3+2), bottom 1fr |
| `/dashboard/comments` | `app/dashboard/(studio)/comments/page.tsx` | Studio | Single column, list grid 2col sm |
| `/dashboard/applications` | `app/dashboard/(studio)/applications/page.tsx` | Studio | Single column max-w-4xl |
```

This completes the page tree structure documentation with comprehensive grid/column layout information for every page.