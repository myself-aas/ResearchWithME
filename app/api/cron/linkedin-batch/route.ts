import { NextRequest, NextResponse } from 'next/server';
import { checkAndPostNewArticles } from '@/lib/linkedin/automation';
import { noStoreHeaders } from '@/lib/cms/http';
import { timingSafeEqualStrings } from '@/lib/crypto';
import { enforceRateLimit } from '@/lib/v34/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, 'cron-linkedin-batch', 15, 60_000);
  if (limited) return limited;
  const cronSecret = (process.env.CRON_SECRET ?? '').trim();
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Cron secret is not configured.' },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${cronSecret}`;
  if (!timingSafeEqualStrings(authHeader, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders() });
  }

  try {
    const result = await checkAndPostNewArticles();
    return NextResponse.json(
      {
        success: true,
        scope: 'editorial_only',
        posted: result.posted,
        failed: result.failed,
        skipped: result.skipped,
        timestamp: new Date().toISOString(),
      },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    console.error('[LinkedIn Cron] Batch job failed:', error);
    return NextResponse.json(
      { error: 'LinkedIn batch job failed.' },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}
