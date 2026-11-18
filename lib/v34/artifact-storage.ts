/**
 * ResearchWithME v3.4 — provider-agnostic artifact storage facade.
 *
 * Backs checksummed scholarly exports and render manifests with whichever
 * storage backend the deployment can actually pay for:
 *
 *   - `supabase` — Supabase Storage (Free plan, **no credit card required**);
 *                  recommended default and the reason this facade exists.
 *   - `r2`       — Cloudflare R2 via a native binding or S3 SigV4 (requires a
 *                  payment method on the Cloudflare account, even on the free
 *                  allowance).
 *   - `inline`   — no object storage; the payload stays in Postgres and the
 *                  signed-URL fields stay null.
 *
 * Resolution order is controlled by `ARTIFACT_STORAGE_PROVIDER`:
 *   - `auto` (default): Supabase → R2 → inline
 *   - `supabase` / `r2`: force a backend and fail loudly if unconfigured
 *   - `inline`: never touch object storage
 */
import crypto from 'node:crypto';
import {
  createR2PresignedGetUrl,
  getR2Config,
  storeArtifactInR2,
  type R2BucketLike,
} from './r2-storage';
import {
  createSupabaseSignedUrl,
  getSupabaseStorageConfig,
  storeArtifactInSupabase,
} from './supabase-storage';

export type ArtifactStorageProvider = 'supabase' | 'r2' | 'inline';
export type ArtifactStoragePreference = 'auto' | ArtifactStorageProvider;

export interface StoredArtifact {
  provider: ArtifactStorageProvider;
  bucket: string | null;
  key: string | null;
  checksumSha256: string;
  byteSize: number;
  signedUrl: string | null;
  signedUrlExpiresAt: string | null;
}

export interface ArtifactStorageStatus {
  preference: ArtifactStoragePreference;
  provider: ArtifactStorageProvider;
  bucket: string | null;
  /** True when a real object store (not `inline`) is configured. */
  configured: boolean;
}

const PREFERENCES: ReadonlySet<string> = new Set(['auto', 'supabase', 'r2', 'inline']);

export function resolveArtifactStoragePreference(
  env: Record<string, string | undefined> = process.env,
): ArtifactStoragePreference {
  const raw = (env.ARTIFACT_STORAGE_PROVIDER ?? '').trim().toLowerCase();
  return PREFERENCES.has(raw) ? (raw as ArtifactStoragePreference) : 'auto';
}

/**
 * Resolves which backend `storeArtifact` will use. In `auto` mode Supabase
 * Storage wins when both Supabase and R2 credentials happen to be present,
 * because it is the only option that never requires a credit card.
 */
export function resolveArtifactStorageProvider(
  env: Record<string, string | undefined> = process.env,
  opts: { r2Binding?: R2BucketLike | null } = {},
): ArtifactStorageProvider {
  const preference = resolveArtifactStoragePreference(env);
  if (preference !== 'auto') return preference;
  if (getSupabaseStorageConfig(env)) return 'supabase';
  if (opts.r2Binding || getR2Config(env)) return 'r2';
  return 'inline';
}

export function getArtifactStorageStatus(
  env: Record<string, string | undefined> = process.env,
): ArtifactStorageStatus {
  const preference = resolveArtifactStoragePreference(env);
  const provider = resolveArtifactStorageProvider(env);
  const bucket =
    provider === 'supabase'
      ? (getSupabaseStorageConfig(env)?.bucket ?? null)
      : provider === 'r2'
        ? (getR2Config(env)?.bucket ?? null)
        : null;
  return { preference, provider, bucket, configured: provider !== 'inline' };
}

function inlineArtifact(checksumSha256: string, byteSize: number): StoredArtifact {
  return {
    provider: 'inline',
    bucket: null,
    key: null,
    checksumSha256,
    byteSize,
    signedUrl: null,
    signedUrlExpiresAt: null,
  };
}

/**
 * Stores a checksummed artifact in the configured backend.
 *
 * `inline` is a graceful, lossless fallback: the caller keeps the payload in
 * Postgres, exactly as before. Forcing `supabase` or `r2` while unconfigured
 * throws, because silently inlining could blow up database row sizes.
 */
export async function storeArtifact(input: {
  key: string;
  body: string | Uint8Array;
  contentType: string;
  filename?: string;
  checksumSha256?: string;
  r2Binding?: R2BucketLike | null;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  presignTtlSeconds?: number;
  upsert?: boolean;
}): Promise<StoredArtifact> {
  const env = input.env ?? process.env;
  const provider = resolveArtifactStorageProvider(env, { r2Binding: input.r2Binding });

  if (provider === 'supabase') {
    const stored = await storeArtifactInSupabase({
      key: input.key,
      body: input.body,
      contentType: input.contentType,
      filename: input.filename,
      checksumSha256: input.checksumSha256,
      env,
      fetchImpl: input.fetchImpl,
      presignTtlSeconds: input.presignTtlSeconds,
      upsert: input.upsert,
    });
    return stored;
  }

  if (provider === 'r2') {
    const stored = await storeArtifactInR2({
      key: input.key,
      body: input.body,
      contentType: input.contentType,
      filename: input.filename,
      checksumSha256: input.checksumSha256,
      r2Binding: input.r2Binding,
      env,
      fetchImpl: input.fetchImpl,
      presignTtlSeconds: input.presignTtlSeconds,
    });
    return stored;
  }

  const bytes =
    typeof input.body === 'string' ? new TextEncoder().encode(input.body) : input.body;
  const checksum =
    input.checksumSha256 ?? crypto.createHash('sha256').update(bytes).digest('hex');
  return inlineArtifact(checksum, bytes.byteLength);
}

/**
 * Re-mints a signed download URL for a stored artifact. Returns `null` for
 * inline artifacts or when the provider is no longer configured.
 */
export async function createArtifactSignedUrl(input: {
  provider: ArtifactStorageProvider | string;
  key: string;
  expiresInSeconds?: number;
  filename?: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  now?: Date;
}): Promise<{ url: string; expiresAt: string } | null> {
  const env = input.env ?? process.env;

  if (input.provider === 'supabase') {
    const config = getSupabaseStorageConfig(env);
    if (!config) return null;
    return createSupabaseSignedUrl(config, input.key, {
      expiresInSeconds: input.expiresInSeconds,
      filename: input.filename,
      fetchImpl: input.fetchImpl,
      now: input.now,
    });
  }

  if (input.provider === 'r2') {
    const config = getR2Config(env);
    if (!config) return null;
    return createR2PresignedGetUrl(config, input.key, {
      expiresInSeconds: input.expiresInSeconds,
      now: input.now,
    });
  }

  return null;
}
