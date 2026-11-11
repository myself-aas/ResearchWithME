import { Resend } from 'resend';
import { renderScenario, validateVariables } from './render';
import {
  LIMITS,
  SENDING_DOMAIN,
  getScenario,
  idempotencyKeyFor,
  isOnSendingDomain,
  listScenarios,
  SUPABASE_AUTH_SENDER,
  parseSender,
  type ScenarioDefinition,
  type ScenarioVariables,
} from './scenarios';

/**
 * The one function that sends a transactional email.
 *
 * Callers name a scenario and supply variables. They do not construct a Resend
 * client, choose a sender, format a subject, or remember that `template` and
 * `html` are mutually exclusive -- all of that is decided here, once.
 */

export interface SendScenarioInput {
  /** Single recipient. Transactional mail is never a list send. */
  to: string;
  variables: ScenarioVariables;
  /**
   * The entity this message is about -- a user id, an application id, an
   * invoice number. Becomes the second half of the idempotency key, so a retry of the
   * same event does not deliver twice. Keys expire after 24 hours; this
   * deduplicates retries, not a deliberate re-send later.
   */
  entityId: string;
}

export type SendScenarioResult =
  | { ok: true; id: string; mode: 'template' | 'local' }
  /** Not an error: the send was deliberately not attempted. */
  | { ok: false; skipped: true; reason: string }
  /** A genuine send failure. */
  | { ok: false; skipped: false; error: string };

export interface SendScenarioOptions {
  /**
   * Force a mode instead of letting the template env var decide. Used by tests
   * and by anything that must not depend on a dashboard-uploaded asset.
   */
  mode?: 'template' | 'local';
}

/** Resend's default rate limit. Kept under rather than exactly at the ceiling. */
const MAX_ATTEMPTS = 4;
const BACKOFF_BASE_MS = 250;

export interface EmailSenderHandle {
  sendScenario(
    key: string,
    input: SendScenarioInput,
    options?: SendScenarioOptions,
  ): Promise<SendScenarioResult>;
}

/** Reads a single string from the environment bag; non-strings are treated as unset. */
type EnvReader = (key: string) => string | undefined;

/**
 * Reads an environment variable bag — the Cloudflare Worker `AppEnv`, Node's
 * `process.env`, or any plain object — without depending on either platform.
 * Every call in this module goes through the reader, so the factory is the
 * single decision point for which secrets a deployment sends mail with.
 */
function envReader(env: object): EnvReader {
  const record = env as Record<string, unknown>;
  return (key) => {
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
  };
}

/**
 * Builds an email sender bound to a specific environment. The Resend client is
 * memoized inside the closure and rebuilt if the key changes, so repeated
 * sends reuse one client while key rotation still takes effect.
 */
export function createEmailSender(env: object): EmailSenderHandle {
  const read = envReader(env);
  let client: Resend | null = null;
  let clientKeyUsed: string | null = null;

  const clientFor = (): Resend | null => {
    const key = (read('RESEND_API_KEY') ?? '').trim();
    if (!key) return null;
    if (!client || clientKeyUsed !== key) {
      client = new Resend(key);
      clientKeyUsed = key;
    }
    return client;
  };

  return {
    sendScenario: (key, input, options) =>
      sendScenarioWith(read, clientFor, key, input, options),
  };
}

/** Tags are ASCII-only and capped at 256 characters for both name and value. */
function sanitizeTag(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, '-').slice(0, LIMITS.maxTagLength);
}

/**
 * Refuses a sender that is not on the verified sending domain.
 *
 * This is a runtime check rather than only a test because the sender identity is
 * also settable in the Resend dashboard, and a template edited there could carry
 * a different `from`. Passing `from` on every send already overrides it; this
 * catches the case where the registry itself is wrong.
 */
