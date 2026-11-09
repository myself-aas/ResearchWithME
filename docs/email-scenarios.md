# Transactional email scenarios

Every message this product sends is a **scenario**: one entry in
`lib/email/scenarios.ts`, one component in `emails/`, one published Resend
template. Nothing else in the codebase constructs a Resend client, picks a
sender, or formats a subject.

These are transactional messages about a person's own account or submission.
Marketing and broadcast mail is a different system and does not belong here —
different sender, different consent rules, different unsubscribe obligation.

## The scenarios

| Key | From | Reply-to | Template env var | Variables (`?` = optional) |
| --- | --- | --- | --- | --- |
| `submission-receipt` | `Research With Me Submissions <submissions@researchwith.me>` | `submissions@researchwith.me` | `RESEND_TPL_SUBMISSION_RECEIPT` | REFERENCE, AUTHOR_NAME, TITLE, CATEGORY, DATA_URL?, ARTIFACT?, ABSTRACT |
| `welcome` | `Research With Me <hello@researchwith.me>` | `hello@researchwith.me` | `RESEND_TPL_WELCOME` | DISPLAY_NAME?, DASHBOARD_URL, NEXT_STEP? |
| `verify-email` | `Research With Me Accounts <accounts@researchwith.me>` | `support@researchwith.me` | `RESEND_TPL_VERIFY_EMAIL` | DISPLAY_NAME?, VERIFY_URL, EXPIRES_IN? |
| `password-reset` | `Research With Me Security <security@researchwith.me>` | `support@researchwith.me` | `RESEND_TPL_PASSWORD_RESET` | DISPLAY_NAME?, RESET_URL, EXPIRES_IN?, REQUESTED_FROM? |
| `security-alert` | `Research With Me Security <security@researchwith.me>` | `security@researchwith.me` | `RESEND_TPL_SECURITY_ALERT` | DISPLAY_NAME?, EVENT_TYPE, EVENT_TIME, EVENT_LOCATION?, ACTION_URL? |
| `review-status-update` | `Research With Me Review Team <review@researchwith.me>` | `review@researchwith.me` | `RESEND_TPL_REVIEW_STATUS_UPDATE` | REFERENCE, TITLE, STATUS, REVIEWER_NAME?, NOTE?, UPDATED_AT? |
| `decision-notification` | `Research With Me Review Team <review@researchwith.me>` | `review@researchwith.me` | `RESEND_TPL_DECISION_NOTIFICATION` | REFERENCE, TITLE, DECISION, DECISION_NOTE?, EDITOR_NAME?, DECIDED_AT? |
| `deadline-reminder` | `Research With Me Reminders <reminders@researchwith.me>` | `support@researchwith.me` | `RESEND_TPL_DEADLINE_REMINDER` | REFERENCE, TITLE, DEADLINE, DAYS_REMAINING, ACTION_URL? |
| `billing-receipt` | `Research With Me Billing <billing@researchwith.me>` | `billing@researchwith.me` | `RESEND_TPL_BILLING_RECEIPT` | INVOICE_NUMBER, AMOUNT, CURRENCY, PERIOD?, BILLED_ON?, RECEIPT_URL? |
| `support-reply` | `Research With Me Support <support@researchwith.me>` | `support@researchwith.me` | `RESEND_TPL_SUPPORT_REPLY` | TICKET_ID, SUBJECT?, REPLY_BODY, AGENT_NAME?, TICKET_URL? |

`?` marks an optional variable: it carries an empty-string fallback and the
component hides its row. An unmarked variable is required and carries **no**
fallback, so Resend rejects the send rather than delivering a message with a
hole in it. The tempting alternative — a realistic-looking fallback for
everything — is worse: plausible wrong data reaching a real person,
indistinguishable downstream.

Every sender is on `researchwith.me`, in `"Name <address>"` form, with a name
that carries the brand so a reader can attribute it. `onboarding@resend.dev` is
never used: a receipt from an address the project does not own is
indistinguishable from phishing.

## The variable contract
### submission-receipt

| Variable | Type | Required | Notes |
| --- | --- | --- | --- |
| `REFERENCE` | string | yes | send fails without it |
| `AUTHOR_NAME` | string | yes | send fails without it |
| `TITLE` | string | yes | send fails without it |
| `CATEGORY` | string | yes | send fails without it |
| `DATA_URL` | string | no | empty string fallback; row hidden |
| `ARTIFACT` | string | no | empty string fallback; row hidden |
| `ABSTRACT` | string | yes | send fails without it |

Subject: `[RWM-2026-7QXTR3] We received your submission`
Idempotency: `submission-receipt/<submission-id>` · Tag: `category=submission-receipt`

### welcome

| Variable | Type | Required | Notes |
| --- | --- | --- | --- |
| `DISPLAY_NAME` | string | no | empty string fallback; row hidden |
| `DASHBOARD_URL` | string | yes | send fails without it |
| `NEXT_STEP` | string | no | empty string fallback; row hidden |

