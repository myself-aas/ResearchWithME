import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EncodedImage } from '@/lib/images/process';

type UploadCall = { bucket: string; path: string; blob: Blob; opts: Record<string, unknown> };

function fakeClient(error: { message: string } | null = null) {
  const calls: UploadCall[] = [];
  const client = {
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, blob: Blob, opts: Record<string, unknown>) {
            calls.push({ bucket, path, blob, opts });
            return error ? { data: null, error } : { data: { path }, error: null };
          },
          getPublicUrl(path: string) {
            return {
              data: { publicUrl: 'https://abc.supabase.co/storage/v1/object/public/blog-images/' + path },
            };
          },
        };
      },
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

function images(type: EncodedImage['type']): EncodedImage[] {
  return [
    { blob: new Blob(['a'], { type }), width: 1600, height: 900, type },
    { blob: new Blob(['b'], { type }), width: 800, height: 450, type },
  ];
}

async function load() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');
  vi.resetModules();
  const storage = await import('@/lib/supabase/storage');
  const urls = await import('@/lib/images/urls');
  return { ...storage, ...urls };
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe('uploadCover', () => {
  it('uploads the primary and the 800 variant', async () => {
    const { uploadCover, isProcessedCover } = await load();
    const { client, calls } = fakeClient();
    const url = await uploadCover(images('image/webp'), client);

    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.bucket).toBe('blog-images');
      expect(call.opts).toEqual({ contentType: 'image/webp', cacheControl: '31536000', upsert: false });
    }
    const primary = calls[0].path;
    expect(primary).toMatch(/^covers\/\d{4}\/\d{2}\/[a-z0-9]+-[a-z0-9]{8}\.webp$/);
    expect(calls[1].path).toBe(primary.replace(/\.webp$/, '-800.webp'));
    expect(url.endsWith(primary)).toBe(true);
    expect(isProcessedCover(url)).toBe(true);
  });

  it('uses .jpg for JPEG output', async () => {
    const { uploadCover } = await load();
    const { client, calls } = fakeClient();
    await uploadCover(images('image/jpeg'), client);

    expect(calls).toHaveLength(2);
    expect(calls[0].path).toMatch(/\.jpg$/);
    expect(calls[1].path).toMatch(/-800\.jpg$/);
    expect(calls[0].opts.contentType).toBe('image/jpeg');
  });

  it('throws the storage error message', async () => {
    const { uploadCover } = await load();
    const { client } = fakeClient({ message: 'Bucket full' });
    await expect(uploadCover(images('image/webp'), client)).rejects.toThrow('Bucket full');
  });
});
