import { z } from 'zod';
import { genui } from '@/src/design/genui.manifest';

const assetSchema = z.strictObject({
  path: z.string().regex(/^\/models\/[A-Za-z0-9_/-]+\.(?:bin|onnx|wasm|json)$/),
  bytes: z.number().int().positive().max(genui.model.maxShardBytes),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const manifestSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/),
  assets: z.array(assetSchema).min(1).max(64),
}).refine(m => m.assets.reduce((total, asset) => total + asset.bytes, 0) <= genui.model.maxBytes, 'Model exceeds the total byte budget.')
  .refine(m => new Set(m.assets.map(asset => asset.path)).size === m.assets.length, 'Duplicate model asset paths.');

type ModelAsset = z.infer<typeof assetSchema>;
type AssetCache = Pick<Cache, 'match' | 'put'>;
interface ModelAssetStorage {
  open(name: string): Promise<AssetCache>;
  delete(name: string): Promise<boolean>;
}
interface DownloadOptions {
  origin: string;
  storage: ModelAssetStorage;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}

export function parseModelManifest(value: unknown) {
  return manifestSchema.parse(value);
}

async function readBoundedBytes(response: Response, maximumBytes: number, signal?: AbortSignal) {
  if (!response.body) throw new Error('Model asset has no response body.');
  const reader = response.body.getReader();
  const output = new Uint8Array(maximumBytes);
  let received = 0;
  const cancelRead = () => { void reader.cancel(signal?.reason); };
  signal?.addEventListener('abort', cancelRead, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) return output.slice(0, received);
      received += value.byteLength;
      if (received > maximumBytes) throw new Error('Model asset exceeds its declared byte limit.');
      output.set(value, received - value.byteLength);
    }
  } finally {
    signal?.removeEventListener('abort', cancelRead);
    await reader.cancel();
    reader.releaseLock();
  }
}

async function verifyAsset(response: Response, asset: ModelAsset, signal?: AbortSignal) {
  const bytes = await readBoundedBytes(response, asset.bytes, signal);
  if (bytes.byteLength !== asset.bytes) throw new Error('Model asset byte count does not match its manifest.');
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const actualHash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  if (actualHash !== asset.sha256) throw new Error('Model asset integrity check failed.');
  return new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream', 'Cross-Origin-Resource-Policy': 'same-origin' } });
}

async function downloadAsset(url: string, asset: ModelAsset, options: DownloadOptions) {
  const response = await (options.fetcher ?? fetch)(url, {
    credentials: 'omit', redirect: 'error', cache: 'no-store', signal: options.signal,
  });
  if (!response.ok || response.redirected) throw new Error(`Model asset request failed (${response.status}).`);
  if (response.url && new URL(response.url).origin !== options.origin) throw new Error('Cross-origin model response rejected.');
  return verifyAsset(response, asset, options.signal);
}

async function cacheAsset(cache: AssetCache, asset: ModelAsset, options: DownloadOptions) {
  options.signal?.throwIfAborted();
  const url = new URL(asset.path, options.origin).href;
  const cached = await cache.match(url);
  const verified = cached ? await verifyAsset(cached, asset, options.signal) : await downloadAsset(url, asset, options);
  options.signal?.throwIfAborted();
  await cache.put(url, verified);
}

/** Delivery infrastructure only. Call from explicit consent; never implies inference availability. */
export async function cacheModelAssets(input: unknown, options: DownloadOptions): Promise<string> {
  options.signal?.throwIfAborted();
  const manifest = parseModelManifest(input);
  const origin = new URL(options.origin);
  if (origin.origin !== options.origin || !['http:', 'https:'].includes(origin.protocol)) throw new Error('An exact HTTP(S) application origin is required.');
  const cacheName = `${genui.model.cache}-${manifest.id}`;
  const cache = await options.storage.open(cacheName);
  try {
    for (const asset of manifest.assets) await cacheAsset(cache, asset, options);
    return cacheName;
  } catch (error) {
    await options.storage.delete(cacheName);
    throw error;
  }
}
