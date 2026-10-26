import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider') || 'github';
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://researchwith.me';
  const redirectUri = `${origin}/auth/callback?provider=${provider}`;

  let authUrl = '';

  switch (provider) {
    case 'github': {
      const clientId = process.env.GITHUB_CLIENT_ID || 'Iv1.rwm_github_oauth_demo';
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
        state: `rwm_gh_${Date.now()}`,
      });
      authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
      break;
    }
    case 'orcid': {
      const clientId = process.env.ORCID_CLIENT_ID || 'APP-RWM-ORCID-DEMO';
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        scope: '/authenticate',
        redirect_uri: redirectUri,
        state: `rwm_orcid_${Date.now()}`,
      });
      authUrl = `https://orcid.org/oauth/authorize?${params.toString()}`;
      break;
    }
    case 'google': {
      const clientId = process.env.GOOGLE_CLIENT_ID || 'rwm-google-oauth-demo.apps.googleusercontent.com';
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        state: `rwm_google_${Date.now()}`,
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      break;
    }
    case 'academic': {
      authUrl = `${origin}/auth/academic`;
      break;
    }
    default:
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  }

  return NextResponse.json({
    provider,
    url: authUrl,
    redirectUri,
    configured: Boolean(
      (provider === 'github' && process.env.GITHUB_CLIENT_ID) ||
      (provider === 'orcid' && process.env.ORCID_CLIENT_ID) ||
      (provider === 'google' && process.env.GOOGLE_CLIENT_ID)
    ),
  });
}
