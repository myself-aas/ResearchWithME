'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/primitives';
import type { BillingProductKey } from '@/lib/billing/catalogue';

/**
 * One product, one button. The click asks the server for a checkout and then
 * opens it.
 *
 * The overlay is the preferred path: Lemon.js shows the checkout on top of the
 * page, the reader never leaves, and `receipt_button_text` still points at their
 * account when the purchase completes. When Lemon.js has not loaded — a blocked
 * script, an offline path, the fallback branch — the same URL opens as a normal
 * navigation, which is what the URL was for before overlays existed. Either way
 * the server created the checkout; this component never assembles one.
 *
 * The product key is the only thing the browser decides. The variant and the
 * price are resolved server-side (see `lib/billing/checkout.ts`).
 */

interface LemonSqueezyOverlay {
  Url?: { Open?: (url: string) => void };
}

declare global {
  interface Window {
    LemonSqueezy?: LemonSqueezyOverlay;
  }
}

interface CheckoutButtonProps {
  product: BillingProductKey;
  label: string;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export default function CheckoutButton({
  product,
  label,
  className,
  variant = 'primary',
}: CheckoutButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const requestPending = useRef(false);

  async function start() {
    if (requestPending.current) return;
    requestPending.current = true;
    setPending(true);
    setError('');

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });

      const body = (await response.json().catch(() => null)) as
        | { url?: unknown; error?: unknown }
        | null;

      if (!response.ok || typeof body?.url !== 'string') {
        setError(
          typeof body?.error === 'string' && body.error
            ? body.error
            : 'The checkout could not be opened. Try again in a moment.',
        );
        return;
      }

      const open = window.LemonSqueezy?.Url?.Open;
      if (typeof open === 'function') {
        open(body.url);
      } else {
        window.location.assign(body.url);
      }
    } catch {
      setError('The checkout could not be opened. Check your connection and try again.');
    } finally {
      requestPending.current = false;
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        size="lg"
        fullWidth
        loading={pending}
        aria-busy={pending}
        onClick={start}
      >
        {pending ? 'Opening checkout…' : label}
      </Button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
