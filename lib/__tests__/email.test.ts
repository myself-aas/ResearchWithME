import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `EMAIL_FROM` and the Resend client are both captured at module load, so each
 * case re-imports the module under a fresh env.
 */
async function loadEmailModule() {
  vi.resetModules();
  return import('@/lib/email');
}

const { sendMock, ResendMock } = vi.hoisted(() => {
  const send = vi.fn();
  return {
    sendMock: send,
    ResendMock: vi.fn().mockImplementation(() => ({ emails: { send } })),
  };
});

vi.mock('resend', () => ({ Resend: ResendMock }));

const input = {
  to: 'amara@example.org',
  subject: '[RWM-2026-7QXTR3] We received your submission',
  html: '<p>Recorded.</p>',
  text: 'Recorded.',
  idempotencyKey: 'submission-receipt/RWM-2026-7QXTR3',
};

beforeEach(() => {
  sendMock.mockReset();
  // ResendMock accumulates across cases otherwise, which makes the
  // client-reuse assertion count every send in the file.
  ResendMock.mockClear();
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});

describe('sendEmail gating', () => {
  it('skips rather than sending when no API key is configured', async () => {
    process.env.EMAIL_FROM = 'editorial@researchwith.me';
    const { sendEmail } = await loadEmailModule();

    const result = await sendEmail(input);

    expect(result).toEqual({
      ok: false,
      skipped: true,
      reason: 'RESEND_API_KEY is not set.',
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('skips rather than sending when no from address is configured', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const { sendEmail } = await loadEmailModule();

    const result = await sendEmail(input);

    expect(result).toEqual({
      ok: false,
      skipped: true,
      reason: 'EMAIL_FROM is not set.',
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('never falls back to the Resend onboarding sandbox address', async () => {
    // A receipt arriving from onboarding@resend.dev would be indistinguishable
    // from phishing. Unconfigured must mean silent, not spoofed.
    process.env.RESEND_API_KEY = 're_test';
    const { sendEmail } = await loadEmailModule();
    await sendEmail(input);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('treats whitespace-only configuration as unconfigured', async () => {
    process.env.RESEND_API_KEY = '   ';
    process.env.EMAIL_FROM = '   ';
    const { sendEmail, isEmailConfigured } = await loadEmailModule();

    expect(isEmailConfigured()).toBe(false);
    expect((await sendEmail(input)).ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('sendEmail when configured', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'ResearchWithMe <editorial@researchwith.me>';
  });

  it('sends with the configured from address and reports the message id', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const { sendEmail } = await loadEmailModule();

    await expect(sendEmail(input)).resolves.toEqual({ ok: true, id: 'msg_1' });

    const [payload] = sendMock.mock.calls[0];
    expect(payload.from).toBe('ResearchWithMe <editorial@researchwith.me>');
    expect(payload.to).toEqual([input.to]);
    expect(payload.html).toBe(input.html);
    expect(payload.text).toBe(input.text);
  });

  it('passes idempotencyKey as a request option, not a payload field', async () => {
    // resend@6 types it on CreateEmailRequestOptions (the Idempotency-Key
    // header). In the payload it is a TS2353 excess-property error, so the
    // pasted SDK doc example does not compile against 6.x.
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const { sendEmail } = await loadEmailModule();

    await sendEmail(input);

    const [payload, options] = sendMock.mock.calls[0];
    expect(payload).not.toHaveProperty('idempotencyKey');
    expect(options).toEqual({ idempotencyKey: input.idempotencyKey });
  });

  it('truncates an over-long idempotency key instead of letting the API reject it', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const { sendEmail } = await loadEmailModule();

    await sendEmail({ ...input, idempotencyKey: 'k'.repeat(400) });

    const [, options] = sendMock.mock.calls[0];
    expect(options.idempotencyKey).toHaveLength(256);
  });

  it('returns the SDK error rather than throwing', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'from must be verified' },
    });
    const { sendEmail } = await loadEmailModule();

    await expect(sendEmail(input)).resolves.toEqual({
      ok: false,
      skipped: false,
      error: 'from must be verified',
    });
  });

  it('survives a transport failure so the caller request is unaffected', async () => {
    // The route handler calls this after the submission is already stored. A DNS
    // or TLS failure must come back as a value, never as a thrown exception.
    sendMock.mockRejectedValue(new Error('fetch failed'));
    const { sendEmail } = await loadEmailModule();

    await expect(sendEmail(input)).resolves.toEqual({
      ok: false,
      skipped: false,
      error: 'fetch failed',
    });
  });

  it('reports skipped=false for a real failure so callers can tell it from unconfigured', async () => {
    sendMock.mockRejectedValue(new Error('fetch failed'));
    const { sendEmail } = await loadEmailModule();

    const result = await sendEmail(input);
    if (result.ok || result.skipped) throw new Error('expected a hard failure');
    expect(result.skipped).toBe(false);
  });

  it('sends a Resend template with variables instead of a body', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_2' }, error: null });
    const { sendEmail } = await loadEmailModule();

    await expect(
      sendEmail({
        to: input.to,
        subject: input.subject,
        template: {
          id: 'tmpl_receipt',
          variables: { reference: 'RWM-2026-7QXTR3', authorName: 'Amara' },
        },
        idempotencyKey: input.idempotencyKey,
      }),
    ).resolves.toEqual({ ok: true, id: 'msg_2' });

    const [payload] = sendMock.mock.calls[0];
    expect(payload.template).toEqual({
      id: 'tmpl_receipt',
      variables: { reference: 'RWM-2026-7QXTR3', authorName: 'Amara' },
    });
    // Resend's template variant is mutually exclusive with html/text, so the
    // payload must not carry a body alongside it.
    expect(payload).not.toHaveProperty('html');
    expect(payload).not.toHaveProperty('text');
  });

  it('still sends the caller subject with a template, so the reference survives', async () => {
    // A Resend template can define its own subject. Overriding it at send time
    // means the tracking ID is present even if an editor drops that variable
    // while editing the template visually.
    sendMock.mockResolvedValue({ data: { id: 'msg_3' }, error: null });
    const { sendEmail } = await loadEmailModule();

    await sendEmail({
      to: input.to,
      subject: '[RWM-2026-7QXTR3] We received your submission',
      template: { id: 'tmpl_receipt', variables: {} },
      idempotencyKey: input.idempotencyKey,
    });

    const [payload] = sendMock.mock.calls[0];
    expect(payload.subject).toBe('[RWM-2026-7QXTR3] We received your submission');
    expect(payload.from).toBe('ResearchWithMe <editorial@researchwith.me>');
  });

  it('reuses one Resend client across sends', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const { sendEmail } = await loadEmailModule();

    await sendEmail(input);
    await sendEmail(input);

    expect(ResendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});
