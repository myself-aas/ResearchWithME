import { describe, expect, it } from 'vitest';
import { createSecurityHeaders } from '@/lib/security/headers';

const headerMap = (development = false) => new Map(createSecurityHeaders(development).map(header => [header.key, header.value]));

describe('first-party security and isolation headers', () => {
  it('requires cross-origin isolation and same-origin resource delivery', () => {
    const headers = headerMap();
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
    expect(headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
    expect(headers.get('X-DNS-Prefetch-Control')).toBe('off');
  });
  it('restricts resource origins and permits WASM compilation but not JavaScript eval in production', () => {
    const policy = headerMap().get('Content-Security-Policy')!;
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("img-src 'self' data:");
    expect(policy).toContain("worker-src 'self' blob:");
    expect(policy).toContain("frame-src 'none'");
    expect(policy).toContain("'wasm-unsafe-eval'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain('https:');
  });
  it('permits the Next development evaluator only in development', () => {
    expect(headerMap(true).get('Content-Security-Policy')).toContain("'unsafe-eval'");
  });
  it('retains the explicit legacy inline exception rather than falsely claiming strict CSP', () => {
    expect(headerMap().get('Content-Security-Policy')).toContain("style-src 'self' 'unsafe-inline'");
  });
});
