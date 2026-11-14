import 'server-only';

import { getDashboardUser } from '@/lib/cms/auth';
import { apiError } from './errors';

/** A browser sends `Origin` on every cross-site write; when present it must be ours. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/** The signed-in account for the key management routes, or the response to send instead. */
export async function requireAccount(
  request: Request,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  if (!isSameOrigin(request)) {
    return { ok: false, response: apiError('INVALID_REQUEST', 'This request must come from the site itself.') };
  }
  const user = await getDashboardUser();
  if (!user) {
    return { ok: false, response: apiError('UNAUTHENTICATED', 'Sign in to manage API keys.') };
  }
  return { ok: true, userId: user.id };
}
