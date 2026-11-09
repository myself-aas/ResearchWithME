# Transactional email

One message leaves this app today: the acknowledgement a submitter receives
after `POST /api/submissions`. Everything below is written so that a second
message can be added without redesigning the first.

## The rules

**Sending is best-effort, always.** Every send happens *after* the action it
reports has already succeeded. A failed send is logged and surfaced in the
response body as `receiptSent: false`; it never fails the request. The send also
sits strictly after the `result.ok` check in the route, so a submission that
could not be stored returns 503 and **no receipt is ever sent for a submission
that was not recorded**.

**Nothing is sent unless a real sender is configured.** Both `RESEND_API_KEY`
and `EMAIL_FROM` must be set. There is deliberately no fallback to Resend's
shared `onboarding@resend.dev` sandbox: a receipt arriving from an address this
project does not own is indistinguishable from phishing. Unconfigured means
silent, and the skip is distinguishable in code from a failure
(`skipped: true` vs `skipped: false`), so the log says which happened.

## Configuration

| Variable | Kind | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | runtime secret | `wrangler secret put RESEND_API_KEY`. Never a build variable. |
| `EMAIL_FROM` | runtime var | An address on a domain verified in the Resend dashboard. Not secret; set it in `wrangler.jsonc` `vars` or as a Worker variable. |
| `RESEND_RECEIPT_TEMPLATE_ID` | runtime var, optional | Switches the receipt to the Resend template path. |

`EMAIL_FROM` is not committed with a value because it has to match a domain
verified in a specific Resend account. Guessing one into `wrangler.jsonc` would
put an unverified address in version control.

## Two rendering paths

The receipt is a React Email component at `emails/submission-receipt.tsx`. The
same component serves both paths; which one runs depends on one variable.

**Default — rendered here.** `RESEND_RECEIPT_TEMPLATE_ID` unset.
`lib/submission-email.tsx` renders the component with `@react-email/render` and
sends `html` plus a `text` part derived from that same HTML, so the two bodies
cannot drift. Nothing external has to exist for mail to work.

**Template — rendered by Resend.** `RESEND_RECEIPT_TEMPLATE_ID` set. The app
sends `{ template: { id, variables } }` and Resend renders it, so editors can
adjust the design in Resend's visual editor without a deploy. The local render
is skipped entirely rather than producing HTML nobody reads.

Two constraints shape the template path. A `template` send cannot carry `text` in
its payload (`text?: never` in the SDK's own types) — but a Template holds a
`text` body of its own, so the multipart alternative survives as long as the
uploaded template has one, and the upload script sets it from the same render.
Template variables are also flat `Record<string, string | number>` — no nesting,
no nulls — which is why absent optional fields are sent as empty strings and the
component hides them. Six keys are reserved by Resend (`FIRST_NAME`, `LAST_NAME`,
`EMAIL`, `UNSUBSCRIBE_URL`, `contact`, `this`); a test rejects them at build
time, case-insensitively, because the reserved list itself mixes cases.

One thing is not delegated either way: the subject is always built in
`lib/submission-email.tsx` and passed at send time, so the tracking ID is
present even if someone editing the template drops that variable.

### Uploading the template

Uploading is scripted rather than done through the dashboard, so the template is
reproducible from code:

```sh
npm run email:dev                 # preview at http://localhost:3001
npm run email:export              # write rendered HTML to .email-export/
npm run email:template:upload     # create + publish, prints the template ID
```

The upload script renders the component with `{{{key}}}` tokens in place of
values — React escapes interpolated children, but braces are not HTML
metacharacters, so the tokens survive, which is what lets one component produce
both a real email and a template. Every variable is declared with a fallback,
because Resend refuses to send when a variable has neither a value nor a
fallback. It publishes, then reads the template back and fails if the status is
not `published`.

`emails/submission-receipt.tsx` stays the source of truth. The uploaded template
is a derived artifact: edit the component, re-run the script. Editing only in
Resend means the next run silently reverts it — deliberately, so there is one
source and one direction.

## Adding another message

Put the component in `emails/`, add a builder beside
`lib/submission-email.tsx`, and call `sendEmail` from the route *after* its
primary action has succeeded. Use `lib/email.ts` rather than constructing a
Resend client — it is where the gating and the never-throw contract live.

Two details that are easy to get wrong:

- `idempotencyKey` goes in the **second** argument of `resend.emails.send`, not
  the payload. `CreateEmailRequestOptions extends IdempotentRequest` and it is
  sent as the `Idempotency-Key` header. In the payload it is a TS2353
  excess-property error against `resend@6`.
- `toPlainText` takes the **rendered HTML string**, not the React element.
  Passing the element does not fail loudly — it reaches the parser and throws
  deep inside `htmlparser2`.
