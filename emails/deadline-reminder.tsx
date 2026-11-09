import * as React from 'react';
import {
  ActionLink,
  EmailLayout,
  FieldTable,
} from './_layout';

/**
 * The `deadline-reminder` message.
 *
 * Props are optional and defaulted so the component is total: the React Email
 * CLI renders the default export with no props, and Resend renders a template
 * whose variable an editor may have removed. A missing field must render as an
 * omitted row, never as an exception.
 */
export interface DeadlineReminderProps {
  /** Resend template variable `REFERENCE`. */
  reference?: string;
  /** Resend template variable `TITLE`. */
  title?: string;
  /** Resend template variable `DEADLINE`. */
  deadline?: string;
  /** Resend template variable `DAYS_REMAINING`. */
  daysRemaining?: number;
  /** Resend template variable `ACTION_URL`. */
  actionUrl?: string;
}

export function DeadlineReminder({
  reference = '',
  title = '',
  deadline = '',
  daysRemaining = 0,
  actionUrl = '',
}: Partial<DeadlineReminderProps> = {}) {

  const daysRemainingText = String(daysRemaining);
  return (
    <EmailLayout
      preview={`${title}: review due ${deadline}.`}
      heading={'A review deadline is approaching'}
      intro='You have an open review task on the submission below. Nothing has been decided against you; this is only a reminder.'
      closing='If you cannot complete the review, tell the desk early and it will be reassigned.'
    >
      <FieldTable
        fields={[
      { label: 'Reference', value: reference, monospace: true },
      { label: 'Title', value: title, monospace: false },
      { label: 'Deadline', value: deadline, monospace: false },
      { label: 'Days remaining', value: daysRemainingText, monospace: true },
        ]}
      />
      <ActionLink href={actionUrl as string} label="Open your review tasks" />
    </EmailLayout>
  );
}

export default DeadlineReminder;
