# LinkedIn Post Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate publishing ResearchWithMe articles to the LinkedIn company page (https://www.linkedin.com/company/144133153/) when new articles are published, with proper formatting, hashtags, and attribution.

**Architecture:** Server-side automation using LinkedIn Marketing API v2 with OAuth 2.0 authentication. The system extracts article metadata from the CMS/catalogue, formats it into LinkedIn-optimized posts with scholarly attribution, and publishes to the company page. Triggers include webhook on article publish, scheduled cron for batch processing, and manual admin trigger.

**Tech Stack:** 
- Next.js 15 App Router (server actions / API routes)
- LinkedIn Marketing API v2 (REST)
- OAuth 2.0 with refresh token rotation
- Supabase for token storage and article state tracking
- TypeScript with strict types
- Zod for validation

**Spec:** This plan implements the LinkedIn automation requirement for ResearchWithMe's content distribution strategy. The spec is derived from PRODUCT.md (content-first reading, verifiability by default) and the company page URL provided.

## Global Constraints

- **Node.js version:** >= 20.0.0 (per package.json engines)
- **LinkedIn API version:** v2 (2024-07+)
- **OAuth scope required:** `w_member_social`, `r_organization_social`, `rw_organization_admin`
- **Company page URN:** `urn:li:organization:144133153`
- **Rate limits:** 100 posts/day per app, 25 posts/day per user (LinkedIn Marketing API)
- **Post character limit:** 3000 characters (LinkedIn)
- **Hashtag limit:** 30 hashtags per post (recommend 3-5)
- **Image requirements:** 1200x627px minimum, 5MB max, JPG/PNG
- **Environment variables required:** `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `LINKEDIN_COMPANY_URN`
- **Token storage:** Encrypted in Supabase `linkedin_tokens` table with RLS
- **Article state tracking:** `linkedin_post_status` field on articles (pending, posted, failed, skipped)
- **WCAG AA compliance:** All UI for admin trigger must meet contrast and keyboard requirements
- **No client-side secrets:** All LinkedIn API calls server-side only

## Review Focus

| Input / Failure Mode | Expected Behavior | Test Location |
|---------------------|-------------------|---------------|
| Article published without cover image | Post publishes with text only, no image attachment | Task 3: Post Content Generation |
| LinkedIn API rate limit exceeded (429) | Exponential backoff retry, max 3 attempts, then mark failed with alert | Task 5: Error Handling & Retry Logic |
| OAuth token expired during post | Auto-refresh using refresh token, retry once, then alert admin | Task 1: LinkedIn API Integration Setup |
| Article content exceeds 3000 chars | Auto-truncate with ellipsis and "Read more" link to article | Task 3: Post Content Generation |
| Duplicate post attempt for same article | Idempotency check prevents duplicate; returns existing post URN | Task 4: Automation Trigger System |
| Network timeout during publish | Retry with backoff; if all retries fail, mark article status=failed | Task 5: Error Handling & Retry Logic |
| Admin manually triggers post for draft article | Validation rejects; only published articles can be posted | Task 4: Automation Trigger System |

---

### Task 1: LinkedIn API Integration Setup

**Files:**
- Create: `lib/linkedin/client.ts`
- Create: `lib/linkedin/oauth.ts`
- Create: `lib/linkedin/types.ts`
- Create: `lib/linkedin/token-store.ts`
- Create: `app/api/admin/linkedin/auth/route.ts`
- Create: `app/api/admin/linkedin/callback/route.ts`
- Create: `supabase/migrations/20261115_linkedin_tokens.sql`
- Test: `lib/linkedin/__tests__/client.test.ts`
- Test: `lib/linkedin/__tests__/oauth.test.ts`
- Test: `lib/linkedin/__tests__/token-store.test.ts`

**Interfaces:**
- Consumes: (none - first task)
- Produces: 
  - `LinkedInClient` class with methods: `postArticle(article: ArticleData): Promise<PostResult>`, `refreshAccessToken(): Promise<TokenResponse>`
  - `TokenStore` interface: `getTokens(): Promise<TokenSet>`, `saveTokens(tokens: TokenSet): Promise<void>`, `clearTokens(): Promise<void>`
  - `OAuth` functions: `getAuthUrl(state: string): string`, `exchangeCodeForTokens(code: string): Promise<TokenResponse>`
  - Types: `TokenSet`, `TokenResponse`, `PostResult`, `ArticleData`, `LinkedInError`

- [ ] **Step 1: Write the failing test for OAuth flow**

```typescript
// lib/linkedin/__tests__/oauth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthUrl, exchangeCodeForTokens } from '@/lib/linkedin/oauth';

describe('LinkedIn OAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.LINKEDIN_CLIENT_ID = 'test-client-id';
    process.env.LINKEDIN_CLIENT_SECRET = 'test-client-secret';
    process.env.LINKEDIN_REDIRECT_URI = 'https://example.com/callback';
  });

  it('generates correct authorization URL with required scopes', () => {
    const url = getAuthUrl('test-state-123');
    expect(url).toContain('https://www.linkedin.com/oauth/v2/authorization');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
    expect(url).toContain('scope=r_organization_social%20w_member_social%20rw_organization_admin');
    expect(url).toContain('state=test-state-123');
    expect(url).toContain('response_type=code');
  });

  it('exchanges authorization code for token response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 5184000,
        token_type: 'Bearer',
      }),
    });

    const result = await exchangeCodeForTokens('auth-code-789');
    expect(result.access_token).toBe('access-token-123');
    expect(result.refresh_token).toBe('refresh-token-456');
    expect(result.expires_in).toBe(5184000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test lib/linkedin/__tests__/oauth.test.ts`
Expected: FAIL with "Cannot find module '@/lib/linkedin/oauth'"

- [ ] **Step 3: Implement OAuth module in `lib/linkedin/oauth.ts`**

```typescript
// lib/linkedin/oauth.ts
import { z } from 'zod';

const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  token_type: z.string(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

const REQUIRED_SCOPES = [
  'r_organization_social',
  'w_member_social',
  'rw_organization_admin',
] as const;

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
    scope: REQUIRED_SCOPES.join(' '),
    state,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  });

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new LinkedInOAuthError(`Token exchange failed: ${response.status}`, error);
  }

  const data = await response.json();
  return TokenResponseSchema.parse(data);
}

