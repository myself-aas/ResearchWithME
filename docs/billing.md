# Lemon Squeezy billing

Two paid products, one merchant of record, no gate on reading. This document is
the operator's view: what is sold, where the money goes, which credentials exist,
what each webhook does to the database, and the order to switch things on.

The blueprint that prompted this integration mixed two different money paths — its
Phase 1 describes Lemon Squeezy paying out to Payoneer, and its Phase 3 describes
Stripe-style checkout sessions on the client. Only the first is real. Nothing here
creates a payment session in the browser: the browser asks the server for a
checkout URL, and the server is the only party that knows a price.

## 1. What is sold

| Product | Key | Price | Mode | Delivery |
| --- | --- | --- | --- | --- |
| The Teardown System | `teardown` | $19 one-time | `payment` | Lemon Squeezy file download |
| Statistical Table Generator | `stat-tables` | $5 one-time | `payment` | Lemon Squeezy file download (`statistical-table-generator-1.0.0.zip`) |

`lib/billing/catalogue.ts` is the single source of these rows; the pricing page,
the checkout route, and the tests all read it. A key that is not in that file
cannot be checked out — `/api/billing/checkout` answers `400`, it does not pass an
unknown string through to Lemon Squeezy.

**Reading is not gated.** Every article, the citation builder, the research
assistant, and the bookmark list stay free and account-less. No surface shows a
"Premium" badge, and no route checks a subscription before rendering content.
This is a product decision, recorded as D3 in the plan, not an omission.

**Only digital goods.** Lemon Squeezy's prohibited-products list includes
"services of any kind (including marketing, design, web development, consulting
or other related services)", "advertising in newsletters", "donations or charity
giving where no product exists", "job boards", and "homework/essay mills", and a
store selling them can be suspended without notice
(https://docs.lemonsqueezy.com/help/getting-started/prohibited-products, read
2026-11-14). Manuscript Editing was a service and was removed from the catalogue
on that date; `editing` is no longer a product key and `/api/billing/checkout`
answers `400` for it. No Manuscript Editing product was ever created in the Lemon Squeezy store, so
nothing was sold and there is nothing to archive or refund.

**The Research Co-Pilot is withdrawn from sale (2026-11-14).** Its payment
switched nothing on, and a subscription that grants nothing is, in the
provider's terms, a donation. `copilot` is no longer a catalogue key, so
`/api/billing/checkout` answers `400` for it and no page offers it.
No co-pilot product was ever created in the Lemon Squeezy store, so there are
no subscribers to cancel or refund. The subscription handling in the webhook,
`lib/billing/status.ts` and the account page is unused code left in place; it
can be removed in a later cleanup. A membership may return only when it
delivers a defined product automatically.

**Nothing can be bought yet (owner confirmed 2026-11-14).** The store has no
products. The site lists the Teardown System, but until a product exists in
Lemon Squeezy and `LEMONSQUEEZY_VARIANT_TEARDOWN` is set, `/api/billing/checkout`
answers `503` and the button reports that checkout is not configured.

**Credits are zero today.** No product in the current catalogue grants
credits, so every order is written with `ai_credits = 0` and the counter on
`/dashboard/account` reads zero. The column and the summing query exist so the
follow-on entitlement spec does not need a second migration; the pricing page
does not promise a credit allowance.

**`Entitlement.plan` has three values, not two.** `copilot` is a live
subscription, `purchases` is ownership of a one-time product with no subscription
behind it, and `none` is neither. The third value exists because a reader who
bought the teardown and later let the co-pilot lapse owns something permanent; a
two-value enum collapsed them to `none` and the account page told a paying
customer they had bought nothing.

## 2. Money path

Lemon Squeezy (merchant of record, charges the card, pays sales tax and VAT) →
Payoneer USD receiving account → DBBL BDT withdrawal.

All three hops are dashboard work in someone else's product. There is no code in
this repository for the payout chain, no bank detail in any environment variable,
and nothing in the database records a settlement. If a payout is late, the
question is answered in the Lemon Squeezy and Payoneer dashboards, not here.

