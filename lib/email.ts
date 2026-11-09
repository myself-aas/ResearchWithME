import { Resend } from 'resend';

/**
 * Outbound email through Resend.
 *
 * Three rules shape this module:
 *
 * 1. Sending is always best-effort. Every caller uses it *after* its primary
 *    action has already succeeded, so an email failure is logged and reported
 *    back — never turned into a failed request. That matches the degrade-rather-
 *    than-break contract the rest of the public read path follows.
 *
 * 2. Nothing is sent unless a real sender is configured. `onboarding@resend.dev`
 *    is a Resend test address; silently falling back to it in production would
 *    mean mail leaves the app from an address the project does not own.
 *
 * 3. Two body shapes, never both. Resend's own types make `template` mutually
 *    exclusive with `react`/`html`/`text`, so the union below mirrors that
 *    rather than letting a caller pass both and discover it at the API.
 */

/** Verified sending address, e.g. `ResearchWithMe <editorial@researchwith.me>`. */
export const EMAIL_FROM = (process.env.EMAIL_FROM ?? '').trim();

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim()) && Boolean(EMAIL_FROM);
}

interface SendEmailBase {
  to: string;
  /**
   * Always supplied by the caller, never left to the template. A Resend
   * template may define its own subject, but a caller that has a tracking ID to
   * guarantee should not depend on someone wiring that variable correctly in a
   * visual editor.
   */
  subject: string;
  /**
   * `<event-type>/<entity-id>`, max 256 characters. Lets a retry not duplicate
   * the message.
   */
  idempotencyKey: string;
  tags?: Array<{ name: string; value: string }>;
}

export type SendEmailInput =
  /** Body rendered here and handed to Resend as HTML. */
  | (SendEmailBase & {
      template?: undefined;
      html: string;
      text?: string;
    })
  /**
   * Body rendered by Resend from an uploaded template.
   *
   * This shape cannot carry `text` -- Resend's template variant sets
   * `text?: never` -- but that is not the same as losing the plain-text part:
   * a Template holds a `text` body of its own (`Template.text`), so the
   * multipart alternative survives as long as the uploaded template has one.
   * `scripts/upload-email-template.ts` sets it from the same component render.
   */
  | (SendEmailBase & {
      template: {
        id: string;
        /** Resend template variables: flat string or number values only. */
        variables: Record<string, string | number>;
      };
      html?: undefined;
      text?: undefined;
    });

export type SendEmailResult =
  | { ok: true; id: string }
  /** Not an error: email is not switched on in this environment. */
  | { ok: false; skipped: true; reason: string }
  /** A genuine send failure. */
  | { ok: false; skipped: false; error: string };

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getClient();
  if (!resend) {
    return { ok: false, skipped: true, reason: 'RESEND_API_KEY is not set.' };
  }
  if (!EMAIL_FROM) {
    return { ok: false, skipped: true, reason: 'EMAIL_FROM is not set.' };
  }

  const body = input.template
    ? { template: { id: input.template.id, variables: input.template.variables } }
    : {
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      };

  // The SDK resolves with { data, error } rather than throwing, so the result is
  // destructured and inspected. The try/catch is only for transport-level
  // failures -- a DNS or TLS error must not take the caller's request down.
  try {
    const { data, error } = await resend.emails.send(
      {
        from: EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        ...(input.tags ? { tags: input.tags } : {}),
        ...body,
      },
      // idempotencyKey is a REQUEST option, sent as the Idempotency-Key header.
      // It is not a field of the payload: resend@6 rejects it there with
      // TS2353 ("Object literal may only specify known properties").
      { idempotencyKey: input.idempotencyKey.slice(0, 256) },
    );

    if (error) return { ok: false, skipped: false, error: error.message };
    return { ok: true, id: data?.id ?? '' };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : 'Email transport failed.',
    };
  }
}
