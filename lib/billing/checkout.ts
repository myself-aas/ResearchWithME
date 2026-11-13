import { variantIdFor, type BillingProductKey } from './catalogue';

/**
 * Create a Lemon Squeezy checkout, server-side.
 *
 * Why the server: the variant is chosen from an allowlist here, not in the
 * browser. A client that could name a variant could name another store's, and
 * a client that could name a price could name any price. The only thing the
 * browser contributes is *which product*, and `lib/billing/catalogue.ts` decides
 * whether that is one of ours.
 *
 * Lemon Squeezy's API is strict JSON:API: the attributes hang off a `data`
 * object of `type: 'checkouts'`, and the store and variant are relationships,
 * not attributes. Sending `{ store_id, variant_id }` — the shape most REST APIs
 * take, and the shape the blueprint's Express sketch took — is a 422.
 *
 * `test_mode` is always sent as a boolean. Leaving it undefined would mean "the
 * store's default", which is production once the store is live, and a staging
 * deploy would take real money.
 */

const API_URL = 'https://api.lemonsqueezy.com/v1/checkouts';

/** The deployment cannot make a checkout: an env var is missing. */
export class CheckoutNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutNotConfiguredError';
  }
}

/** Lemon Squeezy refused or failed. The caller answers 502, not 500. */
export class CheckoutUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutUnavailableError';
  }
}

export interface CreateCheckoutInput {
  userId: string;
  email: string;
  product: BillingProductKey;
  redirectUrl: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

function firstErrorDetail(body: unknown): string {
  if (typeof body !== 'object' || body === null) return '';
  const errors = (body as { errors?: unknown }).errors;
  if (!Array.isArray(errors) || errors.length === 0) return '';
  const first = errors[0] as { detail?: unknown; title?: unknown };
  const detail = typeof first?.detail === 'string' ? first.detail : typeof first?.title === 'string' ? first.title : '';
  return detail.slice(0, 200);
}

export async function createCheckout({
  userId,
  email,
  product,
  redirectUrl,
  env = process.env,
  fetchImpl = fetch,
}: CreateCheckoutInput): Promise<{ url: string }> {
  const apiKey = (env.LEMONSQUEEZY_API_KEY ?? '').trim();
  const storeId = (env.LEMONSQUEEZY_STORE_ID ?? '').trim();
  const variantId = variantIdFor(product, env);

  if (!apiKey) {
    throw new CheckoutNotConfiguredError('LEMONSQUEEZY_API_KEY is not set on this deployment.');
  }
  if (!storeId) {
    throw new CheckoutNotConfiguredError('LEMONSQUEEZY_STORE_ID is not set on this deployment.');
  }
  if (!variantId) {
    throw new CheckoutNotConfiguredError(
      `No Lemon Squeezy variant is configured for "${product}". Set the matching LEMONSQUEEZY_VARIANT_* variable.`,
    );
  }

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        test_mode: (env.LEMONSQUEEZY_TEST_MODE ?? '').trim() === '1',
        checkout_data: {
          email,
          // Read back on every webhook as meta.custom_data.user_id: this is the
          // only link between a purchase and an account.
          custom: { user_id: userId },
        },
        product_options: {
          redirect_url: redirectUrl,
          receipt_button_text: 'Open your account',
          receipt_link_url: redirectUrl,
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: storeId } },
        variant: { data: { type: 'variants', id: variantId } },
      },
    },
  };

  let response: Response;
  try {
    response = await fetchImpl(API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new CheckoutUnavailableError(
      `The checkout service could not be reached: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = firstErrorDetail(body);
    throw new CheckoutUnavailableError(
      detail ? `Lemon Squeezy rejected the checkout: ${detail}` : `Lemon Squeezy returned ${response.status}.`,
    );
  }

  const url = (body as { data?: { attributes?: { url?: unknown } } } | null)?.data?.attributes?.url;
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    throw new CheckoutUnavailableError('Lemon Squeezy accepted the checkout but returned no URL.');
  }

  return { url };
}
