import * as React from 'react';
import {
  ActionLink,
  EmailLayout,
  FieldTable,
} from './_layout';

/**
 * The `password-reset` message.
 *
 * Props are optional and defaulted so the component is total: the React Email
 * CLI renders the default export with no props, and Resend renders a template
 * whose variable an editor may have removed. A missing field must render as an
 * omitted row, never as an exception.
 */
export interface PasswordResetProps {
  /** Resend template variable `DISPLAY_NAME`. */
  displayName?: string;
  /** Resend template variable `RESET_URL`. */
  resetUrl?: string;
  /** Resend template variable `EXPIRES_IN`. */
  expiresIn?: string;
  /** Resend template variable `REQUESTED_FROM`. */
  requestedFrom?: string;
}

export function PasswordReset({
  displayName = '',
  resetUrl = '',
  expiresIn = '',
  requestedFrom = '',
}: Partial<PasswordResetProps> = {}) {
  return (
    <EmailLayout
      preview={'A password reset was requested for your account.'}
      heading={displayName.trim() !== '' ? `Reset your password, ${displayName}` : 'Reset your password'}
      intro='We received a request to reset the password on your ResearchWithMe account. The link below works once and then expires.'
      closing='If you did not request this, your password has not changed and you should tell us at support@researchwith.me.'
    >
      <FieldTable
        fields={[
      { label: 'Expires in', value: expiresIn, monospace: false },
      { label: 'Requested from', value: requestedFrom, monospace: false },
        ]}
      />
      <ActionLink href={resetUrl as string} label="Choose a new password" />
    </EmailLayout>
  );
}

export default PasswordReset;