function assertSenderIdentity(scenario: ScenarioDefinition): string | null {
  const parsed = parseSender(scenario.from);
  if (!parsed) {
    return `Scenario "${scenario.key}" has a malformed from: "${scenario.from}".`;
  }
  if (!isOnSendingDomain(parsed.address)) {
    return `Scenario "${scenario.key}" sends from ${parsed.address}, which is not on ${SENDING_DOMAIN}.`;
  }
  if (!isOnSendingDomain(scenario.replyTo)) {
    return `Scenario "${scenario.key}" replies to ${scenario.replyTo}, which is not on ${SENDING_DOMAIN}.`;
  }
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendScenarioWith(
  read: EnvReader,
  clientFor: () => Resend | null,
  key: string,
  input: SendScenarioInput,
  options: SendScenarioOptions = {},
): Promise<SendScenarioResult> {
  const scenario = getScenario(key);
  if (!scenario) {
    return { ok: false, skipped: false, error: `Unknown email scenario "${key}".` };
  }

  if (scenario.ownedBySupabase) {
    return {
      ok: false,
      skipped: true,
      reason:
        `"${key}" is sent by Supabase Auth itself, from ${SUPABASE_AUTH_SENDER}. ` +
        'Sending it from here too would deliver two emails about the same event.',
    };
  }

  const identityProblem = assertSenderIdentity(scenario);
  if (identityProblem) {
    return { ok: false, skipped: false, error: identityProblem };
  }

  const resend = clientFor();
  if (!resend) {
    return {
      ok: false,
      skipped: true,
      reason: 'RESEND_API_KEY is not set.',
    };
  }

  if (!input.to.trim()) {
    return { ok: false, skipped: false, error: 'No recipient address was supplied.' };
  }

  const problems = validateVariables(scenario, input.variables);
  if (problems.length > 0) {
    return { ok: false, skipped: false, error: problems.join(' ') };
  }

  const templateId = (read(scenario.templateEnv) ?? '').trim();
  const mode = options.mode ?? (templateId ? 'template' : 'local');

  // `template` is mutually exclusive with `html`, `text` and `react`: sending
  // both is a validation error at the API. The branch below is the only place
  // that decides which shape goes out, so they cannot be combined by accident.
  let body:
    | { template: { id: string; variables: ScenarioVariables } }
    | { html: string; text: string };

  if (mode === 'template') {
    if (!templateId) {
      return {
        ok: false,
        skipped: false,
        error:
          `Scenario "${scenario.key}" is set to template mode but ` +
          `${scenario.templateEnv} is not set. Run scripts/sync-templates.ts, ` +
          `or send in local mode.`,
      };
    }
    body = { template: { id: templateId, variables: input.variables } };
  } else {
    // Local mode is the fallback: it needs no uploaded asset and it is the only
    // mode that can carry a plain-text part, since a template send cannot.
    try {
      body = await renderScenario(scenario, input.variables);
    } catch (err) {
      return {
        ok: false,
        skipped: false,
        error: `Rendering "${scenario.key}" failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  const payload = {
    // Passed on every send rather than left to the template's defaults: payload
    // values take precedence, so the sender identity cannot drift if someone
    // edits the template in the dashboard.
    from: scenario.from,
    to: [input.to],
    subject: scenario.subjectBuilder(input.variables),
    replyTo: scenario.replyTo,
    tags: [{ name: sanitizeTag('category'), value: sanitizeTag(scenario.tagCategory) }],
    ...body,
  };

  // The SDK resolves with { data, error } rather than throwing, so the result is
  // inspected. The try/catch is only for transport-level failures and for 429s,
  // which must not take the caller's request down.
  let lastError = '';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const { data, error } = await resend.emails.send(
        payload,
        { idempotencyKey: idempotencyKeyFor(scenario.key, input.entityId) },
      );

      if (error) {
        lastError = error.message;
        // 429 is the documented rate limit (10 requests/second by default).
        // Retry with exponential backoff rather than failing the caller.
        if (isRateLimited(error) && attempt < MAX_ATTEMPTS - 1) {
          await delay(BACKOFF_BASE_MS * 2 ** attempt);
          continue;
        }
        return { ok: false, skipped: false, error: lastError };
      }

      return { ok: true, id: data?.id ?? '', mode };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Email transport failed.';
      if (attempt < MAX_ATTEMPTS - 1) {
        await delay(BACKOFF_BASE_MS * 2 ** attempt);
        continue;
      }
    }
  }

  return { ok: false, skipped: false, error: lastError || 'Email send failed.' };
}

/** Detects a rate-limit response across the shapes the SDK can surface it in. */
function isRateLimited(error: { name?: string; message?: string; status?: number }): boolean {
  if (error.status === 429) return true;
  const text = `${error.name ?? ''} ${error.message ?? ''}`.toLowerCase();
  return text.includes('429') || text.includes('rate limit') || text.includes('too many requests');
}

let defaultSender: { key: string; sender: EmailSenderHandle } | null = null;

/** The Next-environment sender, memoized per RESEND_API_KEY so rotation is honoured. */
function defaultEmailSender(): EmailSenderHandle {
  const key = (process.env.RESEND_API_KEY ?? '').trim();
  if (!defaultSender || defaultSender.key !== key) {
    defaultSender = { key, sender: createEmailSender(process.env) };
  }
  return defaultSender.sender;
}

export async function sendScenario(
  key: string,
  input: SendScenarioInput,
  options: SendScenarioOptions = {},
): Promise<SendScenarioResult> {
  return defaultEmailSender().sendScenario(key, input, options);
}

/**
 * Sends every scenario to one address, sequentially.
 *
 * For live verification against Resend's own test inboxes and nothing else --
 * this is not a broadcast tool, and it deliberately has no concurrency, so it
 * stays well under the 10 requests/second default limit.
 */
export async function sendAllScenariosTo(
  to: string,
  entityIdPrefix = 'verify',
): Promise<Array<{ key: string; result: SendScenarioResult }>> {
  const results: Array<{ key: string; result: SendScenarioResult }> = [];
  for (const scenario of listScenarios()) {
    const result = await sendScenario(scenario.key, {
      to,
      variables: scenario.sample,
      entityId: `${entityIdPrefix}-${scenario.key}`,
    });
    results.push({ key: scenario.key, result });
  }
  return results;
}
