# Sign-in provider review — 17 Nov 2026

Surface: `/login`, the auth callback, and the Supabase Auth provider configuration.
Mode: **Operate**.
Method: read the sign-in path end to end (`app/login/page.tsx` → `components/auth/LoginForm.tsx` → `lib/supabase/oauth.ts` → `app/auth/callback/route.ts`), queried the live Supabase project's auth configuration through the management API, and exercised the UI with focused tests. No live OAuth round trip was performed: the build sandbox cannot reach `supabase.co` or the provider consent pages, so the console-side redirect registration remains an owner check (see *Residual*).

## What the review found

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | **LinkedIn was already enabled in Supabase but had no way in from the app.** The project has `external_linkedin_oidc_enabled = true` with a client ID and secret, yet `/login` offered only Google, and the heading said "Two ways in". | High — a configured provider was invisible | Fixed |
| 2 | **A disabled provider produced raw upstream text.** `provider is not enabled` fell through `mapAuthError`, so the page showed Supabase's wording with no next step. | Medium | Fixed |
| 3 | **Provider buttons were text-only.** No Google or LinkedIn mark, which is the recognition cue people scan for. | Low | Fixed |
| 4 | **A signed-in reader was stranded on `/login`.** The "Signed in, without editor access" panel offered only the writer application, not their dashboard. | Medium | Fixed |
| 5 | **The surface brief was stale.** It described GitHub/ORCID sign-in and magic links, neither of which is a sign-in path. | Low | Fixed |
| 6 | **Deployment docs described "two ways" and lumped GitHub/ORCID in with sign-in.** | Medium — setup instructions that produce a broken button | Fixed |

## What changed

- `lib/supabase/oauth.ts` — `OAuthProviderId` gains `linkedin`; the map sends it as **`linkedin_oidc`** with scopes `openid profile email` (the deprecated legacy `linkedin` provider is not used). `SIGN_IN_PROVIDERS` is exported as the rendered list, and `startOAuthSignIn` accepts an injectable navigation function so the redirect is testable. GitHub and ORCID remain identity links (`linkScholarlyIdentity`), untouched.
- `components/auth/LoginForm.tsx` — one labelled provider group with **Continue with Google** and **Continue with LinkedIn**, each with its mark and an "Opening …" pending state; the email form remains below. Copy now says three ways in. A disabled provider gets a plain-English error. The signed-in-without-editor panel gains **Go to your dashboard** as its primary action.
- `docs/sign-in-providers.md` — provider matrix, scopes, the Supabase configuration that was verified, provider-console callback URLs, failure messages, and the operator checklist.
- `docs/deployment.md` — topology and §5.4 updated to Email + Google + LinkedIn (OIDC), with GitHub/ORCID explicitly described as identity links, and the verification checklist now covers both buttons.
- `.impeccable/surfaces/app-login-page-tsx.md` — corrected to the real three-way sign-in and the reader dashboard path.

## Verified

Supabase project `bxyjjbclaklzjxeumeat`, read on 17 Nov 2026 (secrets withheld):

| Fact | Value |
| --- | --- |
| Google provider | enabled, client ID present, secret present |
| LinkedIn OIDC provider | enabled, client ID present, secret present, email optional |
| GitHub provider | enabled (identity link only) |
| Signups | allowed (`disable_signup = false`) |
| Manual linking | enabled (needed for `linkIdentity`) |
| Site URL | `https://researchwith.me` |
| Redirect allow list | contains `https://researchwith.me/auth/callback**`, `https://www.researchwith.me/auth/callback`, `http://localhost:3000/auth/callback**` |

Application checks:

- Provider mapping and scopes asserted for both buttons; LinkedIn is sent as `linkedin_oidc`, never `linkedin`.
- The callback path is sanitised: a protocol-relative or external `next` falls back to `/`, and `/login`/`/auth/callback` cannot be used as a destination.
- Missing authorization URL and provider errors surface on the page without navigating away.
- Clicking either button calls `startOAuthSignIn` with the requested `next`; LinkedIn is a sign-in, not an identity link.
- `npx tsc --noEmit`, `npx eslint app components lib`, and the full Vitest suite pass.

## Residual (owner actions, not code)

1. **Provider consoles.** Google Cloud and the LinkedIn app must list `https://bxyjjbclaklzjxeumeat.supabase.co/auth/v1/callback` as the authorized redirect URI. Supabase's configuration is correct; these consoles cannot be inspected from this repository or sandbox.
2. **Preview origins.** OAuth from an ephemeral preview host only works if that origin is added to Supabase's redirect allow list. Production and `localhost:3000` are covered; preview hosts are not, by design.
3. **LinkedIn email is optional.** LinkedIn may return no email. The app accepts the account and treats the email as unknown; profile creation then asks for a slug instead of suggesting one. Documented in `docs/sign-in-providers.md` rather than papered over.
4. **Live consent cannot be automated here.** A real click-through (Google and LinkedIn) remains the final acceptance check on a network that can reach both providers.
