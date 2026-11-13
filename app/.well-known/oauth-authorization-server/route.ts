import { oauthDiscoveryResponse } from '@/lib/oauth-discovery';
import { SUPABASE_URL } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export function GET() {
  return oauthDiscoveryResponse(SUPABASE_URL, 'GET');
}

export function HEAD() {
  return oauthDiscoveryResponse(SUPABASE_URL, 'HEAD');
}
