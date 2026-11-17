import { describe, expect, it } from 'vitest';
import { AUTH_MD } from '@/lib/auth-md';
import { GET, HEAD } from '@/app/auth.md/route';

describe('auth.md discovery', () => {
  it('serves honest Markdown discovery', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await response.text()).toBe(AUTH_MD);

    expect(AUTH_MD).toMatch(/^# .*auth\.md/m);
    expect(AUTH_MD).toMatch(/Supported agent registration methods: \*\*none on this host\*\*/);
    expect(AUTH_MD).toContain('/.well-known/oauth-protected-resource');
    expect(AUTH_MD).toContain('editor@researchwith.me');
    expect(AUTH_MD).toContain('agent_auth');
  });

  it('supports HEAD without a body', async () => {
    const response = HEAD();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(response.headers.get('content-type')).toContain('text/markdown');
  });
});
