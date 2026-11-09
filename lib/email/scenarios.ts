import type * as React from 'react';
import { SCENARIO_COMPONENTS } from './components';

/**
 * The transactional email scenario registry.
 *
 * One entry per message the product sends. Everything that could drift between
 * messages -- sender identity, reply-to, subject shape, variable contract,
 * idempotency shape, analytics tag -- is declared here rather than repeated at
 * each call site.
 *
 * Adding a message means adding an entry here, a component in emails/, and a
 * test. It does not mean writing a new send call.
 */

/** Every sending domain this app may use. Enforced by test. */
export const SENDING_DOMAIN = 'researchwith.me';

/** Resend rejects these keys on template creation. Compared case-insensitively. */
export const RESERVED_VARIABLE_KEYS: readonly string[] = [
  'FIRST_NAME',
  'LAST_NAME',
  'EMAIL',
  'UNSUBSCRIBE_URL',
  'contact',
  'this',
];

/** Resend limits. Asserted in tests rather than trusted. */
export const LIMITS = {
  maxVariablesPerTemplate: 50,
  maxVariableKeyLength: 50,
  maxVariableValueLength: 2000,
  maxIdempotencyKeyLength: 256,
  maxTagLength: 256,
} as const;

/** Variable values are flat by requirement: no nesting, no null. */
export type ScenarioVariables = Record<string, string | number>;

export interface ScenarioVariableDefinition {
  key: string;
  type: 'string' | 'number';
  /**
   * Whether the send must fail when this value is absent.
   *
   * A required variable gets **no** fallback, so Resend rejects the send rather
   * than delivering a message with a hole in it. An optional variable gets a
   * `''` fallback, so the message still sends and the component hides the row.
   *
   * The tempting alternative -- a realistic-looking fallback for everything --
   * is worse: it delivers plausible wrong data to a real person, and nothing
   * downstream can tell it was a fallback.
   */
  required: boolean;
}

export interface ScenarioDefinition {
  /** Stable identifier. Also the analytics tag value and the component filename. */
  key: string;
  /** Stable alias on the Resend template, so IDs can be re-resolved by name. */
  templateAlias: string;
  /** `"Friendly Name <address@researchwith.me>"`. Never off-domain. */
  from: string;
  replyTo: string;
  subjectBuilder: (variables: ScenarioVariables) => string;
  variables: ScenarioVariableDefinition[];
  /** Value of the `category` tag. ASCII, <= 256 characters. */
  tagCategory: string;
  /**
   * Documented shape of the idempotency key, `<event-type>/<entity-id>`. The
   * event type is the scenario key; the entity id comes from the caller.
   */
  idempotencyPattern: string;
  /** Env var holding this scenario's published template id. */
  templateEnv: string;
  /** The React Email component, used to render the uploaded template source. */
  component: React.ComponentType<Record<string, never>>;
  /** Realistic values, used for preview and for the variable fallbacks. */
  sample: ScenarioVariables;
}

/**
 * `"Name <address@researchwith.me>"`. Built by a helper so no scenario can
 * accidentally declare an off-domain or malformed sender.
 */
function sender(name: string, localPart: string): string {
  return `${name} <${localPart}@${SENDING_DOMAIN}>`;
}

function address(localPart: string): string {
  return `${localPart}@${SENDING_DOMAIN}`;
}

/**
 * `"[REF] Rest"` when a reference exists, `"Rest"` when it does not. Without
 * this, an absent reference produces "[] Rest" -- and a builder that leaves a
 * double space produces a subject that reads as a typo.
 */
function withReference(reference: string, rest: string): string {
  return reference ? `[${reference}] ${rest}` : rest;
}

/** Reads a possibly-absent variable as a trimmed string. */
function str(variables: ScenarioVariables, key: string): string {
  const value = variables[key];
  return value === undefined || value === null ? '' : String(value).trim();
}

