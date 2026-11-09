import * as React from 'react';
import { Text } from '@react-email/components';
import {
  EmailLayout,
  FieldTable,
} from './_layout';

/**
 * The `submission-receipt` message.
 *
 * Props are optional and defaulted so the component is total: the React Email
 * CLI renders the default export with no props, and Resend renders a template
 * whose variable an editor may have removed. A missing field must render as an
 * omitted row, never as an exception.
 */
export interface SubmissionReceiptProps {
  /** Resend template variable `REFERENCE`. */
  reference?: string;
  /** Resend template variable `AUTHOR_NAME`. */
  authorName?: string;
  /** Resend template variable `TITLE`. */
  title?: string;
  /** Resend template variable `CATEGORY`. */
  category?: string;
  /** Resend template variable `DATA_URL`. */
  dataUrl?: string;
  /** Resend template variable `ARTIFACT`. */
  artifact?: string;
  /** Resend template variable `ABSTRACT`. */
  abstract?: string;
}

export function SubmissionReceipt({
  reference = '',
  authorName = '',
  title = '',
  category = '',
  dataUrl = '',
  artifact = '',
  abstract = '',
}: Partial<SubmissionReceiptProps> = {}) {
  return (
    <EmailLayout
      preview={`Recorded as ${reference}. Not an acceptance.`}
      heading={`Thank you, ${authorName}.`}
      intro='Your submission has reached the editorial desk. This message confirms it was recorded - it is not an acceptance, and no reviewer has been assigned yet.'
      closing='If you need to reach the desk about this submission, reply to this message and quote the reference above.'
    >
      <FieldTable
        fields={[
      { label: 'Reference', value: reference, monospace: true },
      { label: 'Title', value: title, monospace: false },
      { label: 'Category', value: category, monospace: false },
      { label: 'Code / data', value: dataUrl, monospace: true },
      { label: 'Reviewed artifact', value: artifact, monospace: true },
        ]}
      />
      {(abstract as string).trim() !== '' ? (
        <>
          <Text style={{ fontSize: '13px', lineHeight: 1.6, margin: '24px 0 8px', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Abstract as recorded
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: 1.7, margin: 0, color: '#44403c' }}>
            {abstract as string}
          </Text>
        </>
      ) : null}
    </EmailLayout>
  );
}

export default SubmissionReceipt;
