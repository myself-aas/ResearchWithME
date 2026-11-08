import { NextRequest, NextResponse } from 'next/server';
import { isSameOrigin } from '@/lib/cms/http';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email';
import {
  submissionReceiptKey,
  submissionReceiptSubject,
  submissionReceiptVariables,
  renderSubmissionReceipt,
} from '@/lib/submission-email';
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

  // The submission is already recorded at this point, so the acknowledgement is
  // best-effort: a failed or unconfigured send is logged and reported back in
  // the body, never turned into a failed request.
  const variables = submissionReceiptVariables(result.submission);
  const base = {
    to: result.submission.email,
    // Built here rather than left to the template, so the reference is present
    // even if the variable is dropped while editing in Resend's visual editor.
    subject: submissionReceiptSubject(variables.reference),
    idempotencyKey: submissionReceiptKey(result.submission.id),
    tags: [{ name: 'category', value: 'submission-receipt' }],
  };

  // With a template configured, Resend renders the body, so the local render is
  // skipped entirely rather than producing HTML nobody reads. Without one -- the
  // default, and the state of any environment that has not uploaded a template
  // yet -- the same component is rendered here and sent as HTML plus text.
  const templateId = (process.env.RESEND_RECEIPT_TEMPLATE_ID ?? '').trim();
  const sent = await sendEmail(
    templateId
      ? { ...base, template: { id: templateId, variables } }
      : { ...base, ...(await renderSubmissionReceipt(variables)) },
  );

  if (!sent.ok) {
    console.error(
      'Submission receipt not sent:',
      sent.skipped ? sent.reason : sent.error,
    );
  }

  return NextResponse.json(
    {
      success: true,
      submission: {
        id: result.submission.id,
        title: result.submission.title,
        createdAt: result.submission.createdAt,
      },
      receiptSent: sent.ok,
    },
    { status: 201 },
  );
}
