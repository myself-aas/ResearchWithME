import { describe, expect, it } from 'vitest';
import { createTestApp } from '@/test/support/pages';
import { AUTH_MD } from '@/lib/auth-md';
import { GET, HEAD } from '@/app/auth.md/route';

describe('auth.md discovery', () => {
  it('serves the same honest Markdown discovery from Next and Pages', async () => {
    const app = createTestApp();
    const pages = await app.request('/auth.md');
    const next = GET();
    for (const response of [pages, next]) {
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
      expect(await response.text()).toBe(AUTH_MD);
    }
    expect(AUTH_MD).toMatch(/^# .*auth\.md/m);
    expect(AUTH_MD).toContain('Supported agent registration methods: none');
    expect(AUTH_MD).toContain('editor@researchwith.me');
    expect(AUTH_MD).not.toContain('agent_auth');
  });

  it('supports HEAD without a body and does not accept registration POSTs', async () => {
    const app = createTestApp();
    const pagesHead = await app.request('/auth.md', { method: 'HEAD' });
    const nextHead = HEAD();
    for (const response of [pagesHead, nextHead]) {
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('');
      expect(response.headers.get('content-type')).toContain('text/markdown');
    }
    const post = await app.request('/auth.md', { method: 'POST' });
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET, HEAD');
  });
});
