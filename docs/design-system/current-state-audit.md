# Current-State Audit — ResearchWithME (Stage 0)

Date: 2026-11-09. Spec: `docs/pieme-design-system-v3.1.md` (πeme v3.1, stable-candidate).
Branch: `arena/d5fd6236-researchwithme`. Token-layer retokenization to πeme v3.1 already landed (`c522005`, `6932467`).

## Framework and versions

- **Framework:** Next.js 15.5 (App Router) + React 19.2 + TypeScript 5.9 (strict, `tsc --noEmit` gate).
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"`, `@theme inline` in `app/globals.css`), PostCSS, `tw-animate-css`, `@tailwindcss/typography`. No CSS-in-JS.
- **Package manager:** `bun@1.4.4` per `packageManager` (`bun.lock` canonical; a stale `package-lock.json` also exists — flagged as risk R-01). Node ≥20.9.
- **Backend/DB:** Supabase (Postgres + RLS + storage + realtime) via `@supabase/ssr`; local JSON adapters (`data/cms-posts.json`) when env vars are absent. Tables: `posts`, `comments`, `profiles`, `editors`, `author_applications`.
- **Deploy:** Cloudflare Workers via `@opennextjs/cloudflare` (OpenNext), `wrangler.jsonc`, KV cache namespace. `output: 'standalone'`.
- **Email:** React Email 6 + Resend (`emails/`, `lib/email/`), templates now on πeme palette.
- **Video:** HeyGen Hyperframes projects under `videos/*` (`.hyperframes`, compositions); no Remotion dependency yet. `components/VideoEmbed.tsx` embeds them.
- **AI:** `/api/research-assistant` (Gemini via `@google/genai`, catalog-grounded, deterministic fallback), `/api/generate` + `QwenCoverGenerator` (HF Space via `@gradio/client`).
- **Editor:** `@mdxeditor/editor` in `components/cms/MarkdownEditor.tsx`; autosave in `/write`.
- **Charts:** `recharts` in `AuthorImpactRadarChart.tsx`.

## Build, rendering, routing

- App Router, server components by default; `'use client'` in 48 files; `import 'server-only'` in 5 lib files.
- 19 page routes (`/`, `/post/[slug]`, `/papers`, `/paper/[slug]`, `/authors`, `/author/[id]`, `/editions`, `/editorial-board`, `/assistant`, `/cite`, `/bookmarks`, `/login`, `/dashboard*`, `/write`, `/category/[slug]`); 17 API routes; `middleware.ts` session refresh + studio protection.
- Metadata/sitemap/robots/OG/manifest in `app/`; fonts self-hosted via `next/font/local` (`app/fonts/` Newsreader + Inter).

## State and data flows

- CMS store abstraction `lib/cms/store.ts` with local + Supabase adapters; writes server-mediated through `/api/cms/*` (validation, rate limit, origin check, RLS second layer). No service-role key client-side.
- Auth: Supabase email/password + Google OAuth, PKCE exchange at `/auth/callback`; publishing gated by `public.editors`; applications via `public.author_applications`. Authorization is server-enforced (good; keep).
- Reading list/bookmarks/newsletter in `localStorage`; catalogue in `data/*.json`.

## Tests, CI, quality

- Vitest: 17 files, 223 tests (validation, CMS schema/mapping/stores, auth callback, citations, email rendering, rate limit, safe redirect, SVG, production-env). All pass.
- ESLint 9 flat config (`next/core-web-vitals` + `next/typescript` + `jsx-a11y`), `npm run lint` clean. `npm run quality` = lint + typecheck + test + `impeccable detect app components` (currently 0 findings).
- **No CI workflows** (`.github/workflows/` absent despite README references) — risk R-02.
- Prior full audit: `docs/audit-2026-10-25.md` — axe WCAG 2.1 A/AA 0 violations on 14 routes, CLS 0, LCP 80–390 ms local, Impeccable 20/20 after remediation.

## Gaps vs πeme v3.1 (summary; details in sibling docs)

- No token build pipeline (single source of truth → CSS/TS/JSON/SCSS outputs) — tokens live inline in `globals.css`.
- No scholarly domain schemas (Source/SourceVersion/Evidence/Claim/…): CMS model is posts/comments only.
- No trust model dimensions, provenance graph, review threads, integrity events, retraction propagation.
- No i18n (English only; no locale routing, no Bangla, no RTL).
- No dark/system theme toggle (only `.dark-surface` components; πeme dark tokens defined but no UI switch); no forced-colors testing.
- No offline/conflict handling beyond localStorage; no idempotency keys on writes.
- No axe-core in test suite (manual audit only); no visual regression; no e2e.
- No `packages/` monorepo — modular structure must live under existing source dirs.
- Performance budgets not enforced in CI (no CI).
