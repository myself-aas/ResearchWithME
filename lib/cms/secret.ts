import { isValidSecret } from './secret-core';

function configuredSecret() {
  return (process.env.REVALIDATE_SECRET || process.env.MY_SECRET_TOKEN || '').trim();
}

export function hasRevalidateSecret() {
  return configuredSecret().length > 0;
}

/**
 * Constant-time comparison against the configured secret (REVALIDATE_SECRET,
 * with the legacy MY_SECRET_TOKEN accepted). Kept as the Next-signature
 * wrapper until Task 16; the Pages webhook uses isValidSecret directly.
 */
export function isValidRevalidateSecret(provided: string | null): boolean {
  return isValidSecret(provided, configuredSecret());
}