export class LinkedInOAuthError extends Error {
  constructor(message: string, public readonly details: unknown) {
    super(message);
    this.name = 'LinkedInOAuthError';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test lib/linkedin/__tests__/oauth.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing test for token store**

```typescript
// lib/linkedin/__tests__/token-store.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenStore } from '@/lib/linkedin/token-store';

describe('TokenStore', () => {
  let mockSupabase: any;
  let tokenStore: TokenStore;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
    vi.doMock('@/lib/supabase/server', () => ({ createClient: () => mockSupabase }));
    tokenStore = new TokenStore();
  });

  it('retrieves and decrypts tokens from Supabase', async () => {
    mockSupabase.single.mockResolvedValue({
      data: {
        access_token: 'encrypted-access-token',
        refresh_token: 'encrypted-refresh-token',
        expires_at: Date.now() + 3600000,
        scope: 'r_organization_social w_member_social rw_organization_admin',
      },
      error: null,
    });

    const tokens = await tokenStore.getTokens();
    expect(tokens.access_token).toBe('encrypted-access-token');
    expect(tokens.refresh_token).toBe('encrypted-refresh-token');
  });

  it('saves encrypted tokens to Supabase', async () => {
    mockSupabase.upsert.mockResolvedValue({ error: null });

    await tokenStore.saveTokens({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_at: Date.now() + 5184000000,
      scope: 'r_organization_social w_member_social rw_organization_admin',
    });

    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
      }),
      { onConflict: 'id' }
    );
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test lib/linkedin/__tests__/token-store.test.ts`
Expected: FAIL with "Cannot find module '@/lib/linkedin/token-store'"

- [ ] **Step 7: Implement token store in `lib/linkedin/token-store.ts`**

```typescript
// lib/linkedin/token-store.ts
import { createClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/crypto';

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp ms
  scope: string;
}

export class TokenStore {
  private readonly TABLE = 'linkedin_tokens';
  private readonly ROW_ID = 'company_page_tokens';

  async getTokens(): Promise<TokenSet | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from(this.TABLE)
      .select('*')
      .eq('id', this.ROW_ID)
      .single();

    if (error || !data) return null;

    return {
      access_token: decrypt(data.access_token),
      refresh_token: decrypt(data.refresh_token),
      expires_at: data.expires_at,
      scope: data.scope,
    };
  }

  async saveTokens(tokens: TokenSet): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from(this.TABLE)
      .upsert({
        id: this.ROW_ID,
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token),
        expires_at: tokens.expires_at,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) throw new Error(`Failed to save tokens: ${error.message}`);
  }

  async clearTokens(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from(this.TABLE)
      .delete()
      .eq('id', this.ROW_ID);

    if (error) throw new Error(`Failed to clear tokens: ${error.message}`);
  }

  isTokenExpired(tokens: TokenSet): boolean {
    return Date.now() >= tokens.expires_at - 60000; // 1 min buffer
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test lib/linkedin/__tests__/token-store.test.ts`
Expected: PASS

- [ ] **Step 9: Write failing test for LinkedIn client**

```typescript
// lib/linkedin/__tests__/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkedInClient } from '@/lib/linkedin/client';
import { TokenStore } from '@/lib/linkedin/token-store';

describe('LinkedInClient', () => {
  let mockTokenStore: any;
  let client: LinkedInClient;

  beforeEach(() => {
    mockTokenStore = {
      getTokens: vi.fn(),
      saveTokens: vi.fn(),
      isTokenExpired: vi.fn(),
    };
    vi.doMock('@/lib/linkedin/token-store', () => ({ TokenStore: vi.fn().mockImplementation(() => mockTokenStore) }));
    client = new LinkedInClient();
  });

  it('posts article to company page and returns post URN', async () => {
    mockTokenStore.getTokens.mockResolvedValue({
      access_token: 'valid-access-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 3600000,
      scope: 'r_organization_social w_member_social rw_organization_admin',
    });
    mockTokenStore.isTokenExpired.mockReturnValue(false);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'urn:li:share:123456789' }),
    });

    const result = await client.postArticle({
      title: 'Test Article',
      summary: 'Test summary',
      url: 'https://researchwith.me/post/test-article',
      coverImage: 'https://researchwith.me/images/cover.jpg',
      authorName: 'Test Author',
      category: 'Research Reviews',
      tags: ['AI', 'Machine Learning'],
      doi: '10.5555/rwm.test',
    });

    expect(result.success).toBe(true);
    expect(result.postUrn).toBe('urn:li:share:123456789');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.linkedin.com/rest/posts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-access-token',
          'Content-Type': 'application/json',
          'LinkedIn-Version': '2024-07',
        }),
      })
    );
  });

  it('refreshes expired token before posting', async () => {
    mockTokenStore.getTokens
      .mockResolvedValueOnce({
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() - 1000,
        scope: 'r_organization_social w_member_social rw_organization_admin',
      })
      .mockResolvedValueOnce({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Date.now() + 5184000000,
        scope: 'r_organization_social w_member_social rw_organization_admin',
      });
    mockTokenStore.isTokenExpired.mockReturnValue(true);

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 5184000,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'urn:li:share:987654321' }),
      });

    const result = await client.postArticle({
      title: 'Test Article',
      summary: 'Test summary',
      url: 'https://researchwith.me/post/test-article',
      authorName: 'Test Author',
      category: 'Research Reviews',
      tags: [],
    });

    expect(result.success).toBe(true);
    expect(result.postUrn).toBe('urn:li:share:987654321');
    expect(mockTokenStore.saveTokens).toHaveBeenCalled();
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm test lib/linkedin/__tests__/client.test.ts`
Expected: FAIL with "Cannot find module '@/lib/linkedin/client'"

- [ ] **Step 11: Implement LinkedIn client in `lib/linkedin/client.ts`**

```typescript
// lib/linkedin/client.ts
import { TokenStore, TokenSet } from '@/lib/linkedin/token-store';
import { z } from 'zod';

const PostResultSchema = z.object({
  success: z.boolean(),
  postUrn: z.string().optional(),
  error: z.string().optional(),
});

export type PostResult = z.infer<typeof PostResultSchema>;

export interface ArticleData {
  title: string;
  summary: string;
  url: string;
  coverImage?: string;
  authorName: string;
  category: string;
  tags: string[];
  doi?: string;
}

const COMPANY_URN = process.env.LINKEDIN_COMPANY_URN || 'urn:li:organization:144133153';
const API_BASE = 'https://api.linkedin.com/rest';
const API_VERSION = '2024-07';

export class LinkedInClient {
  private tokenStore = new TokenStore();

  async postArticle(article: ArticleData): Promise<PostResult> {
    try {
      const tokens = await this.getValidTokens();
      if (!tokens) {
        return { success: false, error: 'No valid LinkedIn tokens. Please authenticate first.' };
      }

      const postBody = this.buildPostBody(article);
      const response = await this.makeRequest('/posts', 'POST', postBody, tokens.access_token);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          // Token might be invalid, try refresh once
          const refreshed = await this.refreshAndRetry(article);
          if (refreshed) return refreshed;
        }
        return { success: false, error: `LinkedIn API error: ${response.status} - ${JSON.stringify(errorData)}` };
      }

      const data = await response.json();
      return { success: true, postUrn: data.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async getValidTokens(): Promise<TokenSet | null> {
    let tokens = await this.tokenStore.getTokens();
    if (!tokens) return null;

    if (this.tokenStore.isTokenExpired(tokens)) {
      tokens = await this.refreshAccessToken(tokens.refresh_token);
      if (!tokens) return null;
    }
    return tokens;
  }

  private async refreshAccessToken(refreshToken: string): Promise<TokenSet | null> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const newTokens: TokenSet = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_at: Date.now() + data.expires_in * 1000,
      scope: data.scope || 'r_organization_social w_member_social rw_organization_admin',
    };

    await this.tokenStore.saveTokens(newTokens);
    return newTokens;
  }

  private async refreshAndRetry(article: ArticleData): Promise<PostResult | null> {
    const tokens = await this.tokenStore.getTokens();
    if (!tokens?.refresh_token) return null;

    const newTokens = await this.refreshAccessToken(tokens.refresh_token);
    if (!newTokens) return null;

    const postBody = this.buildPostBody(article);
    const response = await this.makeRequest('/posts', 'POST', postBody, newTokens.access_token);

    if (!response.ok) return null;

    const data = await response.json();
    return { success: true, postUrn: data.id };
  }

  private buildPostBody(article: ArticleData): Record<string, unknown> {
    const content = this.formatPostContent(article);
    const authorUrn = `urn:li:organization:${COMPANY_URN.split(':').pop()}`;

    const body: Record<string, unknown> = {
      author: authorUrn,
      commentary: content,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
    };

    if (article.coverImage) {
      body.media = {
        media: article.coverImage,
        title: article.title,
        description: article.summary.slice(0, 200),
      };
    }

    return body;
  }

  private formatPostContent(article: ArticleData): string {
    const hashtags = this.generateHashtags(article.category, article.tags);
    const doiLine = article.doi ? `\n\nDOI: https://doi.org/${article.doi}` : '';
    const readMore = `\n\nRead the full review: ${article.url}`;

    let content = `📖 New Research Review: ${article.title}\n\n`;
    content += `${article.summary}${doiLine}${readMore}\n\n`;
    content += `By ${article.authorName} | ${article.category}\n\n`;
    content += hashtags;

    // LinkedIn 3000 char limit
    if (content.length > 2950) {
      content = content.slice(0, 2900) + '...' + readMore;
    }

    return content;
  }

