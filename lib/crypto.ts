import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const LEGACY_SALT = 'researchwithme-linkedin-salt';
const V2_PREFIX = 'v2';

function requireSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ENCRYPTION_SECRET must be at least 32 characters');
  }
  return secret;
}

function deriveKey(salt: Buffer | string): Buffer {
  return crypto.scryptSync(requireSecret(), salt, 32);
}

/**
 * Encrypts plaintext with AES-256-GCM using a fresh per-ciphertext random salt
 * and IV (`v2:<salt>:<iv>:<authTag>:<ciphertext>`).
 */
export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${V2_PREFIX}:${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts `v2` (per-ciphertext salt) and legacy 3-part (`<iv>:<tag>:<ct>`)
 * AES-256-GCM payloads so existing stored tokens remain readable during rotation.
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');

  if (parts.length === 5 && parts[0] === V2_PREFIX) {
    const [, saltHex, ivHex, authTagHex, encrypted] = parts;
    const key = deriveKey(Buffer.from(saltHex, 'hex'));
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  if (parts.length === 3) {
    const [ivHex, authTagHex, encrypted] = parts;
    const key = deriveKey(LEGACY_SALT);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  throw new Error('Invalid encrypted text format');
}

/**
 * Constant-time string comparison via SHA-256 digests so differing lengths
 * cannot leak timing information.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

/**
 * Verifies an HMAC-SHA256 webhook signature (hex or `sha256=<hex>`).
 */
export function verifyHmacSha256Signature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;
  const candidate = signatureHeader.trim().replace(/^sha256=/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(candidate)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(expected, 'hex'));
}