Because Lemon Squeezy is the merchant of record, the customer's statement shows
Lemon Squeezy's descriptor, refunds are processed there, and the receipts are
emailed by them. Support copy on `/pricing` and `/dashboard/account` says so
rather than implying this site charges cards.

## 3. The privileged write path

The webhook cannot use row-level security.

Supabase's row-level policies key off `auth.uid()`, which exists only for a
request carrying a user's JWT. A Lemon Squeezy webhook carries no such token — it
carries an HMAC signature over the raw body and nothing else. So the write has to
happen with elevated rights, and the only question is how narrow that can be made.

The answer in this repository is deliberately not a service-role key:

- The route verifies the signature itself (`lib/billing/signature.ts`), in
  constant time, over the raw bytes, before parsing the body.
- It then calls one `SECURITY DEFINER` function, `public.apply_billing_event(...)`,
  which takes four arguments and can only do the five things it does: record an
  event, upsert a customer, upsert an order, upsert a subscription, grant
  credits. There is no general-purpose `service_role` credential anywhere in the
  application, so a bug in a route cannot become "read every table".
- The function checks a second shared secret, `BILLING_BRIDGE_SECRET`, as its
  first statement. Without it the call raises `billing_bridge_unauthorized`
  (SQLSTATE `28000`) and writes nothing.

What the bridge secret defends: a leaked publishable/anon key being used to call
the RPC directly. What it does not defend: someone who already has the Worker
secret, or someone with the database password. It is a second lock on one door,
not a substitute for not leaking the first.

**Rotation order matters.** Set the Worker secret first, then update the row:

```sql
-- private.billing_settings is a two-column key/value table; there is no id=1 row.
-- Generate the digest exactly as the migration does, so the encoding matches:
printf %s "<new secret>" | shasum -a 256
-- On Windows (no shasum), the same digest:
--   node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "<new secret>"
insert into private.billing_settings (key, value)
values ('bridge_secret_sha256', '<hex from the command above>')
on conflict (key) do update set value = excluded.value;
```

Reversed, every webhook in the gap is rejected and Lemon Squeezy's retries (three
attempts, 5 s / 25 s / 125 s apart) may all land inside it. A rejected event is
not lost forever — see §4 — but it does need replaying.

## 4. Event handling

`HANDLED_EVENTS` in `lib/billing/events.ts` is the authoritative list — eight
names, and a test pins it:

| Event | What is written |
| --- | --- |
| `order_created` | `billing_customers` upsert, `billing_orders` row, credits if the order's product grants them |
| `subscription_created` | `billing_customers` upsert, `billing_subscriptions` row (`status`, `renews_at`, `ends_at`) |
| `subscription_updated` | `billing_subscriptions` upsert — the dunning state machine lives here |
| `subscription_cancelled` | status → whatever the payload says (`cancelled`), `ends_at` recorded |
| `subscription_expired` | status → `expired`; access ends |
| `subscription_payment_success` | subscription touch; credits reissued for the new period |
| `subscription_payment_failed` | status → `past_due` (access retained, per D2) |
| `subscription_payment_recovered` | status from the payload (normally back to `active`) |

Four of those eight are absent from the blueprint's event list: `cancelled`,
`payment_success`, `payment_failed`, and `payment_recovered`. Without them a
subscription could only ever be `created`, `updated`, or `expired`, and dunning —
the one state the blueprint explicitly asks to test — would never be recorded.
Paused and resumed states are not separate events here; they arrive as
`subscription_updated` with the new status, which the state table in §5 already
covers.

Anything outside that table is **accepted with `200` and recorded as `ignored`**,
not rejected. Lemon Squeezy will happily send new event names, and answering `4xx`
to one it considers important would put it into a retry loop that ends in a
disabled webhook. The unknown name is written to `billing_events` with
`outcome = 'ignored'` so it can be found later rather than guessed at.

**Idempotency** comes from `billing_events`' primary key on the event id. A
replayed delivery — Lemon Squeezy's retry, or a manual replay — hits the
duplicate branch, writes nothing, and still answers `200`. That is what makes
"retry until you get a 200" safe to say out loud.

