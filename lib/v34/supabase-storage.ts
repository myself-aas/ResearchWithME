/**
 * ResearchWithME v3.4 — Supabase Storage signed artifact backend.
 *
 * Drop-in alternative to Cloudflare R2 for checksummed scholarly exports
 * (`v34_scholarly_exports`) and Remotion/Hyperframes render manifests
 * (`v34_render_jobs`).
 *
 * Why it exists: activating Cloudflare R2 requires a payment method on file
 * even for the free tier. Supabase Storage needs no credit card on the Free
 * plan and this project already depends on Supabase, so artifacts can stay on
 * the same platform as the rest of the data.
 *
 * Implementation notes:
 *   - Zero extra dependencies: talks to the Storage REST API with `fetch`.
 *   - Private bucket: objects are written with the service-role key and read
 *     back through time-limited signed URLs (`signedUrl` semantics match R2).
 *   - Edge/Node safe: uses Web Crypto for checksums and global `fetch`.
 */
import crypto from 'node:crypto';

export const DEFAULT_SUPABASE_ARTIFACT_BUCKET = 'researchwithme-artifacts';

/** Default signed-URL lifetime, matching the R2 backend (15 minutes). */
export const DEFAULT_SUPABASE_SIGNED_URL_TTL_SECONDS = 900;

/** Supabase Storage accepts 1 second … 7 days; keep a sane floor of 60s. */
const MIN_SIGNED_URL_TTL_SECONDS = 60;
const MAX_SIGNED_URL_TTL_SECONDS = 604_800;

export interface SupabaseStorageConfig {
  /** Project URL, e.g. `https://<ref>.supabase.co` (no trailing slash). */
  url: string;
  /** Target bucket, private by default. */
  bucket: string;
  /** Service-role / secret key. Required for private-bucket writes and signing. */
  serviceKey: string;
}

export interface SupabaseStoredArtifact {
  provider: 'supabase';
  bucket: string;
  key: string;
  checksumSha256: string;
  byteSize: number;
  signedUrl: string | null;
  signedUrlExpiresAt: string | null;
}

function trim(value: string | undefined): string {
  return (value ?? '').trim();
}

/**
 * Resolves the Supabase Storage configuration from the environment.
 *
 * Reads (first non-empty wins):
 *   - URL:    `SUPABASE_STORAGE_URL` → `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`
 *   - Key:    `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SECRET_KEY` → `SUPABASE_STORAGE_KEY`
 *   - Bucket: `SUPABASE_STORAGE_BUCKET` (default `researchwithme-artifacts`)
 */
export function getSupabaseStorageConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseStorageConfig | null {
  const url = trim(env.SUPABASE_STORAGE_URL) || trim(env.SUPABASE_URL) ||
    trim(env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey =
    trim(env.SUPABASE_SERVICE_ROLE_KEY) || trim(env.SUPABASE_SECRET_KEY) ||
    trim(env.SUPABASE_STORAGE_KEY);
  const bucket = trim(env.SUPABASE_STORAGE_BUCKET) || DEFAULT_SUPABASE_ARTIFACT_BUCKET;

  if (!url || !serviceKey || !bucket) return null;
  // Only http(s) endpoints; ignore placeholder values from .env.example.
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  } catch {
    return null;
  }
  return { url: url.replace(/\/$/, ''), bucket, serviceKey };
}

export function isSupabaseStorageConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return getSupabaseStorageConfig(env) !== null;
}

export function clampSignedUrlTtl(seconds?: number): number {
  const ttl = Number.isFinite(seconds) ? Number(seconds) : DEFAULT_SUPABASE_SIGNED_URL_TTL_SECONDS;
  return Math.max(MIN_SIGNED_URL_TTL_SECONDS, Math.min(Math.round(ttl), MAX_SIGNED_URL_TTL_SECONDS));
}

