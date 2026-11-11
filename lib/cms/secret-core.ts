import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison for webhook secrets. Both values are hashed first
 * so a length difference cannot leak through timing either.
 *
 * Lives in its own module (no Next, no env access) so the Pages webhook can
 * share it; node:crypto is available in workerd under nodejs_compat.
 */
export function isValidSecret(provided: string | null, expected: string): boolean {
  if (!expected || !provided) return false;

  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}
