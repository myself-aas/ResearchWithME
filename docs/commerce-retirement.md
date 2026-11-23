# Product sales retirement — 2026-11-20

ResearchWithMe is a research publication, not a store. Do not reintroduce product offers, checkout, paid subscriptions, or sales calls to action.

## Removed

- `/pricing`, its OfferCatalog structured data, and its navigation/sitemap entries.
- Checkout and entitlement APIs and the payment-provider webhook handler.
- The billing catalogue, store, signature/event processing, purchase status logic, overlay script, checkout button, and sales showcase/article note.
- All `products/` sources, packaging scripts, guides, and product-only tests; public product ZIP downloads.
- Account plan, credits, purchases, and buying UI. Free API keys, monthly usage, profile/identity links, and settings remain.
- Sales messaging on Home, About, Contact, and article pages.
- Payment-provider script/frame CSP allowances, environment examples, deployment setup instructions, and the product CLI CI step.
- Commerce-only documentation, launch plans, and marketing/design instructions. Mixed historical audits retain clearly marked historical findings rather than retroactively changing evidence.

The publication's reviews, review evidence, author profiles, citations, research assistant, reading lists, and independent free API quota system are not products for sale and remain intact.

## Database boundary

`supabase/migrations/20261120000100_retire_commerce.sql` is a **forward migration**, not a rewrite of applied migration history. It:

1. Drops both legacy billing RPC functions and the private billing bridge-secret table.
2. Revokes billing table/sequence access from PUBLIC and application roles, including `service_role`.
3. Removes customer billing-read policies; archived tables retain RLS.
4. Preserves historical customer/order/subscription/event records for owner-reviewed retention obligations.
5. Leaves the independent API-key/quota tables, RPCs, and secret untouched.

The original billing migration remains solely for reproducible migration history. No hosted database was modified during this change. Any future erasure of historical financial records requires a separate owner-reviewed retention decision.

## Deployment handoff (not executed)

Repository deletion does not turn off an already-deployed storefront or hosted payment links.

1. Disable the former products/checkout links and webhook delivery at the payment provider. Review any real recurring subscriptions and outstanding customer obligations there; removing application code does not cancel them.
2. Deploy this branch so old storefront, payment endpoints, and product download paths are no longer served. Purge any separately configured CDN/static download caches as appropriate.
3. Apply the forward retirement migration through the normal reviewed migration process.
4. Remove obsolete `LEMONSQUEEZY_*` variables/secrets and `BILLING_BRIDGE_SECRET` from production/preview deployment settings. Do not remove `API_BRIDGE_SECRET` or the LinkedIn/editorial secrets.
5. Smoke-test research pages and account/API keys. Confirm retired routes/downloads are unavailable and no payment scripts load.

No payment-provider account, live deployment, or production secret settings were changed in this task.

## Validation

- **123 focused Vitest tests pass** across account rendering/failure states, free API keys and quota, assistant API requests, header navigation, home feed, OpenAPI/catalogue coverage, retired-surface regression guards, and CSP.
- `node supabase/tests/commerce-retirement.check.mjs` passes with externally installed PGlite: real historical migration followed by retirement, repeated application, retained records, removed RPCs/secret, revoked table/sequence grants, RLS/policies, and independent API-secret preservation. No hosted database or payment service calls.
- Source scan checks all application/component/library production TS/TSX files for sales-route imports, links, payment configuration and OfferCatalog remnants.
- All **58 offline review/preparation tests** still pass; research deliverables remain intact.
- Syntax transpilation of all 16 changed tracked TS/TSX files reports no errors; this is not a full typecheck.
- `git diff --check` passes.
- Full `npm test` was attempted: **123 files passed, 48 failed; 796 tests passed and 8 failed**. Numerous suites cannot load dependencies absent from this selectively installed environment (including Zod, Zustand, Plate, email packages, axe-core); login tests also fail with an undefined React element. This is not a full-suite pass and these failures were not fixed as part of commerce removal.
- Full `npm run typecheck` was attempted and is not passing: missing application/E2E dependencies, associated inferred-type errors, and the review preview's missing `ImportMeta.glob` typing remain. No production build or real-browser acceptance pass is claimed.

PGlite is an optional offline verification dependency, not added to the application's package manifest. Install it outside the repository and expose it through `PGLITE_PATH` if it is not otherwise resolvable.

## Clean-install validation follow-up

The subsequent GitHub Actions repair replaced the selective dependency setup with canonical `npm ci`. Full lint, typecheck, all 1,115 Vitest tests, production build, bundle budget, and machine release checks now pass locally. This supersedes the earlier validation failures above; see `docs/audits/github-actions-repair-2026-11-20.md` for scope and remote/browser status.
