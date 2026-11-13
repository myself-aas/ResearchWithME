# ResearchWithMe Testing Context

## Test Framework: Vitest

### Configuration (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '**/*.d.ts', '**/__tests__/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

### Setup File (`vitest.setup.ts`)
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase
vi.mock('@/lib/db', () => ({
  db: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

// Mock environment
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
```

## Test Structure

### Unit Tests
```
lib/
  __tests__/
    utils.test.ts
    format.test.ts
    validation.test.ts
    citations.test.ts
    seo.test.ts

components/
  __tests__/
    ArticleFeed.test.tsx
    AuthorProfileCard.test.tsx
    MarkdownBody.test.tsx
```

### Integration Tests
```
app/api/
  __tests__/
    articles.test.ts
    papers.test.ts
    auth.test.ts
```

### E2E Tests (Future)
```
e2e/
  auth.spec.ts
  article-flow.spec.ts
  paper-flow.spec.ts
```

## Running Tests

### Commands
```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage

# Specific file
bun test lib/__tests__/utils.test.ts

# Specific pattern
bun test --testNamePattern="format"
```

### CI Integration
```yaml
# .agents/workflows/quality.yml
- name: Run tests
  run: bun test --coverage
```

## Test Patterns

### Component Testing (React Testing Library)
```tsx
// components/__tests__/ArticleFeed.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ArticleFeed } from '@/components/ArticleFeed'

describe('ArticleFeed', () => {
  const mockArticles = [
    { id: '1', title: 'Article 1', slug: 'article-1', excerpt: 'Excerpt 1' },
    { id: '2', title: 'Article 2', slug: 'article-2', excerpt: 'Excerpt 2' },
  ]

  it('renders article list', () => {
    render(<ArticleFeed articles={mockArticles} />)
    expect(screen.getByText('Article 1')).toBeInTheDocument()
    expect(screen.getByText('Article 2')).toBeInTheDocument()
  })

  it('handles empty state', () => {
    render(<ArticleFeed articles={[]} />)
    expect(screen.getByText('No articles found')).toBeInTheDocument()
  })
})
```

### Utility Testing
```typescript
// lib/__tests__/format.test.ts
import { formatDate, formatReadingTime, slugify } from '@/lib/format'

describe('format', () => {
  describe('formatDate', () => {
    it('formats ISO date to readable string', () => {
      expect(formatDate('2024-01-15T10:30:00Z')).toBe('Jan 15, 2024')
    })

    it('handles invalid dates', () => {
      expect(formatDate('invalid')).toBe('Invalid date')
    })
  })

  describe('slugify', () => {
    it('converts string to URL-safe slug', () => {
      expect(slugify('Hello World!')).toBe('hello-world')
    })

    it('handles special characters', () => {
      expect(slugify('C++ & TypeScript')).toBe('c-typescript')
    })
  })
})
```

### API Route Testing
```typescript
// app/api/__tests__/articles.test.ts
import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/articles/route'

describe('/api/articles', () => {
  it('returns paginated articles', async () => {
    const { req } = createMocks({ method: 'GET', url: '/api/articles?page=1&limit=10' })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toBeInstanceOf(Array)
    expect(data.pagination).toBeDefined()
  })

  it('requires authentication for POST', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: { title: 'Test', content: 'Content' },
    })
    const response = await POST(req)

    expect(response.status).toBe(401)
  })
})
```

### Hook Testing
```typescript
// hooks/__tests__/use-mobile.test.ts
import { renderHook, act } from '@testing-library/react'
import { useMobile } from '@/hooks/use-mobile'

describe('useMobile', () => {
  it('returns false on desktop', () => {
    const { result } = renderHook(() => useMobile())
    expect(result.current).toBe(false)
  })

  it('returns true on mobile viewport', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 375 })
    window.dispatchEvent(new Event('resize'))

    const { result } = renderHook(() => useMobile())
    expect(result.current).toBe(true)
  })
})
```

## Mocking Strategies

### Supabase Client
```typescript
// __mocks__/@supabase/supabase-js.ts
export const createClient = vi.fn(() => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}))
```

### Next.js Modules
```typescript
// __mocks__/next/navigation.ts
export const useRouter = () => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
})

export const usePathname = () => '/'
export const useSearchParams = () => new URLSearchParams()
```

### External APIs
```typescript
// Mock fetch globally
global.fetch = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  ;(fetch as vi.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: 'mocked' }),
  })
})
```

## Test Data Factories

### Factory Functions
```typescript
// __tests__/factories.ts
export const createMockArticle = (overrides = {}) => ({
  id: 'test-id',
  slug: 'test-article',
  title: 'Test Article',
  excerpt: 'Test excerpt',
  content: 'Test content...',
  coverImage: 'https://example.com/cover.jpg',
  authorId: 'author-id',
  categoryId: 'category-id',
  tags: ['tag1', 'tag2'],
  publishedAt: new Date().toISOString(),
  readingTime: 5,
  viewCount: 100,
  likeCount: 10,
  ...overrides,
})

export const createMockPaper = (overrides = {}) => ({
  id: 'paper-id',
  title: 'Test Paper',
  abstract: 'Test abstract...',
  authors: [{ name: 'Author One', orcidId: '0000-0000-0000-0001' }],
  doi: '10.1234/test.2024',
  publishedAt: new Date().toISOString(),
  citationCount: 42,
  ...overrides,
})

export const createMockAuthor = (overrides = {}) => ({
  id: 'author-id',
  name: 'Test Author',
  email: 'author@example.com',
  bio: 'Test bio',
  hIndex: 10,
  citationCount: 100,
  paperCount: 20,
  ...overrides,
})
```

## Coverage Targets

### Minimum Coverage
- **Statements**: 80%
- **Branches**: 70%
- **Functions**: 80%
- **Lines**: 80%

### Critical Paths (100% Target)
- Authentication flows
- Payment/billing (if applicable)
- Data mutation APIs
- Security-related code

## Debugging Tests

### VS Code Launch Config
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "bun",
  "runtimeArgs": ["test", "--inspect-brk"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Common Issues
1. **Act warnings**: Wrap state updates in `act()`
2. **Async issues**: Use `waitFor` for async assertions
3. **Mock cleanup**: Reset mocks in `beforeEach`
4. **Timer issues**: Use `vi.useFakeTimers()` for time-dependent tests

## Best Practices

### Test Organization
- One test file per source file
- Group by feature/component
- Use `describe` for logical grouping
- One assertion per `it` when possible

### Naming Conventions
- `describe('ComponentName', ...)`
- `it('should do something when condition', ...)`
- `it('handles edge case', ...)`

### Test Data
- Use factories for consistent data
- Minimal data for each test
- Avoid shared mutable state

### Assertions
- Prefer `toBeInTheDocument()` over `toBeTruthy()`
- Use `toHaveTextContent()` for text
- Test behavior, not implementation

### Performance
- Run tests in parallel (default)
- Avoid unnecessary renders
- Mock heavy dependencies