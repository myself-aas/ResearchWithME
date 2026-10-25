import { createHash, timingSafeEqual } from 'node:crypto';

function configuredSecret() {
  return (process.env.REVALIDATE_SECRET || process.env.MY_SECRET_TOKEN || '').trim();
}

export function hasRevalidateSecret() {
  return configuredSecret().length > 0;
}

/**
 * Constant-time comparison. Both values are hashed first so a length difference
 * cannot leak through timing either.
 */
export function isValidRevalidateSecret(provided: string | null): boolean {
  const expected = configuredSecret();
  if (!expected || !provided) return false;

  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}
