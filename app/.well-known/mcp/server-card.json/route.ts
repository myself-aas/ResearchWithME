import { mcpCardResponse } from '@/lib/mcp';
import { SITE_URL } from '@/lib/seo';

export function GET() {
  return mcpCardResponse(SITE_URL, 'GET');
}

export function HEAD() {
  return mcpCardResponse(SITE_URL, 'HEAD');
}
