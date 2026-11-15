import Script from 'next/script';

/**
 * Lemon.js — the checkout overlay.
 *
 * Mounted only on the surfaces that sell something (`/pricing`,
 * `/dashboard/account`), never in the root layout. A reader on an article pays
 * for nothing and should download nothing for it; that is also why the CSP
 * allowance for this host is a deliberate, tested decision rather than a
 * site-wide default.
 *
 * `afterInteractive` rather than `beforeInteractive`: the overlay is needed when
 * a button is clicked, not when the page paints. Lemon Squeezy ask that this
 * file not be self-hosted, so it is referenced by URL.
 *
 * It lives in the Pages Router-shared tree too, where `next/script` is aliased
 * to a shim by the Cloudflare Pages build; that build serves no billing surface.
 */
export default function LemonSqueezyScript() {
  return <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />;
}
