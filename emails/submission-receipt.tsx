import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

/**
 * The submission acknowledgement, as a React Email template.
 *
 * Two audiences, one source:
 *
 * - The app renders it locally through @react-email/render when no Resend
 *   template is configured, so nothing depends on a third-party asset existing.
 * - `npx email` previews it, and `npx email resend setup` uploads it to Resend
 *   Templates, where non-technical editors can adjust the wording and design.
 *
 * The uploaded template is a *derived* artifact. This file stays the source of
 * truth in version control; edit here, re-upload, never the other way round.
 *
 * Every prop is a flat string because Resend template variables are
 * `Record<string, string | number>` -- no nested objects, no arrays. That is
 * also why optional fields are empty strings rather than omitted: the template
 * editor substitutes variables textually and cannot express "field absent".
 */
export interface SubmissionReceiptProps {
  /** Tracking ID, e.g. RWM-2026-7QXTR3. */
  reference: string;
  authorName: string;
  title: string;
  category: string;
  /** Empty string when the submitter left it blank. */
  dataUrl: string;
  /** Empty string when the submitter left it blank. */
  artifact: string;
  abstract: string;
}

const ink = '#1c1917';
const muted = '#78716c';
const soft = '#57534e';
const rule = '#e7e5e4';
const page = '#f5f5f4';

function DetailRow({
  label,
  value,
  last,
  monospace,
}: {
  label: string;
  value: string;
  last?: boolean;
  monospace?: boolean;
}) {
  return (
    <Section>
      <tr>
        <td
          style={{
            padding: '10px 14px',
            fontSize: '13px',
            color: muted,
            width: '130px',
            verticalAlign: 'top',
            borderBottom: last ? undefined : `1px solid ${rule}`,
          }}
        >
          {label}
        </td>
        <td
          style={{
            padding: '10px 14px',
            fontSize: '14px',
            color: ink,
            verticalAlign: 'top',
            fontFamily: monospace
              ? 'ui-monospace,SFMono-Regular,Menlo,monospace'
              : undefined,
            wordBreak: monospace ? 'break-all' : undefined,
            borderBottom: last ? undefined : `1px solid ${rule}`,
          }}
        >
          {value}
        </td>
      </tr>
    </Section>
  );
}

// Every prop defaults to an empty string, so the component is total over
// `Partial<SubmissionReceiptProps>`. Not just for the CLI, which renders the
// default export with no props: Resend substitutes template variables
// textually, so a variable an editor removes in the visual editor arrives
// missing, and a template that throws on a missing field takes the send down
// with it. An absent field should render as an omitted row, not an exception.
//
// `SubmissionReceiptProps` itself stays fully required -- that is the contract
// the variable bag satisfies -- and only the component's own parameter is
// partial, so a caller in the app still has to supply every field.
export function SubmissionReceipt({
  reference = '',
  authorName = '',
  title = '',
  category = '',
  dataUrl = '',
  artifact = '',
  abstract = '',
}: Partial<SubmissionReceiptProps> = {}) {
  // Optional rows are dropped rather than rendered with an empty value, which
  // reads to a recipient like a field that failed to save.
  const rows = [
    { label: 'Reference', value: reference, monospace: true },
    { label: 'Title', value: title },
    { label: 'Category', value: category },
    { label: 'Code / data', value: dataUrl, monospace: true },
    { label: 'Reviewed artifact', value: artifact, monospace: true },
  ].filter((row) => row.value.trim() !== '');

  const previewText = `Recorded as ${reference}. Not an acceptance.`;

  return (
    <Html lang="en">
      <Head>
        <title>{`We received your submission ${reference}`}</title>
      </Head>
      {/* Inbox-list snippet. Kept factual: no marketing line, no false promise. */}
      <Preview>{previewText}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: page }}>
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '32px 20px',
            fontFamily: "Georgia,'Times New Roman',serif",
            color: ink,
          }}
        >
          <Text
            style={{
              fontSize: '13px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: muted,
              margin: '0 0 20px',
            }}
          >
            ResearchWithMe
          </Text>

          <Heading
            as="h1"
            style={{ fontSize: '24px', lineHeight: 1.3, margin: '0 0 16px' }}
          >
            Thank you, {authorName}.
          </Heading>

          <Text style={{ fontSize: '16px', lineHeight: 1.6, margin: '0 0 24px' }}>
            Your submission has reached the editorial desk. This message confirms
            it was recorded &mdash; it is not an acceptance, and no reviewer has
            been assigned yet.
          </Text>

          <Section
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: '#ffffff',
              border: `1px solid ${rule}`,
            }}
          >
            {rows.map((row, index) => (
              <DetailRow
                key={row.label}
                label={row.label}
                value={row.value}
                monospace={row.monospace}
                last={index === rows.length - 1}
              />
            ))}
          </Section>

          <Text
            style={{
              fontSize: '13px',
              lineHeight: 1.6,
              margin: '24px 0 8px',
              color: muted,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Abstract as recorded
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: 1.7, margin: '0 0 24px', color: soft }}>
            {abstract}
          </Text>

          <Hr style={{ border: 'none', borderTop: `1px solid ${rule}`, margin: '0 0 20px' }} />

          <Text style={{ fontSize: '14px', lineHeight: 1.6, margin: 0, color: soft }}>
            If you need to reach the desk about this submission, reply to this
            message and quote the reference above.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Sample values for `npx email` preview and for the Resend upload. Deliberately
 * ordinary rather than "Lorem ipsum": an editor adjusting this template should
 * be looking at something shaped like a real submission, including a long title
 * and a real URL, because those are what break layout.
 */
export const SubmissionReceiptSample: SubmissionReceiptProps = {
  reference: 'RWM-2026-7QXTR3',
  authorName: 'Dr. Amara Okonkwo',
  title: 'Attention allocation in low-resource clinical triage',
  category: 'Clinical informatics',
  dataUrl: 'https://example.org/datasets/triage-attention-2026',
  artifact: 'Field notes',
  abstract:
    'A field study of triage decision aids deployed across four district hospitals, measuring the effect of structured prompts on time-to-assessment and on the rate of missed deterioration signals during night shifts.',
};

export default SubmissionReceipt;
