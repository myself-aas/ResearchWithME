import * as React from 'react';
import { Text } from '@react-email/components';
import {
  EmailLayout,
  FieldTable,
  StatusPill,
} from './_layout';

/**
 * The `decision-notification` message.
 *
 * Props are optional and defaulted so the component is total: the React Email
 * CLI renders the default export with no props, and Resend renders a template
 * whose variable an editor may have removed. A missing field must render as an
 * omitted row, never as an exception.
 */
export interface DecisionNotificationProps {
  /** Resend template variable `REFERENCE`. */
  reference?: string;
  /** Resend template variable `TITLE`. */
  title?: string;
  /** Resend template variable `DECISION`. */
  decision?: string;
  /** Resend template variable `DECISION_NOTE`. */
  decisionNote?: string;
  /** Resend template variable `EDITOR_NAME`. */
  editorName?: string;
  /** Resend template variable `DECIDED_AT`. */
  decidedAt?: string;
}

export function DecisionNotification({
  reference = '',
  title = '',
  decision = '',
  decisionNote = '',
  editorName = '',
  decidedAt = '',
}: Partial<DecisionNotificationProps> = {}) {
  return (
    <EmailLayout
      preview={`Decision on ${reference}: ${decision}.`}
      heading={'A decision has been made on your submission'}
      intro='The editorial desk has reached a decision. The reasoning is below.'
      closing='Reply to this message and quote the reference to discuss the decision with the desk.'
    >
      {(decision as string).trim() !== '' ? (
        <StatusPill label={decision as string} tone="positive" />
      ) : null}
      <FieldTable
        fields={[
      { label: 'Reference', value: reference, monospace: true },
      { label: 'Title', value: title, monospace: false },
      { label: 'Editor', value: editorName, monospace: false },
      { label: 'Decided', value: decidedAt, monospace: false },
        ]}
      />
      {(decisionNote as string).trim() !== '' ? (
        <>
          <Text style={{ fontSize: '13px', lineHeight: 1.6, margin: '24px 0 8px', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Reasoning
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: 1.7, margin: 0, color: '#44403c' }}>
            {decisionNote as string}
          </Text>
        </>
      ) : null}
    </EmailLayout>
  );
}

export default DecisionNotification;
