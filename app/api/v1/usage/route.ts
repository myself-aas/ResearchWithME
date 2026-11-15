import { authenticateApiRequest, rateLimited } from '@/lib/api/authenticate';
import { checkBurst } from '@/lib/api/burst';
import { apiError, apiJson } from '@/lib/api/errors';
import { getLedger, monthlyIncluded } from '@/lib/api/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** What the key's account has used this month. Reading it spends nothing. */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const burst = await checkBurst(auth.identity.keyId);
  if (!burst.allowed) return rateLimited(burst.retryAfter);

  try {
    const usage = await getLedger().usage(auth.identity.userId, monthlyIncluded());
    return apiJson({ plan: 'FREE', ...usage });
  } catch (error) {
    console.error('API usage read failed:', error instanceof Error ? error.message : error);
    return apiError('UPSTREAM_UNAVAILABLE', 'Usage cannot be read right now. Try again shortly.');
  }
}
