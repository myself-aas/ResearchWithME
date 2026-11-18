# Supabase editorial CMS

The attachment titled *Full-Stack Next.js & Supabase Free Tier Blogging CMS Blueprint* is implemented here as the production backend for this platform. The reader, editorial studio, comments, and cache invalidation all use one content model; there is no parallel blog bolted onto the site.

The CMS has two adapters behind one interface:

| Mode | When | Storage | Auth |
| --- | --- | --- | --- |
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are set at build time | `posts`, `comments`, `editors`, and `author_applications` tables, `blog-images` bucket | Supabase email/password, Google, LinkedIn (OIDC), and Discord; RLS on every table |
| **Local demo** | Either variable is missing | `data/cms-posts.json`, `data/cms-comments.json` (atomic writes) | No accounts; the studio is open on the server it runs on |

Local demo mode exists so the app builds, runs, and can be reviewed without cloud credentials. It is not a production configuration.

## Blueprint → repository map

| Blueprint step | Implementation | What changed and why |
| --- | --- | --- |
| 1.1 `posts` / `comments` tables | `supabase/migrations/20261025000100_cms_schema.sql` | Keeps the blueprint columns and adds the article metadata the reader already renders: subtitle, summary, category, format, byline, cover, tags, takeaways, reading time, likes, timestamps. Drafts may be incomplete; a check constraint enforces publish-ready content. |
| 1.2 RLS policies | Same migration | Public reads are limited to published posts. Writes require `authenticated`. Comments are public-read and public-insert with length checks, but **append-only** (no update policy). Likes go through one narrow `SECURITY DEFINER` function. |
| 1.3 `blog-images` bucket | `supabase/migrations/20261025000200_cms_storage.sql` | Public read; authenticated upload/replace/delete. The bucket enforces 5 MB and JPEG/PNG/WebP/AVIF/GIF. |
| 1.4 Realtime | Same schema migration | Adds both tables to `supabase_realtime` with guards so re-running the migration is safe. The studio and the public discussion subscribe as a progressive enhancement. |
| 2.1 Dependencies | `package.json` | `@supabase/ssr`, `@supabase/supabase-js`, `react-markdown`, `remark-gfm`, Plate, and `@mdxeditor/editor`. `/write` uses Plate; the dashboard editor retains MDXEditor. |
| 2.2 Environment | `.env.example` | Documents the two public Supabase values and the revalidation secret. Public values are inlined at build time. |
| 2.3 Image optimizer | `next.config.ts` | Remote pattern derived from `NEXT_PUBLIC_SUPABASE_URL`, limited to `/storage/v1/object/public/**`. No wildcard host. |
| 2.4 Upload helper | `lib/supabase/storage.ts` | Validates type and size before upload, writes to `uploads/<year>/<month>/<unique>`, returns the public URL. |
| 3.1 Middleware | `middleware.ts` | Refreshes the Supabase session and protects `/dashboard/**`. With no credentials it steps aside so local demo mode remains usable. |
| 3.2 Dashboard layout | `app/dashboard/layout.tsx`, `components/cms/DashboardShell.tsx` | Rebuilt in the platform's design language. Responsive nav instead of a fixed 16rem sidebar, no modal, explicit sign-out states. |
| 4.1 Editor styles | `components/cms/styles.ts`, `app/globals.css` | No `@apply` overrides for a third-party editor. Tokens come from the design system. |
| 4.2 Rich editor | `components/editor/PlateBodyEditor.tsx`, `components/cms/MarkdownEditor.tsx` | `/write` uses Plate with visual and Markdown modes; the dashboard uses MDXEditor. Both store Markdown. The `/write` preview renders Markdown without raw HTML. |
| 4.3 Login | `app/login/page.tsx`, `components/auth/LoginForm.tsx`, `lib/supabase/oauth.ts` | Google, LinkedIn (OIDC), Discord, or email and password. The redirect returns to `/auth/callback` (`app/auth/callback/route.ts`), which exchanges the PKCE code server-side and sends the user to `next`. Signed-in readers can open their dashboard, or go to `/dashboard/access` to apply for publishing access. Provider setup: `docs/sign-in-providers.md`. |
| 4.4 Apply to write | `app/dashboard/access/page.tsx`, `components/dashboard/AuthorApplication.tsx` | Any signed-in account connects a GitHub or ORCID identity with `auth.linkIdentity` and applies. `apply_as_author()` records the request; an editor approves it from `/dashboard/applications`, which writes the `public.editors` row. |
| 4.4 New article | `app/dashboard/page.tsx`, `components/cms/PostEditor.tsx` | Shared create/edit form with server-side validation, inline field errors, focus management, unsaved-change warning, cover library, takeaways, and draft/publish states. |
| 5.1 Manage articles | `app/dashboard/manage/page.tsx`, `lib/cms/use-cms.ts` | Search and status filters, counts, publish/revert, delete, realtime refetch when Supabase is configured. |
| 5.2 Edit article | `app/dashboard/edit/[id]/page.tsx` | Loads through the API, then reuses `PostEditor`. Status changes are explicit; un-publishing takes a published article off the platform. |
| 5.3 Comment moderation | `app/dashboard/comments/page.tsx` | Joined post titles, filter, two-step delete, realtime refetch. |
| 6.1 Revalidate webhook | `app/api/revalidate/route.ts` | Accepts the secret in `x-revalidate-secret` (query string supported for compatibility), compares it in constant time, revalidates `/`, `/sitemap.xml`, and `/post/<slug>`. Studio writes also revalidate immediately. |
| 6.2 Public feed | Existing `/` feed, `/api/articles`, `lib/cms/catalogue.ts` | Published CMS posts are merged ahead of the bundled catalogue, with derived comment totals. The same catalogue feeds the author archive and the research assistant, so a published article is discoverable everywhere. The blueprint's `/blog` would have duplicated content; the platform keeps one canonical URL (`/post/<slug>`). |
| 6.3 Public comments | Existing `ArticleDiscussion`, `/api/comments` | CMS posts use a `cms-<id>` namespace. The same component posts, displays, and (in the studio) subscribes to changes. |
| 6.4 Article rendering | Existing `/post/[slug]`, `components/MarkdownBody.tsx` | Server-rendered Markdown with GFM tables, code, quotes, and safe external links. Unknown bylines do not produce broken author links. |

