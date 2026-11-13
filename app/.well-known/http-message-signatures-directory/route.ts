import { getCloudflareContext } from '@opennextjs/cloudflare';
import { webBotDirectoryResponse } from '@/lib/web-bot-auth';

export const dynamic = 'force-dynamic';

function privateJwk() {
  try {
    const value = (getCloudflareContext().env as { WEB_BOT_AUTH_PRIVATE_JWK?: string }).WEB_BOT_AUTH_PRIVATE_JWK;
    if (value) return value;
  } catch {
    // Node/local mode reads from process.env instead of Worker bindings.
  }
  return process.env.WEB_BOT_AUTH_PRIVATE_JWK;
}

export function GET() {
  return webBotDirectoryResponse(privateJwk(), 'GET');
}

export function HEAD() {
  return webBotDirectoryResponse(privateJwk(), 'HEAD');
}
