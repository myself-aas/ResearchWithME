import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ exchange: vi.fn(), configured: true }));
vi.mock('@/lib/supabase/config', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'public-key',
  get isSupabaseConfigured() { return mocks.configured; },
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[]) => void } }) => ({
    auth: { exchangeCodeForSession: async (code: string) => {
      const result = await mocks.exchange(code);
      if (!result.error) options.cookies.setAll([{ name: 'session', value: 'token', options: { path: '/', sameSite: 'lax' } }]);
      return result;
    } },
  }),
}));
import { GET } from '@/app/auth/callback/route';

beforeEach(() => { mocks.configured = true; mocks.exchange.mockReset(); });
describe('auth callback', () => {
  it('exchanges a code and returns the session cookie with a safe redirect', async () => {
    mocks.exchange.mockResolvedValue({ error: null });
    const response = await GET(new NextRequest('https://researchwith.me/auth/callback?code=abc&next=%2Fdashboard%3Ftab%3Dposts'));
    expect(mocks.exchange).toHaveBeenCalledWith('abc');
    expect(response.headers.get('location')).toBe('https://researchwith.me/dashboard?tab=posts');
    expect(response.cookies.get('session')?.value).toBe('token');
    expect(response.headers.get('set-cookie')).toContain('SameSite=lax');
  });
  it('reports provider errors without rendering them as HTML', async () => {
    const response = await GET(new NextRequest('https://researchwith.me/auth/callback?error_description=%3Cscript%3E&next=%2Fwrite'));
    const target = new URL(response.headers.get('location')!);
    expect(target.pathname).toBe('/login');
    expect(target.searchParams.get('error_description')).toBe('<script>');
    expect(target.searchParams.get('next')).toBe('/write');
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it('rejects external destinations and reports failed exchanges', async () => {
    mocks.exchange.mockResolvedValue({ error: { message: 'invalid code' } });
    const response = await GET(new NextRequest('https://researchwith.me/auth/callback?code=x&next=%2F%2Fevil.example'));
    const target = new URL(response.headers.get('location')!);
    expect(target.origin).toBe('https://researchwith.me');
    expect(target.searchParams.get('next')).toBe('/');
    expect(target.searchParams.get('error_description')).toContain('could not be completed');
  });
  it('fails closed for missing configuration or code', async () => {
    mocks.configured = false;
    const missingConfig = await GET(new NextRequest('https://researchwith.me/auth/callback?code=x'));
    expect(new URL(missingConfig.headers.get('location')!).searchParams.get('error_description')).toContain('not configured');
    mocks.configured = true;
    const missingCode = await GET(new NextRequest('https://researchwith.me/auth/callback'));
    expect(new URL(missingCode.headers.get('location')!).searchParams.get('error_description')).toContain('missing');
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
});