## Data model

`posts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint identity` | Public id is namespaced as `cms-<id>` |
| `title` | `text` | 1–180 characters; at least 8 to publish |
| `slug` | `text unique` | `^[a-z0-9]+(-[a-z0-9]+)*$`, 1–96 characters |
| `content` | `text` | Markdown, up to 200,000 characters; at least 200 to publish |
| `status` | `text` | `draft` or `published` |
| `subtitle`, `summary` | `text` | Summary needs 40 characters to publish |
| `category`, `format` | `text` | Constrained to the platform's lists in the app |
| `author_id`, `author_name` | `text` | Byline must be one of the verified profiles in `lib/blog-data.ts` |
| `cover_image` | `text` | Bundled `/images/…` or this project's storage bucket |
| `tags` | `text[]` | Up to 8 |
| `key_takeaways` | `text[]` | Up to 8; at least 1 to publish |
| `read_time`, `featured`, `likes` | `text`, `boolean`, `integer` | Reading time is derived from the body |
| `published_at`, `inserted_at`, `updated_at` | `timestamptz` | Maintained by triggers |

`comments`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint identity` | |
| `post_id` | `bigint` | `references posts(id) on delete cascade` |
| `author_name`, `author_role` | `text` | 1–120 / ≤80 characters |
| `content` | `text` | 2–4,000 characters |
| `inserted_at` | `timestamptz` | Server default |

## Setup

1. **Create a Supabase project** and copy the project URL and anon key.
2. **Configure the app** in `.env.local`:

   ```env
   NEXT_PUBLIC_SITE_URL="http://localhost:3000"   # your real origin in production
   NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<sb_publishable_… key>"   # or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY
   REVALIDATE_SECRET="<openssl rand -hex 32>"
   ```

3. **Apply the migrations** with the Supabase CLI:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```

   Or paste each file in `supabase/migrations/` into the SQL editor in order. The storage migration creates the `blog-images` bucket and its policies.

