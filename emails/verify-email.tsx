import * as React from 'react';
import {
  ActionLink,
  EmailLayout,
  FieldTable,
} from './_layout';

/**
 * The `verify-email` message.
 *
 * Props are optional and defaulted so the component is total: the React Email
 * CLI renders the default export with no props, and Resend renders a template
 * whose variable an editor may have removed. A missing field must render as an
 * omitted row, never as an exception.
 */
export interface VerifyEmailProps {
  /** Resend template variable `DISPLAY_NAME`. */
  displayName?: string;
  /** Resend template variable `VERIFY_URL`. */
  verifyUrl?: string;
  /** Resend template variable `EXPIRES_IN`. */
  expiresIn?: string;
}

export function VerifyEmail({
  displayName = '',
  verifyUrl = '',
  expiresIn = '',
}: Partial<VerifyEmailProps> = {}) {
  return (
    <EmailLayout
      preview={'Confirm your email address to finish setting up.'}
      heading={displayName.trim() !== '' ? `Confirm your email, ${displayName}` : 'Confirm your email address'}
      intro='Confirm the address below to finish setting up your ResearchWithMe account. Until it is confirmed you cannot publish on the platform or be listed as an author.'
      closing='If you did not create this account, you can ignore this message and no account will be created.'
    >
      <FieldTable
        fields={[
      { label: 'Expires in', value: expiresIn, monospace: false },
        ]}
      />
      <ActionLink href={verifyUrl as string} label="Confirm email address" />
    </EmailLayout>
  );
}

export default VerifyEmail;
