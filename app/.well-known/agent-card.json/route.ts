import { agentCard } from '@/lib/a2a';
import { SITE_URL } from '@/lib/seo';

export function GET() {
  return Response.json(agentCard(SITE_URL), {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}

export function HEAD() {
  return new Response(null, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
}
