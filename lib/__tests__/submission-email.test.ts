import { describe, expect, it } from 'vitest';
import {
  buildSubmissionReceipt,
  buildSubmissionReceiptTemplateSource,
  isReservedTemplateVariable,
  renderSubmissionReceipt,
  submissionReceiptKey,
  submissionReceiptSubject,
  submissionReceiptTemplateVariables,
  submissionReceiptVariables,
} from '@/lib/submission-email';
import { SubmissionReceiptSample } from '@/emails/submission-receipt';
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

const hostile = {
  reference: 'RWM-2026-HOSTILE',
  authorName: '<img src=x onerror=alert(1)>',
  title: '<script>alert(1)</script>',
  category: 'Cat',
  dataUrl: '',
  artifact: "O'Brien & Sons <b>",
  abstract: '"><b>break out</b>',
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

describe('submissionReceiptSubject', () => {
  it('leads with the tracking ID so it survives client-side truncation', () => {
    expect(submissionReceiptSubject(submission.id)).toBe(
      `[${submission.id}] We received your submission`,
    );
    expect(submissionReceiptSubject(submission.id).startsWith('[RWM-')).toBe(true);
  });
});

describe('submissionReceiptVariables', () => {
  it('produces only flat string values, as Resend template variables require', () => {
    const variables = submissionReceiptVariables(submission);
    for (const [key, value] of Object.entries(variables)) {
      expect(typeof value, `${key} must be a string`).toBe('string');
      expect(value).not.toBeNull();
    }
  });

  it('turns a null dataUrl into an empty string rather than dropping the key', () => {
    // Resend substitutes template variables textually; a missing key would
    // render as the literal placeholder rather than as an absent field.
    const variables = submissionReceiptVariables({ ...submission, dataUrl: null });
    expect(variables.dataUrl).toBe('');
    expect(Object.keys(variables)).toContain('dataUrl');
  });

  it('never echoes the derived institutional flag', () => {
    // `institutional` is a boolean computed from the contact address by
    // isInstitutionalEmail. Rendering it would print "Institution: true", which
    // reads as a data error rather than a credibility signal.
    for (const institutional of [true, false]) {
      const variables = submissionReceiptVariables({ ...submission, institutional });
      expect(variables).not.toHaveProperty('institutional');
      expect(Object.values(variables)).not.toContain('true');
    }
  });

  it('does not echo the contact address the receipt is being sent to', () => {
    const variables = submissionReceiptVariables(submission);
    expect(Object.values(variables)).not.toContain(submission.email);
  });

  it('matches the shape the component declares', () => {
    // If the component gains a prop, the bag must supply it -- otherwise the
    // uploaded Resend template would substitute an empty value silently.
    expect(Object.keys(submissionReceiptVariables(submission)).sort()).toEqual(
      Object.keys(SubmissionReceiptSample).sort(),
    );
  });
});

describe('renderSubmissionReceipt', () => {
  it('renders both bodies from the same template', async () => {
    const { html, text } = await renderSubmissionReceipt(
      submissionReceiptVariables(submission),
    );

    expect(html).toContain('<!DOCTYPE');
    for (const value of [
      submission.id,
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

  it('separates table cells in the plain-text body', async () => {
    // A two-column table reads well in HTML but flattens to
    // "ReferenceRWM-2026-7QXTR3" in plain text. Each cell is rendered as a
    // block so the label sits above its value.
    const { text } = await renderSubmissionReceipt(
      submissionReceiptVariables(submission),
    );

    expect(text).not.toContain(`Reference${submission.id}`);
    expect(text).toContain('Reference');
    expect(text).toContain(submission.id);
  });

  it('omits an optional field rather than rendering an empty label', async () => {
    const { html, text } = await renderSubmissionReceipt({
      ...submissionReceiptVariables(submission),
      dataUrl: '',
      artifact: '   ',
    });

    for (const body of [html, text]) {
      expect(body).not.toContain('Code / data');
      expect(body).not.toContain('Reviewed artifact');
    }
    expect(html).toContain('Reference');
  });

  it('escapes submitter-controlled values in the HTML body', async () => {
    // Every field here is typed by a stranger into a public form. React escapes
    // interpolated children, which is exactly the behaviour this test pins: if
    // anyone later switches a cell to dangerouslySetInnerHTML or a template
    // literal, the receipt becomes a stored XSS payload in an inbox.
    const { html } = await renderSubmissionReceipt(hostile);

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    // Escaped, not dropped -- the recipient can still read what was submitted.
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&amp; Sons');
    expect(html).toContain('O&#x27;Brien');
  });

  it('leaves the plain-text body unescaped so it reads as text', async () => {
    const { text } = await renderSubmissionReceipt(hostile);

    expect(text).toContain('<script>alert(1)</script>');
    expect(text).toContain("O'Brien & Sons <b>");
    expect(text).not.toContain('&lt;');
    expect(text).not.toContain('&amp;');
    expect(text).not.toContain('&#x27;');
  });

  it('says plainly that the submission was not accepted', async () => {
    // The product makes no review-timeline promise anywhere, so the receipt
    // must not invent one either.
    const { html, text } = await renderSubmissionReceipt(
      submissionReceiptVariables(submission),
    );

    for (const body of [html, text]) {
      expect(body).toContain('not an acceptance');
      expect(body).not.toMatch(/business days|working days|within \d+ days/i);
    }
    // The HTML body spells out the reviewer state; the em dash is an entity there.
    expect(html).toContain('no reviewer has been assigned');
    expect(text).toContain('no reviewer has been assigned');
  });
});

describe('buildSubmissionReceipt', () => {
  it('returns everything needed to send, keyed off the stored record', async () => {
    const receipt = await buildSubmissionReceipt(submission);

    expect(receipt.subject).toContain(submission.id);
    expect(receipt.variables.reference).toBe(submission.id);
    expect(receipt.html).toContain(submission.title);
    expect(receipt.text).toContain(submission.title);
  });

  it('produces the same bodies as rendering its own variables', async () => {
    const receipt = await buildSubmissionReceipt(submission);
    const direct = await renderSubmissionReceipt(receipt.variables);

    expect(receipt.html).toBe(direct.html);
    expect(receipt.text).toBe(direct.text);
  });
});

describe('submissionReceiptTemplateVariables', () => {
  it('declares one variable per component prop', () => {
    const keys = submissionReceiptTemplateVariables().map((v) => v.key);
    expect(keys.sort()).toEqual(Object.keys(SubmissionReceiptSample).sort());
  });

  it('gives every variable a fallback so a missing value cannot fail the send', () => {
    // Resend refuses to send when a variable has neither a supplied value nor a
    // fallback. A fallback turns a future gap into a generic receipt rather
    // than a failed send.
    for (const definition of submissionReceiptTemplateVariables()) {
      expect(
        definition.fallbackValue,
        `${definition.key} needs a fallback`,
      ).not.toBeNull();
      expect(definition.fallbackValue).not.toBeUndefined();
    }
  });

  it('avoids the variable keys Resend reserves', () => {
    // The reserved list mixes cases (EMAIL upper, contact lower), so the
    // reservation is treated as case-insensitive -- the safe reading.
    for (const definition of submissionReceiptTemplateVariables()) {
      expect(
        isReservedTemplateVariable(definition.key),
        `${definition.key} is reserved by Resend`,
      ).toBe(false);
    }
    expect(isReservedTemplateVariable('email')).toBe(true);
    expect(isReservedTemplateVariable('EMAIL')).toBe(true);
    expect(isReservedTemplateVariable('contact')).toBe(true);
    expect(isReservedTemplateVariable('this')).toBe(true);
    expect(isReservedTemplateVariable('reference')).toBe(false);
  });

  it('stays well under the 50-variable limit', () => {
    expect(submissionReceiptTemplateVariables().length).toBeLessThan(50);
  });
});

describe('buildSubmissionReceiptTemplateSource', () => {
  it('emits a triple-brace token for every variable, in both bodies', async () => {
    // Compared against literal token strings, not the builder's own
    // construction: comparing both sides of a check to the same helper is how a
    // malformed token passes a test and then silently never substitutes.
    const source = await buildSubmissionReceiptTemplateSource();

    for (const key of Object.keys(SubmissionReceiptSample)) {
      const token = '{{{' + key + '}}}';
      expect(source.html, `html missing ${token}`).toContain(token);
      expect(source.text, `text missing ${token}`).toContain(token);
    }
  });

  it('leaks no sample values into the uploaded template', async () => {
    const source = await buildSubmissionReceiptTemplateSource();

    expect(source.html).not.toContain(SubmissionReceiptSample.reference);
    expect(source.html).not.toContain(SubmissionReceiptSample.authorName);
    expect(source.text).not.toContain(SubmissionReceiptSample.title);
  });

  it('includes a text body so the template path keeps its plain-text part', async () => {
    // A `template` send cannot carry `text` in its payload, but a Template can
    // hold one, so the multipart alternative survives only if this is set.
    const source = await buildSubmissionReceiptTemplateSource();

    expect(source.text.length).toBeGreaterThan(100);
    expect(source.html).toContain('<!DOCTYPE');
  });

  it('names itself and sets a subject default for dashboard test emails', async () => {
    const source = await buildSubmissionReceiptTemplateSource();

    expect(source.name).toBe('submission-receipt');
    expect(source.subject).toBe('[{{{reference}}}] We received your submission');
  });
});

describe('plain-text conversion', () => {
  it('does not uppercase the greeting', async () => {
    // html-to-text uppercases h1 by default, which made the text part read
    // "THANK YOU, DR. AMARA OKONKWO." and would have turned a {{{authorName}}}
    // token into {{{AUTHORNAME}}}, silently unsubstituted.
    const { text } = await renderSubmissionReceipt(
      submissionReceiptVariables(submission),
    );

    expect(text).toContain(`Thank you, ${submission.authorName}.`);
    expect(text).not.toContain(submission.authorName.toUpperCase());
  });
});
