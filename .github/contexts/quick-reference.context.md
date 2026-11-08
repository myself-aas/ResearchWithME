# ResearchWithMe Quick Reference Context

## Essential Commands

### Development
```bash
# Start dev server
bun run dev

# Type checking
bun run typecheck
bun run typecheck --watch

# Linting
bun run lint
bun run lint --fix

# Testing
bun test
bun test --watch
bun test --coverage

# Quality gate (run before commit/PR)
bun run quality

# Build
bun run build

# Preview production build
bun run preview
```

### Database (Supabase)
```bash
# Start local Supabase
supabase start

# Reset database (apply migrations)
supabase db reset

# Create new migration
supabase migration new migration_name

# Push migrations to local
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > lib/supabase/types.ts

# Open Supabase Studio
supabase studio
```

### Deployment (Cloudflare)
```bash
# Deploy to preview
wrangler deploy --env preview

# Deploy to production
wrangler deploy --env production

# View logs
wrangler tail

# List deployments
wrangler deployments list

# Rollback
wrangler rollback <deployment-id>

# Set secrets
wrangler secret put SECRET_NAME
```

### HyperFrames Video
```bash
# Lint composition
npx hyperframes lint

# Check composition
npx hyperframes check

# Preview in browser
npx hyperframes preview

# Render video
npx hyperframes render

# Catalog registry blocks
npx hyperframes catalog
npx hyperframes catalog --search "keyword"
```

## Key File Paths

### Configuration
```
next.config.ts           # Next.js config
open-next.config.ts      # OpenNext config
wrangler.jsonc           # Cloudflare Workers config
tsconfig.json            # TypeScript config
vitest.config.ts         # Vitest config
eslint.config.mjs        # ESLint config
postcss.config.mjs       # PostCSS config
tailwind.config.ts       # Tailwind config (if exists)
```

### Core Application
```
app/
  layout.tsx             # Root layout
  page.tsx               # Home page
  globals.css            # Global styles + design tokens
  middleware.ts          # Edge middleware
  api/                   # API routes
  post/[slug]/           # Article pages
  paper/[id]/            # Paper pages
  author/[id]/           # Author pages
  category/[slug]/       # Category pages
```

### Libraries
```
lib/
  db.ts                  # Supabase client (server-only)
  blog-data.ts           # Article queries
  research-data.ts       # Paper/research queries
  auth-context.tsx       # Auth React context
  citations.ts           # Citation formatting
  format.ts              # Date, string formatting
  seo.ts                 # Metadata generation
  validation.ts          # Zod schemas
  rate-limit.ts          # Rate limiting
  utils.ts               # General utilities
```

### Components
```
components/
  ArticleFeed.tsx        # Article listing
  ArticleInteractions.tsx # Likes, bookmarks, shares
  AuthorProfileCard.tsx  # Author display
  MarkdownBody.tsx       # MDX rendering
  ReadingProgress.tsx    # Scroll indicator
  VideoEmbed.tsx         # Video player
  BrandLogo.tsx          # Logo component
  BlogHeader.tsx         # Site header
  BlogFooter.tsx         # Site footer
```

### Database
```
supabase/
  migrations/            # SQL migrations (idempotent)
```

### Video Content
```
videos/
  explainer/             # Paper explainer videos
  edition-trailer/       # Edition trailers
  radar-chart/           # Author impact charts
```

### Documentation
```
docs/
  ResearchWithMe_Template.md  # Article template
  deployment.md               # Deployment guide
  supabase-cms.md             # CMS documentation
```

## Environment Variables

### Required
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

### Optional
```env
RESEND_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Common Patterns

### Supabase Query (Server Component)
```typescript
import { db } from '@/lib/db'

const { data: articles } = await db
  .from('articles')
  .select('*, author:profiles(*)')
  .eq('status', 'published')
  .order('published_at', { ascending: false })
  .limit(10)
```

### API Route Handler
```typescript
// app/api/articles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { articleSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  
  const { data, error } = await db
    .from('articles')
    .select('*, author:profiles(*)', { count: 'exact' })
    .eq('status', 'published')
    .range((page - 1) * limit, page * limit - 1)
    .order('published_at', { ascending: false })
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({
    data,
    pagination: { page, limit, total: error?.count || 0 }
  })
}
```

### Client Component with Auth
```typescript
'use client'
import { useAuth } from '@/lib/auth-context'

export function LikeButton({ articleSlug }: { articleSlug: string }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  
  const handleLike = async () => {
    if (!user) return redirect('/login')
    const res = await fetch(`/api/articles/${articleSlug}/like`, { method: 'POST' })
    if (res.ok) setLiked(!liked)
  }
  
  return <button onClick={handleLike} className={liked ? 'liked' : ''}>♥</button>
}
```

### MDX Component
```typescript
// components/MarkdownBody.tsx
import { MDXRemote } from 'next-mdx-remote/rsc'
import { components } from './mdx-components'

export function MarkdownBody({ source }: { source: string }) {
  return <MDXRemote source={source} components={components} />
}
```

## Git Workflow

### Branch Names
```
feat/short-description
fix/short-description
docs/short-description
refactor/short-description
test/short-description
```

### Commit Format
```
type(scope): description

- Detail 1
- Detail 2

Closes #123
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

## VS Code Shortcuts

### Command Palette
- `Ctrl+Shift+P` - Open command palette
- `Ctrl+P` - Quick open file
- `Ctrl+Shift+O` - Go to symbol
- `Ctrl+G` - Go to line

### Terminal
- `Ctrl+`` - Toggle terminal
- `Ctrl+Shift+`` - New terminal

### Debug
- `F5` - Start debugging
- `F9` - Toggle breakpoint
- `F10` - Step over
- `F11` - Step into

### Git
- `Ctrl+Shift+G` - Source control
- `Ctrl+Enter` - Commit
- `Ctrl+Shift+Enter` - Commit & push

## Troubleshooting

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
bun install

# Clear Turbo cache
rm -rf .turbo
```

### Type Errors
```bash
# Restart TS server
# VS Code: Ctrl+Shift+P > "TypeScript: Restart TS Server"

# Check types
bun run typecheck
```

### Supabase Issues
```bash
# Reset local DB
supabase db reset

# Check status
supabase status

# View logs
supabase logs
```

### Deployment Issues
```bash
# Check wrangler config
wrangler whoami

# View deployment logs
wrangler tail --format=pretty

# Check secrets
wrangler secret list
```

## Useful Links

### Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [React 19 Docs](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [OpenNext](https://opennext.js.org)
- [Vitest](https://vitest.dev)
- [HyperFrames](https://hyperframes.dev)

### Project Specific
- `PRODUCT.md` - Product vision
- `DESIGN.md` - Design system
- `docs/ResearchWithMe_Template.md` - Article template
- `.github/contexts/` - All context files
- `.github/instructions/` - Agent instructions
- `.github/agents/` - Custom agents