4. **Enable sign-in providers.** Authentication → Sign In / Providers: Email, Google, LinkedIn (OIDC), Discord, GitHub, and ORCID. Google, LinkedIn, and Discord are the three social sign-in buttons (`openid email profile`, `openid profile email`, and `openid identify email connections` respectively); GitHub and ORCID are identity links only, attached from `/dashboard/access` to apply as a writer. LinkedIn must be the **OIDC** provider, not the deprecated legacy one, and its email setting can stay optional because LinkedIn may not release an address. Details: `docs/sign-in-providers.md`. ORCID is a custom OIDC provider: add it under Custom providers with the identifier `orcid` (the app calls it as `custom:orcid`), issuer `https://orcid.org`, scope `openid`, and the client ID and secret from an ORCID Public API app. Two settings are easy to miss and both stop ORCID linking: turn on **Allow manual linking** (Authentication → Sign In / Providers → User Signups), because `/dashboard/access` attaches the provider with `auth.linkIdentity`; and mark email as **optional** on the ORCID custom provider, because ORCID's `openid` scope returns no email address and Supabase otherwise rejects the callback. Supabase stores the linked identity under the provider name `custom:orcid`; `lib/supabase/identities.ts` maps that back to `orcid`. A failed link returns to `/dashboard/access?link_error=…` with the reason. Open sign-up is safe because an account alone grants no studio access (see step 5). For each OAuth app, the provider's callback URL is the one Supabase shows (`https://<project-ref>.supabase.co/auth/v1/callback`), not this site.
5. **Grant editor access.** The `20261028000100_editor_allowlist.sql` migration gates every studio write, draft read, comment moderation, and image upload on `public.editors`. After an editor has signed in once, add them in the SQL editor:
   ```sql
   insert into public.editors (user_id, note)
   select id, 'editor' from auth.users where email = 'editor@example.org'
   on conflict (user_id) do nothing;
   ```
6. **Allow redirects.** Supabase → Authentication → URL Configuration:
   - Site URL: `https://<your-origin>`
   - Redirect URLs: `https://<your-origin>/auth/callback` (add `http://localhost:3000/auth/callback` for local development)
   For the configured project, enter `https://bxyjjbclaklzjxeumeat.supabase.co/auth/v1/callback` in each OAuth provider's console. In Supabase, allow the **application** callback URLs instead: `https://researchwith.me/auth/callback`, `https://www.researchwith.me/auth/callback`, and local/preview origins as needed. These are separate settings. Set the Site URL to the production origin and ensure sign-ups are enabled in Supabase Auth if new users should register.

   Google, LinkedIn, and Discord sign-ins — and GitHub/ORCID identity links — return to `/auth/callback?next=…`, which exchanges the PKCE code server-side and continues to `next`. OAuth uses same-tab navigation; open the site directly rather than inside an embedded preview if the provider blocks iframe navigation. New accounts are readers until an editor approves their application. If sign-in fails, check the displayed error, enabled provider credentials and callback URLs, and rebuild after changing the public environment variables.
7. **Configure the cache webhook (optional).** Database → Webhooks → *Create*:
   - Table: `posts`; events: insert, update, delete
   - URL: `https://<your-origin>/api/revalidate`
   - HTTP header: `x-revalidate-secret: <REVALIDATE_SECRET>`

   Studio writes already call `revalidatePath`, so the webhook mainly covers edits made directly in Supabase.
7. **Rebuild.** `NEXT_PUBLIC_*` values are inlined by Next.js; changing them requires a new build.

## Rendering and caching

- `/post/[slug]` is server-rendered on demand with `revalidate = 30`. It mixes bundled articles with live CMS rows, so it cannot be limited to build-time slugs; the route cache keeps repeat reads fast, and studio writes revalidate the path immediately.
- The article route has **no** streaming fallback above it. Next.js cannot send a 404 once a response has started streaming, so the previous root `loading.tsx` turned every missing article into an HTTP 200 soft 404. Removing that global boundary restored real 404s and removed the full-page loader flash on navigation.
- `/` and the author archive re-render from `/api/articles`, which merges CMS posts ahead of the bundled catalogue. The author archive keeps bundled posts on screen while the API refreshes it, so the profile never flashes empty.
- Comment totals on feed cards come from one bounded id scan (`listCommentCounts`), shared by both adapters. The assistant indexes the same catalogue, so a new article can be cited without a rebuild.
- The sitemap is regenerated on revalidation and includes published CMS slugs.

## Verify

```bash
npm run quality             # lint, typecheck, 51 tests, source detector
npm run build               # production build
npm start                   # then open /login and /dashboard

# Revalidation endpoint (expects 200 with the header, 401 without)
curl -i -X POST http://localhost:3000/api/revalidate \
  -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -H "content-type: application/json" \
  -d '{"table":"posts","record":{"slug":"inside-paged-attention"}}'
```

