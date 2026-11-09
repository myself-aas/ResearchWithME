import * as React from 'react';
import { Text } from '@react-email/components';
import {
  EmailLayout,
  FieldTable,
  StatusPill,
} from './_layout';

/**
 * The `review-status-update` message.
 *
 * Props are optional and defaulted so the component is total: the React Email
 * CLI renders the default export with no props, and Resend renders a template
 * whose variable an editor may have removed. A missing field must render as an
 * omitted row, never as an exception.
 */
export interface ReviewStatusUpdateProps {
  /** Resend template variable `REFERENCE`. */
  reference?: string;
  /** Resend template variable `TITLE`. */
  title?: string;
  /** Resend template variable `STATUS`. */
  status?: string;
  /** Resend template variable `REVIEWER_NAME`. */
  reviewerName?: string;
  /** Resend template variable `NOTE`. */
  note?: string;
  /** Resend template variable `UPDATED_AT`. */
  updatedAt?: string;
}

export function ReviewStatusUpdate({
  reference = '',
  title = '',
  status = '',
  reviewerName = '',
  note = '',
  updatedAt = '',
}: Partial<ReviewStatusUpdateProps> = {}) {
  return (
    <EmailLayout
      preview={`${title} is now ${status}.`}
      heading={'Your submission moved to a new stage'}
      intro='The editorial desk has updated the status of your submission. This is a progress note, not a decision.'
      closing='Reply to this message and quote the reference if you need to reach the desk about it.'
    >
      {(status as string).trim() !== '' ? (
        <StatusPill label={status as string} />
      ) : null}
      <FieldTable
        fields={[
      { label: 'Reference', value: reference, monospace: true },
      { label: 'Title', value: title, monospace: false },
      { label: 'Status', value: status, monospace: false },
      { label: 'Reviewer', value: reviewerName, monospace: false },
      { label: 'Updated', value: updatedAt, monospace: false },
        ]}
      />
      {(note as string).trim() !== '' ? (
        <>
          <Text style={{ fontSize: '13px', lineHeight: 1.6, margin: '24px 0 8px', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Note from the desk
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: 1.7, margin: 0, color: '#44403c' }}>
            {note as string}
          </Text>
        </>
      ) : null}
    </EmailLayout>
  );
}

export default ReviewStatusUpdate;