  private generateHashtags(category: string, tags: string[]): string {
    const categoryTags = category.toLowerCase().replace(/[^a-z0-9]/g, '');
    const tagHashtags = tags
      .slice(0, 3)
      .map(t => t.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(Boolean);
    const baseTags = ['ResearchWithMe', 'OpenScience', 'ResearchReview', categoryTags];
    const allTags = [...new Set([...baseTags, ...tagHashtags])].slice(0, 5);
    return allTags.map(t => `#${t}`).join(' ');
  }

  private async makeRequest(
    endpoint: string,
    method: string,
    body: Record<string, unknown>,
    accessToken: string
  ): Promise<Response> {
    return fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': API_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test lib/linkedin/__tests__/client.test.ts`
Expected: PASS

- [ ] **Step 13: Create Supabase migration for token storage**

```sql
-- supabase/migrations/20261115_linkedin_tokens.sql
CREATE TABLE IF NOT EXISTS linkedin_tokens (
  id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE linkedin_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage LinkedIn tokens"
  ON linkedin_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add linkedin_post_status to articles table if using CMS
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS linkedin_post_status TEXT DEFAULT 'pending';
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS linkedin_post_urn TEXT;
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS linkedin_posted_at TIMESTAMPTZ;
```

- [ ] **Step 14: Create OAuth callback route**

```typescript
// app/api/admin/linkedin/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/linkedin/oauth';
import { TokenStore } from '@/lib/linkedin/token-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/admin/linkedin?error=${error}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/admin/linkedin?error=missing_params', request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const tokenStore = new TokenStore();
    await tokenStore.saveTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token!,
      expires_at: Date.now() + tokens.expires_in * 1000,
      scope: tokens.token_type === 'Bearer' ? 'r_organization_social w_member_social rw_organization_admin' : '',
    });

    return NextResponse.redirect(new URL('/admin/linkedin?success=true', request.url));
  } catch (err) {
    console.error('LinkedIn OAuth callback error:', err);
    return NextResponse.redirect(new URL('/admin/linkedin?error=token_exchange_failed', request.url));
  }
}
```

- [ ] **Step 15: Create OAuth initiation route**

```typescript
// app/api/admin/linkedin/auth/route.ts
import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/linkedin/oauth';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const state = crypto.randomUUID();
  const authUrl = getAuthUrl(state);

  // Store state in session/cookie for validation
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
```

- [ ] **Step 16: Commit**

```bash
git add lib/linkedin/ supabase/migrations/20261115_linkedin_tokens.sql app/api/admin/linkedin/
git commit -m "feat: add LinkedIn API integration with OAuth 2.0 and token management"
```

---

### Task 2: Article Data Extraction

**Files:**
- Create: `lib/linkedin/article-extractor.ts`
- Create: `lib/linkedin/__tests__/article-extractor.test.ts`
- Modify: `lib/cms/catalogue.ts` (add helper for published articles)

**Interfaces:**
- Consumes: `BlogPost` type from `lib/blog-data.ts`, `getCachedArticleCatalogue` from `lib/cms/catalogue.ts`
- Produces: `extractArticleForLinkedIn(slug: string): Promise<ArticleData | null>`, `getPublishedArticles(): Promise<BlogPost[]>`

- [ ] **Step 1: Write failing test for article extractor**

```typescript
// lib/linkedin/__tests__/article-extractor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractArticleForLinkedIn, getPublishedArticles } from '@/lib/linkedin/article-extractor';

describe('Article Extractor', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('extracts ArticleData from BlogPost with all fields', async () => {
    const mockArticle = {
      id: 'post-1',
      slug: 'test-article',
      title: 'Test Article Title',
      subtitle: 'Test subtitle for the article',
      category: 'Research Reviews',
      format: 'Paper Review',
      author: {
        id: 'author-1',
        name: 'Dr. Test Author',
        avatar: 'TA',
        role: 'Researcher',
        domain: 'AI',
      },
      publishedAt: 'January 15, 2026',
      readTime: '10 min read',
      coverImage: '/images/cover.jpg',
      featured: true,
      summary: 'This is a test article summary for LinkedIn posting.',
      content: ['Paragraph 1', 'Paragraph 2'],
      keyTakeaways: ['Takeaway 1', 'Takeaway 2'],
      tags: ['AI', 'Machine Learning', 'Research'],
      likes: 100,
      commentsCount: 10,
      dateISO: '2026-01-15',
    };

    vi.doMock('@/lib/cms/catalogue', () => ({
      getCachedArticleCatalogue: vi.fn().mockResolvedValue([mockArticle]),
    }));

    const result = await extractArticleForLinkedIn('test-article');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Test Article Title');
    expect(result!.summary).toBe('This is a test article summary for LinkedIn posting.');
    expect(result!.url).toBe('https://researchwith.me/post/test-article');
    expect(result!.coverImage).toBe('https://researchwith.me/images/cover.jpg');
    expect(result!.authorName).toBe('Dr. Test Author');
    expect(result!.category).toBe('Research Reviews');
    expect(result!.tags).toEqual(['AI', 'Machine Learning', 'Research']);
    expect(result!.doi).toBe('10.5555/rwm.post-1');
  });

  it('handles missing cover image gracefully', async () => {
    const mockArticle = {
      id: 'post-2',
      slug: 'no-image-article',
      title: 'No Image Article',
      subtitle: 'Subtitle',
      category: 'GitHub Repo Teardowns',
      format: 'Repo Teardown',
      author: { id: 'a1', name: 'Author', avatar: 'A', role: 'Dev', domain: 'Tech' },
      publishedAt: 'January 15, 2026',
      readTime: '5 min read',
      coverImage: '',
      featured: false,
      summary: 'Summary without image',
      content: [],
      keyTakeaways: [],
      tags: ['GitHub'],
      likes: 0,
      commentsCount: 0,
    };

    vi.doMock('@/lib/cms/catalogue', () => ({
      getCachedArticleCatalogue: vi.fn().mockResolvedValue([mockArticle]),
    }));

    const result = await extractArticleForLinkedIn('no-image-article');
    expect(result).not.toBeNull();
    expect(result!.coverImage).toBeUndefined();
  });

  it('returns null for non-existent slug', async () => {
    vi.doMock('@/lib/cms/catalogue', () => ({
      getCachedArticleCatalogue: vi.fn().mockResolvedValue([]),
    }));

    const result = await extractArticleForLinkedIn('non-existent');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test lib/linkedin/__tests__/article-extractor.test.ts`
Expected: FAIL with "Cannot find module '@/lib/linkedin/article-extractor'"

- [ ] **Step 3: Implement article extractor in `lib/linkedin/article-extractor.ts`**

```typescript
// lib/linkedin/article-extractor.ts
import { getCachedArticleCatalogue } from '@/lib/cms/catalogue';
import { ArticleData } from '@/lib/linkedin/client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://researchwith.me';

export async function extractArticleForLinkedIn(slug: string): Promise<ArticleData | null> {
  const articles = await getCachedArticleCatalogue();
  const article = articles.find(a => a.slug === slug || a.id === slug);
  
  if (!article) return null;

  // Only process published articles (CMS drafts have different handling)
  // For JSON-based articles, all are considered published
  
  const coverImage = article.coverImage && article.coverImage.trim() !== '' && !article.coverImage.startsWith('data:')
    ? `${SITE_URL}${article.coverImage}`
    : undefined;

  return {
    title: article.title,
    summary: article.summary,
    url: `${SITE_URL}/post/${article.slug}`,
    coverImage,
    authorName: article.author.name,
    category: article.category,
    tags: article.tags,
    doi: `10.5555/rwm.${article.id}`,
  };
}

export async function getPublishedArticles(): Promise<Array<{ slug: string; title: string; dateISO?: string }>> {
  const articles = await getCachedArticleCatalogue();
  return articles
    .filter(a => a.slug && a.title)
    .map(a => ({ slug: a.slug, title: a.title, dateISO: a.dateISO }))
    .sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test lib/linkedin/__tests__/article-extractor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/linkedin/article-extractor.ts lib/linkedin/__tests__/article-extractor.test.ts
git commit -m "feat: add article data extraction for LinkedIn posting"
```

---

### Task 3: Post Content Generation

**Files:**
- Create: `lib/linkedin/content-formatter.ts`
- Create: `lib/linkedin/__tests__/content-formatter.test.ts`

**Interfaces:**
- Consumes: `ArticleData` from `lib/linkedin/client.ts`
- Produces: `formatLinkedInPost(article: ArticleData): FormattedPost`, `truncateForLinkedIn(text: string, maxLength: number): string`

- [ ] **Step 1: Write failing test for content formatter**

```typescript
// lib/linkedin/__tests__/content-formatter.test.ts
import { describe, it, expect } from 'vitest';
import { formatLinkedInPost, truncateForLinkedIn } from '@/lib/linkedin/content-formatter';

describe('Content Formatter', () => {
  const mockArticle = {
    title: 'Inside vLLM & PagedAttention: Why Memory Fragmentation Was Killing LLM Serving',
    summary: 'Before vLLM, serving transformers at scale suffered from up to 80% wasted GPU VRAM due to sequential pre-allocation of the KV cache.',
    url: 'https://researchwith.me/post/inside-vllm-and-paged-attention',
    coverImage: 'https://researchwith.me/images/folio-code.jpeg',
    authorName: 'Maya Lin',
    category: 'GitHub Repo Teardowns',
    tags: ['CUDA', 'vLLM', 'GPU Inference', 'Systems Engineering', 'Performance'],
    doi: '10.5555/rwm.post-1',
  };

  it('formats post with all required elements', () => {
    const formatted = formatLinkedInPost(mockArticle);
    
    expect(formatted.text).toContain('📖 New Research Review: Inside vLLM & PagedAttention');
    expect(formatted.text).toContain('Before vLLM, serving transformers at scale suffered');
    expect(formatted.text).toContain('DOI: https://doi.org/10.5555/rwm.post-1');
    expect(formatted.text).toContain('Read the full review: https://researchwith.me/post/inside-vllm-and-paged-attention');
    expect(formatted.text).toContain('By Maya Lin | GitHub Repo Teardowns');
    expect(formatted.text).toContain('#ResearchWithMe');
    expect(formatted.text).toContain('#OpenScience');
    expect(formatted.hashtags).toContain('#CUDA');
    expect(formatted.hashtags).toContain('#vLLM');
    expect(formatted.hashtags).toContain('#GPUInference');
  });

  it('truncates content exceeding 3000 characters', () => {
    const longArticle = {
      ...mockArticle,
      summary: 'A'.repeat(3000),
    };
    const formatted = formatLinkedInPost(longArticle);
    expect(formatted.text.length).toBeLessThanOrEqual(3000);
    expect(formatted.text).toContain('...');
    expect(formatted.text).toContain('Read the full review:');
  });

  it('handles missing cover image', () => {
    const noImageArticle = { ...mockArticle, coverImage: undefined };
    const formatted = formatLinkedInPost(noImageArticle);
    expect(formatted.text).not.toContain('[Image]');
    expect(formatted.media).toBeUndefined();
  });

  it('truncateForLinkedIn preserves word boundaries', () => {
    const text = 'This is a test sentence that should be truncated at word boundary';
    const truncated = truncateForLinkedIn(text, 30);
    expect(truncated.length).toBeLessThanOrEqual(30);
    expect(truncated).not.toMatch(/\w+$/); // Doesn't end mid-word
    expect(truncated).toContain('...');
  });

  it('limits hashtags to 5', () => {
    const manyTagsArticle = {
      ...mockArticle,
      tags: ['Tag1', 'Tag2', 'Tag3', 'Tag4', 'Tag5', 'Tag6', 'Tag7'],
    };
    const formatted = formatLinkedInPost(manyTagsArticle);
    const hashtagCount = (formatted.text.match(/#\w+/g) || []).length;
    expect(hashtagCount).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test lib/linkedin/__tests__/content-formatter.test.ts`
Expected: FAIL with "Cannot find module '@/lib/linkedin/content-formatter'"

- [ ] **Step 3: Implement content formatter in `lib/linkedin/content-formatter.ts`**

```typescript
// lib/linkedin/content-formatter.ts
import { ArticleData } from '@/lib/linkedin/client';

export interface FormattedPost {
  text: string;
  hashtags: string[];
  media?: string;
}

const MAX_LENGTH = 3000;
const TRUNCATION_SUFFIX = '...';
const READ_MORE_TEMPLATE = '\n\nRead the full review: {url}';

export function formatLinkedInPost(article: ArticleData): FormattedPost {
  const hashtags = generateHashtags(article.category, article.tags);
  const doiLine = article.doi ? `\n\nDOI: https://doi.org/${article.doi}` : '';
  const readMore = READ_MORE_TEMPLATE.replace('{url}', article.url);

  let content = `📖 New Research Review: ${article.title}\n\n`;
  content += `${article.summary}${doiLine}${readMore}\n\n`;
  content += `By ${article.authorName} | ${article.category}\n\n`;
  content += hashtags.join(' ');

  // Truncate if needed
  if (content.length > MAX_LENGTH) {
    const availableLength = MAX_LENGTH - (readMore.length + TRUNCATION_SUFFIX.length + 50); // buffer
    const truncatedSummary = truncateForLinkedIn(article.summary, availableLength);
    content = `📖 New Research Review: ${article.title}\n\n`;
    content += `${truncatedSummary}${doiLine}${readMore}\n\n`;
    content += `By ${article.authorName} | ${article.category}\n\n`;
    content += hashtags.join(' ');
  }

  return {
    text: content,
    hashtags,
    media: article.coverImage,
  };
}

export function truncateForLinkedIn(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.slice(0, maxLength - TRUNCATION_SUFFIX.length);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.5) {
    return truncated.slice(0, lastSpace) + TRUNCATION_SUFFIX;
  }
  
  return truncated + TRUNCATION_SUFFIX;
}

function generateHashtags(category: string, tags: string[]): string[] {
  const categoryTag = category.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tagHashtags = tags
    .slice(0, 3)
    .map(t => t.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);
  
  const baseTags = ['ResearchWithMe', 'OpenScience', 'ResearchReview'];
  if (categoryTag) baseTags.push(categoryTag);
  
  const allTags = [...new Set([...baseTags, ...tagHashtags])].slice(0, 5);
  return allTags.map(t => `#${t}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test lib/linkedin/__tests__/content-formatter.test.ts`
Expected: PASS

- [ ] **Step 5: Update LinkedIn client to use content formatter**

```typescript
// lib/linkedin/client.ts - Update the buildPostBody method
import { formatLinkedInPost } from '@/lib/linkedin/content-formatter';

private buildPostBody(article: ArticleData): Record<string, unknown> {
  const formatted = formatLinkedInPost(article);
  const authorUrn = `urn:li:organization:${COMPANY_URN.split(':').pop()}`;

  const body: Record<string, unknown> = {
    author: authorUrn,
    commentary: formatted.text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
  };

  if (formatted.media) {
    body.media = {
      media: formatted.media,
      title: article.title,
      description: article.summary.slice(0, 200),
    };
  }

  return body;
}
```

- [ ] **Step 6: Run all LinkedIn tests to verify integration**

Run: `npm test lib/linkedin/`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/linkedin/content-formatter.ts lib/linkedin/__tests__/content-formatter.test.ts lib/linkedin/client.ts
git commit -m "feat: add LinkedIn post content formatting with truncation and hashtags"
```

---

### Task 4: Automation Trigger System

**Files:**
- Create: `lib/linkedin/automation.ts`
- Create: `app/api/admin/linkedin/post/route.ts`
- Create: `app/api/webhooks/article-published/route.ts`
- Create: `lib/linkedin/__tests__/automation.test.ts`
- Create: `app/api/cron/linkedin-batch/route.ts` (for scheduled batch posting)

**Interfaces:**
- Consumes: `LinkedInClient` from Task 1, `extractArticleForLinkedIn` from Task 2, `formatLinkedInPost` from Task 3
- Produces: `postArticleToLinkedIn(slug: string): Promise<PostResult>`, `batchPostArticles(slugs: string[]): Promise<BatchResult>`, `checkAndPostNewArticles(): Promise<BatchResult>`

- [ ] **Step 1: Write failing test for automation**

```typescript
// lib/linkedin/__tests__/automation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postArticleToLinkedIn, batchPostArticles } from '@/lib/linkedin/automation';

describe('LinkedIn Automation', () => {
  let mockClient: any;
  let mockExtractor: any;

  beforeEach(() => {
    mockClient = { postArticle: vi.fn() };
    mockExtractor = { extractArticleForLinkedIn: vi.fn() };
    
    vi.doMock('@/lib/linkedin/client', () => ({ LinkedInClient: vi.fn().mockImplementation(() => mockClient) }));
    vi.doMock('@/lib/linkedin/article-extractor', () => ({ extractArticleForLinkedIn: mockExtractor }));
  });

  it('posts single article successfully', async () => {
    mockExtractor.mockResolvedValue({
      title: 'Test Article',
      summary: 'Test summary',
      url: 'https://researchwith.me/post/test',
      authorName: 'Test Author',
      category: 'Research Reviews',
      tags: ['AI'],
      doi: '10.5555/rwm.test',
    });
    mockClient.postArticle.mockResolvedValue({ success: true, postUrn: 'urn:li:share:123' });

    const result = await postArticleToLinkedIn('test-article');
    expect(result.success).toBe(true);
    expect(result.postUrn).toBe('urn:li:share:123');
    expect(mockClient.postArticle).toHaveBeenCalled();
  });

  it('handles article not found', async () => {
    mockExtractor.mockResolvedValue(null);
    const result = await postArticleToLinkedIn('non-existent');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Article not found');
  });

  it('batch posts multiple articles with rate limiting', async () => {
    const articles = ['article-1', 'article-2', 'article-3'];
    mockExtractor
      .mockResolvedValueOnce({ title: 'Article 1', summary: 'S1', url: 'u1', authorName: 'A', category: 'C', tags: [], doi: 'd1' })
      .mockResolvedValueOnce({ title: 'Article 2', summary: 'S2', url: 'u2', authorName: 'A', category: 'C', tags: [], doi: 'd2' })
      .mockResolvedValueOnce({ title: 'Article 3', summary: 'S3', url: 'u3', authorName: 'A', category: 'C', tags: [], doi: 'd3' });
    mockClient.postArticle
      .mockResolvedValueOnce({ success: true, postUrn: 'urn:1' })
      .mockResolvedValueOnce({ success: true, postUrn: 'urn:2' })
      .mockResolvedValueOnce({ success: true, postUrn: 'urn:3' });

    const result = await batchPostArticles(articles);
    expect(result.posted).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(3);
  });

  it('continues batch on individual failure', async () => {
    const articles = ['article-1', 'article-2'];
    mockExtractor
      .mockResolvedValueOnce({ title: 'Article 1', summary: 'S1', url: 'u1', authorName: 'A', category: 'C', tags: [], doi: 'd1' })
      .mockResolvedValueOnce({ title: 'Article 2', summary: 'S2', url: 'u2', authorName: 'A', category: 'C', tags: [], doi: 'd2' });
    mockClient.postArticle
      .mockResolvedValueOnce({ success: true, postUrn: 'urn:1' })
      .mockResolvedValueOnce({ success: false, error: 'Rate limited' });

    const result = await batchPostArticles(articles);
    expect(result.posted).toBe(1);
    expect(result.failed).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test lib/linkedin/__tests__/automation.test.ts`
Expected: FAIL with "Cannot find module '@/lib/linkedin/automation'"

- [ ] **Step 3: Implement automation in `lib/linkedin/automation.ts`**

```typescript
// lib/linkedin/automation.ts
import { LinkedInClient } from '@/lib/linkedin/client';
import { extractArticleForLinkedIn } from '@/lib/linkedin/article-extractor';
import { PostResult } from '@/lib/linkedin/client';

export interface BatchResult {
  posted: number;
  failed: number;
  results: Array<{ slug: string; result: PostResult }>;
}

const RATE_LIMIT_DELAY_MS = 1000; // 1 second between posts

export async function postArticleToLinkedIn(slug: string): Promise<PostResult> {
  const client = new LinkedInClient();
  const article = await extractArticleForLinkedIn(slug);
  
  if (!article) {
    return { success: false, error: `Article not found: ${slug}` };
  }

  return client.postArticle(article);
}

export async function batchPostArticles(slugs: string[]): Promise<BatchResult> {
  const client = new LinkedInClient();
  const results: BatchResult['results'] = [];
  let posted = 0;
  let failed = 0;

  for (const slug of slugs) {
    const article = await extractArticleForLinkedIn(slug);
    
    if (!article) {
      results.push({ slug, result: { success: false, error: 'Article not found' } });
      failed++;
      continue;
    }

    const result = await client.postArticle(article);
    results.push({ slug, result });

    if (result.success) {
      posted++;
      // Update article status in CMS if available
      await updateArticleLinkedInStatus(slug, 'posted', result.postUrn);
    } else {
      failed++;
      await updateArticleLinkedInStatus(slug, 'failed', undefined, result.error);
    }

    // Rate limiting delay
    if (slugs.indexOf(slug) < slugs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  return { posted, failed, results };
}

export async function checkAndPostNewArticles(): Promise<BatchResult> {
  // This would integrate with CMS to find articles with linkedin_post_status = 'pending'
  // For now, return empty - implement based on CMS schema
  const { getPublishedArticles } = await import('@/lib/linkedin/article-extractor');
  const articles = await getPublishedArticles();
  
  // Filter to only those not yet posted (would need CMS integration)
  const pendingSlugs = articles
    .filter(a => a.slug) // Add status check when CMS supports it
    .map(a => a.slug!);
  
  if (pendingSlugs.length === 0) {
    return { posted: 0, failed: 0, results: [] };
  }

  return batchPostArticles(pendingSlugs);
}

async function updateArticleLinkedInStatus(
  slug: string, 
  status: 'pending' | 'posted' | 'failed', 
  postUrn?: string, 
  error?: string
): Promise<void> {
  // TODO: Integrate with CMS when article schema supports linkedin_post_status
  // For JSON-based articles, this is a no-op
  console.log(`[LinkedIn] Article ${slug} status: ${status}`, { postUrn, error });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test lib/linkedin/__tests__/automation.test.ts`
Expected: PASS

- [ ] **Step 5: Create admin manual post API route**

```typescript
// app/api/admin/linkedin/post/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { postArticleToLinkedIn } from '@/lib/linkedin/automation';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await request.json();
  
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid slug' }, { status: 400 });
  }

  const result = await postArticleToLinkedIn(slug);
  
  if (result.success) {
    return NextResponse.json({ success: true, postUrn: result.postUrn });
  } else {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
}
```

- [ ] **Step 6: Create webhook for article published (if using CMS)**

```typescript
// app/api/webhooks/article-published/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { postArticleToLinkedIn } from '@/lib/linkedin/automation';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  // Verify webhook signature if using Supabase webhooks
  const headersList = await headers();
  const signature = headersList.get('x-supabase-signature');
  
  // TODO: Verify signature with Supabase webhook secret
  
  const payload = await request.json();
  
  // Supabase webhook payload for INSERT on articles table
  if (payload.type === 'INSERT' && payload.table === 'articles') {
    const article = payload.record;
    
    // Only post if article is published (not draft)
    if (article.status === 'published' && article.slug) {
      // Fire and forget - don't block webhook response
      postArticleToLinkedIn(article.slug).catch(err => {
        console.error(`[LinkedIn] Failed to post article ${article.slug}:`, err);
      });
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 7: Create cron route for batch processing**

```typescript
// app/api/cron/linkedin-batch/route.ts
import { NextResponse } from 'next/server';
import { checkAndPostNewArticles } from '@/lib/linkedin/automation';
import { headers } from 'next/headers';

// This route should be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external scheduler)
// Protect with CRON_SECRET
export async function GET(request: Request) {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkAndPostNewArticles();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[LinkedIn Cron] Batch posting failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add lib/linkedin/automation.ts lib/linkedin/__tests__/automation.test.ts app/api/admin/linkedin/post/ app/api/webhooks/article-published/ app/api/cron/linkedin-batch/
git commit -m "feat: add LinkedIn automation triggers (manual, webhook, cron)"
```

---

### Task 5: Error Handling & Retry Logic

**Files:**
- Create: `lib/linkedin/retry.ts`
- Create: `lib/linkedin/__tests__/retry.test.ts`
- Modify: `lib/linkedin/client.ts` (integrate retry logic)
- Modify: `lib/linkedin/automation.ts` (integrate retry logic)

**Interfaces:**
- Consumes: `LinkedInClient`, `PostResult`
- Produces: `withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T>`, `RetryOptions` interface, `LinkedInError` class hierarchy

- [ ] **Step 1: Write failing test for retry logic**

```typescript
// lib/linkedin/__tests__/retry.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, LinkedInRateLimitError, LinkedInAuthError, LinkedInServerError } from '@/lib/linkedin/retry';

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries on rate limit error with exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new LinkedInRateLimitError('Rate limited', 429))
      .mockRejectedValueOnce(new LinkedInRateLimitError('Rate limited', 429))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
    
    // Fast-forward through delays
    await vi.runAllTimersAsync();
    
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('retries on server error (5xx)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new LinkedInServerError('Internal server error', 500))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 50 });
    await vi.runAllTimersAsync();
    
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry on auth error (401)', async () => {
    const fn = vi.fn().mockRejectedValue(new LinkedInAuthError('Unauthorized', 401));

    await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toThrow(LinkedInAuthError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on client error (4xx except 429)', async () => {
    const fn = vi.fn().mockRejectedValue(new LinkedInServerError('Bad request', 400));

    await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toThrow(LinkedInServerError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after max attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new LinkedInRateLimitError('Rate limited', 429));

    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toThrow(LinkedInRateLimitError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('calls onRetry callback', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new LinkedInRateLimitError('Rate limited', 429))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 10, onRetry });
    await vi.runAllTimersAsync();
    
    await promise;
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(LinkedInRateLimitError));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test lib/linkedin/__tests__/retry.test.ts`
Expected: FAIL with "Cannot find module '@/lib/linkedin/retry'"

- [ ] **Step 3: Implement retry logic in `lib/linkedin/retry.ts`**

```typescript
// lib/linkedin/retry.ts
export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
  onRetry?: (attempt: number, error: Error) => void;
}

export class LinkedInError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly details?: unknown) {
    super(message);
    this.name = 'LinkedInError';
  }
}

export class LinkedInRateLimitError extends LinkedInError {
  constructor(message: string, statusCode: number = 429, details?: unknown) {
    super(message, statusCode, details);
    this.name = 'LinkedInRateLimitError';
  }
}

export class LinkedInAuthError extends LinkedInError {
  constructor(message: string, statusCode: number = 401, details?: unknown) {
    super(message, statusCode, details);
    this.name = 'LinkedInAuthError';
  }
}

export class LinkedInServerError extends LinkedInError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, statusCode, details);
    this.name = 'LinkedInServerError';
  }
}

export class LinkedInClientError extends LinkedInError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, statusCode, details);
    this.name = 'LinkedInClientError';
  }
}

const DEFAULT_RETRYABLE_CODES = [429, 500, 502, 503, 504];

export function isRetryableError(error: Error, retryableCodes: number[]): boolean {
  if (error instanceof LinkedInRateLimitError) return true;
  if (error instanceof LinkedInAuthError) return false;
  if (error instanceof LinkedInClientError) return false;
  if (error instanceof LinkedInServerError) return retryableCodes.includes(error.statusCode);
  return false; // Unknown errors - don't retry by default
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    retryableStatusCodes = DEFAULT_RETRYABLE_CODES,
    onRetry,
  } = options;

  let lastError: Error;
  let delay = baseDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) break;
      
      if (!isRetryableError(lastError, retryableCodes)) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait with jitter
      const jitter = Math.random() * 0.3 * delay;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError!;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test lib/linkedin/__tests__/retry.test.ts`
Expected: PASS

- [ ] **Step 5: Update LinkedIn client to use retry logic**

```typescript
// lib/linkedin/client.ts - Update the makeRequest method
import { withRetry, LinkedInRateLimitError, LinkedInAuthError, LinkedInServerError, LinkedInClientError } from '@/lib/linkedin/retry';

private async makeRequest(
  endpoint: string,
  method: string,
  body: Record<string, unknown>,
  accessToken: string
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': API_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    // Classify errors for retry logic
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = `LinkedIn API error: ${response.status}`;
      
      if (response.status === 429) {
        throw new LinkedInRateLimitError(message, 429, errorData);
      }
      if (response.status === 401) {
        throw new LinkedInAuthError(message, 401, errorData);
      }
      if (response.status >= 500) {
        throw new LinkedInServerError(message, response.status, errorData);
      }
      if (response.status >= 400) {
        throw new LinkedInClientError(message, response.status, errorData);
      }
    }

    return response;
  }, {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    onRetry: (attempt, error) => {
      console.warn(`[LinkedIn] Retry attempt ${attempt} after error:`, error.message);
    },
  });
}
```

- [ ] **Step 6: Update automation to use retry for batch operations**

```typescript
// lib/linkedin/automation.ts - Update batchPostArticles
import { withRetry, LinkedInRateLimitError } from '@/lib/linkedin/retry';

export async function batchPostArticles(slugs: string[]): Promise<BatchResult> {
  const client = new LinkedInClient();
  const results: BatchResult['results'] = [];
  let posted = 0;
  let failed = 0;

  for (const slug of slugs) {
    const article = await extractArticleForLinkedIn(slug);
    
    if (!article) {
      results.push({ slug, result: { success: false, error: 'Article not found' } });
      failed++;
      continue;
    }

    // Wrap individual post in retry
    const result = await withRetry(
      () => client.postArticle(article),
      {
        maxAttempts: 3,
        baseDelayMs: 2000,
        maxDelayMs: 15000,
        onRetry: (attempt, error) => {
          console.warn(`[LinkedIn Batch] Retry ${attempt} for ${slug}:`, error.message);
        },
      }
    ).catch(error => ({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));

    results.push({ slug, result });

    if (result.success) {
      posted++;
      await updateArticleLinkedInStatus(slug, 'posted', result.postUrn);
    } else {
      failed++;
      await updateArticleLinkedInStatus(slug, 'failed', undefined, result.error);
    }

    // Rate limiting delay between articles
    if (slugs.indexOf(slug) < slugs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  return { posted, failed, results };
}
```

- [ ] **Step 7: Run all tests to verify integration**

Run: `npm test lib/linkedin/`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add lib/linkedin/retry.ts lib/linkedin/__tests__/retry.test.ts lib/linkedin/client.ts lib/linkedin/automation.ts
git commit -m "feat: add robust retry logic with exponential backoff for LinkedIn API"
```

---

### Task 6: Monitoring & Logging

**Files:**
- Create: `lib/linkedin/monitoring.ts`
- Create: `lib/linkedin/__tests__/monitoring.test.ts`
- Create: `app/api/admin/linkedin/status/route.ts`
- Modify: `lib/linkedin/client.ts` (add logging)
- Modify: `lib/linkedin/automation.ts` (add logging)

**Interfaces:**
- Consumes: All previous LinkedIn modules
- Produces: `logLinkedInEvent(event: LinkedInEvent): Promise<void>`, `getLinkedInMetrics(): Promise<LinkedInMetrics>`, `LinkedInEvent` type, `LinkedInMetrics` type

- [ ] **Step 1: Write failing test for monitoring**

```typescript
// lib/linkedin/__tests__/monitoring.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logLinkedInEvent, getLinkedInMetrics, LinkedInEventType } from '@/lib/linkedin/monitoring';

describe('LinkedIn Monitoring', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    };
    vi.doMock('@/lib/supabase/server', () => ({ createClient: () => mockSupabase }));
  });

  it('logs post attempt event', async () => {
    mockSupabase.insert.mockResolvedValue({ error: null });

    await logLinkedInEvent({
      type: 'post_attempt',
      slug: 'test-article',
      status: 'success',
      postUrn: 'urn:li:share:123',
      timestamp: new Date().toISOString(),
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('linkedin_events');
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'post_attempt',
        slug: 'test-article',
        status: 'success',
        post_urn: 'urn:li:share:123',
      })
    );
  });

  it('logs post failure with error details', async () => {
    mockSupabase.insert.mockResolvedValue({ error: null });

    await logLinkedInEvent({
      type: 'post_attempt',
      slug: 'test-article',
      status: 'failed',
      error: 'Rate limited',
      timestamp: new Date().toISOString(),
    });

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: 'Rate limited',
      })
    );
  });

  it('retrieves metrics for dashboard', async () => {
    mockSupabase.select.mockResolvedValue({
      data: [
        { type: 'post_attempt', status: 'success', created_at: '2026-01-15T10:00:00Z' },
        { type: 'post_attempt', status: 'success', created_at: '2026-01-15T11:00:00Z' },
        { type: 'post_attempt', status: 'failed', created_at: '2026-01-15T12:00:00Z' },
      ],
      error: null,
    });

    const metrics = await getLinkedInMetrics();
    expect(metrics.totalPosts).toBe(3);
    expect(metrics.successfulPosts).toBe(2);
    expect(metrics.failedPosts).toBe(1);
    expect(metrics.successRate).toBeCloseTo(66.67, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test lib/linkedin/__tests__/monitoring.test.ts`
Expected: FAIL with "Cannot find module '@/lib/linkedin/monitoring'"

- [ ] **Step 3: Implement monitoring in `lib/linkedin/monitoring.ts`**

```typescript
// lib/linkedin/monitoring.ts
import { createClient } from '@/lib/supabase/server';

export type LinkedInEventType = 'post_attempt' | 'token_refresh' | 'oauth_init' | 'oauth_callback' | 'batch_start' | 'batch_complete';

export interface LinkedInEvent {
  type: LinkedInEventType;
  slug?: string;
  status: 'success' | 'failed' | 'pending';
  postUrn?: string;
  error?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface LinkedInMetrics {
  totalPosts: number;
  successfulPosts: number;
  failedPosts: number;
  successRate: number;
  recentEvents: LinkedInEvent[];
  lastPostAt: string | null;
}

const EVENTS_TABLE = 'linkedin_events';

export async function logLinkedInEvent(event: LinkedInEvent): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from(EVENTS_TABLE).insert({
      type: event.type,
      slug: event.slug,
      status: event.status,
      post_urn: event.postUrn,
      error: event.error,
      details: event.details,
      created_at: event.timestamp,
    });

    if (error) {
      console.error('[LinkedIn Monitoring] Failed to log event:', error);
    }
  } catch (err) {
    console.error('[LinkedIn Monitoring] Unexpected error logging event:', err);
  }
}

export async function getLinkedInMetrics(days: number = 30): Promise<LinkedInMetrics> {
  const supabase = createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .select('*')
    .eq('type', 'post_attempt')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) {
    return {
      totalPosts: 0,
      successfulPosts: 0,
      failedPosts: 0,
      successRate: 0,
      recentEvents: [],
      lastPostAt: null,
    };
  }

  const postAttempts = data.filter(e => e.type === 'post_attempt');
  const successful = postAttempts.filter(e => e.status === 'success');
  const failed = postAttempts.filter(e => e.status === 'failed');

  return {
    totalPosts: postAttempts.length,
    successfulPosts: successful.length,
    failedPosts: failed.length,
    successRate: postAttempts.length > 0 ? (successful.length / postAttempts.length) * 100 : 0,
    recentEvents: data as LinkedInEvent[],
    lastPostAt: successful[0]?.created_at || null,
  };
}

// Helper to log from client/automation
export function createEventLogger() {
  return {
    logPostAttempt: (slug: string, status: 'success' | 'failed', postUrn?: string, error?: string) =>
      logLinkedInEvent({
        type: 'post_attempt',
        slug,
        status,
        postUrn,
        error,
        timestamp: new Date().toISOString(),
      }),
    logTokenRefresh: (status: 'success' | 'failed', error?: string) =>
      logLinkedInEvent({
        type: 'token_refresh',
        status,
        error,
        timestamp: new Date().toISOString(),
      }),
    logBatchStart: (count: number) =>
      logLinkedInEvent({
        type: 'batch_start',
        status: 'pending',
        details: { articleCount: count },
        timestamp: new Date().toISOString(),
      }),
    logBatchComplete: (posted: number, failed: number) =>
      logLinkedInEvent({
        type: 'batch_complete',
        status: failed === 0 ? 'success' : 'failed',
        details: { posted, failed },
        timestamp: new Date().toISOString(),
      }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test lib/linkedin/__tests__/monitoring.test.ts`
Expected: PASS

- [ ] **Step 5: Create Supabase migration for events table**

```sql
-- supabase/migrations/20261115_linkedin_events.sql
CREATE TABLE IF NOT EXISTS linkedin_events (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  slug TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  post_urn TEXT,
  error TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_linkedin_events_type_created ON linkedin_events(type, created_at DESC);
CREATE INDEX idx_linkedin_events_slug ON linkedin_events(slug);

ALTER TABLE linkedin_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage LinkedIn events"
  ON linkedin_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view LinkedIn events"
  ON linkedin_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

- [ ] **Step 6: Create admin status API route**

```typescript
// app/api/admin/linkedin/status/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLinkedInMetrics } from '@/lib/linkedin/monitoring';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const metrics = await getLinkedInMetrics(30);
  
  // Also get token status
  const { data: tokens } = await supabase
    .from('linkedin_tokens')
    .select('expires_at, scope, updated_at')
    .eq('id', 'company_page_tokens')
    .single();

  return NextResponse.json({
    metrics,
    tokens: tokens ? {
      expiresAt: tokens.expires_at,
      scope: tokens.scope,
      lastUpdated: tokens.updated_at,
      isExpired: Date.now() >= tokens.expires_at,
    } : null,
  });
}
```

- [ ] **Step 7: Integrate logging into client and automation**

```typescript
// lib/linkedin/client.ts - Add to postArticle method
import { createEventLogger } from '@/lib/linkedin/monitoring';

const logger = createEventLogger();

export async function postArticle(article: ArticleData): Promise<PostResult> {
  try {
    // ... existing code ...
    const result = await this.makeRequest('/posts', 'POST', postBody, tokens.access_token);
    
    if (!response.ok) {
      // ... error handling ...
      await logger.logPostAttempt(article.url, 'failed', undefined, errorMessage);
      return { success: false, error: errorMessage };
    }

    const data = await response.json();
    await logger.logPostAttempt(article.url, 'success', data.id);
    return { success: true, postUrn: data.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logger.logPostAttempt(article.url, 'failed', undefined, errorMessage);
    return { success: false, error: errorMessage };
  }
}
```

```typescript
// lib/linkedin/automation.ts - Add to batchPostArticles
import { createEventLogger } from '@/lib/linkedin/monitoring';

const logger = createEventLogger();

export async function batchPostArticles(slugs: string[]): Promise<BatchResult> {
  await logger.logBatchStart(slugs.length);
  
  // ... existing code ...
  
  await logger.logBatchComplete(posted, failed);
  return { posted, failed, results };
}
```

- [ ] **Step 8: Run all tests to verify integration**

Run: `npm test lib/linkedin/`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add lib/linkedin/monitoring.ts lib/linkedin/__tests__/monitoring.test.ts supabase/migrations/20261115_linkedin_events.sql app/api/admin/linkedin/status/ lib/linkedin/client.ts lib/linkedin/automation.ts
git commit -m "feat: add LinkedIn monitoring, logging, and admin status dashboard"
```

---

### Task 7: Testing & Validation

**Files:**
- Create: `lib/linkedin/__tests__/integration.test.ts`
- Create: `test/e2e/linkedin-automation.spec.ts`
- Modify: `package.json` (add test scripts)
- Create: `.github/workflows/linkedin-automation.yml` (CI workflow)

**Interfaces:**
- Consumes: All LinkedIn modules
- Produces: Integration tests, E2E tests, CI pipeline

- [ ] **Step 1: Write integration test**

```typescript
// lib/linkedin/__tests__/integration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkedInClient } from '@/lib/linkedin/client';
import { formatLinkedInPost } from '@/lib/linkedin/content-formatter';
import { extractArticleForLinkedIn } from '@/lib/linkedin/article-extractor';
import { postArticleToLinkedIn } from '@/lib/linkedin/automation';

describe('LinkedIn Integration', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.LINKEDIN_CLIENT_ID = 'test-client';
    process.env.LINKEDIN_CLIENT_SECRET = 'test-secret';
    process.env.LINKEDIN_REDIRECT_URI = 'https://test.com/callback';
    process.env.LINKEDIN_COMPANY_URN = 'urn:li:organization:144133153';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://researchwith.me';
  });

  it('full flow: extract article -> format -> post', async () => {
    // Mock article data
    const mockArticle = {
      id: 'post-integration',
      slug: 'integration-test',
      title: 'Integration Test Article',
      subtitle: 'Testing the full pipeline',
      category: 'Research Reviews',
      format: 'Paper Review',
      author: { id: 'a1', name: 'Test Author', avatar: 'TA', role: 'Researcher', domain: 'AI' },
      publishedAt: 'January 15, 2026',
      readTime: '10 min read',
      coverImage: '/images/test.jpg',
      featured: true,
      summary: 'This is a test article for integration testing.',
      content: ['Para 1'],
      keyTakeaways: ['Takeaway 1'],
      tags: ['Testing', 'Integration'],
      likes: 0,
      commentsCount: 0,
      dateISO: '2026-01-15',
    };

    vi.doMock('@/lib/cms/catalogue', () => ({
      getCachedArticleCatalogue: vi.fn().mockResolvedValue([mockArticle]),
    }));

    // Mock token store
    vi.doMock('@/lib/linkedin/token-store', () => ({
      TokenStore: vi.fn().mockImplementation(() => ({
        getTokens: vi.fn().mockResolvedValue({
          access_token: 'valid-token',
          refresh_token: 'refresh-token',
          expires_at: Date.now() + 3600000,
          scope: 'r_organization_social w_member_social rw_organization_admin',
        }),
        saveTokens: vi.fn().mockResolvedValue(undefined),
        isTokenExpired: vi.fn().mockReturnValue(false),
      })),
    }));

    // Mock fetch for LinkedIn API
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'urn:li:share:integration123' }),
      });

    // Run full flow
    const article = await extractArticleForLinkedIn('integration-test');
    expect(article).not.toBeNull();

    const formatted = formatLinkedInPost(article!);
    expect(formatted.text).toContain('Integration Test Article');
    expect(formatted.text.length).toBeLessThanOrEqual(3000);

    const client = new LinkedInClient();
    const result = await client.postArticle(article!);
    expect(result.success).toBe(true);
    expect(result.postUrn).toBe('urn:li:share:integration123');
  });

  it('handles special characters in article content', async () => {
    const mockArticle = {
      id: 'post-special',
      slug: 'special-chars',
      title: 'Article with "Quotes" & <Tags>',
      subtitle: 'Subtitle',
      category: 'Research Reviews',
      format: 'Paper Review',
      author: { id: 'a1', name: 'Author', avatar: 'A', role: 'Researcher', domain: 'AI' },
      publishedAt: 'January 15, 2026',
      readTime: '5 min read',
      coverImage: '',
      featured: false,
      summary: 'Summary with special chars: "quotes", <tags>, & ampersands',
      content: [],
      keyTakeaways: [],
      tags: ['Special', 'Chars'],
      likes: 0,
      commentsCount: 0,
    };

    vi.doMock('@/lib/cms/catalogue', () => ({
      getCachedArticleCatalogue: vi.fn().mockResolvedValue([mockArticle]),
    }));

    vi.doMock('@/lib/linkedin/token-store', () => ({
      TokenStore: vi.fn().mockImplementation(() => ({
        getTokens: vi.fn().mockResolvedValue({
          access_token: 'valid-token',
          refresh_token: 'refresh-token',
          expires_at: Date.now() + 3600000,
          scope: 'r_organization_social w_member_social rw_organization_admin',
        }),
        saveTokens: vi.fn().mockResolvedValue(undefined),
        isTokenExpired: vi.fn().mockReturnValue(false),
      })),
    }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'urn:li:share:special123' }),
    });

    const article = await extractArticleForLinkedIn('special-chars');
    const formatted = formatLinkedInPost(article!);
    
    // Verify special characters are handled
    expect(formatted.text).toContain('"Quotes"');
    expect(formatted.text).toContain('<Tags>');
    expect(formatted.text).toContain('& ampersands');
  });
});
```

- [ ] **Step 2: Write E2E test**

```typescript
// test/e2e/linkedin-automation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('LinkedIn Admin Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@researchwith.me');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('admin can connect LinkedIn account', async ({ page }) => {
    await page.goto('/admin/linkedin');
    
