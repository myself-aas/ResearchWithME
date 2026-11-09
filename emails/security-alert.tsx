import * as React from 'react';
import {
  ActionLink,
  EmailLayout,
  FieldTable,
} from './_layout';

/**
 * The `security-alert` message.
 *
 * Props are optional and defaulted so the component is total: the React Email
 * CLI renders the default export with no props, and Resend renders a template
 * whose variable an editor may have removed. A missing field must render as an
 * omitted row, never as an exception.
 */
export interface SecurityAlertProps {
  /** Resend template variable `DISPLAY_NAME`. */
  displayName?: string;
  /** Resend template variable `EVENT_TYPE`. */
  eventType?: string;
  /** Resend template variable `EVENT_TIME`. */
  eventTime?: string;
  /** Resend template variable `EVENT_LOCATION`. */
  eventLocation?: string;
  /** Resend template variable `ACTION_URL`. */
  actionUrl?: string;
}

export function SecurityAlert({
  displayName = '',
  eventType = '',
  eventTime = '',
  eventLocation = '',
  actionUrl = '',
}: Partial<SecurityAlertProps> = {}) {
  return (
    <EmailLayout
      preview={`${eventType} on your ResearchWithMe account.`}
      heading={displayName.trim() !== '' ? `Security alert, ${displayName}` : 'Security alert'}
      intro='Something changed on your ResearchWithMe account. We are telling you so you can confirm it was you.'
      closing='If this was not you, change your password and review your connected sign-in methods.'
    >
      <FieldTable
        fields={[
      { label: 'What happened', value: eventType, monospace: false },
      { label: 'When', value: eventTime, monospace: false },
      { label: 'From', value: eventLocation, monospace: false },
        ]}
      />
      <ActionLink href={actionUrl as string} label="Review account activity" />
    </EmailLayout>
  );
}

export default SecurityAlert;
