import { randomUUID } from 'node:crypto';

/**
 * Part V §13 — Structured request-context telemetry & redaction.
 *
 * Strictly redacts research prose, quotations, unpublished titles, reviewer
 * identities, and restricted identifiers before any log/trace emission.
 */
export interface RequestTelemetryContext {
  requestId: string;
  userId: string | null;
  workspaceId: string | null;
  route: string;
  releaseVersion: string;
  traceId: string;
}

const REDACTED_KEYS = new Set([
  'body',
  'content',
  'text',
  'quote',
  'quotation',
  'excerpt',
  'title',
  'abstract',
  'reviewerId',
  'reviewerName',
  'reviewerEmail',
  'authorEmail',
  'statement',
  'draft',
  'markdown',
  'prompt',
  'secret',
  'token',
  'password',
  'authorization',
]);

export function createRequestContext(
  request: Request | { headers?: { get?: (key: string) => string | null }; url?: string },
  opts: { route: string; userId?: string | null; workspaceId?: string | null },
): RequestTelemetryContext {
  const existingReqId = request.headers?.get?.('x-request-id');
  const existingTrace = request.headers?.get?.('x-trace-id') ?? request.headers?.get?.('traceparent');
  return {
    requestId: existingReqId && existingReqId.trim().length > 0 ? existingReqId.trim() : `req_${randomUUID()}`,
    userId: opts.userId ?? null,
    workspaceId: opts.workspaceId ?? null,
    route: opts.route,
    releaseVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? 'v3.4.0',
    traceId: existingTrace && existingTrace.trim().length > 0 ? existingTrace.trim() : `tr_${randomUUID().slice(0, 16)}`,
  };
}

export function sanitizeTelemetryMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (REDACTED_KEYS.has(key) || /secret|token|password|quote|reviewer|excerpt|body|content/i.test(key)) {
      clean[key] = '[REDACTED]';
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      clean[key] = sanitizeTelemetryMetadata(value as Record<string, unknown>);
    } else if (typeof value === 'string' && value.length > 160) {
      clean[key] = `${value.slice(0, 32)}…[TRUNCATED]`;
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export function normalizeErrorCode(error: unknown): string {
  if (!error) return 'UNKNOWN_ERROR';
  if (typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  if (error instanceof Error) {
    return error.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_') || 'ERROR';
  }
  return 'UNKNOWN_ERROR';
}

export function logStructuredError(
  eventName: string,
  ctx: RequestTelemetryContext,
  error: unknown,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const record = {
    level: 'error',
    event: eventName,
    timestamp: new Date().toISOString(),
    requestId: ctx.requestId,
    traceId: ctx.traceId,
    route: ctx.route,
    releaseVersion: ctx.releaseVersion,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
    errorCode: normalizeErrorCode(error),
    ...sanitizeTelemetryMetadata(extra),
  };
  if (process.env.NODE_ENV !== 'test') {
    console.error(JSON.stringify(record));
  }
  return record;
}
