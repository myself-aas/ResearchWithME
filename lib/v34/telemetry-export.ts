/**
 * ResearchWithME v3.4 — OpenTelemetry OTLP Trace Exporter & Sentry Capture
 * (Wave 18 P1 — Zero-Bloat Edge-Safe Telemetry).
 *
 * Exports W3C-correlated OTLP/HTTP JSON spans (`OTEL_EXPORTER_OTLP_ENDPOINT`)
 * and captures redacted exceptions to Sentry (`SENTRY_DSN`) with `X-Request-Id`
 * and `X-Trace-Id` correlation. Strictly strips research prose, quotations,
 * reviewer identities, and secrets via `sanitizeTelemetryMetadata`.
 */
import crypto from 'node:crypto';
import {
  normalizeErrorCode,
  sanitizeTelemetryMetadata,
  type RequestTelemetryContext,
} from './observability';

export interface OtlpSpanInput {
  name: string;
  ctx: RequestTelemetryContext;
  startTimeMs: number;
  endTimeMs?: number;
  status?: 'OK' | 'ERROR';
  attributes?: Record<string, unknown>;
}

export interface ParsedSentryDsn {
  publicKey: string;
  projectId: string;
  envelopeUrl: string;
}

function toHexId(input: string, length: number): string {
  const cleaned = input.replace(/[^0-9a-f]/gi, '').toLowerCase();
  if (cleaned.length >= length) return cleaned.slice(0, length);
  return crypto.createHash('sha256').update(input || 'rwm').digest('hex').slice(0, length);
}

/**
 * Parses a standard Sentry DSN (`https://<key>@<host>/<projectId>`) into an
 * Edge-compatible Envelope API URL without importing heavy Node SDK bundles.
 */
export function parseSentryDsn(dsn: string | null | undefined): ParsedSentryDsn | null {
  const trimmed = (dsn ?? '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const publicKey = parsed.username;
    const segments = parsed.pathname.split('/').filter(Boolean);
    const projectId = segments.at(-1);
    if (!publicKey || !projectId) return null;
    const basePath = segments.slice(0, -1).join('/');
    const prefix = basePath ? `/${basePath}` : '';
    return {
      publicKey,
      projectId,
      envelopeUrl: `${parsed.protocol}//${parsed.host}${prefix}/api/${projectId}/envelope/`,
    };
  } catch {
    return null;
  }
}

/**
 * Builds a standards-compliant OTLP/HTTP JSON `ExportTraceServiceRequest`
 * payload with all attributes passed through `sanitizeTelemetryMetadata`.
 */
export function buildOtlpSpanPayload(input: OtlpSpanInput): Record<string, unknown> {
  const endMs = input.endTimeMs ?? Date.now();
  const traceId = toHexId(input.ctx.traceId, 32);
  const spanId = crypto.randomBytes(8).toString('hex');
  const cleanAttrs = sanitizeTelemetryMetadata({
    'rwm.request_id': input.ctx.requestId,
    'rwm.route': input.ctx.route,
    'rwm.release': input.ctx.releaseVersion,
    ...(input.ctx.workspaceId ? { 'rwm.workspace_id': input.ctx.workspaceId } : {}),
    ...(input.attributes ?? {}),
  });

  const otlpAttributes = Object.entries(cleanAttrs).map(([key, val]) => ({
    key,
    value:
      typeof val === 'number'
        ? { doubleValue: val }
        : typeof val === 'boolean'
          ? { boolValue: val }
          : { stringValue: String(val ?? '') },
  }));

  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'researchwithme-v34' } },
            { key: 'service.version', value: { stringValue: input.ctx.releaseVersion } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: 'researchwithme.v34.telemetry', version: '1.0.0' },
            spans: [
              {
                traceId,
                spanId,
                name: input.name,
                kind: 2, // SPAN_KIND_SERVER
                startTimeUnixNano: String(Math.trunc(input.startTimeMs) * 1_000_000),
                endTimeUnixNano: String(Math.trunc(endMs) * 1_000_000),
                attributes: otlpAttributes,
                status: { code: input.status === 'ERROR' ? 2 : 1 },
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Exports a single redacted span to `OTEL_EXPORTER_OTLP_ENDPOINT` (when set).
 * Returns `{ exported: false, skipped: true }` when OTLP is unconfigured.
 */
export async function exportOtlpSpan(
  input: OtlpSpanInput,
  opts: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<{ exported: boolean; skipped?: boolean; status?: number }> {
  const env = opts.env ?? process.env;
  const baseEndpoint = (env.OTEL_EXPORTER_OTLP_ENDPOINT ?? '').trim();
  if (!baseEndpoint) return { exported: false, skipped: true };

  const url = baseEndpoint.endsWith('/v1/traces')
    ? baseEndpoint
    : `${baseEndpoint.replace(/\/$/, '')}/v1/traces`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': input.ctx.requestId,
    'X-Trace-Id': input.ctx.traceId,
  };
  const extraHeaders = (env.OTEL_EXPORTER_OTLP_HEADERS ?? '').trim();
  if (extraHeaders) {
    for (const pair of extraHeaders.split(',')) {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        headers[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
      }
    }
  }

  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildOtlpSpanPayload(input)),
    });
    return { exported: res.ok, status: res.status };
  } catch {
    return { exported: false };
  }
}