    // Click connect button
    await page.click('button:has-text("Connect LinkedIn")');
    
    // Should redirect to LinkedIn OAuth
    await expect(page).toHaveURL(/linkedin\.com\/oauth/);
  });

  test('admin can manually post article', async ({ page }) => {
    await page.goto('/admin/linkedin');
    
    // Select article from dropdown
    await page.selectOption('select[name="articleSlug"]', 'inside-vllm-and-paged-attention');
    
    // Click post button
    await page.click('button:has-text("Post to LinkedIn")');
    
    // Wait for success toast
    await expect(page.locator('text=Successfully posted to LinkedIn')).toBeVisible({ timeout: 10000 });
  });

  test('shows LinkedIn posting status', async ({ page }) => {
    await page.goto('/admin/linkedin');
    
    // Check status cards
    await expect(page.locator('text=LinkedIn Status')).toBeVisible();
    await expect(page.locator('text=Connected')).toBeVisible(); // or "Not Connected"
  });
});
```

- [ ] **Step 3: Add test scripts to package.json**

```json
// package.json - Add to scripts section
{
  "scripts": {
    "test:linkedin": "vitest run lib/linkedin/__tests__/",
    "test:linkedin:watch": "vitest lib/linkedin/__tests__/",
    "test:e2e:linkedin": "playwright test test/e2e/linkedin-automation.spec.ts",
    "test:all": "npm run test && npm run test:linkedin"
  }
}
```

- [ ] **Step 4: Create CI workflow**

```yaml
# .github/workflows/linkedin-automation.yml
name: LinkedIn Automation Tests

