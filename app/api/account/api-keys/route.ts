import { apiError, apiJson } from '@/lib/api/errors';
import { getApiKeyStore } from '@/lib/api/key-store';
import { MAX_ACTIVE_KEYS, generateApiKey, hashApiKey } from '@/lib/api/keys';
import { requireAccount } from '@/lib/api/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_NAME = 60;
const MAX_BODY = 1024;

function unavailable(error: unknown) {
  console.error('API key store failed:', error instanceof Error ? error.message : error);
  return apiError('UPSTREAM_UNAVAILABLE', 'API keys are unavailable right now. Try again shortly.');
}

export async function GET(request: Request) {
  const account = await requireAccount(request);
  if (!account.ok) return account.response;
  try {
    return apiJson({ data: await getApiKeyStore().list(account.userId) });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  const account = await requireAccount(request);
  if (!account.ok) return account.response;

  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return apiError('UNSUPPORTED_MEDIA_TYPE', 'Send the request as application/json.');
  }

  let name = '';
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) throw new Error('too large');
    const body = JSON.parse(raw) as { name?: unknown };
    name = typeof body?.name === 'string' ? body.name.trim() : '';
  } catch {
    return apiError('INVALID_REQUEST', 'The request body could not be read.');
  }
  if (name.length < 1 || name.length > MAX_NAME) {
    return apiError('INVALID_REQUEST', `name must be 1 to ${MAX_NAME} characters.`);
  }

  // The raw key exists only in this scope and in the response body below.
  const { key, prefix } = generateApiKey();
  try {
    const created = await getApiKeyStore().create(account.userId, { name, prefix, keyHash: await hashApiKey(key) });
    if (created === 'LIMIT_REACHED') {
      return apiError('INVALID_REQUEST', `You can have at most ${MAX_ACTIVE_KEYS} active keys. Revoke one first.`);
    }
    return apiJson({ ...created, key }, 201);
  } catch (error) {
    return unavailable(error);
  }
}
