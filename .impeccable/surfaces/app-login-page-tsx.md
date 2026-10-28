---
version: 1
slug: "app-login-page-tsx"
primary_target: "app/login/page.tsx"
related_targets: ["components/auth/LoginForm.tsx","lib/cms/auth.ts"]
---

# Editorial Sign-In

Mode: Operate

## Purpose
Give an editor a safe, unambiguous way into the studio, and explain local demo mode without pretending an account exists.

## First useful result
A user signs in with Google, GitHub, a password, or a magic link and lands on the URL they originally requested; a signed-in account without editor access is told why the studio is closed and how to get access; an operator without credentials understands how to connect Supabase.

## Direction
A reading-room invitation rather than a SaaS card: an editorial column explaining the studio, one focused form, and a setup panel in demo mode. Warm paper, amber actions, no illustration.

## Constraints
- WCAG 2.1 AA contrast, visible focus, labelled inputs, and announced auth errors.
- Reflow to 320px; the form never causes horizontal scrolling.
- OAuth and magic-link codes are exchanged on /auth/callback, never on a protected route.
- Provider buttons only for providers actually enabled in Supabase Auth (Google, GitHub); no fabricated SSO. Sign-in never implies studio access.
- Errors state the recovery; input survives a failed attempt.

## Checks
Wrong password, unknown email, expired magic link, missing email for a link, already-signed-in state, signed-in-but-not-editor state, provider error returned to /login, demo mode, and mobile keyboard behaviour.
