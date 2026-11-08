import type { SubmissionRecord } from './submissions';

/**
 * The acknowledgement a submitter receives. Kept separate from lib/email.ts so
 * the content is a pure function that can be tested without an API key or a
 * network.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Every field here is typed by a stranger into a public form and lands in an
 * HTML document, so nothing is interpolated raw.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

/** `<event-type>/<entity-id>`, the shape Resend expects for idempotency keys. */
export function submissionReceiptKey(submissionId: string): string {
  return `submission-receipt/${submissionId}`.slice(0, 256);
}

export interface ReceiptContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * What the receipt echoes back, as `[label, value]` pairs.
 *
 * Deliberately excludes `institutional`, which is a boolean derived from the
 * contact address by `isInstitutionalEmail` -- an editorial credibility signal,
 * not something the submitter typed or can correct. Excludes `email` for the
 * same reason the receipt is being sent there: quoting it back proves nothing.
 *
 * Values are read from the stored record, not the request body, so what the
 * submitter sees is what an editor will read -- including any truncation
 * `cleanText` applied (title at 180 characters, abstract at 4000).
 */
function receiptFields(submission: SubmissionRecord): Array<[string, string]> {
  const fields: Array<[string, string]> = [
    ['Reference', submission.id],
    ['Title', submission.title],
    ['Category', submission.category],
    ['Code / data', submission.dataUrl ?? ''],
    ['Reviewed artifact', submission.artifact],
  ];
  // Omit empty ones rather than rendering a label with a blank value.
  return fields.filter(([, value]) => value.trim() !== '');
}

export function buildSubmissionReceipt(submission: SubmissionRecord): ReceiptContent {
  const name = escapeHtml(submission.authorName);
  const abstract = escapeHtml(submission.abstract);

  const fields = receiptFields(submission);
  const monospace =
    'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;';

  const rows = fields
    .map(([label, value], index) => {
      const border = index === fields.length - 1 ? '' : 'border-bottom:1px solid #e7e5e4;';
      const valueStyle = label === 'Reference' || label === 'Code / data' ? monospace : '';
      return `
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#78716c;width:130px;vertical-align:top;${border}">${label}</td>
          <td style="padding:10px 14px;font-size:14px;vertical-align:top;${border}${valueStyle}">${escapeHtml(value)}</td>
        </tr>`;
    })
    .join('');

  // The ID goes first, so it survives client-side subject truncation and stays
  // visible in an inbox list -- finding this message again is the point of it.
  // The title is left out: it can be 180 characters and is already echoed in
  // full in the body.
  const subject = `[${submission.id}] We received your submission`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f5f5f4;">
    <div style="max-width:600px;margin:0 auto;padding:32px 20px;font-family:Georgia,'Times New Roman',serif;color:#1c1917;">
      <p style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#78716c;margin:0 0 20px;">
        ResearchWithMe
      </p>
      <h1 style="font-size:24px;line-height:1.3;margin:0 0 16px;">Thank you, ${name}.</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">
        Your submission has reached the editorial desk. This message confirms it was recorded
        &mdash; it is not an acceptance, and no reviewer has been assigned yet.
      </p>
      <table role="presentation" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e7e5e4;">${rows}
      </table>
      <p style="font-size:13px;line-height:1.6;margin:24px 0 8px;color:#78716c;text-transform:uppercase;letter-spacing:0.08em;">
        Abstract as recorded
      </p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 24px;color:#44403c;">${abstract}</p>
      <p style="font-size:14px;line-height:1.6;margin:0;color:#57534e;">
        If you need to reach the desk about this submission, reply to this message and quote the
        reference above.
      </p>
    </div>
  </body>
</html>`;

  const details = fields.map(
    ([label, value]) => `${label}: ${value}`,
  );

  const text = [
    `Thank you, ${submission.authorName}.`,
    '',
    'Your submission has reached the editorial desk. This message confirms it was',
    'recorded -- it is not an acceptance, and no reviewer has been assigned yet.',
    '',
    ...details,
    '',
    'Abstract as recorded:',
    '',
    submission.abstract,
    '',
    'If you need to reach the desk about this submission, reply to this message and',
    'quote the reference above.',
  ].join('\n');

  return { subject, html, text };
}
