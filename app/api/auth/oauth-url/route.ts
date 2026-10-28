import { NextRequest, NextResponse } from 'next/server';

// Google, GitHub, and email sign-in go through Supabase Auth (lib/supabase/oauth.ts).
// Only the ORCID prototype still builds its URL here until ORCID is added to Supabase.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider') || 'orcid';
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://researchwith.me';
  const redirectUri = `${origin}/auth/callback?provider=${provider}`;

  let authUrl = '';

  switch (provider) {
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
    configured: Boolean(provider === 'orcid' && process.env.ORCID_CLIENT_ID),
  });
}
