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
 * Shared chrome for every transactional email.
 *
 * Colours are the DESIGN.md tokens rather than ad-hoc values, so the mail looks
 * like the site. Status colour is never the only signal: DESIGN.md requires it
 * to be paired with a text label, which is why `StatusPill` always renders its
 * label.
 *
 * Structure is deliberately plain-text friendly. The text part is derived from
 * this HTML by `@react-email/render`'s `toPlainText`, which uppercases `h1` and
 * gives adjacent table cells no separator -- both are overridden in
 * `lib/email/render.ts`, so block-level elements here stay block-level.
 */

export const palette = {
  primary: '#78350f',
  accent: '#047857',
  danger: '#991b1b',
  page: '#fafaf9',
  surface: '#ffffff',
  surfaceSubtle: '#f5f5f4',
  border: '#e7e5e4',
  ink: '#1c1917',
  inkMuted: '#57534e',
  inkFaint: '#78716c',
} as const;

const serif = "Georgia,'Times New Roman',serif";
const mono = 'ui-monospace,SFMono-Regular,Menlo,monospace';

export interface EmailLayoutProps {
  /** Inbox-list snippet. Factual only -- no marketing line, no false promise. */
  preview: string;
  /** Heading shown at the top of the body. */
  heading: string;
  /** Introductory paragraph under the heading. */
  intro?: string;
  children?: React.ReactNode;
  /**
   * Closing note above the footer, e.g. how to reply. Optional because a
   * security alert should not invite a reply to the address that sent it.
   */
  closing?: string;
  /**
   * The reply-to address, surfaced in the footer so a reader who cannot use
   * Reply-To still knows where to write.
   */
  replyTo?: string;
}

export function EmailLayout({
  preview,
  heading,
  intro,
  children,
  closing,
  replyTo,
}: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: palette.page }}>
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '32px 20px',
            fontFamily: serif,
            color: palette.ink,
          }}
        >
          <Text
            style={{
              fontSize: '13px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: palette.inkFaint,
              margin: '0 0 20px',
            }}
          >
            ResearchWithMe
          </Text>

          <Heading
            as="h1"
            style={{
              fontSize: '24px',
              lineHeight: 1.3,
              margin: '0 0 16px',
              fontWeight: 700,
            }}
          >
            {heading}
          </Heading>

          {intro ? (
            <Text style={{ fontSize: '16px', lineHeight: 1.6, margin: '0 0 24px' }}>
              {intro}
            </Text>
          ) : null}

          {children}

          {closing ? (
            <Text
              style={{
                fontSize: '14px',
                lineHeight: 1.6,
                margin: '24px 0 0',
                color: palette.inkMuted,
              }}
            >
              {closing}
            </Text>
          ) : null}

          <Hr
            style={{
              border: 'none',
              borderTop: `1px solid ${palette.border}`,
              margin: '28px 0 16px',
            }}
          />

          <Text
            style={{
              fontSize: '12px',
              lineHeight: 1.6,
              margin: 0,
              color: palette.inkFaint,
            }}
          >
            ResearchWithMe &mdash; researchwith.me
            {replyTo ? ` \u00b7 Reply to ${replyTo}` : ''}
          </Text>
          <Text
            style={{
              fontSize: '12px',
              lineHeight: 1.6,
              margin: '6px 0 0',
              color: palette.inkFaint,
            }}
          >
            This is a transactional message about your account or activity on the
            platform. It is not a newsletter, and there is nothing to unsubscribe from.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * A label/value row. Empty values are hidden by the caller, not here, because
 * only the caller knows which fields are optional.
 */
export function FieldRow({
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
  const border = last ? undefined : `1px solid ${palette.border}`;
  return (
    <Section>
      <tr>
        <td
          style={{
            padding: '10px 14px',
            fontSize: '13px',
            color: palette.inkFaint,
            width: '140px',
            verticalAlign: 'top',
            borderBottom: border,
          }}
        >
          {label}
        </td>
        <td
          style={{
            padding: '10px 14px',
            fontSize: '14px',
            color: palette.ink,
            verticalAlign: 'top',
            fontFamily: monospace ? mono : undefined,
            wordBreak: monospace ? 'break-all' : undefined,
            borderBottom: border,
          }}
        >
          {value}
        </td>
      </tr>
    </Section>
  );
}

/** Wraps `FieldRow`s in the shared card chrome, hiding empty rows. */
export function FieldTable({
  fields,
}: {
  fields: Array<{ label: string; value: string; monospace?: boolean }>;
}) {
  const visible = fields.filter((field) => field.value.trim() !== '');
  if (visible.length === 0) return null;

  return (
    <Section
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
      }}
    >
      {visible.map((field, index) => (
        <FieldRow
          key={field.label}
          label={field.label}
          value={field.value}
          monospace={field.monospace}
          last={index === visible.length - 1}
        />
      ))}
    </Section>
  );
}

/**
 * A status shown as a coloured label. The colour is never the only signal --
 * the text label always renders alongside it.
 */
export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'positive' | 'danger';
}) {
  const color =
    tone === 'positive'
      ? palette.accent
      : tone === 'danger'
        ? palette.danger
        : palette.inkMuted;

  return (
    <Section
      style={{
        display: 'inline-block',
        padding: '6px 12px',
        marginBottom: '20px',
        borderRadius: '3px',
        backgroundColor: palette.surfaceSubtle,
        border: `1px solid ${palette.border}`,
      }}
    >
      <Text
        style={{
          margin: 0,
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color,
        }}
      >
        {label}
      </Text>
    </Section>
  );
}

/**
 * A call to action. Rendered as a link rather than a button image, so it
 * survives clients that strip images and reads correctly in the text part.
 */
export function ActionLink({
  href,
  label,
  caption,
}: {
  href: string;
  label: string;
  caption?: string;
}) {
  if (!href.trim()) return null;

  return (
    <Section style={{ margin: '24px 0 0' }}>
      <Text style={{ margin: '0 0 10px', fontSize: '15px' }}>
        <a
          href={href}
          style={{
            color: palette.primary,
            textDecoration: 'underline',
            fontWeight: 600,
          }}
        >
          {label}
        </a>
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: '12px',
          color: palette.inkFaint,
          fontFamily: mono,
          wordBreak: 'break-all',
        }}
      >
        {caption ?? href}
      </Text>
    </Section>
  );
}
