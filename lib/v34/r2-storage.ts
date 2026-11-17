/**
 * ResearchWithME v3.4 — Cloudflare R2 Signed Artifact Storage (Wave 18 P1).
 *
 * Backs checksummed scholarly exports (`v34_scholarly_exports`) and
 * Remotion/Hyperframes render artifacts (`v34_render_jobs`) with Cloudflare R2
 * storage and time-limited AWS Signature V4 presigned download URLs.
 *
 * Supports two zero-dependency runtime paths (Cloudflare Workers + Node 20+):
 *   1. Native Cloudflare `R2Bucket` binding when provisioned on the Worker env.
 *   2. S3-compatible R2 HTTP API via Web Crypto `AWS4-HMAC-SHA256` signing
 *      using `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
 * Falls back cleanly to inline storage when R2 env credentials are not set.
 */
import crypto from 'node:crypto';

export interface R2Config {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
}

export interface R2StoredObject {
  provider: 'r2' | 'inline';
  bucket: string | null;
  key: string | null;
  checksumSha256: string;
  byteSize: number;
  signedUrl: string | null;
  signedUrlExpiresAt: string | null;
}

export interface R2BucketLike {
  put(
    key: string,
    value: string | ArrayBuffer | Uint8Array,
    options?: {
      httpMetadata?: { contentType?: string; contentDisposition?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
}

const DEFAULT_PRESIGN_TTL_SECONDS = 900; // 15 minutes

export function getR2Config(env: Record<string, string | undefined> = process.env): R2Config | null {
  const accountId = (env.R2_ACCOUNT_ID ?? '').trim();
  const bucket = (env.R2_BUCKET ?? '').trim();
  const accessKeyId = (env.R2_ACCESS_KEY_ID ?? '').trim();
  const secretAccessKey = (env.R2_SECRET_ACCESS_KEY ?? '').trim();
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return null;
  const endpoint =
    (env.R2_S3_ENDPOINT ?? '').trim() || `https://${accountId}.r2.cloudflarestorage.com`;
  return { accountId, bucket, accessKeyId, secretAccessKey, endpoint: endpoint.replace(/\/$/, '') };
}

export function isR2Configured(env: Record<string, string | undefined> = process.env): boolean {
  return getR2Config(env) !== null;
}

function sha256Hex(data: string | Uint8Array): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodePathSegments(key: string): string {
  return key
    .split('/')
    .filter((seg) => seg.length > 0)
    .map(encodeRfc3986)
    .join('/');
}

function formatAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function deriveSigningKey(secretAccessKey: string, dateStamp: string, region = 'auto'): Buffer {
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, 's3');
  return hmacSha256(kService, 'aws4_request');
}

/**
 * Generates an AWS Signature V4 presigned GET URL for a Cloudflare R2 object.
 */
export function createR2PresignedGetUrl(
  config: R2Config,
  key: string,
  opts: {
    expiresInSeconds?: number;
    now?: Date;
    responseContentDisposition?: string;
    responseContentType?: string;
  } = {},
): { url: string; expiresAt: string } {
  const ttl = Math.max(60, Math.min(opts.expiresInSeconds ?? DEFAULT_PRESIGN_TTL_SECONDS, 86_400));
  const now = opts.now ?? new Date();
  const { amzDate, dateStamp } = formatAmzDate(now);
  const region = 'auto';
  const service = 's3';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const endpointUrl = new URL(config.endpoint);
  const canonicalUri = `/${encodeRfc3986(config.bucket)}/${encodePathSegments(key)}`;

  const queryParams: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${config.accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(ttl)],
    ['X-Amz-SignedHeaders', 'host'],
  ];
  if (opts.responseContentDisposition) {
    queryParams.push(['response-content-disposition', opts.responseContentDisposition]);
  }
  if (opts.responseContentType) {
    queryParams.push(['response-content-type', opts.responseContentType]);
  }
  queryParams.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const canonicalQuery = queryParams
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
    .join('&');

  const canonicalHeaders = `host:${endpointUrl.host}\n`;
  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = deriveSigningKey(config.secretAccessKey, dateStamp, region);
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex');

  const url = `${config.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();
  return { url, expiresAt };
}

/**
 * Stores a checksummed scholarly export or render artifact in Cloudflare R2
 * (via native `R2Bucket` binding or S3 SigV4 PUT) and returns signed metadata.
 * Gracefully degrades to `{ provider: 'inline' }` when R2 is unconfigured.
 */
export async function storeArtifactInR2(input: {
  key: string;
  body: string | Uint8Array;
  contentType: string;
  filename?: string;
  checksumSha256?: string;
  r2Binding?: R2BucketLike | null;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  presignTtlSeconds?: number;
}): Promise<R2StoredObject> {
  const bytes = typeof input.body === 'string' ? Buffer.from(input.body, 'utf8') : input.body;
  const checksumSha256 = input.checksumSha256 ?? sha256Hex(bytes);
  const byteSize = bytes.byteLength;
  const config = getR2Config(input.env);

  const disposition = input.filename
    ? `attachment; filename="${input.filename.replace(/["\\]/g, '')}"`
    : undefined;

  // Path 1: Native Cloudflare R2 binding if present
  if (input.r2Binding) {
    await input.r2Binding.put(input.key, bytes, {
      httpMetadata: {
        contentType: input.contentType,
        contentDisposition: disposition,
      },
      customMetadata: {
        sha256: checksumSha256,
      },
    });
    const signed = config
      ? createR2PresignedGetUrl(config, input.key, {
          expiresInSeconds: input.presignTtlSeconds,
          responseContentDisposition: disposition,
          responseContentType: input.contentType,
        })
      : null;

    return {
      provider: 'r2',
      bucket: config?.bucket ?? 'R2_ARTIFACTS',
      key: input.key,
      checksumSha256,
      byteSize,
      signedUrl: signed?.url ?? null,
      signedUrlExpiresAt: signed?.expiresAt ?? null,
    };
  }

  // Path 2: S3-compatible R2 HTTP PUT with AWS Signature V4
  if (!config) {
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

  const now = new Date();
  const { amzDate, dateStamp } = formatAmzDate(now);
  const region = 'auto';
  const service = 's3';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const endpointUrl = new URL(config.endpoint);
  const canonicalUri = `/${encodeRfc3986(config.bucket)}/${encodePathSegments(input.key)}`;

  const canonicalHeaders =
    `content-type:${input.contentType}\n` +
    `host:${endpointUrl.host}\n` +
    `x-amz-content-sha256:${checksumSha256}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    checksumSha256,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = deriveSigningKey(config.secretAccessKey, dateStamp, region);
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const doFetch = input.fetchImpl ?? fetch;

  const response = await doFetch(`${config.endpoint}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      'Content-Type': input.contentType,
      'x-amz-content-sha256': checksumSha256,
      'x-amz-date': amzDate,
      Authorization: authorization,
      ...(disposition ? { 'Content-Disposition': disposition } : {}),
    },
    body: new Uint8Array(bytes),
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed with HTTP ${response.status} for key ${input.key}`);
  }

  const signed = createR2PresignedGetUrl(config, input.key, {
    expiresInSeconds: input.presignTtlSeconds,
    now,
    responseContentDisposition: disposition,
    responseContentType: input.contentType,
  });

  return {
    provider: 'r2',
    bucket: config.bucket,
    key: input.key,
    checksumSha256,
    byteSize,
    signedUrl: signed.url,
    signedUrlExpiresAt: signed.expiresAt,
  };
}
