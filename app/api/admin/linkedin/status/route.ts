import { NextResponse } from 'next/server';
import { TokenStore, type LinkedInRpcClient } from '@/lib/linkedin/token-store';
import { getLinkedInMetrics } from '@/lib/linkedin/monitoring';
import { requireEditorInChief } from '@/lib/cms/auth';
import { noStoreHeaders } from '@/lib/cms/http';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/v34/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'admin-linkedin-status', 60, 60_000);
  if (limited) return limited;
  const gate = await requireEditorInChief();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status, headers: noStoreHeaders() });
  }

  const supabase = await createSupabaseServerClient();
  const rpcClient = supabase as unknown as LinkedInRpcClient;
  const tokenStore = new TokenStore({ client: rpcClient });

  const tokens = await tokenStore.getTokens();
  const metrics = await getLinkedInMetrics(30, { client: rpcClient });

  const isConnected = Boolean(tokens);
  const isExpired = tokens ? tokenStore.isTokenExpired(tokens) : false;

  return NextResponse.json(
    {
      connected: isConnected,
      scope: 'editorial_only',
      tokenExpired: isExpired,
      expiresAt: tokens?.expires_at ? new Date(tokens.expires_at).toISOString() : null,
      metrics,
    },
    { headers: noStoreHeaders() },
  );
}
