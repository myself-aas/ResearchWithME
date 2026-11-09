# ResearchWithMe Architecture Context

## System Architecture

### Frontend (Next.js 15 App Router)
- **App Router**: File-based routing under `app/`
- **Server Components**: Default for all components
- **Client Components**: Explicit `'use client'` directive
- **Middleware**: `middleware.ts` for auth, redirects, rate limiting

### Backend (Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Auth with OAuth providers (GitHub, Google, ORCID)
- **Storage**: Supabase Storage for assets
- **Real-time**: Supabase Realtime for comments, notifications

### API Layer
- **Route Handlers**: Under `app/api/` for server-side logic
- **CMS API**: `/api/cms/*` for content management (never direct Supabase client-side with service-role key)
- **Auth API**: `/api/auth/*` for authentication flows
- **Revalidation**: `/api/revalidate` for ISR cache invalidation

## Data Flow

### Article/Paper Content
1. **Writing access**: reader applies at `/dashboard/access` → an editor approves (`public.editors`)
2. **Publishing**: an approved writer publishes via `/write` or the studio → Supabase → revalidation
3. **Reading**: `/paper/[id]` or `/post/[slug]` → Server Components → Supabase

### User Authentication
1. **Providers**: GitHub, Google, ORCID, Email
2. **Session**: Supabase JWT in HttpOnly cookies
3. **Middleware**: Validates session on protected routes
4. **Profile**: `/author/[id]` → Supabase profiles table

## Key Components

### Shared UI (`components/`)
- `ArticleFeed.tsx` - Article listing with pagination
- `ArticleInteractions.tsx` - Likes, bookmarks, shares
- `AuthorProfileCard.tsx` - Author info display
- `MarkdownBody.tsx` - MDX rendering with citations
- `ReadingProgress.tsx` - Scroll progress indicator
- `VideoEmbed.tsx` - HyperFrames video player

### Data Access (`lib/`)
- `db.ts` - Supabase client (server-side only)
- `blog-data.ts` - Article/paper queries
- `research-data.ts` - Research-specific queries
- `citations.ts` - Citation parsing and formatting
- `seo.ts` - Metadata generation
- `auth-context.tsx` - React context for auth state

## Database Schema (Key Tables)
- `articles` - Published content
- `papers` - Research papers with metadata
- `authors` - User profiles
- `comments` - Discussion threads
- `bookmarks` - User bookmarks
- `author_applications` - Writer applications approved into `public.editors`
- `categories` - Content categorization

## Deployment
- **Platform**: Cloudflare Workers via OpenNext (`open-next.config.ts`, `wrangler.jsonc`)
- **Edge**: Middleware runs at edge
- **ISR**: Incremental Static Regeneration for content pages
- **Headers**: `_headers` for caching, security

## Security
- **RLS**: All Supabase tables have Row Level Security policies
- **Service Role**: Only in server-side API routes, never client
- **Rate Limiting**: `/lib/rate-limit.ts` for API protection
- **CSP**: Content Security Policy via headers