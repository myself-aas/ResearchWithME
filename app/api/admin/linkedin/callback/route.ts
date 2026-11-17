import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/linkedin/oauth';
import { TokenStore, type LinkedInRpcClient } from '@/lib/linkedin/token-store';
import { requireEditorInChief } from '@/lib/cms/auth';
import { noStoreHeaders } from '@/lib/cms/http';
import { timingSafeEqualStrings } from '@/lib/crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dashboardRedirect(request: NextRequest, params: Record<string, string>) {
  const target = new URL('/dashboard/desk', request.url);
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(target);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  // Clear single-use OAuth state cookie immediately.
  response.cookies.set('linkedin_oauth_state', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/api/admin/linkedin',
  });
  return response;
}

export async function GET(request: NextRequest) {
  const gate = await requireEditorInChief();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status, headers: noStoreHeaders() });
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  if (oauthError) {
    return dashboardRedirect(request, { linkedin_error: oauthError.slice(0, 100) });
  }

  if (!code || !state) {
    return dashboardRedirect(request, { linkedin_error: 'missing_params' });
  }

  const expectedState = request.cookies.get('linkedin_oauth_state')?.value;
  if (!expectedState || !timingSafeEqualStrings(state, expectedState)) {
    return dashboardRedirect(request, { linkedin_error: 'invalid_state' });
  }

  try {
    const tokenResponse = await exchangeCodeForTokens(code);
    const supabase = await createSupabaseServerClient();
    const tokenStore = new TokenStore({
      client: supabase as unknown as LinkedInRpcClient,
    });

    await tokenStore.saveTokens({
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || '',
      expires_at: Date.now() + tokenResponse.expires_in * 1000,
      scope: 'r_organization_social w_member_social rw_organization_admin',
    });

    return dashboardRedirect(request, { linkedin: 'connected' });
  } catch (err) {
    console.error('[LinkedIn OAuth] Token exchange failed:', err);
    return dashboardRedirect(request, { linkedin_error: 'token_exchange_failed' });
  }
}
