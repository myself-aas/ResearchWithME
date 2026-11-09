import * as React from 'react';
import { Text } from '@react-email/components';
import {
  ActionLink,
  EmailLayout,
  FieldTable,
} from './_layout';

/**
 * The `support-reply` message.
 *
 * Props are optional and defaulted so the component is total: the React Email
 * CLI renders the default export with no props, and Resend renders a template
 * whose variable an editor may have removed. A missing field must render as an
 * omitted row, never as an exception.
 */
export interface SupportReplyProps {
  /** Resend template variable `TICKET_ID`. */
  ticketId?: string;
  /** Resend template variable `SUBJECT`. */
  subject?: string;
  /** Resend template variable `REPLY_BODY`. */
  replyBody?: string;
  /** Resend template variable `AGENT_NAME`. */
  agentName?: string;
  /** Resend template variable `TICKET_URL`. */
  ticketUrl?: string;
}

export function SupportReply({
  ticketId = '',
  subject = '',
  replyBody = '',
  agentName = '',
  ticketUrl = '',
}: Partial<SupportReplyProps> = {}) {
  return (
    <EmailLayout
      preview={`A reply to ${ticketId}.`}
      heading={'We replied to your request'}
      intro='Someone from the ResearchWithMe support team has answered your request.'
      closing='Reply to this message to keep the conversation in the same ticket.'
    >
      <FieldTable
        fields={[
      { label: 'Ticket', value: ticketId, monospace: true },
      { label: 'Subject', value: subject, monospace: false },
      { label: 'From', value: agentName, monospace: false },
        ]}
      />
      {(replyBody as string).trim() !== '' ? (
        <>
          <Text style={{ fontSize: '13px', lineHeight: 1.6, margin: '24px 0 8px', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Reply
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: 1.7, margin: 0, color: '#44403c' }}>
            {replyBody as string}
          </Text>
        </>
      ) : null}
      <ActionLink href={ticketUrl as string} label="Open the full conversation" />
    </EmailLayout>
  );
}

export default SupportReply;