function encodeObjectPath(key: string): string {
  // Supabase expects an unencoded `/` between path segments but encoded
  // characters inside each segment (same normalisation R2 needs).
  return key
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function sha256Hex(data: string | Uint8Array): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function buildSupabaseObjectUrl(
  config: SupabaseStorageConfig,
  key: string,
  action: 'object' | 'sign' = 'object',
): string {
  const bucket = encodeURIComponent(config.bucket);
  const path = encodeObjectPath(key);
  return action === 'sign'
    ? `${config.url}/storage/v1/object/sign/${bucket}/${path}`
    : `${config.url}/storage/v1/object/${bucket}/${path}`;
}

export function resolveSupabaseSignedUrl(config: SupabaseStorageConfig, signedURL: string): string {
  if (/^https?:\/\//i.test(signedURL)) return signedURL;
  const path = signedURL.startsWith('/') ? signedURL : `/${signedURL}`;
  return `${config.url}/storage/v1${path}`;
}

/**
 * Creates a time-limited signed GET URL for a private Supabase Storage object.
 * Mirrors `createR2PresignedGetUrl` from `./r2-storage`.
 */
export async function createSupabaseSignedUrl(
  config: SupabaseStorageConfig,
  key: string,
  opts: {
    expiresInSeconds?: number;
    filename?: string;
    now?: Date;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<{ url: string; expiresAt: string }> {
  const ttl = clampSignedUrlTtl(opts.expiresInSeconds);
  const doFetch = opts.fetchImpl ?? fetch;
  const response = await doFetch(buildSupabaseObjectUrl(config, key, 'sign'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expiresIn: ttl,
      ...(opts.filename ? { download: opts.filename } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase Storage signing failed with HTTP ${response.status} for key ${key}`,
    );
  }

  const payload = (await response.json()) as { signedURL?: string };
  if (!payload.signedURL) {
    throw new Error(`Supabase Storage signing returned no signedURL for key ${key}`);
  }

  return {
    url: resolveSupabaseSignedUrl(config, payload.signedURL),
    expiresAt: new Date((opts.now ?? new Date()).getTime() + ttl * 1000).toISOString(),
  };
}

/**
 * Uploads a checksummed artifact to a private Supabase Storage bucket and
 * returns the same metadata shape the R2 backend produces.
 *
 * Throws when the upload is rejected so callers can surface a real error
 * instead of silently persisting an artifact that is not retrievable.
 */
export async function storeArtifactInSupabase(input: {
  key: string;
  body: string | Uint8Array;
  contentType: string;
  filename?: string;
  checksumSha256?: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  presignTtlSeconds?: number;
  upsert?: boolean;
  now?: Date;
  config?: SupabaseStorageConfig | null;
}): Promise<SupabaseStoredArtifact> {
  const config = input.config ?? getSupabaseStorageConfig(input.env);
  if (!config) {
    throw new Error(
      'Supabase artifact storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  const bytes =
    typeof input.body === 'string' ? new TextEncoder().encode(input.body) : input.body;
  const checksumSha256 = input.checksumSha256 ?? sha256Hex(bytes);
  const doFetch = input.fetchImpl ?? fetch;

  const response = await doFetch(buildSupabaseObjectUrl(config, input.key), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.serviceKey}`,
      'Content-Type': input.contentType,
      'cache-control': 'max-age=3600',
      'x-upsert': input.upsert ? 'true' : 'false',
      // Belt and braces: some Storage versions honour metadata only when the
      // checksum travels in a header rather than a custom field.
      'x-checksum-sha256': checksumSha256,
    },
    body: new Uint8Array(bytes),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const message = detail ? `: ${detail.slice(0, 200)}` : '';
    throw new Error(
      `Supabase Storage upload failed with HTTP ${response.status} for key ${input.key}${message}`,
    );
  }

  const signed = await createSupabaseSignedUrl(config, input.key, {
    expiresInSeconds: input.presignTtlSeconds,
    filename: input.filename,
    now: input.now,
    fetchImpl: doFetch,
  });

  return {
    provider: 'supabase',
    bucket: config.bucket,
    key: input.key,
    checksumSha256,
    byteSize: bytes.byteLength,
    signedUrl: signed.url,
    signedUrlExpiresAt: signed.expiresAt,
  };
}

/** Deletes an artifact object. Useful for retention/cleanup jobs. */
export async function deleteArtifactFromSupabase(input: {
  key: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  config?: SupabaseStorageConfig | null;
}): Promise<boolean> {
  const config = input.config ?? getSupabaseStorageConfig(input.env);
  if (!config) return false;
  const doFetch = input.fetchImpl ?? fetch;
  const response = await doFetch(buildSupabaseObjectUrl(config, input.key), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${config.serviceKey}` },
  });
  return response.ok;
}
