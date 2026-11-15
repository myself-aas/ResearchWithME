import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getLinkedInMetrics } from '@/lib/linkedin/monitoring';

export async function GET() {
  const supabase = await createSupabaseServerClient();
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