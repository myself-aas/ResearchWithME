# ResearchWithMe Development Workflows Context

## Quality Assurance Workflow

### Pre-commit Checks
```bash
npm run quality          # Full quality gate (lint + typecheck + test + impeccable)
npm run lint             # ESLint only
npm run typecheck        # TypeScript only
npm test                 # Vitest only
npm run impeccable:source # Impeccable source scan only
```

### CI/CD Pipeline (`.agents/workflows/quality.yml`)
1. **Install**: `bun install --frozen-lockfile`
2. **Lint**: `npm run lint`
3. **Typecheck**: `npm run typecheck`
4. **Test**: `npm test`
5. **Impeccable**: `npm run impeccable:source`
6. **Build**: `npm run build`

## Development Workflows

### Adding a New Route
1. Create route under `app/[route]/page.tsx`
2. Add layout if needed: `app/[route]/layout.tsx`
3. Create surface brief: `.agents/surfaces/[route].md`
4. Update `DESIGN.md` if new patterns
5. Run `npm run quality`

### Adding a New Component
1. Create under `components/` (shared) or `app/[route]/components/` (route-specific)
2. Follow naming: PascalCase, `.tsx` extension
3. Use Tailwind v4 tokens (no arbitrary values)
4. Export from `components/index.ts` if shared
5. Add tests in `__tests__/` if complex

### Adding API Route
1. Create under `app/api/[resource]/route.ts`
2. Use Supabase client from `lib/db.ts` (server-only)
3. Validate input with `lib/validation.ts`
4. Apply rate limiting from `lib/rate-limit.ts`
5. Return typed responses

### Database Changes
1. Create migration in `supabase/migrations/`
2. Use idempotent SQL (IF NOT EXISTS, etc.)
3. Include RLS policies
4. Test locally with `supabase db reset`
5. Deploy via Supabase CLI

### Content Management
1. CMS writes via `/api/cms/*` endpoints
2. Never use service-role key client-side
3. Revalidate with `/api/revalidate` after changes
4. Use `lib/blog-data.ts` for queries

## HyperFrames Video Workflow

### Creating Videos
1. Read `/hyperframes` skill first
2. Use `/hyperframes-registry` for pre-built blocks
3. Source media via `/media-use`
4. Scaffold with `/hyperframes-cli`
5. Lint: `npx hyperframes lint`
6. Check: `npx hyperframes check`
7. Render: `npx hyperframes render`

### Video Types
- **Explainer**: Paper breakdowns (60-90s)
- **Edition Trailer**: Compendium promotions
- **Radar Chart**: Author impact visualizations
- **Slideshow**: `/editions` presentations

## Git Workflow

### Branch Naming
- `feat/[short-description]` - New features
- `fix/[short-description]` - Bug fixes
- `docs/[short-description]` - Documentation
- `refactor/[short-description]` - Code improvements
- `test/[short-description]` - Test additions

### Commit Messages
```
feat: add author impact radar chart component

- Create AuthorImpactRadarChart.tsx with Recharts
- Add radar chart data transformation in lib/research-data.ts
- Update author profile page to include chart

Closes #123
```

### PR Process
1. Create PR with descriptive title
2. Link related issues
3. Ensure `npm run quality` passes
4. Request review from maintainers
5. Squash merge after approval

## Testing Strategy

### Unit Tests (`vitest.config.ts`)
- Location: `__tests__/` adjacent to source
- Naming: `[file].test.ts` or `[file].spec.ts`
- Run: `npm test` or `npm test -- --watch`

### Integration Tests
- API routes: Test via `app/api/**/__tests__/`
- Database: Use Supabase local instance
- Auth: Mock Supabase auth helpers

### E2E Tests (Future)
- Playwright for critical user flows
- Run in CI on PR

## Code Style

### TypeScript
- Strict mode enabled
- Explicit return types for public APIs
- Use `type` over `interface` for unions
- Prefer `const` assertions for literals

### React
- Server Components by default
- Client Components only when needed
- Use `React.FC` sparingly
- Props destructuring in signature

### Tailwind CSS v4
- Use design tokens from `globals.css`
- No arbitrary values (`w-[123px]`)
- Responsive: `md:`, `lg:`, `xl:`
- Dark mode: `dark:` variant

### Imports
```typescript
// External first
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Internal with @/ alias
import { db } from '@/lib/db'
import { ArticleFeed } from '@/components/ArticleFeed'
```

## Environment Variables

### Required (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Optional
```
NEXT_PUBLIC_APP_URL=
RESEND_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Debugging

### VS Code Launch Config
```json
{
  "type": "node",
  "request": "launch",
  "name": "Next.js: Debug",
  "runtimeExecutable": "bun",
  "runtimeArgs": ["run", "dev"],
  "console": "integratedTerminal"
}
```

### Common Commands
```bash
# Dev server
bun run dev

# Type check watch
bun run typecheck --watch

# Test watch
bun run test --watch

# Lint fix
bun run lint --fix

# Database reset
supabase db reset

# Generate types
supabase gen types typescript --local > lib/supabase/types.ts
```