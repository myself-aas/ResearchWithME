import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/linkedin/oauth';
import { requireEditorInChief } from '@/lib/cms/auth';
import { noStoreHeaders } from '@/lib/cms/http';
import { enforceRateLimit } from '@/lib/v34/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'admin-linkedin-auth', 20, 60_000);
  if (limited) return limited;
  const gate = await requireEditorInChief();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status, headers: noStoreHeaders() });
  }

  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_REDIRECT_URI) {
    return NextResponse.json(
      { error: 'LinkedIn OAuth is not configured on this deployment.' },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  const state = crypto.randomUUID();
  const authUrl = getAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/api/admin/linkedin',
  });

  return response;
}
