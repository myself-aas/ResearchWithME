import { describe, expect, it } from 'vitest';
import {
  buildSubmissionReceipt,
  submissionReceiptKey,
} from '@/lib/submission-email';
import type { SubmissionRecord } from '@/lib/submissions';

const submission: SubmissionRecord = {
  id: 'RWM-2026-7QXTR3',
  title: 'Attention in low-resource clinical settings',
  authorName: 'Dr. Amara Okonkwo',
  email: 'amara@example.org',
  category: 'Clinical informatics',
  abstract: 'A field study of triage aids across four district hospitals.',
  artifact: 'Field notes',
  dataUrl: 'https://example.org/dataset',
  institutional: false,
  createdAt: '2026-11-08T10:00:00.000Z',
  status: 'received',
};

describe('submissionReceiptKey', () => {
  it('is stable for the same submission and distinct across submissions', () => {
    expect(submissionReceiptKey(submission.id)).toBe(
      submissionReceiptKey(submission.id),
    );
    expect(submissionReceiptKey('RWM-2026-OTHER')).not.toBe(
      submissionReceiptKey(submission.id),
    );
  });

  it('namespaces the key so it cannot collide with other mail', () => {
    expect(submissionReceiptKey(submission.id)).toBe(
      `submission-receipt/${submission.id}`,
    );
  });

  it('stays within the 256-character limit Resend imposes', () => {
    expect(submissionReceiptKey('x'.repeat(400))).toHaveLength(256);
  });
});

describe('buildSubmissionReceipt', () => {
  it('puts the tracking ID in the subject so it is searchable', () => {
    expect(buildSubmissionReceipt(submission).subject).toContain(submission.id);
  });

  it('echoes what an editor will actually read', () => {
    const { html, text } = buildSubmissionReceipt(submission);
    for (const value of [
      submission.title,
      submission.category,
      submission.artifact,
      submission.abstract,
      submission.dataUrl as string,
    ]) {
      expect(html).toContain(value);
      expect(text).toContain(value);
    }
  });

  it('omits a field rather than rendering an empty label when it is absent', () => {
    const { html, text } = buildSubmissionReceipt({
      ...submission,
      dataUrl: null,
      artifact: '   ',
    });
    for (const body of [html, text]) {
      expect(body).not.toContain('Code / data');
      expect(body).not.toContain('Reviewed artifact');
    }
    // The rows that remain still render.
    expect(html).toContain('Reference');
  });

  it('never echoes the derived institutional flag', () => {
    // `institutional` is a boolean computed from the contact address by
    // isInstitutionalEmail. Rendering it would print "Institution: true", which
    // reads as a data error rather than a credibility signal.
    for (const institutional of [true, false]) {
      const { html, text } = buildSubmissionReceipt({ ...submission, institutional });
      expect(html).not.toContain('Institution');
      expect(text).not.toContain('Institution');
      expect(html).not.toContain('true');
    }
  });

  it('keeps the HTML and plain-text bodies in agreement', () => {
    const { html, text } = buildSubmissionReceipt({ ...submission, dataUrl: null });
    // Both derive from the same field list, so a field present in one and
    // missing from the other is a bug, not a formatting choice.
    for (const label of ['Reference', 'Title', 'Category', 'Reviewed artifact']) {
      expect(html).toContain(label);
      expect(text).toContain(label);
    }
  });

  it('keeps the plain-text alternative readable', () => {
    const { text } = buildSubmissionReceipt(submission);
    expect(text).not.toContain('<p>');
    expect(text).not.toContain('&mdash;');
    // Paragraph breaks must survive; an earlier version filtered them out.
    expect(text.split('\n\n').length).toBeGreaterThan(3);
  });

  it('escapes submitter-controlled text in the HTML body', () => {
    // The title, author name and abstract all arrive from an anonymous form, so
    // an unescaped interpolation is a stored XSS payload in the recipient's
    // inbox.
    const hostile = buildSubmissionReceipt({
      ...submission,
      title: '<script>alert("xss")</script>',
      authorName: '<img src=x onerror=alert(1)>',
      abstract: '"><b>break out</b>',
      artifact: "O'Brien & Sons <b>",
    });

    expect(hostile.html).not.toContain('<script>');
    // `onerror=` survives as inert text once the angle brackets are escaped;
    // what must not survive is the tag that would execute it.
    expect(hostile.html).not.toContain('<img');
    expect(hostile.html).not.toContain('<b>');
    expect(hostile.html).not.toContain('"><b>');
    expect(hostile.html).not.toContain("O'Brien & Sons <b>");
    // Escaped, not dropped -- the recipient can still read what was submitted.
    expect(hostile.html).toContain('&lt;script&gt;');
    expect(hostile.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(hostile.html).toContain('O&#39;Brien &amp; Sons');
  });

  it('does not escape the plain-text alternative into mojibake', () => {
    const hostile = buildSubmissionReceipt({
      ...submission,
      title: '<script>alert("xss")</script>',
      abstract: "O'Brien & Sons",
    });
    expect(hostile.text).toContain('<script>alert("xss")</script>');
    expect(hostile.text).toContain("O'Brien & Sons");
    expect(hostile.text).not.toContain('&lt;');
  });

  it('says plainly that the submission was not accepted', () => {
    // The product makes no review-timeline promise anywhere, so the receipt
    // must not invent one either.
    const { html, text } = buildSubmissionReceipt(submission);
    for (const body of [html, text]) {
      expect(body).toContain('not an acceptance');
      expect(body).toContain('no reviewer has been assigned');
      expect(body).not.toMatch(/business days|working days|within \d+ days/i);
    }
  });
});