export const SCENARIOS = {
  'submission-receipt': {
    key: 'submission-receipt',
    templateAlias: 'submission-receipt',
    from: sender('Research With Me Submissions', 'submissions'),
    replyTo: address('submissions'),
    // The reference leads so it survives client-side subject truncation and
    // stays visible in an inbox list -- finding this message again is the point.
    subjectBuilder: (v) => withReference(str(v, 'REFERENCE'), 'We received your submission'),
    variables: [
      { key: 'REFERENCE', type: 'string', required: true },
      { key: 'AUTHOR_NAME', type: 'string', required: true },
      { key: 'TITLE', type: 'string', required: true },
      { key: 'CATEGORY', type: 'string', required: true },
      { key: 'DATA_URL', type: 'string', required: false },
      { key: 'ARTIFACT', type: 'string', required: false },
      { key: 'ABSTRACT', type: 'string', required: true },
    ],
    tagCategory: 'submission-receipt',
    idempotencyPattern: 'submission-receipt/<submission-id>',
    templateEnv: 'RESEND_TPL_SUBMISSION_RECEIPT',
    component: SCENARIO_COMPONENTS['submission-receipt'] as ScenarioDefinition['component'],
    sample: {
      REFERENCE: 'RWM-2026-7QXTR3',
      AUTHOR_NAME: 'Dr. Amara Okonkwo',
      TITLE: 'Attention allocation in low-resource clinical triage',
      CATEGORY: 'Clinical informatics',
      DATA_URL: 'https://example.org/datasets/triage-attention-2026',
      ARTIFACT: 'Field notes',
      ABSTRACT:
        'A field study of triage decision aids deployed across four district hospitals, measuring the effect of structured prompts on time-to-assessment and on the rate of missed deterioration signals during night shifts.',
    },
  },

  welcome: {
    key: 'welcome',
    templateAlias: 'welcome',
    from: sender('Research With Me', 'hello'),
    replyTo: address('hello'),
    subjectBuilder: (v) => {
      const name = str(v, 'DISPLAY_NAME');
      return name ? `Welcome to ResearchWithMe, ${name}` : 'Welcome to ResearchWithMe';
    },
    variables: [
      { key: 'DISPLAY_NAME', type: 'string', required: false },
      { key: 'DASHBOARD_URL', type: 'string', required: true },
      { key: 'NEXT_STEP', type: 'string', required: false },
    ],
    tagCategory: 'welcome',
    idempotencyPattern: 'welcome/<user-id>',
    templateEnv: 'RESEND_TPL_WELCOME',
    component: SCENARIO_COMPONENTS['welcome'] as ScenarioDefinition['component'],
    sample: {
      DISPLAY_NAME: 'Amara',
      DASHBOARD_URL: 'https://researchwith.me/dashboard',
      NEXT_STEP: 'Complete your author profile so editors can find you.',
    },
  },

  'verify-email': {
    key: 'verify-email',
    templateAlias: 'verify-email',
    from: sender('Research With Me Accounts', 'accounts'),
    replyTo: address('support'),
    subjectBuilder: () => 'Confirm your email address',
    variables: [
      { key: 'DISPLAY_NAME', type: 'string', required: false },
      { key: 'VERIFY_URL', type: 'string', required: true },
      { key: 'EXPIRES_IN', type: 'string', required: false },
    ],
    tagCategory: 'verify-email',
    idempotencyPattern: 'verify-email/<user-id>',
    templateEnv: 'RESEND_TPL_VERIFY_EMAIL',
    component: SCENARIO_COMPONENTS['verify-email'] as ScenarioDefinition['component'],
    sample: {
      DISPLAY_NAME: 'Amara',
      VERIFY_URL: 'https://researchwith.me/auth/confirm?token=example',
      EXPIRES_IN: '24 hours',
    },
  },

  'password-reset': {
    key: 'password-reset',
    templateAlias: 'password-reset',
    from: sender('Research With Me Security', 'security'),
    replyTo: address('support'),
    subjectBuilder: () => 'Reset your ResearchWithMe password',
    variables: [
      { key: 'DISPLAY_NAME', type: 'string', required: false },
      { key: 'RESET_URL', type: 'string', required: true },
      { key: 'EXPIRES_IN', type: 'string', required: false },
      { key: 'REQUESTED_FROM', type: 'string', required: false },
    ],
    tagCategory: 'password-reset',
    idempotencyPattern: 'password-reset/<user-id>',
    templateEnv: 'RESEND_TPL_PASSWORD_RESET',
    component: SCENARIO_COMPONENTS['password-reset'] as ScenarioDefinition['component'],
    sample: {
      DISPLAY_NAME: 'Amara',
      RESET_URL: 'https://researchwith.me/auth/reset?token=example',
      EXPIRES_IN: '1 hour',
      REQUESTED_FROM: 'Dhaka, Bangladesh',
    },
  },

  'security-alert': {
    key: 'security-alert',
    templateAlias: 'security-alert',
    from: sender('Research With Me Security', 'security'),
    // Reply-to is security@, not support@: an alert about a compromised account
    // should route somewhere that treats it as an incident.
    replyTo: address('security'),
    subjectBuilder: (v) => {
      const event = str(v, 'EVENT_TYPE');
      return event ? `Security alert: ${event}` : 'Security alert on your account';
    },
    variables: [
      { key: 'DISPLAY_NAME', type: 'string', required: false },
      { key: 'EVENT_TYPE', type: 'string', required: true },
      { key: 'EVENT_TIME', type: 'string', required: true },
      { key: 'EVENT_LOCATION', type: 'string', required: false },
      { key: 'ACTION_URL', type: 'string', required: false },
    ],
    tagCategory: 'security-alert',
    idempotencyPattern: 'security-alert/<event-id>',
    templateEnv: 'RESEND_TPL_SECURITY_ALERT',
    component: SCENARIO_COMPONENTS['security-alert'] as ScenarioDefinition['component'],
    sample: {
      DISPLAY_NAME: 'Amara',
      EVENT_TYPE: 'New sign-in',
      EVENT_TIME: '8 November 2026 at 21:14 UTC',
      EVENT_LOCATION: 'Dhaka, Bangladesh \u00b7 Chrome on macOS',
      ACTION_URL: 'https://researchwith.me/dashboard/access',
    },
  },

  'review-status-update': {
    key: 'review-status-update',
    templateAlias: 'review-status-update',
    from: sender('Research With Me Review Team', 'review'),
    replyTo: address('review'),
    subjectBuilder: (v) =>
      withReference(
        str(v, 'REFERENCE'),
        `Review update: ${str(v, 'STATUS') || 'status changed'}`,
      ),
    variables: [
      { key: 'REFERENCE', type: 'string', required: true },
      { key: 'TITLE', type: 'string', required: true },
      { key: 'STATUS', type: 'string', required: true },
      { key: 'REVIEWER_NAME', type: 'string', required: false },
      { key: 'NOTE', type: 'string', required: false },
      { key: 'UPDATED_AT', type: 'string', required: false },
    ],
    tagCategory: 'review-status-update',
    idempotencyPattern: 'review-status-update/<submission-id>-<status>',
    templateEnv: 'RESEND_TPL_REVIEW_STATUS_UPDATE',
    component: SCENARIO_COMPONENTS['review-status-update'] as ScenarioDefinition['component'],
    sample: {
      REFERENCE: 'RWM-2026-7QXTR3',
      TITLE: 'Attention allocation in low-resource clinical triage',
      STATUS: 'Under review',
      REVIEWER_NAME: 'Dr. Ifeoma Balogun',
      NOTE: 'Assigned to a reviewer with clinical informatics expertise.',
      UPDATED_AT: '8 November 2026',
    },
  },

  'decision-notification': {
    key: 'decision-notification',
    templateAlias: 'decision-notification',
    from: sender('Research With Me Review Team', 'review'),
    replyTo: address('review'),
    subjectBuilder: (v) =>
      withReference(str(v, 'REFERENCE'), 'Decision on your submission'),
    variables: [
      { key: 'REFERENCE', type: 'string', required: true },
      { key: 'TITLE', type: 'string', required: true },
      { key: 'DECISION', type: 'string', required: true },
      { key: 'DECISION_NOTE', type: 'string', required: false },
      { key: 'EDITOR_NAME', type: 'string', required: false },
      { key: 'DECIDED_AT', type: 'string', required: false },
    ],
    tagCategory: 'decision-notification',
    idempotencyPattern: 'decision-notification/<submission-id>',
    templateEnv: 'RESEND_TPL_DECISION_NOTIFICATION',
    component: SCENARIO_COMPONENTS['decision-notification'] as ScenarioDefinition['component'],
    sample: {
      REFERENCE: 'RWM-2026-7QXTR3',
      TITLE: 'Attention allocation in low-resource clinical triage',
      DECISION: 'Accepted with revisions',
      DECISION_NOTE:
        'The triage protocol section needs the inter-rater reliability figures before publication.',
      EDITOR_NAME: 'Dr. Ifeoma Balogun',
      DECIDED_AT: '8 November 2026',
    },
  },

  'deadline-reminder': {
    key: 'deadline-reminder',
    templateAlias: 'deadline-reminder',
    from: sender('Research With Me Reminders', 'reminders'),
    replyTo: address('support'),
    subjectBuilder: (v) => {
      const days = v.DAYS_REMAINING;
      const label =
        days === undefined || days === ''
          ? 'soon'
          : Number(days) === 1
            ? '1 day'
            : `${days} days`;
      return withReference(str(v, 'REFERENCE'), `Review deadline in ${label}`);
    },
    variables: [
      { key: 'REFERENCE', type: 'string', required: true },
      { key: 'TITLE', type: 'string', required: true },
      { key: 'DEADLINE', type: 'string', required: true },
      { key: 'DAYS_REMAINING', type: 'number', required: true },
      { key: 'ACTION_URL', type: 'string', required: false },
    ],
    tagCategory: 'deadline-reminder',
    idempotencyPattern: 'deadline-reminder/<submission-id>-<date>',
    templateEnv: 'RESEND_TPL_DEADLINE_REMINDER',
    component: SCENARIO_COMPONENTS['deadline-reminder'] as ScenarioDefinition['component'],
    sample: {
      REFERENCE: 'RWM-2026-7QXTR3',
      TITLE: 'Attention allocation in low-resource clinical triage',
      DEADLINE: '15 November 2026',
      DAYS_REMAINING: 7,
      ACTION_URL: 'https://researchwith.me/dashboard/applications',
    },
  },

  'billing-receipt': {
    key: 'billing-receipt',
    templateAlias: 'billing-receipt',
    from: sender('Research With Me Billing', 'billing'),
    replyTo: address('billing'),
    subjectBuilder: (v) => {
      const invoice = str(v, 'INVOICE_NUMBER');
      return invoice
        ? `Receipt ${invoice} from ResearchWithMe`
        : 'Your receipt from ResearchWithMe';
    },
    variables: [
      { key: 'INVOICE_NUMBER', type: 'string', required: true },
      // Money is a string, not a number: a receipt must show the currency
      // formatting the payer was charged, and 1200.5 as a number is ambiguous.
      { key: 'AMOUNT', type: 'string', required: true },
      { key: 'CURRENCY', type: 'string', required: true },
      { key: 'PERIOD', type: 'string', required: false },
      { key: 'BILLED_ON', type: 'string', required: false },
      { key: 'RECEIPT_URL', type: 'string', required: false },
    ],
    tagCategory: 'billing-receipt',
    idempotencyPattern: 'billing-receipt/<invoice-number>',
    templateEnv: 'RESEND_TPL_BILLING_RECEIPT',
    component: SCENARIO_COMPONENTS['billing-receipt'] as ScenarioDefinition['component'],
    sample: {
      INVOICE_NUMBER: 'RWM-INV-2026-0142',
      AMOUNT: '12.00',
      CURRENCY: 'USD',
      PERIOD: '8 November \u2013 7 December 2026',
      BILLED_ON: '8 November 2026',
      RECEIPT_URL: 'https://researchwith.me/billing/invoices/RWM-INV-2026-0142',
    },
  },

  'support-reply': {
    key: 'support-reply',
    templateAlias: 'support-reply',
    from: sender('Research With Me Support', 'support'),
    replyTo: address('support'),
    subjectBuilder: (v) => {
      const subject = str(v, 'SUBJECT');
      const ticket = str(v, 'TICKET_ID');
      if (subject && ticket) return `Re: ${subject} (${ticket})`;
      if (subject) return `Re: ${subject}`;
      return ticket ? `Re: your request ${ticket}` : 'Re: your request to ResearchWithMe';
    },
    variables: [
      { key: 'TICKET_ID', type: 'string', required: true },
      { key: 'SUBJECT', type: 'string', required: false },
      { key: 'REPLY_BODY', type: 'string', required: true },
      { key: 'AGENT_NAME', type: 'string', required: false },
      { key: 'TICKET_URL', type: 'string', required: false },
    ],
    tagCategory: 'support-reply',
    idempotencyPattern: 'support-reply/<ticket-id>-<reply-id>',
    templateEnv: 'RESEND_TPL_SUPPORT_REPLY',
    component: SCENARIO_COMPONENTS['support-reply'] as ScenarioDefinition['component'],
    sample: {
      TICKET_ID: 'RWM-SUP-0091',
      SUBJECT: 'Cannot link my ORCID record',
      REPLY_BODY:
        'We have re-sent the ORCID authorisation link. It is valid for 30 minutes, and linking does not change your existing submissions.',
      AGENT_NAME: 'Nadia',
      TICKET_URL: 'https://researchwith.me/support/RWM-SUP-0091',
    },
  },
} satisfies Record<string, Omit<ScenarioDefinition, 'component'>> &
  Record<string, { component: ScenarioDefinition['component'] }>;

