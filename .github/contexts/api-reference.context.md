# ResearchWithMe API Reference Context

## API Routes Structure

### Authentication (`app/api/auth/`)
```
POST   /api/auth/login           - Email/password login
POST   /api/auth/register        - User registration
POST   /api/auth/logout          - Session termination
POST   /api/auth/refresh         - Token refresh
GET    /api/auth/session         - Current session
POST   /api/auth/forgot-password - Password reset request
POST   /api/auth/reset-password  - Password reset confirmation
```

### OAuth Providers (`app/api/auth/providers/`)
```
GET    /api/auth/providers/github    - GitHub OAuth init
GET    /api/auth/providers/google    - Google OAuth init
GET    /api/auth/providers/orcid     - ORCID OAuth init
GET    /api/auth/callback            - OAuth callback handler
```

### Articles (`app/api/articles/`)
```
GET    /api/articles             - List articles (paginated, filtered)
GET    /api/articles/[slug]      - Single article by slug
POST   /api/articles             - Create article (auth required)
PATCH  /api/articles/[slug]      - Update article (auth required)
DELETE /api/articles/[slug]      - Delete article (auth required)
POST   /api/articles/[slug]/like - Toggle like
POST   /api/articles/[slug]/bookmark - Toggle bookmark
```

### Papers (`app/api/papers/`)
```
GET    /api/papers               - List papers (paginated, filtered)
GET    /api/papers/[id]          - Single paper by ID
POST   /api/papers               - Create paper (auth required)
PATCH  /api/papers/[id]          - Update paper (auth required)
DELETE /api/papers/[id]          - Delete paper (auth required)
GET    /api/papers/[id]/citations - Paper citations
GET    /api/papers/[id]/references - Paper references
```

### Authors (`app/api/authors/`)
```
GET    /api/authors              - List authors
GET    /api/authors/[id]         - Single author profile
GET    /api/authors/[id]/articles - Author's articles
GET    /api/authors/[id]/papers   - Author's papers
GET    /api/authors/[id]/impact   - Author impact metrics
```

### CMS (`app/api/cms/`)
```
POST   /api/cms/articles         - Create article (editorial)
PATCH  /api/cms/articles/[slug]  - Update article (editorial)
POST   /api/cms/papers           - Create paper (editorial)
PATCH  /api/cms/papers/[id]      - Update paper (editorial)
POST   /api/cms/revalidate       - Trigger ISR revalidation
```

### Comments (`app/api/comments/`)
```
GET    /api/comments?article=[slug] - Article comments
POST   /api/comments                - Create comment (auth)
PATCH  /api/comments/[id]           - Update comment (auth)
DELETE /api/comments/[id]           - Delete comment (auth)
POST   /api/comments/[id]/reply     - Reply to comment
```

### Submissions (`app/api/submissions/`)
```
GET    /api/submissions          - List submissions (editorial)
GET    /api/submissions/[id]     - Single submission
POST   /api/submissions          - Create submission (auth)
PATCH  /api/submissions/[id]     - Update submission (editorial)
POST   /api/submissions/[id]/review - Editorial review
```

### Research Assistant (`app/api/research-assistant/`)
```
POST   /api/research-assistant/chat     - AI research chat
POST   /api/research-assistant/summarize - Paper summarization
POST   /api/research-assistant/extract  - Key findings extraction
POST   /api/research-assistant/citations - Citation generation
```

### Revalidation (`app/api/revalidate/`)
```
POST   /api/revalidate           - Trigger ISR revalidation
Headers: x-revalidate-secret     - Secret for verification
Body: { paths: string[] }        - Paths to revalidate
```

## Request/Response Types

### Pagination
```typescript
interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

### Error Response
```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
```

### Article
```typescript
interface Article {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  coverImage: string
  authorId: string
  categoryId: string
  tags: string[]
  publishedAt: string
  createdAt: string
  updatedAt: string
  readingTime: number
  viewCount: number
  likeCount: number
}
```

### Paper
```typescript
interface Paper {
  id: string
  title: string
  abstract: string
  authors: Author[]
  doi: string
  arxivId?: string
  publishedAt: string
  journal?: string
  citations: number
  references: string[]
  pdfUrl?: string
  codeUrl?: string
  tags: string[]
}
```

### Author
```typescript
interface Author {
  id: string
  name: string
  email: string
  avatarUrl?: string
  bio: string
  orcidId?: string
  githubUrl?: string
  twitterUrl?: string
  websiteUrl?: string
  affiliation?: string
  hIndex: number
  citationCount: number
  paperCount: number
}
```

## Authentication

### Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Cookie-Based (Middleware)
- HttpOnly, Secure, SameSite=Lax
- Automatic refresh via middleware

## Rate Limiting

### Limits
- Auth endpoints: 10 req/min
- API endpoints: 100 req/min
- CMS endpoints: 50 req/min
- Research assistant: 20 req/min

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1699999999
```

## Validation

### Common Schemas (`lib/validation.ts`)
```typescript
// Article creation
const articleSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(500),
  content: z.string().min(100),
  coverImage: z.string().url(),
  categoryId: z.string().uuid(),
  tags: z.array(z.string()).max(10),
})

// Paper creation
const paperSchema = z.object({
  title: z.string().min(1).max(300),
  abstract: z.string().min(50).max(5000),
  authors: z.array(authorSchema).min(1),
  doi: z.string().regex(/^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i),
  arxivId: z.string().optional(),
  publishedAt: z.string().datetime(),
  journal: z.string().optional(),
  references: z.array(z.string()).optional(),
  tags: z.array(z.string()).max(15),
})
```

## Database Queries (`lib/blog-data.ts`, `lib/research-data.ts`)

### Article Queries
```typescript
// Get paginated articles
getArticles({ page, limit, category, tag, author, search })

// Get article by slug
getArticleBySlug(slug)

// Get related articles
getRelatedArticles(articleId, limit)

// Increment view count
incrementViewCount(slug)
```

### Paper Queries
```typescript
// Get paginated papers
getPapers({ page, limit, tag, author, year, search })

// Get paper by ID
getPaperById(id)

// Get paper citations
getPaperCitations(paperId)

// Get citing papers
getCitingPapers(paperId)
```

### Author Queries
```typescript
// Get author by ID
getAuthorById(id)

// Get author impact metrics
getAuthorImpact(authorId)

// Get author publications
getAuthorPublications(authorId)
```

## Webhooks

### Supabase Webhooks
- `article.created` - New article published
- `paper.created` - New paper added
- `comment.created` - New comment
- `submission.updated` - Submission status change

### Payload Format
```json
{
  "type": "INSERT",
  "table": "articles",
  "record": { ... },
  "schema": "public"
}
```

## Deployment Endpoints

### Cloudflare Workers
- All API routes deployed to edge
- Middleware runs at edge
- ISR via Cloudflare KV

### Health Checks
```
GET /api/health              - Basic health
GET /api/health/db           - Database connectivity
GET /api/health/cache        - Cache status
```