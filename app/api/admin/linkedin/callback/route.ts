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