import { webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { cacheModelAssets, parseModelManifest } from '@/lib/assistant/model-assets';

const content = new Uint8Array([1, 2, 3]);
const digest = async (bytes: Uint8Array) => Buffer.from(await webcrypto.subtle.digest('SHA-256', bytes)).toString('hex');

async function fixture() {
  const manifest = { id: 'fixture-v1', assets: [{ path: '/models/fixture.bin', bytes: content.length, sha256: await digest(content) }] };
  const entries = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (key: string) => entries.get(key)?.clone()),
    put: vi.fn(async (key: string, value: Response) => { entries.set(key, value); }),
  };
  const storage = { open: vi.fn(async () => cache), delete: vi.fn(async () => true) };
  const fetcher = vi.fn(async () => new Response(content));
  return { manifest, storage, fetcher, entries };
}

describe('same-origin model asset delivery (no inference engine)', () => {
  it('validates total, shard, version, paths and integrity declarations', async () => {
    const { manifest } = await fixture();
    expect(parseModelManifest(manifest).assets).toHaveLength(1);
    for (const path of ['https://evil.test/model.bin', '//evil.test/model.bin', '/api/model.bin', '/models/../secret.bin', '/models/%2e%2e/secret.bin']) {
      expect(() => parseModelManifest({ ...manifest, assets: [{ ...manifest.assets[0], path }] })).toThrow();
    }
    expect(() => parseModelManifest({ ...manifest, assets: [{ ...manifest.assets[0], bytes: 20971521 }] })).toThrow();
    expect(() => parseModelManifest({ ...manifest, assets: Array.from({ length: 8 }, (_, i) => ({ ...manifest.assets[0], path: `/models/shard-${i}.bin`, bytes: 20000000 })) })).toThrow();
    expect(() => parseModelManifest({ ...manifest, assets: [manifest.assets[0], manifest.assets[0]] })).toThrow();
  });

  it('downloads with no credentials or redirects, verifies SHA-256, and reuses versioned Cache Storage', async () => {
    const f = await fixture();
    const options = { origin: 'https://example.test', storage: f.storage, fetcher: f.fetcher };
    await cacheModelAssets(f.manifest, options);
    expect(f.fetcher).toHaveBeenCalledWith('https://example.test/models/fixture.bin', expect.objectContaining({ credentials: 'omit', redirect: 'error', cache: 'no-store' }));
    expect(f.storage.open).toHaveBeenCalledWith('reme-model-v4.1-fixture-v1');
    expect(f.entries.size).toBe(1);
    await cacheModelAssets(f.manifest, options);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects corruption and does not retain an incomplete version', async () => {
    const f = await fixture();
    f.fetcher.mockImplementation(async () => new Response(new Uint8Array([9, 9, 9])));
    await expect(cacheModelAssets(f.manifest, { origin: 'https://example.test', storage: f.storage, fetcher: f.fetcher })).rejects.toThrow(/integrity/);
    expect(f.storage.delete).toHaveBeenCalledWith('reme-model-v4.1-fixture-v1');
    expect(f.entries.size).toBe(0);
  });

  it('bounds streamed bytes independently of Content-Length', async () => {
    const f = await fixture();
    f.fetcher.mockImplementation(async () => new Response(new Uint8Array(100)));
    await expect(cacheModelAssets(f.manifest, { origin: 'https://example.test', storage: f.storage, fetcher: f.fetcher })).rejects.toThrow(/byte limit/);
    expect(f.entries.size).toBe(0);
  });

  it('honors cancellation before opening a cache or making any request', async () => {
    const f = await fixture();
    const controller = new AbortController(); controller.abort();
    await expect(cacheModelAssets(f.manifest, { origin: 'https://example.test', storage: f.storage, fetcher: f.fetcher, signal: controller.signal })).rejects.toThrow();
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.storage.open).not.toHaveBeenCalled();
  });
});
