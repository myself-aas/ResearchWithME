import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIMITS, getScenario } from '@/lib/email/scenarios';

/**
 * `RESEND_API_KEY` and the Resend client are captured at module load, so each
 * case re-imports the module under a fresh environment.
 */
async function loadSendModule() {
  vi.resetModules();
  return import('@/lib/email/send');
}

const { sendMock, ResendMock } = vi.hoisted(() => {
  const send = vi.fn();
  return {
    sendMock: send,
    ResendMock: vi.fn().mockImplementation(() => ({ emails: { send } })),
  };
});

vi.mock('resend', () => ({ Resend: ResendMock }));

const KEY = 'RESEND_TPL_WELCOME';

function sampleInput(scenarioKey = 'welcome') {
  const scenario = getScenario(scenarioKey)!;
  return {
    to: 'amara@example.org',
    entityId: 'user_123',
    variables: scenario.sample,
  };
}

beforeEach(() => {
  sendMock.mockReset();
  ResendMock.mockClear();
  delete process.env.RESEND_API_KEY;
  delete process.env[KEY];
});

describe('sendScenario gating', () => {
  it('skips rather than sending when no API key is configured', async () => {
    const { sendScenario } = await loadSendModule();

    await expect(sendScenario('welcome', sampleInput())).resolves.toEqual({
      ok: false,
      skipped: true,
      reason: 'RESEND_API_KEY is not set.',
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('reports an unknown scenario without touching the network', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const { sendScenario } = await loadSendModule();

    const result = await sendScenario('not-a-scenario', sampleInput());

    expect(result.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('refuses to send to an empty recipient', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const { sendScenario } = await loadSendModule();

    const result = await sendScenario('welcome', {
      ...sampleInput(),
      to: '   ',
    });

    expect(result.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('refuses to send when a required variable is missing', async () => {
    // Failing here rather than at Resend means the caller gets every problem at
    // once, and no half-built message reaches a recipient.
    process.env.RESEND_API_KEY = 're_test';
    const { sendScenario } = await loadSendModule();

    const result = await sendScenario('welcome', {
      ...sampleInput(),
      variables: { ...sampleInput().variables, DASHBOARD_URL: '' },
    });

    expect(result).toMatchObject({ ok: false, skipped: false });
    if (!result.ok && !result.skipped) {
      expect(result.error).toContain('DASHBOARD_URL');
    }
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('sendScenario in template mode', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
    process.env[KEY] = 'tpl_01JTEST';
  });

  it('sends template and never html, text or react alongside it', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const { sendScenario } = await loadSendModule();

    await expect(
      sendScenario('welcome', sampleInput()),
    ).resolves.toEqual({ ok: true, id: 'msg_1', mode: 'template' });

    const [payload] = sendMock.mock.calls[0];
    expect(payload.template).toEqual({
      id: 'tpl_01JTEST',
      variables: sampleInput().variables,
    });
    // Mutually exclusive at the API: sending both is a validation error.
    expect(payload).not.toHaveProperty('html');
    expect(payload).not.toHaveProperty('text');
    expect(payload).not.toHaveProperty('react');
  });

  it('passes from, subject and replyTo explicitly on every send', async () => {
    // Payload values take precedence over template defaults, so the sender
    // identity cannot drift if someone edits the template in the dashboard.
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const { sendScenario } = await loadSendModule();
    const scenario = getScenario('welcome')!;

    await sendScenario('welcome', sampleInput());

    const [payload] = sendMock.mock.calls[0];
    expect(payload.from).toBe(scenario.from);
    expect(payload.from).toBe(
      'Research With Me <hello@researchwith.me>',
    );
    expect(payload.replyTo).toBe(scenario.replyTo);
    expect(payload.subject).toBe('Welcome to ResearchWithMe, Amara');
  });

  it('sets the idempotency key as a request option, not a payload field', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const { sendScenario } = await loadSendModule();

    await sendScenario('welcome', sampleInput());

    const [payload, options] = sendMock.mock.calls[0];
    expect(payload).not.toHaveProperty('idempotencyKey');
    expect(options).toEqual({
      idempotencyKey: 'welcome/user_123',
    });
    expect(options.idempotencyKey.length).toBeLessThanOrEqual(
      LIMITS.maxIdempotencyKeyLength,
    );
  });

  it('tags the message with the scenario category', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const { sendScenario } = await loadSendModule();

    await sendScenario('welcome', sampleInput());

    const [payload] = sendMock.mock.calls[0];
    expect(payload.tags).toEqual([
      { name: 'category', value: 'welcome' },
    ]);
  });

  it('fails clearly when template mode is forced but no id is configured', async () => {
    delete process.env[KEY];
    const { sendScenario } = await loadSendModule();

    const result = await sendScenario('welcome', sampleInput(), {
      mode: 'template',
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.skipped) {
      expect(result.error).toContain(KEY);
    }
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('sendScenario in local mode', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
  });

  it('renders the component and sends html plus text', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_2' }, error: null });
    const { sendScenario } = await loadSendModule();

    await expect(
      sendScenario('welcome', sampleInput()),
    ).resolves.toEqual({ ok: true, id: 'msg_2', mode: 'local' });

    const [payload] = sendMock.mock.calls[0];
    expect(payload).not.toHaveProperty('template');
    expect(payload.html).toContain('<!DOCTYPE');
    // Local mode is the only mode that can carry a plain-text part.
    expect(typeof payload.text).toBe('string');
    expect(payload.text.length).toBeGreaterThan(50);
  });

  it('is chosen automatically when no template id is configured', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_3' }, error: null });
    const { sendScenario } = await loadSendModule();

    const result = await sendScenario('welcome', sampleInput());

    expect(result).toEqual({ ok: true, id: 'msg_3', mode: 'local' });
  });

  it('escapes hostile variables in the rendered body', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_4' }, error: null });
    const { sendScenario } = await loadSendModule();
    const scenario = getScenario('welcome')!;

    await sendScenario('welcome', {
      ...sampleInput(),
      variables: { ...scenario.sample, NEXT_STEP: '<script>alert(1)</script>' },
    });

    const [payload] = sendMock.mock.calls[0];
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('&lt;script&gt;');
  });
});

describe('sendScenario failure handling', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
  });

  it('returns the SDK error rather than throwing', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'from must be verified' },
    });
    const { sendScenario } = await loadSendModule();

    await expect(sendScenario('welcome', sampleInput())).resolves.toEqual({
      ok: false,
      skipped: false,
      error: 'from must be verified',
    });
  });

  it('survives a transport failure so the caller request is unaffected', async () => {
    sendMock.mockRejectedValue(new Error('fetch failed'));
    const { sendScenario } = await loadSendModule();

    const result = await sendScenario('welcome', sampleInput());

    expect(result).toMatchObject({ ok: false, skipped: false });
    if (!result.ok && !result.skipped) {
      expect(result.error).toBe('fetch failed');
    }
  });

  it('retries a 429 with backoff and succeeds', async () => {
    vi.useFakeTimers();
    sendMock
      .mockResolvedValueOnce({
        data: null,
        error: { name: 'rate_limit', message: 'Too many requests', status: 429 },
      })
      .mockResolvedValueOnce({ data: { id: 'msg_after_429' }, error: null });
    const { sendScenario } = await loadSendModule();

    const promise = sendScenario('welcome', sampleInput());
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ ok: true, id: 'msg_after_429', mode: 'local' });
    expect(sendMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('gives up after repeated rate limiting rather than retrying forever', async () => {
    vi.useFakeTimers();
    sendMock.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit', message: 'Too many requests', status: 429 },
    });
    const { sendScenario } = await loadSendModule();

    const promise = sendScenario('welcome', sampleInput());
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(sendMock).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  it('reuses one Resend client across sends', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_5' }, error: null });
    const { sendScenario } = await loadSendModule();

    await sendScenario('welcome', sampleInput());
    await sendScenario('welcome', {
      to: 'amara@example.org',
      entityId: 'user_1',
      variables: getScenario('welcome')!.sample,
    });

    expect(ResendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});

describe('sendScenario across every scenario', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
  });

  it('sends every scenario Supabase does not own, from its own address', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_x' }, error: null });
    const { sendScenario } = await loadSendModule();
    const { listScenarios } = await import('@/lib/email/scenarios');

    const scenarios = listScenarios();
    const sendable = scenarios.filter((scenario) => !scenario.ownedBySupabase);
    const owned = scenarios.filter((scenario) => scenario.ownedBySupabase);

    // Assert the split rather than trusting the filter: if a scenario is marked
    // owned by mistake, this fails instead of quietly shrinking the loop.
    expect(owned.map((scenario) => scenario.key).sort()).toEqual([
      'password-reset',
      'verify-email',
    ]);
    expect(sendable.length).toBe(scenarios.length - 2);

    for (const scenario of sendable) {
      const result = await sendScenario(scenario.key, {
        to: 'amara@example.org',
        entityId: `entity-${scenario.key}`,
        variables: scenario.sample,
      });

      expect(result.ok, `${scenario.key} failed to send`).toBe(true);
      const [payload] = sendMock.mock.calls[sendMock.mock.calls.length - 1];
      expect(payload.from).toBe(scenario.from);
      expect(payload.replyTo).toBe(scenario.replyTo);
      expect(payload.subject.trim().length).toBeGreaterThan(0);
      expect(payload.html).toContain('<!DOCTYPE');
    }

    for (const scenario of owned) {
      const result = await sendScenario(scenario.key, {
        to: 'amara@example.org',
        entityId: `entity-${scenario.key}`,
        variables: scenario.sample,
      });

      expect(result, `${scenario.key} should not be sent from here`).toMatchObject({
        ok: false,
        skipped: true,
      });
    }
  });
});

describe('Supabase-owned scenarios', () => {
  it('refuses verify-email and password-reset instead of double-sending', async () => {
    process.env.RESEND_API_KEY = 're_test_key_not_real';
    const { sendScenario } = await loadSendModule();

    for (const key of ['verify-email', 'password-reset']) {
      const result = await sendScenario(key, sampleInput(key));
      expect(result).toMatchObject({ ok: false, skipped: true });
      if (!result.ok && result.skipped) {
        expect(result.reason).toContain('Supabase Auth');
        expect(result.reason).toContain('team@researchwith.me');
      }
    }

    // The refusal happens before a client is even constructed.
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('still sends the scenarios Supabase does not own', async () => {
    process.env.RESEND_API_KEY = 're_test_key_not_real';
    sendMock.mockResolvedValue({ data: { id: 'em_welcome_1' }, error: null });
    const { sendScenario } = await loadSendModule();

    const result = await sendScenario('welcome', sampleInput('welcome'));

    expect(result.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
