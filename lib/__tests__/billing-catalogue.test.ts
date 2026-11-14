import { describe, expect, it } from 'vitest';
import { BILLING_PRODUCTS, isBillingProductKey, variantIdFor } from '@/lib/billing/catalogue';
import { hasPremiumAccess, isSubscriptionStatus } from '@/lib/billing/status';

describe('billing catalogue', () => {
  it('pins the spec prices verbatim', () => {
    const byKey = Object.fromEntries(BILLING_PRODUCTS.map((p) => [p.key, p]));
    expect(byKey.teardown.priceLabel).toBe('$19');
    expect(byKey.teardown.mode).toBe('payment');
  });

  it('reads variant ids from the environment and reports a missing one as null', () => {
    expect(variantIdFor('teardown', { LEMONSQUEEZY_VARIANT_TEARDOWN: ' 42 ' })).toBe('42');
    expect(variantIdFor('teardown', {})).toBeNull();
    expect(variantIdFor('teardown', { LEMONSQUEEZY_VARIANT_TEARDOWN: '' })).toBeNull();
  });

  it('grants access for every paid-first state and denies the terminal two', () => {
    for (const status of ['on_trial', 'active', 'past_due', 'cancelled', 'paused'] as const) {
      expect(hasPremiumAccess(status), status).toBe(true);
    }
    for (const status of ['none', 'unpaid', 'expired'] as const) {
      expect(hasPremiumAccess(status), status).toBe(false);
    }
  });

  it('rejects values Lemon Squeezy never sends', () => {
    expect(isSubscriptionStatus('trialing')).toBe(false);
    expect(isSubscriptionStatus(undefined)).toBe(false);
    expect(isSubscriptionStatus('active')).toBe(true);
  });

  it('rejects inherited Object.prototype names as products', () => {
    // `value in VARIANT_ENV` walks the prototype chain, so any of these used to
    // pass the guard and reach the checkout path.
    for (const name of ['toString', 'constructor', 'hasOwnProperty', 'valueOf', '__proto__', 'isPrototypeOf']) {
      expect(isBillingProductKey(name)).toBe(false);
    }
  });

  it('accepts exactly the one real product key', () => {
    expect(isBillingProductKey('teardown')).toBe(true);
    expect(isBillingProductKey('')).toBe(false);
    expect(isBillingProductKey('TEARDOWN')).toBe(false);
  });

  it('sells no service: the payment provider prohibits them', () => {
    // https://docs.lemonsqueezy.com/help/getting-started/prohibited-products
    expect(BILLING_PRODUCTS.map((p) => p.key)).toEqual(['teardown']);
    expect(isBillingProductKey('editing')).toBe(false);
    // Withdrawn 2026-11-14: the membership delivered nothing when the payment
    // cleared, which the provider treats as a donation.
    expect(isBillingProductKey('copilot')).toBe(false);
    expect(BILLING_PRODUCTS.some((p) => p.mode === 'subscription')).toBe(false);
    const copy = JSON.stringify(BILLING_PRODUCTS).toLowerCase();
    for (const word of ['consult', 'sponsor', 'donat', 'pay what you want', 'manuscript editing', 'membership', 'co-pilot']) {
      expect(copy, word).not.toContain(word);
    }
  });
});
