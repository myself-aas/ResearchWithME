# ResearchWithMe Deployment Context

## Platform: Cloudflare Workers via OpenNext

### Configuration Files
- `open-next.config.ts` - OpenNext configuration
- `wrangler.jsonc` - Cloudflare Workers configuration
- `next.config.ts` - Next.js configuration

### Build Process
```bash
# Development
bun run dev

# Production build
bun run build

# Preview locally
bun run preview

# Deploy to Cloudflare
bun run deploy
```

### OpenNext Configuration (`open-next.config.ts`)
```typescript
import { defineOpenNextConfig } from '@opennextjs/cloudflare'

export default defineOpenNextConfig({
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge',
      converter: 'edge',
    },
  },
  dangerous: {
    enableCacheInterception: false,
  },
})
```

### Wrangler Configuration (`wrangler.jsonc`)
```jsonc
{
  "name": "researchwithme",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS",
    "not_found_handling": "single-page-application"
  },
  "observability": {
    "enabled": true
  },
  "vars": {
    "NEXT_PUBLIC_APP_URL": "https://researchwithme.com"
  }
}
```

## Environment Variables

### Required (Cloudflare Dashboard)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

### Optional
```
RESEND_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Secrets (wrangler secret put)
```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put RESEND_API_KEY
```

## Edge Middleware

### Location
`middleware.ts` - Runs at Cloudflare edge

### Features
- Authentication validation
- Rate limiting
- Redirects (www, trailing slash)
- Security headers
- Bot detection

### Middleware Config
```typescript
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
```

## Incremental Static Regeneration (ISR)

### Cache Strategy
- **Articles**: 1 hour (revalidated on publish)
- **Papers**: 6 hours (revalidated on citation updates)
- **Authors**: 2 hours (revalidated on profile updates)
- **Categories**: 24 hours

### Revalidation API
```bash
# Trigger revalidation
curl -X POST https://researchwithme.com/api/revalidate \
  -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -d '{"paths": ["/paper/abc123", "/author/xyz789"]}'
```

### Cache Headers
```typescript
// next.config.ts
async headers() {
  return [
    {
      source: '/paper/:slug',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
      ],
    },
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, must-revalidate' },
      ],
    },
  ]
}
```

## Static Assets

### Public Directory
`public/` - Served directly from Cloudflare Assets

### Images
- `public/images/` - Static images
- `public/assets/` - Fonts, icons, etc.
- Optimized via Next.js Image component

### Headers (`public/_headers`)
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=31536000, immutable

/api/*
  Cache-Control: no-store, must-revalidate
```

## Monitoring & Observability

### Cloudflare Analytics
- Workers Analytics Engine
- Real-time logs via `wrangler tail`
- Custom metrics via `env.ANALYTICS.writeDataPoint()`

### Error Tracking
- Sentry integration (configured in `next.config.ts`)
- Cloudflare Workers error logs

### Performance
- Web Vitals via `vercel/analytics` (adapted for Cloudflare)
- Custom timing marks in components

## CI/CD Pipeline

### GitHub Actions (`.agents/workflows/quality.yml`)
```yaml
name: Quality Gate
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run typecheck
      - run: bun test
      - run: bun run impeccable:source
      - run: bun run build
```

### Deployment
```yaml
# On merge to main
- name: Deploy to Cloudflare
  run: |
    bun run build
    wrangler deploy --env production
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

## Domain & DNS

### Primary Domain
`researchwithme.com` - Cloudflare DNS

### Subdomains
- `www.researchwithme.com` → Redirect to apex
- `api.researchwithme.com` → Workers API (if separate)
- `assets.researchwithme.com` → R2 bucket (future)

### SSL/TLS
- Cloudflare Universal SSL
- HSTS enabled
- Minimum TLS 1.2

## Rollback Strategy

### Instant Rollback
```bash
# List deployments
wrangler deployments list

# Rollback to previous
wrangler rollback <deployment-id>
```

### Database Rollback
- Supabase Point-in-Time Recovery (PITR)
- Migration down scripts in `supabase/migrations/`

## Performance Budgets

### Core Web Vitals Targets
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **TTFB**: < 600ms

### Bundle Size Limits
- **Initial JS**: < 100KB gzipped
- **Total JS**: < 300KB gzipped
- **CSS**: < 50KB gzipped

### Monitoring
```bash
# Lighthouse CI in PR checks
# Bundle analyzer: bun run build && npx @next/bundle-analyzer
```

## Security

### Content Security Policy
```typescript
// middleware.ts
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')
```

### Rate Limiting
- Edge rate limiting via Cloudflare
- Application rate limiting via Upstash Redis

### Secrets Management
- Never commit `.env` files
- Use Cloudflare Workers secrets
- Rotate keys quarterly

## Disaster Recovery

### Backup Strategy
- Supabase: Daily automated backups (7-day retention)
- Cloudflare: Worker versions retained (100 deployments)
- Git: Full history on GitHub

### Recovery Procedures
1. **Worker rollback**: `wrangler rollback`
2. **Database restore**: Supabase dashboard → Backups → Restore
3. **DNS failover**: Cloudflare Load Balancing (configured)

## Cost Optimization

### Cloudflare Workers
- Free tier: 100K requests/day
- Paid: $5/million requests
- Optimize: Cache aggressively, minimize worker execution

### Supabase
- Free tier: 500MB database, 1GB bandwidth
- Pro: $25/month for 8GB database
- Optimize: Connection pooling, read replicas

### Artifact storage (Supabase Storage — active)
- Free tier: 1GB storage, 5GB egress, **no credit card required**
- Used for: checksummed scholarly exports and render manifests
- Code: `lib/v34/supabase-storage.ts` + `lib/v34/artifact-storage.ts`
- Setup: `docs/artifact-storage.md`; bucket provisioning via
  `npm run storage:provision:supabase -- --apply`
- Fallback order: supabase → r2 → inline (`ARTIFACT_STORAGE_PROVIDER`)

### R2 Storage (optional, not enabled)
- Free tier: 10GB storage, 1M Class A operations
- Requires a payment method on the Cloudflare account, even inside the free tier
- Only used when `ARTIFACT_STORAGE_PROVIDER=r2` and the four `R2_*` values are set