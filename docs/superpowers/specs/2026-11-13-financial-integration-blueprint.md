# Advanced Technical Integration Plan: ResearchWithMe Financial Infrastructure

This document outlines the end-to-end technical implementation for integrating Lemon Squeezy as a Merchant of Record (MoR) into ResearchWithMe, routing payments to Payoneer, and automating digital product delivery, SaaS subscriptions, and 1-on-1 service bookings.

---

## Phase 1: Core Account & Banking Pipeline Setup
Before writing any code, the financial routing must be established to ensure compliance and seamless DBBL payouts.

### Step 1.1: Payoneer to DBBL Configuration
1. Log into **Payoneer**. Navigate to **Receive > Global Payment Service**.
2. Provision a **US Receiving Account** (USD). Note the Routing (ABA) and Account Number.
3. Navigate to **Withdraw & Transfer > Manage Bank Accounts**.
4. Add your **Dutch-Bangla Bank Limited (DBBL)** account. 
   * **Currency:** BDT.
   * **Routing Number:** Ensure you use the specific 9-digit routing number for your local Mymensingh DBBL branch.

### Step 1.2: Lemon Squeezy Store & Payout Setup
1. Create a **Lemon Squeezy** account and set up your Store (ResearchWithMe).
2. Go to **Settings > Payouts**.
3. Select **Bank Account** and input the Payoneer USD Routing and Account numbers.
4. Go to **Settings > API**. Generate a **Production API Key** and a **Test API Key**. Store these securely in your backend environment variables (e.g., `.env.production` and `.env.local`).

---

## Phase 2: Product Configuration & Checkout Generation
Configure your offerings in the Lemon Squeezy dashboard so they can be referenced via API.

### Step 2.1: Digital Products (The $19 Teardown System)
1. Create a new product: **Single payment**, Digital Good.
2. Upload the Notion Link (as a PDF instruction sheet) or ZIP file directly to Lemon Squeezy (LS handles the secure file delivery).
3. Generate the **Checkout Link**.

### Step 2.2: SaaS Subscriptions (Premium AI Co-Pilot)
1. Create a new product: **Subscription**.
2. Define pricing: $9/month. 
3. Note the `Product ID` and `Variant ID`. You will need these to generate dynamic checkout links via the API for users logged into ResearchWithMe.

### Step 2.3: Pay-As-You-Go & Variable Pricing (Editing Services)
1. Create a product called "Manuscript Editing".
2. Enable **"Pay what you want"** (PWYW) with a minimum price (e.g., $150). 
3. *Alternative:* Create specific Variants for word-count tiers (e.g., Variant A: <3k words, Variant B: 3k-5k words).

---

## Phase 3: Frontend Integration (ResearchWithMe UI)
Use the Lemon.js SDK to create seamless, on-site checkout overlays so users never leave the ResearchWithMe domain.

### Step 3.1: Install Lemon.js
Add the Lemon.js script to your frontend application (e.g., Next.js `_app.tsx` or `index.html`):
`<script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>`

### Step 3.2: Initialize and Bind Checkouts
Bind the checkout to your pricing buttons. Instead of redirecting users, trigger a popup overlay:

```javascript
// Example for React/Next.js
const handleCheckout = () => {
    window.createLemonSqueezy();
    window.LemonSqueezy.Url.Open(
        'https://researchwithme.lemonsqueezy.com/checkout/buy/YOUR_VARIANT_ID',
        { dark: true } // Matches academic/developer aesthetic
    );
};
```

### Step 3.3: Passing User Data to Checkout
To ensure the purchase links to the logged-in ResearchWithMe user, pass custom data (like their User ID) to the checkout link:
`?checkout[custom][user_id]=user_12345&checkout[email]=user@email.com`
*This is critical for Phase 4 so your database knows who paid.*

---

## Phase 4: Backend Automation & Webhook Architecture
Lemon Squeezy will notify your backend when a payment succeeds, fails, or a subscription is canceled.

### Step 4.1: Database Schema Updates
Add the following fields to your `Users` table (PostgreSQL/MongoDB):
*   `lemon_squeezy_customer_id` (String)
*   `subscription_status` (Enum: active, past_due, canceled, none)
*   `subscription_plan` (String)
*   `ai_credits` (Integer)

### Step 4.2: Creating the Webhook Endpoint
Create a secure endpoint (e.g., `POST /api/webhooks/lemonsqueezy`) to listen for events. 

**Critical Events to Listen For:**
*   `order_created` (For single purchases and adding credits)
*   `subscription_created` (To unlock the SaaS tier)
*   `subscription_updated` / `subscription_expired` (To revoke access)

### Step 4.3: Cryptographic Signature Verification (Security)
You MUST verify that the webhook actually came from Lemon Squeezy.

```javascript
// Node.js/Express Example
const crypto = require('crypto');

app.post('/api/webhooks/lemonsqueezy', express.raw({type: 'application/json'}), (req, res) => {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    const signature = req.headers['x-signature'];

    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
        return res.status(403).send('Invalid signature');
    }

    const event = JSON.parse(req.body).meta.custom_data;
    // Process the event (e.g., update DB using event.user_id)
    res.status(200).send('Webhook received');
});
```

---

## Phase 5: Service Delivery & No-Code Routing (Make.com/Zapier)
For services that require human intervention (1-on-1 calls, manuscript reviews), route the webhooks through an automation platform to handle the logistics.

### Step 5.1: 1-on-1 Audits (Calendly Integration)
1. User buys "The Soundboard Audit" via Lemon Squeezy.
2. Webhook triggers Make.com / Zapier.
3. Zapier generates a single-use **Calendly** scheduling link.
4. Zapier sends an automated email (via SendGrid/Gmail) to the user: *"Thanks for booking the audit! Click here to schedule your time."*

### Step 5.2: Manuscript Review Intake
1. User buys the "Manuscript Critique".
2. Webhook triggers Zapier.
3. Zapier sends an email with a secure **Tally Form** or **Google Form** link.
4. The user uploads their `.docx` file and target journal info.
5. Zapier routes the uploaded file into a specific Google Drive folder and sends you a Slack/Email notification to begin the review.

---

## Phase 6: Testing & Go-Live Protocol

1. **Enable Test Mode:** In Lemon Squeezy, switch to Test Mode. 
2. **Simulate Purchases:** Use LS's provided test credit card numbers to buy the Teardown System, book an Audit, and subscribe to the AI Co-Pilot.
3. **Verify Webhooks:** Check your backend database to ensure the `user_id` successfully received the `ai_credits` or `subscription_status = active`.
4. **Test Dunning:** Manually trigger a "payment failed" webhook in the LS dashboard to ensure your database revokes user access correctly.
5. **Production Switch:** Swap your Test API keys for Production API keys, disable Test Mode in LS, and deploy to your live domain. 