/**
 * Builds a redacted Sentry Envelope string (never includes research prose,
 * quotations, titles, tokens, or reviewer IDs).
 */
export function buildSentryEnvelope(
  dsn: ParsedSentryDsn,
  eventName: string,
  ctx: RequestTelemetryContext,
  error: unknown,
  extra: Record<string, unknown> = {},
): { eventId: string; envelope: string } {
  const eventId = crypto.randomBytes(16).toString('hex');
  const sentAt = new Date().toISOString();
  const errorCode = normalizeErrorCode(error);
  const safeExtra = sanitizeTelemetryMetadata(extra);

  const header = JSON.stringify({
    event_id: eventId,
    sent_at: sentAt,
    dsn: `https://${dsn.publicKey}@sentry.invalid/${dsn.projectId}`,
  });
  const itemHeader = JSON.stringify({ type: 'event', content_type: 'application/json' });
  const eventPayload = JSON.stringify({
    event_id: eventId,
    timestamp: Math.floor(Date.now() / 1000),
    platform: 'javascript',
    level: 'error',
    release: ctx.releaseVersion,
    logger: 'researchwithme.v34',
    message: `${eventName}: ${errorCode}`,
    tags: {
      request_id: ctx.requestId,
      trace_id: ctx.traceId,
      route: ctx.route,
      error_code: errorCode,
    },
    contexts: {
      trace: {
        trace_id: toHexId(ctx.traceId, 32),
        span_id: crypto.randomBytes(8).toString('hex'),
        op: 'http.server',
      },
    },
    extra: safeExtra,
  });

  return {
    eventId,
    envelope: `${header}\n${itemHeader}\n${eventPayload}\n`,
  };
}

/**
 * Sends a redacted exception event to Sentry via the lightweight Envelope API.
 */
export async function captureSentryException(
  eventName: string,
  ctx: RequestTelemetryContext,
  error: unknown,
  opts: {
    extra?: Record<string, unknown>;
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<{ captured: boolean; skipped?: boolean; eventId?: string; status?: number }> {
  const env = opts.env ?? process.env;
  const parsed = parseSentryDsn(env.SENTRY_DSN);
  if (!parsed) return { captured: false, skipped: true };

  const { eventId, envelope } = buildSentryEnvelope(
    parsed,
    eventName,
    ctx,
    error,
    opts.extra ?? {},
  );

  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(parsed.envelopeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=researchwithme-v34/1.0`,
        'X-Request-Id': ctx.requestId,
        'X-Trace-Id': ctx.traceId,
      },
      body: envelope,
    });
    return { captured: res.ok, eventId, status: res.status };
  } catch {
    return { captured: false, eventId };
  }
}
