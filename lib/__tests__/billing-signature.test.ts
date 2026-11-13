import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyLemonSignature } from '@/lib/billing/signature';

const SECRET = 'whsec_test_0123456789abcdef';
const BODY = JSON.stringify({ meta: { event_name: 'order_created' } });
const sign = (body: string, secret = SECRET) => createHmac('sha256', secret).update(body).digest('hex');

describe('verifyLemonSignature', () => {
  it('accepts an HMAC over the exact raw body', () => {
    expect(verifyLemonSignature(BODY, sign(BODY), SECRET)).toBe(true);
  });
  it('accepts uppercase hex and surrounding whitespace', () => {
    expect(verifyLemonSignature(BODY, `  ${sign(BODY).toUpperCase()}\n`, SECRET)).toBe(true);
  });
  it('rejects a tampered body', () => {
    expect(verifyLemonSignature(`${BODY} `, sign(BODY), SECRET)).toBe(false);
  });
  it('rejects a signature made with another secret', () => {
    expect(verifyLemonSignature(BODY, sign(BODY, 'other'), SECRET)).toBe(false);
  });
  it('rejects a missing header, an empty secret, and a short signature without throwing', () => {
    expect(verifyLemonSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyLemonSignature(BODY, sign(BODY), '')).toBe(false);
    expect(verifyLemonSignature(BODY, sign(BODY).slice(0, 63), SECRET)).toBe(false);
    expect(verifyLemonSignature(BODY, 'zz'.repeat(32), SECRET)).toBe(false);
  });
});
