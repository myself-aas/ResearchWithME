import { apiError } from '@/lib/api/errors';
import { getApiKeyStore } from '@/lib/api/key-store';
import { requireAccount } from '@/lib/api/session';
import { enforceRateLimit } from '@/lib/v34/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, context: { params: Promise<{ keyId: string }> }) {
  const limited = await enforceRateLimit(request, 'account-api-keys-delete', 30, 60_000);
  if (limited) return limited;

  const account = await requireAccount(request);
  if (!account.ok) return account.response;

  const { keyId } = await context.params;
  try {
    const revoked = await getApiKeyStore().revoke(account.userId, keyId);
    if (!revoked) return apiError('NOT_FOUND', 'No active key with that id belongs to this account.');
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('API key store failed:', error instanceof Error ? error.message : error);
    return apiError('UPSTREAM_UNAVAILABLE', 'API keys are unavailable right now. Try again shortly.');
  }
}
