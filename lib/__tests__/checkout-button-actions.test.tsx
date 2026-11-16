// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import CheckoutButton from '@/components/billing/CheckoutButton';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete window.LemonSqueezy; });

it('only creates one checkout on duplicate activation while a request is pending', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let resolveRequest!: (value: Response) => void;
  const pending = new Promise<Response>((resolve) => { resolveRequest = resolve; });
  const fetchMock = vi.fn((_url: string, _options: RequestInit) => pending);
  const open = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  window.LemonSqueezy = { Url: { Open: open } };
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<CheckoutButton product="teardown" label="Buy" />));
    const button = element.querySelector('button')!;
    await act(async () => { button.click(); button.click(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ product: 'teardown' });
    await act(async () => { resolveRequest(new Response(JSON.stringify({ url: 'https://example.org/checkout' }))); await pending; });
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('https://example.org/checkout');
    expect(element.textContent).not.toContain('purchase complete');
  } finally { await act(async () => root.unmount()); element.remove(); }
});

it('shows provider failure as an alert and allows retry without claiming a purchase', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Checkout not configured' }), { status: 503 })));
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<CheckoutButton product="teardown" label="Buy" />));
    await act(async () => { element.querySelector('button')!.click(); });
    expect(element.querySelector('[role=alert]')?.textContent).toBe('Checkout not configured');
    expect(element.querySelector('button')?.disabled).toBe(false);
    expect(element.textContent).not.toContain('purchase complete');
  } finally { await act(async () => root.unmount()); element.remove(); }
});
