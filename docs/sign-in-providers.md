# Sign-in providers

ResearchWithMe signs readers in with **Google**, **LinkedIn (OpenID Connect)**, or **email and password**. All three create or resume a normal reader session. Publishing access is separate: it comes from the `editors` allowlist and the writer application, never from the provider that was used to sign in.

## What the application does

| Provider | Supabase identifier (`provider`) | Scopes requested | Button |
| --- | --- | --- | --- |
| Google | `google` | `openid email profile` | Continue with Google |
| LinkedIn | `linkedin_oidc` | `openid profile email` | Continue with LinkedIn |
| Email + password | — | — | Sign in |

- `lib/supabase/oauth.ts` is the single place that maps a UI provider to a Supabase provider and its scopes. `SIGN_IN_PROVIDERS` is the list rendered on `/login`.
- The redirect target is always `/auth/callback?next=<safe path>`. `lib/safe-redirect.ts` rejects absolute, protocol-relative, backslash, control-character, `/login`, and `/auth/callback` targets, so an OAuth round trip cannot be turned into an open redirect.
- `/auth/callback` exchanges the PKCE code **server-side** with `@supabase/ssr`, then redirects to `next` (default `/dashboard`). Provider errors return to `/login` with an escaped `error_description`; identity-link failures return to `/dashboard/access`.
- `startOAuthSignIn` uses `skipBrowserRedirect` and navigates only after Supabase returns an authorization URL. A provider that is disabled produces an error on the page, not a blank tab.
- GitHub and ORCID are **not** sign-in buttons. They are identity links (`linkIdentity`) attached to an existing account when applying to write, so connecting them cannot replace a reader's session.

## Supabase project configuration

Project: `bxyjjbclaklzjxeumeat` (`https://bxyjjbclaklzjxeumeat.supabase.co`).

Verified through the Supabase management API on 17 Nov 2026:

| Setting | Value | Why it matters |
| --- | --- | --- |
| `external_google_enabled` | `true` | Google button works; client ID and secret are present. |
| `external_linkedin_oidc_enabled` | `true` | LinkedIn button uses the OIDC connector; client ID and secret are present. |
| `external_linkedin_oidc_email_optional` | `true` | LinkedIn does not always release an email address. Accounts can still be created; the app treats a missing email as empty rather than inventing one. |
| `external_github_enabled` | `true` | Identity link only, for writer applications. |
| `disable_signup` | `false` | A first OAuth sign-in creates a reader account. |
| `security_manual_linking_enabled` | `true` | Required for `linkIdentity` on an existing session. |
| Site URL | `https://researchwith.me` | Origin used when a redirect has no explicit target. |
| Redirect URLs | `https://researchwith.me/auth/callback**`, `https://www.researchwith.me/auth/callback`, `http://localhost:3000/auth/callback**` | Must include every origin the app is served from, including preview deployments. |

Secrets stay in Supabase. Nothing in this repository contains a provider client secret, and none should be added.

### Provider consoles

Each provider must also trust Supabase's callback:

```
https://bxyjjbclaklzjxeumeat.supabase.co/auth/v1/callback
```

- **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client**: add that URL as an *Authorized redirect URI*. The app's own `/auth/callback` is a different URL and must not be used here.
- **LinkedIn Developers → App → Auth → Authorized redirect URLs**: add the same Supabase URL. The app needs the **Sign In with LinkedIn using OpenID Connect** product (scopes `openid`, `profile`, `email`). The legacy "Sign In with LinkedIn" product is closed to new apps and is not used.

LinkedIn posting (`/api/admin/linkedin/*`, `lib/linkedin/*`) is a separate integration with its own LinkedIn app credentials. Do not reuse the sign-in provider's secret for posting.

## Enabling or changing a provider

1. In Supabase → **Authentication → Providers**, enable Google or LinkedIn (OIDC) and paste the client ID and secret from the provider console.
2. Confirm the provider's redirect URL is the Supabase callback above, not `researchwith.me/auth/callback`.
3. In Supabase → **Authentication → URL Configuration**, keep the site `/auth/callback` entries for every deployed origin.
4. Deploy the UI change: add the provider to `SIGN_IN_PROVIDERS` and the button group in `components/auth/LoginForm.tsx`.
5. Verify: `/login` → button → provider consent → `https://researchwith.me/auth/callback?code=…` → `/dashboard`.

## Failure modes and what the page says

| Upstream message | What the reader sees |
| --- | --- |
| `access_denied` / cancelled consent | "Sign-in was cancelled on the provider's page…" |
| `redirect_to is not allowed` | "This address is not registered for sign-in…" |
| `Error getting user email from external provider` | "The provider did not share an email address…" |
| Provider disabled in Supabase | "That sign-in provider is not switched on yet…" |
| Signups disabled | "New accounts are not being accepted at the moment…" |

## Checks

- `npx vitest run lib/__tests__/oauth-signin.test.ts lib/__tests__/login-form-actions.test.tsx lib/__tests__/login-error.test.tsx`
- Signed-out `/login` shows one provider group with both buttons and the email form.
- A Google sign-in lands on `/dashboard` with a reader session.
- A LinkedIn sign-in does the same, with or without an emailed address.
- A signed-in reader can reach `/dashboard` from `/login` instead of being stranded on the "without editor access" panel.
- GitHub and ORCID still appear only as identity links on `/dashboard/access`.
