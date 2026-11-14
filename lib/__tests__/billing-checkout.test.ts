import { describe, expect, it, vi } from 'vitest';
import { CheckoutNotConfiguredError, CheckoutUnavailableError, createCheckout } from '@/lib/billing/checkout';

const USER = '10000000-0000-4000-8000-000000000001';
const URL = 'https://researchwithme.lemonsqueezy.com/checkout/buy/abc';

const env = (over: Record<string, string> = {}) => ({
  LEMONSQUEEZY_API_KEY: 'ls_key',
  LEMONSQUEEZY_STORE_ID: '77',
  LEMONSQUEEZY_VARIANT_COPILOT: '42',
  NEXT_PUBLIC_SITE_URL: 'https://researchwith.me',
  ...over,
});

const reply = (body: unknown, status = 201) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

const input = (over: Partial<Parameters<typeof createCheckout>[0]> = {}) => ({
  userId: USER,
  email: 'reader@example.org',
  product: 'copilot' as const,
  redirectUrl: 'https://researchwith.me/dashboard/account',
  ...over,
});

describe('createCheckout', () => {
  it('posts the documented JSON:API envelope', async () => {
    const fetchImpl = reply({ data: { attributes: { url: URL } } });
    const result = await createCheckout({ ...input(), env: env({ LEMONSQUEEZY_TEST_MODE: '1' }), fetchImpl });

    expect(result).toEqual({ url: URL });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.lemonsqueezy.com/v1/checkouts');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: 'Bearer ls_key',
    });

    const body = JSON.parse(String(init.body));
    expect(body.data.type).toBe('checkouts');
    expect(body.data.attributes.test_mode).toBe(true);
    expect(body.data.attributes.checkout_data).toEqual({
      email: 'reader@example.org',
      custom: { user_id: USER },
    });
    expect(body.data.attributes.product_options.redirect_url).toBe('https://researchwith.me/dashboard/account');
    expect(body.data.relationships).toEqual({
      store: { data: { type: 'stores', id: '77' } },
      variant: { data: { type: 'variants', id: '42' } },
    });
  });

  it('sends test_mode false, not undefined, when the flag is unset', async () => {
    const fetchImpl = reply({ data: { attributes: { url: URL } } });
    await createCheckout({ ...input(), env: env(), fetchImpl });
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.data.attributes.test_mode).toBe(false);
  });

  it('refuses to invent a variant id', async () => {
    const fetchImpl = reply({ data: { attributes: { url: URL } } });
    await expect(
      createCheckout({ ...input(), env: env({ LEMONSQUEEZY_VARIANT_COPILOT: '' }), fetchImpl }),
    ).rejects.toBeInstanceOf(CheckoutNotConfiguredError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refuses when the store id or API key is missing', async () => {
    const fetchImpl = reply({ data: { attributes: { url: URL } } });
    await expect(createCheckout({ ...input(), env: env({ LEMONSQUEEZY_STORE_ID: '' }), fetchImpl })).rejects.toBeInstanceOf(CheckoutNotConfiguredError);
    await expect(createCheckout({ ...input(), env: env({ LEMONSQUEEZY_API_KEY: '' }), fetchImpl })).rejects.toBeInstanceOf(CheckoutNotConfiguredError);
  });

  it('reports a rejected checkout as unavailable, with the vendor message', async () => {
    const fetchImpl = reply({ errors: [{ detail: 'Variant does not belong to this store.' }] }, 422);
    await expect(createCheckout({ ...input(), env: env(), fetchImpl })).rejects.toBeInstanceOf(CheckoutUnavailableError);
  });

  it('reports a 2xx with no url as unavailable', async () => {
    const fetchImpl = reply({ data: { attributes: {} } }, 201);
    await expect(createCheckout({ ...input(), env: env(), fetchImpl })).rejects.toBeInstanceOf(CheckoutUnavailableError);
  });
});
