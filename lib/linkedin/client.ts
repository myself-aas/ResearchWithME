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