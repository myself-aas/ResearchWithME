/**
 * API key format: `rwm_` followed by 32 random bytes in base64url (43
 * characters). Only the SHA-256 hash and the first 12 characters are stored;
 * the key is high-entropy, so a fast unsalted hash is sufficient and lets the
 * lookup be a single indexed equality.
 */
export const MAX_ACTIVE_KEYS = 5;
export const KEY_PATTERN = /^rwm_[A-Za-z0-9_-]{43}$/;
const PREFIX_LENGTH = 12;

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function secureRandom(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function generateApiKey(randomBytes: (n: number) => Uint8Array = secureRandom): { key: string; prefix: string } {
  const key = `rwm_${base64Url(randomBytes(32))}`;
  return { key, prefix: key.slice(0, PREFIX_LENGTH) };
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hashApiKey(key: string): Promise<string> {
  return sha256Hex(key);
}

/** The key, or null unless the header is exactly `Bearer <key>`. */
export function parseBearer(header: string | null): string | null {
  if (!header || !header.startsWith('Bearer ')) return null;
  const candidate = header.slice('Bearer '.length);
  return KEY_PATTERN.test(candidate) ? candidate : null;
}
