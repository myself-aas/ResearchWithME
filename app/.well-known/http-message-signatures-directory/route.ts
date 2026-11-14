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

/**
 * The authority the response was served from. The directory self-signature
 * covers it, so it must be the host the client actually requested — not a
 * configured site URL, which differs on preview deployments.
 */
function authority(request: Request): string | undefined {
  return request.headers.get('host') ?? undefined;
}

export function GET(request: Request) {
  return webBotDirectoryResponse(privateJwk(), 'GET', authority(request));
}

export function HEAD(request: Request) {
  return webBotDirectoryResponse(privateJwk(), 'HEAD', authority(request));
}
