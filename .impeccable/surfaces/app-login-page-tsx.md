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
An editor signs in with a password or magic link and lands on the studio URL they originally requested; an operator without credentials understands how to connect Supabase.

## Direction
A reading-room invitation rather than a SaaS card: an editorial column explaining the studio, one focused form, and a setup panel in demo mode. Warm paper, amber actions, no illustration.

## Constraints
- WCAG 2.1 AA contrast, visible focus, labelled inputs, and announced auth errors.
- Reflow to 320px; the form never causes horizontal scrolling.
- Magic-link codes are exchanged on /login, never on a protected route.
- No public sign-up and no fabricated SSO buttons.
- Errors state the recovery; input survives a failed attempt.

## Checks
Wrong password, unknown email, expired magic link, missing email for a link, already-signed-in state, demo mode, and mobile keyboard behaviour.