**Order of checks in the route:** size limit → signature → JSON → shape. A body
larger than the limit is refused before it is hashed, so an unauthenticated
caller cannot buy CPU with a 10 MB body.

## 5. Subscription states

| Status | Access | Why |
| --- | --- | --- |
| `on_trial` | yes | They are inside a trial they were granted |
| `active` | yes | Paid and current |
| `past_due` | yes | The card failed but Lemon Squeezy is still retrying; cutting access on the first failure punishes an expired card |
| `paused` | yes | They paid for the period they are in |
| `cancelled` | yes | Cancelling stops the renewal, not the period already paid for |
| `unpaid` | no | Lemon Squeezy gave up retrying; there is no paid period left |
| `expired` | no | Terminal |
| `none` | no | Never subscribed |

`hasPremiumAccess` in `lib/billing/status.ts` is the only place this table is
encoded, and the switch is exhaustive: adding a status without deciding its rule
is a TypeScript error, not a silent "no access".

## 6. Test mode

`LEMONSQUEEZY_TEST_MODE=1` makes every checkout carry `"test_mode": true`, and
Lemon Squeezy then sends webhooks whose payloads carry `test_mode: true`. Every
billing row stores that flag.

The flag is sent as an explicit boolean, never omitted. Omitting it means "the
store's default", which becomes "production" the day the store goes live — and a
preview deploy would start taking real payments with nobody noticing.

Reading code filters test rows out of anything a customer sees (the entitlement
route and `/dashboard/account`); operator queries should include them on purpose
when reconciling a test purchase.

## 7. Owner runbook

Do these in order. Steps 1–3 are database work, 4–6 are Lemon Squeezy dashboard
work, and the last step is the only one that can take real money.

1. **Apply the migration.** *Done in production on 2026-11-19.*
   `supabase/migrations/20261113000300_billing.sql`, through the SQL editor or
   one migration at a time. Do not run `npx supabase db push` against
   production: its migration history uses different version names from the
   files in this repository, so `db push` would try to re-run every migration
   until `supabase migration repair` aligns them. It creates
   `billing_customers`, `billing_subscriptions`, `billing_orders`,
   `billing_events`, `private.billing_settings`, the `apply_billing_event`
   function, and the RLS policies that let a customer read only their own rows.
2. **Insert the bridge digest** into `private.billing_settings`, using the same
   value you set as `BILLING_BRIDGE_SECRET` (§3 has the SQL).
3. **Set the three Worker secrets**: `npx wrangler secret put LEMONSQUEEZY_API_KEY`,
   `… LEMONSQUEEZY_WEBHOOK_SECRET`, `… BILLING_BRIDGE_SECRET`, each with
   `--name researchwithme`. Set `LEMONSQUEEZY_STORE_ID`, the two catalogue
   variants (`LEMONSQUEEZY_VARIANT_TEARDOWN`, `LEMONSQUEEZY_VARIANT_STAT_TABLES`)
   and `LEMONSQUEEZY_TEST_MODE=1` the same way, as secrets. They are not
   confidential, but `wrangler.jsonc` has no `vars` block, and variables set only
   in the dashboard are removed by the next `wrangler deploy`; secrets persist.
   (`LEMONSQUEEZY_VARIANT_COPILOT` is not needed: the co-pilot is withdrawn.)
4. **Create the webhook** in the Lemon Squeezy dashboard: URL
   `https://<your-domain>/api/webhooks/lemonsqueezy`, signing secret the same
   value as `LEMONSQUEEZY_WEBHOOK_SECRET`, and at minimum the four events the
   blueprint names (`order_created`, `subscription_created`, `subscription_updated`,
   `subscription_expired`) plus the payment sub-events in §4.
5. **Test-mode purchase.** With the store in test mode, buy each of the two
   products using Lemon Squeezy's test card (`4242 4242 4242 4242`, any future
   expiry, any CVC). For each one confirm three things: a row in the matching
   table with `test_mode = true`, a `200` in the webhook delivery log, and the
   purchase visible on `/dashboard/account` for the account whose `user_id` was
   passed to the checkout.
