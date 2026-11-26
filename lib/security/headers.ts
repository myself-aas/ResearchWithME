const LEGACY_INLINE_SCRIPT_POLICY = "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'";

/** Inline hydration/figure styles still need migration before a strict nonce policy. */
function contentSecurityPolicy(development: boolean): string {
  return [
    "default-src 'self'",
    development ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'" : LEGACY_INLINE_SCRIPT_POLICY,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "media-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function createSecurityHeaders(development = false) {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(development) },
    { key: 'Content-Signal', value: 'search=yes, ai-input=yes, ai-train=yes' },
  ];
}