export type ScenarioKey = keyof typeof SCENARIOS;

/** Every scenario as a list, for iteration in scripts and tests. */
export function listScenarios(): ScenarioDefinition[] {
  return Object.values(SCENARIOS) as ScenarioDefinition[];
}

export function getScenario(key: string): ScenarioDefinition | undefined {
  return (SCENARIOS as Record<string, ScenarioDefinition | undefined>)[key];
}

/**
 * `Name <address>` parsed into its parts. Returns null for anything malformed,
 * which is what makes the sender-domain test meaningful rather than a substring
 * check that `"evil@researchwith.me.attacker.tld"` would pass.
 */
export function parseSender(from: string): { name: string; address: string } | null {
  const match = /^(.+?) <([^<>\s]+)>$/.exec(from.trim());
  if (!match) return null;
  return { name: match[1].trim(), address: match[2] };
}

/** True when the address belongs to the sending domain, exactly. */
export function isOnSendingDomain(addressValue: string): boolean {
  const at = addressValue.lastIndexOf('@');
  if (at < 1 || at === addressValue.length - 1) return false;
  return addressValue.slice(at + 1).toLowerCase() === SENDING_DOMAIN;
}

/**
 * The idempotency key for a send: `<scenario-key>/<entity-id>`, capped at the
 * 256 characters Resend allows. Keys expire after 24 hours, so this only
 * deduplicates retries of the same event, not a deliberate re-send later.
 */
export function idempotencyKeyFor(key: string, entityId: string): string {
  return `${key}/${entityId}`.slice(0, LIMITS.maxIdempotencyKeyLength);
}

/** Reserved-name check, case-insensitive because the reserved list mixes cases. */
export function isReservedVariableKey(key: string): boolean {
  const lowered = key.toLowerCase();
  return RESERVED_VARIABLE_KEYS.some((reserved) => reserved.toLowerCase() === lowered);
}
