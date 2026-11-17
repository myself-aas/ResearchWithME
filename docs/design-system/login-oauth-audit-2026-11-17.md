# Sign-in provider review — 17 Nov 2026

Surface: `/login`, the auth callback, and the Supabase Auth provider configuration.
Mode: **Operate**.
Method: read the sign-in path end to end (`app/login/page.tsx` → `components/auth/LoginForm.tsx` → `lib/supabase/oauth.ts` → `app/auth/callback/route.ts`), queried the live Supabase project's auth configuration through the management API, checked the owner-supplied LinkedIn and Discord console pages, and exercised the UI with focused tests. No live OAuth round trip was performed: the build sandbox cannot reach `supabase.co` or the provider consent pages, so a real click-through remains the final acceptance check.

## What the review found

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | **LinkedIn was enabled in Supabase but had no way in from the app.** `external_linkedin_oidc_enabled = true` with a client ID and secret, yet `/login` offered only Google and the copy said "Two ways in". | High — a configured provider was invisible | Fixed |
| 2 | **Discord was enabled in Supabase but had no way in either.** `external_discord_enabled = true`, client ID `1572352685854687392` matching the Discord application, secret present. | High | Fixed |
| 3 | **A disabled provider produced raw upstream text.** `provider is not enabled` fell through `mapAuthError`. | Medium | Fixed |
| 4 | **Provider buttons were text-only.** No Google/LinkedIn mark for the cue people scan for. | Low | Fixed |
| 5 | **A signed-in reader was stranded on `/login`.** The "without editor access" panel offered only the writer application. | Medium | Fixed |
| 6 | **The surface brief was stale.** It described GitHub/ORCID sign-in and magic links, neither of which is a sign-in path. | Low | Fixed |
| 7 | **Deployment docs described "two ways" and lumped GitHub/ORCID in with sign-in.** | Medium — setup instructions that produce a broken button | Fixed |
| 8 | **The supplied Discord URL was a bot install link, not an OAuth sign-in URL.** It carried `bot`, `guilds`, and `permissions=8` (administrator). Reusing it for sign-in would ask readers to hand the app control of their servers. | High if copied | Guarded — the app requests `identify email` only, and a test asserts `bot`/`guilds` never appear in the scopes. |

## What changed

- `lib/supabase/oauth.ts` — `OAuthProviderId` gains `linkedin` and `discord`. LinkedIn maps to **`linkedin_oidc`** (`openid profile email`, not the deprecated legacy connector); Discord maps to **`discord`** (`identify email`). `SIGN_IN_PROVIDERS` is exported as the rendered list, and `startOAuthSignIn` accepts an injectable navigation function so the redirect is testable. GitHub and ORCID remain identity links (`linkScholarlyIdentity`), untouched.
- `components/auth/LoginForm.tsx` — one labelled group of three full-width provider buttons (**Google**, **LinkedIn**, **Discord**), each with its mark and an "Opening …" state; the email form remains below. Copy now says four ways in. A disabled provider gets a plain-English error. The signed-in-without-editor panel gains **Go to your dashboard** as its primary action.
- `docs/sign-in-providers.md` — provider matrix, scopes, the verified Supabase configuration, provider-console callback URLs (including Discord's OAuth2 redirect setting), failure messages, the bot-URL warning, and the operator checklist.
- `docs/deployment.md`, `docs/supabase-cms.md` — topology, setup, and verification checklists updated to Email + Google + LinkedIn (OIDC) + Discord, with GitHub/ORCID explicitly described as identity links.
- `.impeccable/surfaces/app-login-page-tsx.md` — corrected to the real four-way sign-in, the three provider buttons, and the reader dashboard path.

## Verified

Supabase project `bxyjjbclaklzjxeumeat`, read on 17 Nov 2026 (secrets withheld):

| Fact | Value |
| --- | --- |
| Google provider | enabled, client ID present, secret present |
| LinkedIn OIDC provider | enabled, client ID present, secret present, email optional |
| Discord provider | enabled, client ID `1572352685854687392` (matches the Discord application), secret present, email required |
| GitHub provider | enabled (identity link only) |
| Signups | allowed (`disable_signup = false`) |
| Manual linking | enabled (needed for `linkIdentity`) |
| Site URL | `https://researchwith.me` |
| Redirect allow list | contains `https://researchwith.me/auth/callback**`, `https://www.researchwith.me/auth/callback`, `http://localhost:3000/auth/callback**` |

Provider-console evidence supplied by the owner:

- LinkedIn app `reme.` lists `https://bxyjjbclaklzjxeumeat.supabase.co/auth/v1/callback` as its only authorized redirect URL, with `openid`, `profile`, `email` (and `w_member_social` for posting) approved. Sign-in does not request the posting scope.
- Discord application `reme.` uses application ID `1572352685854687392`, matching Supabase's configured client ID. Its OAuth2 redirect list still needs to be confirmed against the same Supabase callback.

Application checks:

- Provider mapping and scopes asserted for all three buttons; LinkedIn is sent as `linkedin_oidc`, never `linkedin`; Discord as `discord` with exactly `identify email`.
- A regression test fails if `bot`, `guilds`, or permission scopes are added to the Discord sign-in request.
- The callback path is sanitised: a protocol-relative or external `next` falls back to `/`, and `/login`/`/auth/callback` cannot be used as a destination.
- Missing authorization URL and provider errors surface on the page without navigating away.
- Clicking any provider button calls `startOAuthSignIn` with the requested `next`; all three are sign-ins, not identity links.
- `npx tsc --noEmit`, `npx eslint app components lib`, and the full Vitest suite pass.

## Residual (owner actions, not code)

1. **Google console.** The Google OAuth client must list `https://bxyjjbclaklzjxeumeat.supabase.co/auth/v1/callback` as its authorized redirect URI. Supabase's side is correct; the console page was not supplied, so this is unconfirmed.
2. **Discord console.** Confirm **OAuth2 → Redirects** contains the same Supabase callback. The general-information page supplied does not show that list. Use the Copy button in Discord's OAuth2 tab, not the bot install URL.
3. **Preview origins.** OAuth from an ephemeral preview host only works if that origin is added to Supabase's redirect allow list. Production and `localhost:3000` are covered; preview hosts are not, by design.
4. **LinkedIn email is optional.** LinkedIn may return no email. The app accepts the account and treats the email as unknown; profile creation then asks for a slug instead of suggesting one. Documented in `docs/sign-in-providers.md` rather than papered over.
5. **Live consent cannot be automated here.** A real click-through for Google, LinkedIn, and Discord remains the final acceptance check on a network that can reach all three providers.
