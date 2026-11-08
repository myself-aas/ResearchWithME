import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Exercises the real Resend SDK with no mock, against a deliberately invalid
 * key. The point is the contract the route handler depends on: whatever the
 * transport does -- an API rejection or no network at all -- sendEmail returns a
 * value and never throws, and it is distinguishable from the unconfigured skip.
 *
 * Nothing is delivered: the key is not real, so this can only ever fail.
 */

const ORIGINAL_KEY = process.env.RESEND_API_KEY;
const ORIGINAL_FROM = process.env.EMAIL_FROM;

beforeAll(() => {
  vi.resetModules();
  process.env.RESEND_API_KEY = 're_test_deliberately_not_a_real_key';
  process.env.EMAIL_FROM = 'ResearchWithMe <editorial@example.invalid>';
});

afterAll(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = ORIGINAL_KEY;
  if (ORIGINAL_FROM === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = ORIGINAL_FROM;
});

describe('sendEmail against the real SDK', () => {
  it('reports a hard failure rather than a skip when configured', async () => {
    const { sendEmail, isEmailConfigured } = await import('@/lib/email');
    expect(isEmailConfigured()).toBe(true);

    const result = await sendEmail({
      to: 'nobody@example.invalid',
      subject: '[RWM-2026-TEST] We received your submission',
      html: '<p>Recorded.</p>',
      text: 'Recorded.',
      idempotencyKey: 'submission-receipt/RWM-2026-TEST',
    });

    expect(result.ok).toBe(false);
    // The distinction the route handler logs on: skipped=true means "email is
    // switched off here", skipped=false means "we tried and it failed".
    if (!result.ok) expect(result.skipped).toBe(false);
  });

  it('does not throw, so a caller request cannot be taken down by it', async () => {
    const { sendEmail } = await import('@/lib/email');

    await expect(
      sendEmail({
        to: 'nobody@example.invalid',
        subject: 'probe',
        html: '<p>x</p>',
        idempotencyKey: 'probe/1',
      }),
    ).resolves.toBeDefined();
  });
});
