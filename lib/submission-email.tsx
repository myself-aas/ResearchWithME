// In scope for the JSX below: this repo's vitest transform uses the classic JSX
// runtime, so the automatic runtime's implicit import is not injected in tests.
import * as React from 'react';
import { render, toPlainText } from '@react-email/render';
import { SubmissionReceipt } from '@/emails/submission-receipt';
import {
  SubmissionReceiptSample,
  type SubmissionReceiptProps,
} from '@/emails/submission-receipt';
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

/**
 * `toPlainText` takes the rendered HTML, not the element -- passing the element
 * does not fail loudly, it reaches the parser and throws deep inside
 * htmlparser2.
 *
 * The default conversion also mangles two things this template relies on, so
 * both are overridden:
 *
 * - `h1` is uppercased. Without this the greeting reads "THANK YOU, DR. AMARA
 *   OKONKWO." in the text part, and a `{{{authorName}}}` token in an uploaded
 *   template would become `{{{AUTHORNAME}}}` and never substitute.
 * - Adjacent `<td>` cells get no separator, so the two-column detail table
 *   flattens to "ReferenceRWM-2026-7QXTR3". Making each cell a block puts the
 *   label above its value, which fixes the text without giving up the table in
 *   the HTML.
 */
const PLAIN_TEXT_SELECTORS = [
  { selector: 'h1', format: 'block' as const },
  { selector: 'td', format: 'block' as const },
];

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
    // `toPlainText` takes the rendered HTML, not the element -- see
    // PLAIN_TEXT_SELECTORS for why the conversion needs configuring.
    text: toPlainText(html, { selectors: PLAIN_TEXT_SELECTORS }),
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

/**
 * Resend template names, and the reserved variable keys.
 *
 * `FIRST_NAME`, `LAST_NAME`, `EMAIL`, `UNSUBSCRIBE_URL`, `contact` and `this`
 * are reserved by Resend and rejected on template creation. The list mixes
 * cases -- `EMAIL` upper, `contact` lower -- so the reservation cannot be
 * assumed case-sensitive; the guard below compares case-insensitively, which is
 * the safe reading.
 */
export const SUBMISSION_RECEIPT_TEMPLATE_NAME = 'submission-receipt';

const RESERVED_VARIABLE_KEYS = new Set([
  'first_name',
  'last_name',
  'email',
  'unsubscribe_url',
  'contact',
  'this',
]);

export function isReservedTemplateVariable(key: string): boolean {
  return RESERVED_VARIABLE_KEYS.has(key.toLowerCase());
}

/**
 * Resend's own type for this is not exported, so the shape is restated here --
 * as a discriminated union, matching theirs. A single `type: 'string' | 'number'`
 * with a union `fallbackValue` is not assignable to it, because their type ties
 * the fallback's type to the discriminator.
 */
export type ReceiptVariableDefinition =
  | { key: string; type: 'string'; fallbackValue?: string | null }
  | { key: string; type: 'number'; fallbackValue?: number | null };

/**
 * The variable declarations for the uploaded template.
 *
 * Every key carries a fallback. Resend refuses to send a template email when a
 * variable has neither a supplied value nor a fallback, so a fallback turns a
 * future gap into a slightly generic receipt instead of a failed send. The
 * sample values are used, which are ordinary rather than "Lorem ipsum" so a
 * fallback still reads like a real submission.
 */
export function submissionReceiptTemplateVariables(): ReceiptVariableDefinition[] {
  return Object.entries(SubmissionReceiptSample).map(
    ([key, value]): ReceiptVariableDefinition =>
      typeof value === 'number'
        ? { key, type: 'number', fallbackValue: value }
        : { key, type: 'string', fallbackValue: value },
  );
}

/**
 * `{{{key}}}`, the triple-brace token Resend templates substitute. Built by
 * concatenation rather than a template literal: nested braces next to `${}` are
 * easy to get wrong by one, and a malformed token still renders -- it simply
 * never substitutes, so the mistake is silent until a real send.
 */
function mustache(key: string): string {
  return '{{{' + key + '}}}';
}

export interface ReceiptTemplateSource {
  name: string;
  html: string;
  text: string;
  subject: string;
  variables: ReceiptVariableDefinition[];
}

/**
 * The template source to upload to Resend, built from the same component the
 * app renders locally.
 *
 * The component is rendered with `{{{key}}}` tokens standing in for values.
 * React escapes interpolated children, but braces are not HTML metacharacters,
 * so the tokens survive intact -- which is what makes one component able to
 * produce both a real email and a template.
 *
 * `text` is included deliberately. A `template` send cannot carry `text` in its
 * payload -- Resend's own types set `text?: never` there -- but a Template can
 * hold a text body of its own, so the multipart alternative survives the
 * template path as long as the uploaded template has one.
 *
 * `subject` is set as a template default so the dashboard's test-email preview
 * renders, but the app always passes its own subject at send time, which takes
 * precedence, so the tracking ID never depends on the template being right.
 */
export async function buildSubmissionReceiptTemplateSource(): Promise<ReceiptTemplateSource> {
  const definitions = submissionReceiptTemplateVariables();

  // Guard before building anything: a reserved key would fail at the API, after
  // the render, with an error that points at Resend rather than at this file.
  const reserved = definitions
    .filter((definition) => isReservedTemplateVariable(definition.key))
    .map((definition) => definition.key);
  if (reserved.length > 0) {
    throw new Error(
      `Reserved Resend template variable key(s): ${reserved.join(', ')}`,
    );
  }

  const placeholders = Object.fromEntries(
    definitions.map((definition) => [
      definition.key,
      mustache(definition.key),
    ]),
  ) as SubmissionReceiptVariables;

  const { html, text } = await renderSubmissionReceipt(placeholders);

  return {
    name: SUBMISSION_RECEIPT_TEMPLATE_NAME,
    html,
    text,
    subject: submissionReceiptSubject(mustache('reference')),
    variables: definitions,
  };
}