6. **Simulate a failed payment.** In the Lemon Squeezy dashboard, use the
   subscription's "simulate failed payment" action. Confirm the subscription row
   moves to `past_due`, that `/dashboard/account` still grants access and shows
   the payment warning, and that a later success returns it to `active`.
7. **Switch production keys last.** Replace the API key and variant IDs with live
   values, clear `LEMONSQUEEZY_TEST_MODE`, and repeat one real purchase of the
   cheapest product. Refund it afterwards — that exercises the refund path in the
   merchant of record without leaving a charge behind.

If step 5 shows a `401`/`403` blurb in the delivery log, it is the signature
secret (§7.4) or the raw body being re-serialised before hashing. If it shows a
`500` with `billing_bridge_unauthorized`, it is §7.2. If it shows `503`, the
deployment's environment is incomplete — the response says which variable.

## 8. Not in scope

Three follow-on specs came out of the blueprint's scope split and are deliberately
absent from this repository:

- **Licence keys and software delivery.** The Teardown System is delivered as a
  file; there is no licence server, no activation check, and no "members area"
  for downloads.
- **The 1-on-1 Soundboard Audit booking flow.** Calendly or Tally embedded through
  Zapier/Make, with a manuscript intake form landing in Google Drive. That is
  a service, which Lemon Squeezy prohibits, so it cannot be sold through this
  integration at all.
- **Tax and invoicing beyond the merchant of record.** Lemon Squeezy is the MoR,
  so it files and remits. Nothing in this repository computes tax, stores a VAT
  number, or renders an invoice PDF.

Two further departures worth naming because they differ from the blueprint's
letter: there is **no Prisma** (this repository has no ORM; schema changes are SQL
migrations) and **no variant ID in a checkout URL** (the blueprint's
`checkout[buy_now]=...` URL form predates the checkout API; `POST /v1/checkouts`
with a `variant` relationship is what Lemon Squeezy documents, and it is what
`lib/billing/checkout.ts` sends).

## Product files

The files for every download are built from `products/` (`python products/build.py`) into `products/downloads/`.

- Paid, uploaded to their product in the Lemon Squeezy store: The Teardown System ($19), Manuscript Check ($5),
  and the full Statistical Table Generator ($5). The Teardown System and the Statistical Table Generator are in the catalogue; each shows "Not on sale yet" until its variant ID (`LEMONSQUEEZY_VARIANT_TEARDOWN`, `LEMONSQUEEZY_VARIANT_STAT_TABLES`) is set.
  Manuscript Check waits for Lemon Squeezy's written reply.
- Free, served by the site from `public/downloads` and listed on `/pricing` with no checkout and no account:
  the free edition of Manuscript Check and the Research Toolkit.

## Store product setup

Values for Lemon Squeezy's **Store → Products → New product** form, one product
per catalogue entry. Create them with the store in **test mode** first; test and
live variant IDs differ (§7.7). Names and descriptions follow
`lib/billing/catalogue.ts`, so the store and `/pricing` say the same thing, and
the same copy rules apply: no invented numbers, nothing promised that the
download does not contain.

### Fields shared by every product

| Field | Value | Why |
| --- | --- | --- |
| Pricing | **Single payment** | Every catalogue product is `mode: 'payment'`. No subscriptions (§1). |
| Pricing model | **Standard pricing** | The price is fixed by the catalogue, not by the buyer. |
| Tax category | The **e-book / digital publication** category for the Teardown System; the **downloadable (installed) software, personal use** category for the two programs | The form defaults to *SaaS*, which is wrong for all three: nothing is hosted, the buyer downloads files. The category drives the VAT rate Lemon Squeezy applies as merchant of record, so pick the closest label the dropdown offers. |
| Media | Optional; leave empty until there is a 1600 × 1200 product image | No product imagery exists in the repository yet. |
| Files | The product's zip from `products/downloads/` | Built by `python products/build.py`; see *Product files*. |
| Variants | **None**: keep the single default variant | Its ID is the `LEMONSQUEEZY_VARIANT_*` value. A second variant would need a catalogue change. |
| Generate license keys | **Off** | There is no licence server or activation check (§8). |
| Display product on storefront | **Off** | Purchases are linked to an account only through `custom.user_id`, which `lib/billing/checkout.ts` sets. A storefront purchase carries no user id, so `apply_billing_event` records it as `ignored` (`missing_user_id`) and the buyer's account never shows it. Sell only through `/pricing`. |
| Confirmation modal: title | `Thanks for your order!` | Default is fine. |
| Confirmation modal: button text / link | `Download your files` → `https://app.lemonsqueezy.com/my-orders` | Applies only outside the site's checkout: `lib/billing/checkout.ts` overrides the link with `redirect_url` (`/dashboard/account`). |
| Email receipt: button text / link | `Download your files` → `https://app.lemonsqueezy.com/my-orders` | Same: site checkouts override both with `Open your account` → `/dashboard/account`. |