Manual checks for a configured project: sign in, save a draft, edit it, publish it, confirm it appears on `/` and `/post/<slug>`, post a comment, delete it in `/dashboard/comments`, revert the article to draft, and confirm it disappears from the platform.

## Security model

- **RLS everywhere.** Anonymous visitors can only read published posts and append comments to published posts that satisfy the length constraints; comments on drafts never leave the studio. Only accounts listed in `public.editors` (checked by `public.is_editor()`) can read drafts, create, update, or delete posts, moderate comments, or upload images. Any other signed-in account is a reader. No update policy exists on comments, so they are immutable.
- **No service-role key in the app.** Every request runs with the user's session or the anon key; RLS is the boundary. This keeps the deployment safe if a server bundle leaks.
- **Writes go through route handlers** (`/api/cms/*`) rather than direct browser CRUD. The handlers validate with the same schema as the editor, enforce origin checks, and apply per-IP rate limits. RLS remains a second line of defence.
- **Sanitised rendering.** `react-markdown` does not render raw HTML. Link and image URLs are filtered; covers may only come from this project's storage bucket or the bundled editorial images.
- **Secret handling.** The revalidation secret is compared with `timingSafeEqual` over SHA-256 digests, accepts a header rather than a query string, and is never exposed to the browser.
- **Session handling.** Middleware refreshes cookies on `/dashboard/**`; the dashboard layout re-checks the user server-side, and `app/dashboard/(studio)/layout.tsx` layers the editor gate on top of the session gate. OAuth codes are exchanged on `/auth/callback` rather than on a protected route. The app gate (`requireEditor`) and RLS both fail closed if the allowlist cannot be read.
- **Writer applications.** `public.author_applications` has no `INSERT`/`UPDATE`/`DELETE` policies — every write goes through `apply_as_author()` or `review_author_application()`, both `security definer` with an empty `search_path`. `apply_as_author()` refuses a provider the caller has not linked (`identity_not_linked`) and stores the handle from `auth.identities`, ignoring the one in the request, so the queue shows identifiers the provider returned. Approval inserts the `public.editors` row inside the function, so a reviewer can grant access only to the applicant the database resolved from the application id.
- **Comments are append-only** for readers and editors. Moderation can delete but not rewrite what a reader said.

## Local demo mode details

- Files: `data/cms-posts.json` and `data/cms-comments.json`. They are git-ignored and created on first write.
- Writes are serialised in-process and committed with a temp-file rename.
- Deleting an article removes its comments (the same cascade as the foreign key).
- Ids are numeric strings, millisecond-free, so the public namespace matches Supabase (`cms-1`, `cms-2`, …).
- The studio and `/api/cms/*` are unauthenticated in this mode. Do not expose a local-mode deployment to the internet.
- `/write` publishes through the same `/api/cms/posts` route as the dashboard, so there is one write path and the JSON archive cannot diverge from the live database. The older `POST /api/articles` handler has been removed.

## Deliberate departures from the attached blueprint

1. **One canonical reader.** The blueprint's `/blog` and `/blog/[slug]` would duplicate `/` and `/post/[slug]` and split SEO signals. Published posts feed the existing routes and sitemap.
2. **Markdown-based editors.** `/write` uses Plate with a lossless Markdown source mode for content the visual editor cannot safely round-trip. The dashboard uses MDXEditor. Both retain the existing Markdown storage format.
3. **Server-mediated mutations** instead of client-side inserts: validation, rate limiting, origin checks, and no direct table access from the browser.
4. **Hardened RLS** instead of `using (true)` for every authenticated operation and an unconstrained public insert: comments are length-checked, scoped to published posts, and immutable, and likes use a two-line function rather than exposing post updates.
5. **Draft-aware constraints.** The blueprint requires content on every row; the CMS allows unfinished drafts and enforces completeness at publish time.
6. **Verified bylines.** Authors come from the platform's credential catalogue rather than a free-text account name, preserving the product's authorship guarantee.

## Open follow-ups

- Add an `authors` table if bylines need to be created without a code change; today the verified catalogue lives in `lib/blog-data.ts`.
- Add CAPTCHA or an edge rate limiter before comments are opened to significant traffic.
- Add Playwright coverage for the studio flows; the current suite covers schema, mapping, storage adapters, and the secret comparison.
- Add a scheduled job or database trigger to send the revalidation webhook if articles are edited outside the studio.