on:
  push:
    paths:
      - 'lib/linkedin/**'
      - 'app/api/admin/linkedin/**'
      - 'app/api/webhooks/article-published/**'
      - 'app/api/cron/linkedin-batch/**'
      - 'supabase/migrations/*linkedin*'
  pull_request:
    paths:
      - 'lib/linkedin/**'
      - 'app/api/admin/linkedin/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run LinkedIn unit tests
        run: npm run test:linkedin
        env:
          LINKEDIN_CLIENT_ID: ${{ secrets.LINKEDIN_CLIENT_ID }}
          LINKEDIN_CLIENT_SECRET: ${{ secrets.LINKEDIN_CLIENT_SECRET }}
          LINKEDIN_REDIRECT_URI: ${{ secrets.LINKEDIN_REDIRECT_URI }}
          LINKEDIN_COMPANY_URN: ${{ secrets.LINKEDIN_COMPANY_URN }}
          NEXT_PUBLIC_SITE_URL: https://researchwith.me
      
      - name: Run type check
        run: npm run typecheck
      
      - name: Run lint
        run: npm run lint

  e2e:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Run E2E tests
        run: npm run test:e2e:linkedin
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000
```

- [ ] **Step 5: Run all tests to verify**

Run: `npm run test:linkedin`
Expected: PASS (all LinkedIn unit tests)

Run: `npm run test:e2e:linkedin`
Expected: PASS (E2E tests - requires running dev server)

Run: `npm run typecheck`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Manual validation with company page**

1. Deploy to staging environment
2. Navigate to `/admin/linkedin`
3. Click "Connect LinkedIn" and authorize with company page admin account
4. Select a published article and click "Post to LinkedIn"
5. Verify post appears on https://www.linkedin.com/company/144133153/
6. Check formatting, hashtags, link, and image
7. Verify admin status dashboard shows success metrics

- [ ] **Step 7: Commit**

```bash
git add lib/linkedin/__tests__/integration.test.ts test/e2e/linkedin-automation.spec.ts package.json .github/workflows/linkedin-automation.yml
git commit -m "test: add integration tests, E2E tests, and CI workflow for LinkedIn automation"
```

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-11-15-linkedin-post-automation.md`. Please review the plan. Which execution approach would you prefer?**

- **Subagent-driven** - A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** - I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end. Runs well with a mid-tier session model, since the plan carries the design.

**For this plan I recommend Subagent-driven, because the LinkedIn integration involves multiple independent modules (OAuth, API client, content formatting, automation triggers, retry logic, monitoring) that can be developed and reviewed in parallel, and a mistake in token handling or rate limiting could result in API bans or failed posts that are hard to debug. Does the plan capture what you want, and which approach should we use?**