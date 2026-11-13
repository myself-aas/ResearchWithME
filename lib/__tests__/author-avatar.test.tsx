// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Author } from '@/lib/blog-data';

const author = (avatar: string): Author => ({
  id: 'a1',
  name: 'Maya Lin',
  role: 'Researcher',
  domain: 'Computer Systems',
  bio: 'Bio',
  avatar,
} as Author);

async function load() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');
  vi.resetModules();
  return (await import('@/components/AuthorAvatar')).default;
}

describe('AuthorAvatar', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('renders an uploaded profile photo', async () => {
    const AuthorAvatar = await load();
    const url = 'https://abc.supabase.co/storage/v1/object/public/profile-images/u1/avatar-x.webp';
    expect(renderToStaticMarkup(<AuthorAvatar author={author(url)} />)).toContain(url);
  });

  it('falls back to the domain SVG for a foreign URL', async () => {
    const AuthorAvatar = await load();
    const html = renderToStaticMarkup(<AuthorAvatar author={author('https://evil.example/a.png')} />);
    expect(html).toContain('data:image/svg+xml');
    expect(html).not.toContain('evil.example');
  });

  it('falls back to the domain SVG when there is no photo', async () => {
    const AuthorAvatar = await load();
    expect(renderToStaticMarkup(<AuthorAvatar author={author('')} />)).toContain('data:image/svg+xml');
  });

  it('never calls the network', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const AuthorAvatar = await load();
    renderToStaticMarkup(<AuthorAvatar author={author('')} />);
    expect(spy).not.toHaveBeenCalled();
  });
});
