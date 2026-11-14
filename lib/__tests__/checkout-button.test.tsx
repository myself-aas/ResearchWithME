// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CheckoutButton from '@/components/billing/CheckoutButton';

const CHECKOUT_URL = 'https://researchwithme.lemonsqueezy.com/checkout/buy/abc';

let container: HTMLDivElement;
let root: Root;
const assign = vi.fn();

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<CheckoutButton product="copilot" label="Subscribe" />);
  });
  return container.querySelector('button')!;
}

async function click(button: HTMLButtonElement) {
  await act(async () => {
    button.click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  assign.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign },
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete (window as { LemonSqueezy?: unknown }).LemonSqueezy;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('CheckoutButton', () => {
  it('opens the on-site overlay when Lemon.js is present', async () => {
    const Open = vi.fn();
    (window as { LemonSqueezy?: unknown }).LemonSqueezy = { Url: { Open } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: CHECKOUT_URL }) }));

    await click(mount());

    expect(fetch).toHaveBeenCalledWith('/api/billing/checkout', expect.objectContaining({ method: 'POST' }));
    expect(Open).toHaveBeenCalledTimes(1);
    expect(Open).toHaveBeenCalledWith(CHECKOUT_URL);
    expect(assign).not.toHaveBeenCalled();
  });

  it('falls back to a top-level navigation when Lemon.js is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: CHECKOUT_URL }) }));

    await click(mount());

    expect(assign).toHaveBeenCalledWith(CHECKOUT_URL);
  });

  it('shows an inline alert and does not navigate when the server refuses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Checkout is not available on this deployment yet.' }),
      }),
    );

    const button = mount();
    await click(button);

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('not available');
    expect(assign).not.toHaveBeenCalled();
    expect(button.disabled).toBe(false);
  });

  it('re-enables the button after a successful handoff', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: CHECKOUT_URL }) }));
    const button = mount();
    await click(button);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-busy')).toBe('false');
  });
});
