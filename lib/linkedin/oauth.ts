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