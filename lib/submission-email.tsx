// In scope for the JSX below: this repo's vitest transform uses the classic JSX
// runtime, so the automatic runtime's implicit import is not injected in tests.
import * as React from 'react';
import { render, toPlainText } from '@react-email/render';
import { SubmissionReceipt } from '@/emails/submission-receipt';
import type { SubmissionReceiptProps } from '@/emails/submission-receipt';
import type { SubmissionRecord } from './submissions';

/**
 * Turns a stored submission into the acknowledgement it should receive.
 *
 * The layout lives in emails/submission-receipt.tsx so that the same component
 * serves three paths: the local render below, `npx email` for previewing, and
 * the Resend Templates upload that editors adjust visually. Here it is only
 * about producing values and bodies -- no HTML strings are assembled by hand.
 *
 * Kept separate from lib/email.ts so the transport stays swappable and this
 * stays testable without an API key.
 */

/**
 * The variable bag handed to Resend, and the props of the template.
 *
 * The index signature exists because Resend types template variables as
 * `Record<string, string | number>`, and a plain interface -- having no implicit
 * index signature -- is not assignable to it. It is added here rather than on
 * `SubmissionReceiptProps`, so the component's own props stay strict and a
 * misspelled prop is still a compile error at the component boundary.
 */
export interface SubmissionReceiptVariables extends SubmissionReceiptProps {
  [key: string]: string | number;
}

/**
 * The flat variable bag. Resend template variables are
 * `Record<string, string | number>`, so there is no nesting and no nulls --
 * an absent optional field is an empty string, which the component then hides.
 *
 * Values come from the stored record rather than the request body, so what the
 * submitter sees is what an editor will read, including any truncation
 * `cleanText` applied (title at 180 characters, abstract at 4000).
 *
 * Deliberately excludes `institutional`, a boolean derived from the contact
 * address by `isInstitutionalEmail`: an editorial credibility signal, not
 * something the submitter typed or can correct. Excludes `email` for the same
 * reason the receipt is being sent there -- quoting it back proves nothing.
 */
export function submissionReceiptVariables(
  submission: SubmissionRecord,
): SubmissionReceiptVariables {
  return {
    reference: submission.id,
    authorName: submission.authorName,
    title: submission.title,
    category: submission.category,
    dataUrl: submission.dataUrl ?? '',
    artifact: submission.artifact,
    abstract: submission.abstract,
  };
}

/** `<event-type>/<entity-id>`, the shape Resend expects for idempotency keys. */
export function submissionReceiptKey(submissionId: string): string {
  return `submission-receipt/${submissionId}`.slice(0, 256);
}

/**
 * The tracking ID goes first so it survives client-side subject truncation and
 * stays visible in an inbox list -- finding this message again is its purpose.
 * The title is left out: it can be 180 characters and is already echoed in full
 * in the body.
 *
 * Built here rather than left to the Resend template so that a send always
 * carries the reference, even if someone editing the template in Resend's
 * visual editor drops the variable.
 */
export function submissionReceiptSubject(reference: string): string {
  return `[${reference}] We received your submission`;
}

export interface ReceiptContent {
  subject: string;
  html: string;
  text: string;
  variables: SubmissionReceiptVariables;
}

/**
 * Renders the template locally. Both bodies come from the same element, so the
 * HTML and plain-text parts cannot drift apart -- an earlier version maintained
 * them as two separate hand-built strings.
 *
 * Takes the variable bag rather than a record so that a caller already holding
 * variables -- one about to send through a Resend template, or a test -- can
 * render without constructing a whole SubmissionRecord.
 */
export async function renderSubmissionReceipt(
  variables: SubmissionReceiptVariables,
): Promise<{ html: string; text: string }> {
  // JSX rather than createElement: the component's parameter is defaulted, and
  // createElement's overloads then resolve it as FunctionComponent<{}>.
  const element = <SubmissionReceipt {...variables} />;
  const html = await render(element);

  return {
    html,
    // `toPlainText` takes the rendered HTML, not the element -- passing the
    // element makes it hand a non-string to the parser, which throws deep inside
    // htmlparser2 rather than failing loudly here.
    //
    // The detail rows are a two-column table, which reads well in HTML but
    // flattens to "ReferenceRWM-2026-7QXTR3" in plain text because adjacent
    // cells get no separator. Treating each cell as a block puts the label above
    // its value, which fixes the text without giving up the table in the HTML.
    text: toPlainText(html, {
      selectors: [{ selector: 'td', format: 'block' }],
    }),
  };
}

/**
 * Convenience wrapper for the common case: everything needed to send the
 * acknowledgement for one stored submission.
 */
export async function buildSubmissionReceipt(
  submission: SubmissionRecord,
): Promise<ReceiptContent> {
  const variables = submissionReceiptVariables(submission);

  return {
    subject: submissionReceiptSubject(variables.reference),
    variables,
    ...(await renderSubmissionReceipt(variables)),
  };
}
