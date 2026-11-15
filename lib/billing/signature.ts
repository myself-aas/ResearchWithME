import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Lemon Squeezy signs every webhook with an HMAC-SHA256 of the **raw request
 * body** and sends the hexadecimal digest in `X-Signature`. Nothing else is
 * signed: no timestamp, no URL, no replay window. So the only things this
 * function can prove are "the body was not altered in transit" and "the sender
 * knew the signing secret". Idempotency (Task 6) covers replay.
 *
 * `rawBody` must be the bytes the sender signed. Parsing the JSON first and
 * re-serialising it changes key order and whitespace and breaks the digest, so
 * the route reads the body as text and hands it here untouched.
 *
 * The comparison is timing-safe and length-guarded: `timingSafeEqual` throws on
 * buffers of different length, and a length difference is not secret, so
 * short-circuiting on it leaks nothing.
 */

/** Hex length of a SHA-256 digest, so a malformed header never reaches the compare. */
const HEX_SHA256_LENGTH = 64;

export function hasWebhookSecret(env: Record<string, string | undefined> = process.env): boolean {
  return (env.LEMONSQUEEZY_WEBHOOK_SECRET ?? '').trim().length > 0;
}

export function verifyLemonSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  const expected = secret.trim();
  const provided = (signatureHeader ?? '').trim().toLowerCase();
  if (!expected || provided.length !== HEX_SHA256_LENGTH) return false;
  if (!/^[0-9a-f]+$/.test(provided)) return false;

  const digest = createHmac('sha256', expected).update(rawBody).digest();
  const supplied = Buffer.from(provided, 'hex');
  if (supplied.length !== digest.length) return false;
  return timingSafeEqual(digest, supplied);
}