Subject: `Welcome to ResearchWithMe, Amara`
Idempotency: `welcome/<user-id>` · Tag: `category=welcome`

### verify-email

| Variable | Type | Required | Notes |
| --- | --- | --- | --- |
| `DISPLAY_NAME` | string | no | empty string fallback; row hidden |
| `VERIFY_URL` | string | yes | send fails without it |
| `EXPIRES_IN` | string | no | empty string fallback; row hidden |

Subject: `Confirm your email address`
Idempotency: `verify-email/<user-id>` · Tag: `category=verify-email`

### password-reset

| Variable | Type | Required | Notes |
| --- | --- | --- | --- |
| `DISPLAY_NAME` | string | no | empty string fallback; row hidden |
| `RESET_URL` | string | yes | send fails without it |
| `EXPIRES_IN` | string | no | empty string fallback; row hidden |
| `REQUESTED_FROM` | string | no | empty string fallback; row hidden |

Subject: `Reset your ResearchWithMe password`
Idempotency: `password-reset/<user-id>` · Tag: `category=password-reset`

### security-alert

| Variable | Type | Required | Notes |
| --- | --- | --- | --- |
| `DISPLAY_NAME` | string | no | empty string fallback; row hidden |
| `EVENT_TYPE` | string | yes | send fails without it |
| `EVENT_TIME` | string | yes | send fails without it |
| `EVENT_LOCATION` | string | no | empty string fallback; row hidden |
| `ACTION_URL` | string | no | empty string fallback; row hidden |

Subject: `Security alert: New sign-in`
Idempotency: `security-alert/<event-id>` · Tag: `category=security-alert`

### review-status-update

| Variable | Type | Required | Notes |
| --- | --- | --- | --- |
| `REFERENCE` | string | yes | send fails without it |
| `TITLE` | string | yes | send fails without it |
| `STATUS` | string | yes | send fails without it |
| `REVIEWER_NAME` | string | no | empty string fallback; row hidden |
| `NOTE` | string | no | empty string fallback; row hidden |
| `UPDATED_AT` | string | no | empty string fallback; row hidden |

Subject: `[RWM-2026-7QXTR3] Review update: Under review`
Idempotency: `review-status-update/<submission-id>-<status>` · Tag: `category=review-status-update`

### decision-notification

| Variable | Type | Required | Notes |
| --- | --- | --- | --- |
| `REFERENCE` | string | yes | send fails without it |
| `TITLE` | string | yes | send fails without it |
| `DECISION` | string | yes | send fails without it |
| `DECISION_NOTE` | string | no | empty string fallback; row hidden |
| `EDITOR_NAME` | string | no | empty string fallback; row hidden |
| `DECIDED_AT` | string | no | empty string fallback; row hidden |

Subject: `[RWM-2026-7QXTR3] Decision on your submission`
Idempotency: `decision-notification/<submission-id>` · Tag: `category=decision-notification`

### deadline-reminder

| Variable | Type | Required | Notes |
| --- | --- | --- | --- |
| `REFERENCE` | string | yes | send fails without it |
| `TITLE` | string | yes | send fails without it |
| `DEADLINE` | string | yes | send fails without it |
| `DAYS_REMAINING` | number | yes | send fails without it |
| `ACTION_URL` | string | no | empty string fallback; row hidden |

Subject: `[RWM-2026-7QXTR3] Review deadline in 7 days`
Idempotency: `deadline-reminder/<submission-id>-<date>` · Tag: `category=deadline-reminder`

### billing-receipt

| Variable | Type | Required | Notes |
| --- | --- | --- | --- |
| `INVOICE_NUMBER` | string | yes | send fails without it |
| `AMOUNT` | string | yes | send fails without it |
| `CURRENCY` | string | yes | send fails without it |
| `PERIOD` | string | no | empty string fallback; row hidden |
| `BILLED_ON` | string | no | empty string fallback; row hidden |
| `RECEIPT_URL` | string | no | empty string fallback; row hidden |

Subject: `Receipt RWM-INV-2026-0142 from ResearchWithMe`
Idempotency: `billing-receipt/<invoice-number>` · Tag: `category=billing-receipt`

### support-reply

| Variable | Type | Required | Notes |
| --- | --- | --- | --- |
| `TICKET_ID` | string | yes | send fails without it |
| `SUBJECT` | string | no | empty string fallback; row hidden |
| `REPLY_BODY` | string | yes | send fails without it |
| `AGENT_NAME` | string | no | empty string fallback; row hidden |
| `TICKET_URL` | string | no | empty string fallback; row hidden |

Subject: `Re: Cannot link my ORCID record (RWM-SUP-0091)`
Idempotency: `support-reply/<ticket-id>-<reply-id>` · Tag: `category=support-reply`


## Layout

