---
version: 1
slug: "app-login-page-tsx"
primary_target: "app/login/page.tsx"
related_targets: ["components/auth/LoginForm.tsx","lib/supabase/oauth.ts","lib/cms/auth.ts"]
---

# Editorial Sign-In

Mode: Operate

## Purpose
Give a reader or editor a safe, unambiguous way into the studio, and explain local demo mode without pretending an account exists.

## First useful result
A reader signs in with Google, LinkedIn, Discord, or a password and lands on the URL they originally requested; a signed-in account without editor access is told why the studio is closed, can still reach their dashboard, and is offered the writer application; an operator without credentials understands how to connect Supabase.

## Direction
A reading-room invitation rather than a SaaS card: an editorial column explaining the studio, one focused form, and a setup panel in demo mode. Warm paper, amber actions, no illustration. Three provider buttons stack above the email form, each with the mark people recognise and an explicit "Opening …" state; the email form remains the fallback for accounts without a social identity.

## Constraints
- Uses the shared platform masthead and footer (BlogHeader/BlogFooter), identical to the public pages; no bespoke studio chrome. The studio sidebar is page content, not site chrome.
- WCAG 2.1 AA contrast, visible focus, labelled inputs, and announced auth errors. Provider buttons are in one labelled group; the icons are decorative.
- Reflow to 320px; the form never causes horizontal scrolling. The three provider buttons keep their order (Google, LinkedIn, Discord) and remain full-width at every breakpoint.
- OAuth codes are exchanged on /auth/callback, never on a protected route; the `next` path is sanitised against external and protocol-relative targets.
- Provider buttons only for providers actually enabled in Supabase Auth (Google, LinkedIn OIDC, Discord). Discord asks for `openid identify email connections` — never `bot`, guild, or permission scopes. GitHub and ORCID are identity links on an existing session, not ways in — they never appear here. No fabricated SSO. Sign-in never implies studio access.
- Errors state the recovery; input survives a failed attempt. A disabled provider says so in words rather than opening a blank window.

## Checks
Wrong password, unknown email, cancelled consent on any of the three providers, a provider disabled in Supabase, a provider that shares no email, a Discord account with no verified email, already-signed-in state, signed-in-but-not-editor state (dashboard link present), provider error returned to /login, demo mode, and mobile keyboard behaviour.
