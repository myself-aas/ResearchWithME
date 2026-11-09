import * as React from 'react';
import {
  ActionLink,
  EmailLayout,
  FieldTable,
} from './_layout';

/**
 * The `welcome` message.
 *
 * Props are optional and defaulted so the component is total: the React Email
 * CLI renders the default export with no props, and Resend renders a template
 * whose variable an editor may have removed. A missing field must render as an
 * omitted row, never as an exception.
 */
export interface WelcomeProps {
  /** Resend template variable `DISPLAY_NAME`. */
  displayName?: string;
  /** Resend template variable `DASHBOARD_URL`. */
  dashboardUrl?: string;
  /** Resend template variable `NEXT_STEP`. */
  nextStep?: string;
}

export function Welcome({
  displayName = '',
  dashboardUrl = '',
  nextStep = '',
}: Partial<WelcomeProps> = {}) {
  return (
    <EmailLayout
      preview={'Your ResearchWithMe account is ready.'}
      heading={`Welcome, ${displayName}.`}
      intro='Your ResearchWithMe account is ready. You can save reading lists, submit work for editorial review, and track what the desk has received.'
      closing='Nothing is public until you publish it yourself.'
    >
      <FieldTable
        fields={[
      { label: 'Next step', value: nextStep, monospace: false },
        ]}
      />
      <ActionLink href={dashboardUrl as string} label="Open your dashboard" />
    </EmailLayout>
  );
}

export default Welcome;
