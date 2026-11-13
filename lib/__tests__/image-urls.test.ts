import { beforeEach, describe, expect, it, vi } from 'vitest';

const BASE = 'https://abc.supabase.co/storage/v1/object/public';

async function load() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');
  vi.resetModules();
  return import('@/lib/images/urls');
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe('image urls', () => {
  it('isProfileImageUrl', async () => {
    const { isProfileImageUrl } = await load();
    expect(isProfileImageUrl(`${BASE}/profile-images/u1/avatar-x.webp`)).toBe(true);
    expect(isProfileImageUrl('https://evil.example/storage/v1/object/public/profile-images/u1/a.webp')).toBe(false);
    expect(isProfileImageUrl('')).toBe(false);
    expect(isProfileImageUrl(null)).toBe(false);
  });

  it('isProcessedCover', async () => {
    const { isProcessedCover } = await load();
    expect(isProcessedCover(`${BASE}/blog-images/covers/2026/11/k3x9-ab12cd34.webp`)).toBe(true);
    expect(isProcessedCover(`${BASE}/blog-images/covers/2026/11/k3x9-ab12cd34-800.webp`)).toBe(false);
    expect(isProcessedCover('/images/folio-hero.jpeg')).toBe(false);
    expect(isProcessedCover(`${BASE}/blog-images/uploads/2026/11/x.jpg`)).toBe(false);
  });

  it('coverVariantUrl and coverLoader', async () => {
    const { coverVariantUrl, coverLoader } = await load();
    const src = `${BASE}/blog-images/covers/2026/11/k3x9-ab12cd34.webp`;
    const small = `${BASE}/blog-images/covers/2026/11/k3x9-ab12cd34-800.webp`;
    expect(coverVariantUrl(src, 800)).toBe(small);
    expect(coverLoader({ src, width: 640 })).toBe(small);
    expect(coverLoader({ src, width: 1200 })).toBe(src);
  });

  it('uniqueImageId', async () => {
    const { uniqueImageId } = await load();
    const a = uniqueImageId();
    expect(a).toMatch(/^[a-z0-9]+-[a-z0-9]{8}$/);
    expect(uniqueImageId()).not.toBe(a);
  });
});
