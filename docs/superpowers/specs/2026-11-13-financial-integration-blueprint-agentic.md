# Agentic Technical Integration Plan: ResearchWithMe Financial Infrastructure

This document outlines the end-to-end technical implementation for integrating Lemon Squeezy as a Merchant of Record (MoR) into ResearchWithMe. 

This plan is structured using the **Superpowers Software Development Methodology** to ensure agentic efficiency, strict Test-Driven Development (TDD), and systematic root-cause debugging.

---

## Phase 0: Brainstorming & Spec Agreement (`brainstorming`)
*Do not write any code until this phase is signed off.*
1. **Design Document Generation:** Validate the exact user flow for the $19 Teardown System, the AI Co-Pilot Subscription, and the Pay-What-You-Want Manuscript Review. 
2. **Architecture Sign-off:** Ensure the payout pipeline (Lemon Squeezy → Payoneer → DBBL) is configured in the respective dashboards before initializing the local development environment. Store `LEMON_SQUEEZY_WEBHOOK_SECRET` and API keys in secure `.env.local` files.

---

## Phase 1: Environment Isolation (`using-git-worktrees`)
Before modifying the ResearchWithMe core, the agent must isolate the workspace to protect the main branch.
1. **Branch Creation:** Create a new isolated Git worktree: `git switch -c feature/lemon-squeezy-integration`
2. **Baseline Verification:** Run the existing project test suite (e.g., `npm test` or `pytest`) to verify a clean red/green baseline before introducing billing logic.

---

## Phase 2: Implementation Plan (`writing-plans`)
The agent will break the integration down into bite-sized engineering tasks (2-5 minutes each). Every task requires exact file paths, complete code snippets, and strict verification steps.

### Task 2.1: Database Schema Migration
*   **Target:** `prisma/schema.prisma` (or equivalent ORM file)
*   **Action:** Add fields for `lemon_squeezy_customer_id` (String), `subscription_status` (Enum), `subscription_plan` (String), and `ai_credits` (Integer) to the `User` model.
*   **Verification:** Run the migration generation command.

### Task 2.2: Frontend Lemon.js Injection
*   **Target:** `pages/_app.tsx` or `app/layout.tsx`
*   **Action:** Inject `<script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>` into the document head.
*   **Verification:** Verify script loads in the DOM without blocking hydration.

### Task 2.3: Checkout Button Component (`test-driven-development`)
*   **Target:** `components/CheckoutButton.tsx` and `components/CheckoutButton.test.tsx`
*   **TDD Cycle (RED-GREEN-REFACTOR):**
    1.  **RED:** Write a test asserting that clicking the button calls `window.LemonSqueezy.Url.Open()` with a mock Variant ID and User ID appended to the URL (`?checkout[custom][user_id]=X`). Watch it fail.
    2.  **GREEN:** Implement the component to bind to Lemon.js and pass the `custom_data` object correctly. Watch the test pass.
    3.  **REFACTOR:** Ensure the UI matches the academic/developer aesthetic (e.g., passing `{ dark: true }` to the overlay).

### Task 2.4: Secure Webhook Endpoint (`test-driven-development`)
*   **Target:** `api/webhooks/lemonsqueezy.ts` and `api/webhooks/lemonsqueezy.test.ts`
*   **TDD Cycle:**
    1.  **RED:** Write failing tests for (A) rejecting requests with missing signatures, (B) rejecting invalid cryptographic signatures, and (C) successfully parsing a valid payload.
    2.  **GREEN:** Implement the `crypto.createHmac('sha256', secret)` logic to verify the `x-signature` header against the raw request body. Parse the `order_created` and `subscription_created` events.
    3.  **REFACTOR:** Extract the signature verification logic into a reusable middleware or utility function.

---

## Phase 3: Execution & Review (`subagent-driven-development`)
The agent will execute the tasks outlined in Phase 2 inline. 
1. **Requesting Code Review:** After completing the components and webhook endpoints, the agent will invoke `requesting-code-review` to inspect the code against the Phase 0 spec.
2. **Verification Before Completion:** If webhook tests fail, the agent will invoke `systematic-debugging` to trace the root cause (e.g., raw body parsing issues in Next.js) rather than guessing solutions.

---

## Phase 4: Delivery Automations (Make.com/Zapier Routing)
Once the local code is merged, configure the external No-Code routing for service fulfillment based on the Lemon Squeezy custom data payloads.

1. **1-on-1 Audits:** Zapier listens to the LS Webhook → Generates a single-use Calendly link → Emails the link to `checkout[email]`.
2. **Manuscript Review:** Zapier listens to LS Webhook → Emails a secure Tally form to collect the `.docx` file → Routes the uploaded file to the ResearchWithMe Google Drive.

---

## Phase 5: Testing & Go-Live (`finishing-a-development-branch`)
1. **Enable Test Mode:** Switch Lemon Squeezy to Test Mode. Buy the Teardown System and book an Audit using test cards.
2. **E2E Verification:** Check the local database to ensure `user_id` received `ai_credits` successfully.
3. **Cleanup:** Once all tests pass, the agent will present merge options (PR creation), clean up the worktree, and finalize the branch.