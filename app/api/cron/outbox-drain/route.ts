import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { noStoreHeaders } from '@/lib/cms/http';
import { timingSafeEqualStrings } from '@/lib/crypto';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { enforceRateLimit } from '@/lib/v34/http';
import { createRequestContext, logStructuredError } from '@/lib/v34/observability';
import { drainOutboxBatch } from '@/lib/v34/outbox-worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildServiceSupabase() {
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const url = (process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? SUPABASE_URL).trim();
  if (!serviceKey || !url || url.includes('127.0.0.1:9')) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function handleDrain(request: NextRequest) {
  const limited = await enforceRateLimit(request, 'cron-v34-outbox-drain', 30, 60_000);
  if (limited) return limited;

  const cronSecret = (process.env.CRON_SECRET ?? '').trim();
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Cron secret is not configured.' },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  const authHeader = request.headers.get('authorization') ?? '';
  if (!timingSafeEqualStrings(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders() });
  }

  const ctx = createRequestContext(request, { route: '/api/cron/outbox-drain' });
  const url = new URL(request.url);
  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '25', 10);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 25;
  const consumer = url.searchParams.get('consumer')?.trim() || 'rwm-cron-outbox-drain';

  try {
    const supabase = buildServiceSupabase();
    const summary = await drainOutboxBatch({
      consumer,
      limit,
      supabase,
      requestId: ctx.requestId,
      traceId: ctx.traceId,
    });

    return NextResponse.json(
      {
        ok: true,
        durableBackend: Boolean(supabase),
        requestId: ctx.requestId,
        traceId: ctx.traceId,
        ...summary,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          ...noStoreHeaders(),
          'X-Request-Id': ctx.requestId,
          'X-Trace-Id': ctx.traceId,
        },
      },
    );
  } catch (error) {
    logStructuredError('cron.outbox_drain.failed', ctx, error);
    return NextResponse.json(
      { error: 'Outbox drain failed.', requestId: ctx.requestId, traceId: ctx.traceId },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleDrain(request);
}

export async function POST(request: NextRequest) {
  return handleDrain(request);
}
