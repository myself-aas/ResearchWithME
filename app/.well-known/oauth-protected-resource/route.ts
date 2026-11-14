import { protectedResourceMetadata } from '@/lib/agent-auth';

export const dynamic = 'force-dynamic';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim() || 'https://researchwith.me';

export function GET() {
  return protectedResourceMetadata(SITE);
}

export function HEAD() {
  const response = protectedResourceMetadata(SITE);
  return new Response(null, { status: response.status, headers: response.headers });
}