All ten share `emails/_layout.tsx`: header, footer, brand colours from
`DESIGN.md`, and block-level structure so the plain-text conversion reads
properly. `FieldTable` hides empty rows; `StatusPill` always renders its text
label alongside the colour, because `DESIGN.md` requires status colour never to
be the only signal; `ActionLink` is a link rather than an image button, so it
survives clients that strip images.

Every component is **total**: it renders with no props at all. The React Email
CLI renders the default export that way, and Resend renders a template whose
variable an editor may have removed. A missing field must produce an omitted
row, never an exception.

Variables are flat `string | number` — no nesting, no null. Keys are at most 50
characters, values at most 2,000, and a template may declare at most 50
variables. Six names are reserved by Resend (`FIRST_NAME`, `LAST_NAME`, `EMAIL`,
`UNSUBSCRIBE_URL`, `contact`, `this`); the guard compares lowercased because the
reserved list itself mixes cases.

## Two delivery modes

`sendScenario` picks one per scenario, based on whether that scenario's template
env var is set:

- **Template mode** — `template: { id, variables }`. Resend renders it, so
  editors can adjust the design in the dashboard without a deploy. Cannot carry
  `text` in the payload (`text?: never` in the SDK's own types), but the
  uploaded template holds a text body of its own, so the multipart alternative
  survives.
- **Local mode** — the component is rendered here and sent as `html` plus
  `text`. Needs no uploaded asset, and is the only mode with a plain-text part
  generated at send time.

`template` is mutually exclusive with `html`, `text` and `react`; sending both
is a validation error. The branch in `sendScenario` is the only place that
decides which shape goes out, so they cannot be combined by accident.

Leaving a template env var unset is safe — that scenario just renders locally.
That is the correct state for a fresh environment, and it means nothing depends
on a dashboard asset existing before the app works.

## Sending

```ts
import { sendScenario } from '@/lib/email/send';

const sent = await sendScenario('password-reset', {
  to: user.email,
  entityId: user.id,           // second half of the idempotency key
  variables: { RESET_URL: url, EXPIRES_IN: '1 hour', DISPLAY_NAME: user.name },
});

if (!sent.ok) {
  // logged, not thrown: the caller's primary action already succeeded
  console.error('password-reset not sent:', sent.skipped ? sent.reason : sent.error);
}
```

`from`, `subject` and `replyTo` are passed on every send rather than left to the
template's defaults, because payload values take precedence — so the sender
identity cannot drift if someone edits the template in the dashboard.

The result is a value, never a throw. `skipped: true` means email is switched
off in this environment; `skipped: false` means it was attempted and failed. A
`429` (the default limit is 10 requests/second) is retried with exponential
backoff, up to four attempts.

Callers must send **after** their primary action has succeeded. The submission
route does exactly that, and because the send sits after its `result.ok` check,
no receipt can ever confirm a submission that was not stored.

## Adding a scenario

1. Add an entry to `SCENARIOS` in `lib/email/scenarios.ts` — key, alias, from,
   replyTo, subject builder, variables, tag, idempotency pattern, template env
   var, and sample values.
2. Create `emails/<key>.tsx` using `EmailLayout`, and register it in
   `lib/email/components.ts`.
3. Call `sendScenario('<key>', { to, entityId, variables })`.
4. Run `npm run email:template:sync`, then set the new env var.

Tests cover the registry generically, so a new scenario is checked for sender
domain, variable limits, reserved names, totality and escaping without writing
new test cases.

## Syncing templates

```sh
RESEND_API_KEY=re_... npm run email:template:sync
```

Idempotent: it lists what exists, matches by alias, updates or creates, then
publishes and reads the template back to confirm `status === 'published'`. Only
published templates can send.

`emails/` is the source of truth and the direction is one way. Editing a template
only in the dashboard means the next sync reverts it — deliberately, so what is
in git is what subscribers receive.

The uploaded template is the component rendered with `{{{KEY}}}` tokens in place
of values. React escapes interpolated children, but braces are not HTML
metacharacters, so the tokens survive — which is what lets one component produce
both a real email and a template.

## Local preview

```sh
npm run email:dev      # http://localhost:3001
npm run email:export   # rendered HTML in .email-export/
```

## What is not verified

No email has been delivered. `api.resend.com` is unreachable from the
environment this was built in and there is no API key, so **no template has been
created, published, or sent**. Before this runs in production:

1. Confirm `researchwith.me` is verified in Resend. Nothing here checks that —
   `sendScenario` refuses an off-domain *sender*, which is not the same thing.
2. `wrangler secret put RESEND_API_KEY`.
3. `npm run email:template:sync`, then set the printed env vars.
4. Send each scenario to `delivered@resend.dev`, and exercise
   `bounced@resend.dev`, `complained@resend.dev` and `suppressed@resend.dev`
   once each. Do not use invented addresses — they damage domain reputation.

Whether Resend substitutes camelCase-style keys case-sensitively is also
unconfirmed. The keys here are `UPPER_SNAKE`, matching Resend's own examples,
which avoids the question.
