import { NextRequest, NextResponse } from 'next/server';
import { isSameOrigin } from '@/lib/cms/http';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { createSubmission } from '@/lib/submissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  const limit = await rateLimit(clientKey(request, 'submissions'), 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions from this connection. Wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'Send the submission as JSON.' }, { status: 415 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'The submission body could not be read.' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'The submission body is empty.' }, { status: 400 });
  }

  const result = createSubmission(payload as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      success: true,
      submission: {
        id: result.submission.id,
        title: result.submission.title,
        createdAt: result.submission.createdAt,
      },
    },
    { status: 201 },
  );
}