> **Check during the first test purchase (§7.5):** site checkouts send the
> confirmation modal and the receipt button to `/dashboard/account`, and that page
> lists purchases but does not link to the files, which live on Lemon Squeezy's
> order page. Confirm the buyer can still reach the download (for example from
> the receipt email). If not, either stop overriding `receipt_link_url` in
> `lib/billing/checkout.ts` so the receipt keeps Lemon Squeezy's order link, or
> add a "Download your files" link to `https://app.lemonsqueezy.com/my-orders` on
> the account page.

### 1. The Teardown System → `LEMONSQUEEZY_VARIANT_TEARDOWN`

| Field | Value |
| --- | --- |
| Name | `The Teardown System` |
| Description | `A step-by-step method for auditing research code: pin the commit, read before you run, log each claim, and write a record others can check. PDF + templates.` (156 characters) |
| Price | `$19` |
| Files | `teardown-system-1.0.0.zip`: method guide (PDF), reading checklist (PDF), claim ledger (CSV and XLSX), run-log and teardown-record templates, licence |
| Confirmation modal: message | `Your files are ready: the method guide, the reading checklist, the claim ledger and the record templates. Start with The-Teardown-System.pdf.` |
| Email receipt: thank-you note | `Thank you for buying The Teardown System. Start with The-Teardown-System.pdf; the templates follow its six stages.` |

### 2. Statistical Table Generator → `LEMONSQUEEZY_VARIANT_STAT_TABLES`

| Field | Value |
| --- | --- |
| Name | `Statistical Table Generator` |
| Description | `Turn a CSV file into APA 7 tables and print-ready figures on your own computer. 21 analyses, a draft sentence per result. Needs Python 3.8+. No data uploaded.` (158 characters) |
| Price | `$5` |
| Files | `statistical-table-generator-1.0.0.zip`: full edition (`apa_tables.py`, `apa_more.py`, `figures.py`, `statdist.py`), guide (PDF), sample data, licence |
| Confirmation modal: message | `Unzip the download and open Statistical-Table-Generator.pdf first. You need Python 3.8 or later and a terminal; try it on sample-data.csv.` |
| Email receipt: thank-you note | `Thank you for buying the Statistical Table Generator. Your data never leaves your computer; start with the guide PDF.` |

### Held: Manuscript Check (do not publish yet)

Waiting for Lemon Squeezy's written reply (see *Product files*), and not a
catalogue key, so a store product would sell nothing through the site. Prepared
values for when it is cleared and added to `lib/billing/catalogue.ts`:

| Field | Value |
| --- | --- |
| Name | `Manuscript Check` |
| Description | `Three programs that check a manuscript, its references, and your reply to reviewers before you submit. Runs on your computer with Python 3.8+. One payment.` (155 characters) |
| Price | `$5` |
| Files | `manuscript-check-1.0.0.zip` (full edition) |

### Not store products

Manuscript Editing and the Research Co-Pilot are withdrawn (§1). The free
Manuscript Check edition and the Research Toolkit are served from
`public/downloads`; creating them as *Lead magnet* products would add a second,
unlinked copy.

## When nothing can be bought

`isPurchasable` (`lib/billing/catalogue.ts`) is true only when `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`
and the product's variant variable are set. Until then `/pricing` shows "Not on sale yet" in place of the buy
button and the account page offers nothing to buy. To open sales: create the product in the store, attach its
zip, and set the three variables.
