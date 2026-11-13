# ResearchWithMe Archival Editorial Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor ResearchWithMe (`researchwith.me`) into a Minimalist Archival Editorial experience with `motion` catalog transitions, a `cmdk` + `fuse.js` Command Palette, persistent `zustand` Reading List and Digest preferences, `lenis` reader scrolling, and `@radix-ui` inline citation and specialist verification popovers across both Cloudflare Pages (Vite) and Next.js builds.

**Architecture:** All tokens compile from `tokens/src/*.json` into `tokens/generated/tokens.css`, consumed in lockstep by `app/globals.css` (Next.js) and `cloudflare-pages/src/globals.css` (Vite Pages -> `cloudflare-pages/dist/`). Shared client components in `components/` and stores/utilities in `lib/` run across both targets via the `cloudflare-pages/src/compat/*` bridge without importing Node-only or `server-only` modules. Heavy interactive surfaces (`CommandPalette` and `useSession`'s Supabase client) load lazily and `lenis` mounts only on reader routes so the `/` shell stays under the 200 KB gzip budget (`scripts/check-budgets.mjs`).

**Tech Stack:** React 19, Vite 7 (`cloudflare-pages/`), Next.js 15 (`app/`), TypeScript 5.9, Tailwind CSS v4, `motion`, `cmdk`, `fuse.js`, `@radix-ui/react-popover`, `@radix-ui/react-dialog`, `zustand` (`persist`), `lenis`, Vitest 3 + `axe-core`.

**Spec:** `DESIGN.md`, `PRODUCT.md`, `docs/reme-design-system-v3.1.md`, `docs/migration-baseline.md`

## Global Constraints

- **Light (Archival Paper) tokens:** Background `#FAF9F6`, Surface `#F3F1EC`, Ink `#121214`, Muted `#5C5C63`, Hairline Border `rgba(18, 18, 20, 0.10)`, Single Accent `#1D4ED8` (`on-primary` `#FFFFFF`).
- **Dark (Obsidian) tokens:** Background `#0C0D10`, Surface `#14161B`, Ink `#F2F2F5`, Muted `#9496A1`, Hairline Border `rgba(255, 255, 255, 0.10)`, Single Accent `#60A5FA` (`on-primary` `#0C0D10` for >= 4.5:1 WCAG AA contrast).
- **Strict single-accent rule:** `#1D4ED8` (Light) / `#60A5FA` (Dark) is used strictly for active filters, verified specialist badges, inline citation triggers, and focus outlines — never decorative gradients or secondary accent buttons.
- **Typography stacks:** Display/Headlines `'Newsreader', Georgia, serif`; UI/Body `'Inter', system-ui, sans-serif`; Monospace `'JetBrains Mono', monospace` (DOIs `10.5555/rwm`, ISSN `2994-0821`, ORCIDs, GitHub metrics, code); Bengali `'Noto Serif Bengali', 'Hind Siliguri', sans-serif` (retaining `'Noto Sans Bengali'` fallback for `:root[lang="bn"]` test parity; zero external Google Fonts CDN calls).
- **Layout & reading measure:** Crisp `1px` hairline dividers (`border-line`), no heavy card drop shadows, generous whitespace, and max reading width `68ch` (`max-w-[68ch]`) on long-form articles and papers.
- **Catalog taxonomy:** Preserve all 6 editorial columns (`Research Reviews`, `GitHub Repo Teardowns`, `STEM & Tech`, `Health & Medicine`, `Sociology & Culture`, `Data & Policy`) and all 5 formats (`Paper Review`, `Repo Teardown`, `Deep-Dive Essay`, `Field Notes`, `Case Study`).
- **Non-destructive preservation:** Keep all existing routes (`/`, `/articles` redirect alias, `/category/[slug]`, `/post/[slug]`, `/papers`, `/paper/[slug]`, `/authors`, `/author/[id]`, `/editions`, `/editorial-board`, `/assistant`, `/bookmarks`, `/cite`, `/api-docs`, `/login`, `/write`, `/dashboard/*`), all 24 `app/api/` operations (`test/contracts/baseline.test.ts`), `ISSN 2994-0821`, DOI prefix `10.5555/rwm`, `CC BY 4.0` notices, SSR landmarks/titles (`test/pages/*.test.ts`), and 1:1 `en`/`bn` dictionary key parity with >= 35% pseudo-localization expansion.
- **Cloudflare Pages & budget gates:** Zero Node-only or `server-only` imports in shared client modules (`failOnServerOnly()` in `cloudflare-pages/vite.config.ts`); verify both `npm run build` and `npm run build:pages` after each of the 4 phases, keeping `/` shell JS <= 200 KB gzip (`npm run budgets`).

## Review Focus

1. **Blocked or quota-exceeded `localStorage` (private browsing) during bookmark or digest saves:** `usePreferencesStore` must update in-memory session state and navbar badge counts without throwing and expose `storagePersisted: false` so UI surfaces warn the reader instead of silently claiming persistence (pinned in Task 3).
2. **Pasting URL-wrapped, uppercased, or punctuation-suffixed identifiers into `Cmd+K` (`"https://doi.org/10.5555/RWM.POST-1."`, `"https://github.com/vllm-project/vllm/"`, `"https://orcid.org/0000-0001-9234-8812"`):** `searchCatalog()` must strip URL schemes/hosts and trailing punctuation, normalize case, and rank the exact record `#1` ahead of fuzzy partial matches (pinned in Task 4).
3. **Hostile or code-embedded identifiers inside article prose (`` `10.5555/rwm.post-1` ``, Markdown links `[repo](https://...)`, or `</script><script>alert(1)</script>` next to `DOI: 10.5555/rwm.post-1`):** `renderWithInlineCitations()` must skip `<code>`/`<pre>`/`<a>` contexts, never interpret raw HTML, and leave unmatched `[99]` brackets as plain text (pinned in Task 7).
4. **SSR-to-client hydration and no-JS visibility for persisted badge counts and `motion` catalog lists:** Pre-hydration store selectors must return `0`/`false` matching SSR HTML, and `AnimatePresence initial={false}` must emit `opacity: 1` static markup so no-JS crawlers and readers see every card without hydration warnings (pinned in Tasks 3 and 6).
5. **`prefers-reduced-motion: reduce` and `#hash` anchor jumps (`#discussion`, `#main-content`) while `Lenis` is mounted:** `ArticleSmoothScroll` must skip or immediately destroy `Lenis` when reduced motion is active or toggled mid-session, and move keyboard focus to `#hash` targets on click (pinned in Task 8).

---

## File Structure

### Phase 1 — Design Tokens & Typography (Tasks 1–2)
- `lib/tokens/contrast.ts` & `tokens/scripts/check-contrast.mjs` — WCAG luminance/contrast utilities upgraded to alpha-composite `rgba(...)` tokens over `#RRGGBB` backdrops.
- `tokens/src/{primitive,semantic-light,semantic-dark,component}.json` & `tokens/scripts/build.mjs` — Archival Paper & Obsidian token sources and generator (`tokens/generated/*`).
- `DESIGN.md` — Impeccable schema front-matter kept in lockstep with generated token values.
- `app/globals.css` & `cloudflare-pages/src/globals.css` — Shared Tailwind v4 `@theme inline` variables, `68ch` prose measure, `1px` hairlines, and `:root[lang="bn"]` Bengali line-height calibration.
- `app/layout.tsx`, `cloudflare-pages/src/document.tsx`, `components/ThemeToggle.tsx` — Flash-free Light/Dark class bootstrap and accessible theme toggle control.

### Phase 2 — Navigation, `Cmd+K` Search & Persistent Store (Tasks 3–5)
- `package.json`, `next.config.ts`, `lib/supabase/use-session.ts` — Dependency installation, package import tree-shaking, and deferred Supabase browser client import to free ~45 KB gzip in the `/` shell.
- `lib/stores/preferences-store.ts` — Single `zustand` `persist` store (`rwm-preferences-v1`) for Reading List posts/papers, liked posts, Weekly Digest preferences, theme, and one-time legacy `localStorage` migration.
- `lib/search/catalog-index.ts` & `components/search/CommandPalette.tsx` — Normalized identifier + `Fuse.js` search engine and lazy-loaded `@radix-ui/react-dialog` + `cmdk` modal.
- `lib/i18n/messages/{en,bn}.json` & `components/i18n/LocaleSwitcher.tsx` — Bilingual UI keys (`en` + `bn`) with 1:1 parity and hairline switcher styling.
- `components/BlogHeader.tsx`, `components/BlogFooter.tsx`, `components/NewsletterSignup.tsx`, `components/BookmarksPanel.tsx` — Hairline masthead/footer, `Cmd+K` trigger, reactive navbar badges, and Zustand-backed Reading List / Digest panels.
- `app/articles/page.tsx`, `cloudflare-pages/src/routes.tsx`, `cloudflare-pages/src/server/route-data.ts` — Canonical `/articles` -> `/` redirect preserving all documented routes.

### Phase 3 — Animated Catalog Filters & States (Task 6)
- `components/BlogHero.tsx`, `components/HomeFeed.tsx`, `components/FeaturedArticle.tsx`, `components/ArticleFeed.tsx`, `components/PapersArchive.tsx`, `components/AuthorSpotlight.tsx`, `components/AuthorDirectory.tsx` — `LazyMotion` (`domMax`) + `AnimatePresence` + `layout` filtering across all 6 columns and 5 formats, hairline index/article cards, and diagnostic empty states.

### Phase 4 — Interactive `68ch` Reader, Progress Dock, `Lenis` & Popovers (Tasks 7–8)
- `components/reader/InlineCitationPopover.tsx` — `@radix-ui/react-popover` inline citation trigger + one-click BibTeX / APA / DOI copy with polite live-region announcements.
- `components/reader/SpecialistBadgePopover.tsx` — `@radix-ui/react-popover` verified ORCID / GitHub specialist hover/click card.
- `lib/citations-inline.tsx` & `components/MarkdownBody.tsx` — Safe text-node tokenizer converting `[n]`, `DOI`, and `arXiv` markers into `InlineCitationPopover` nodes inside `68ch` prose.
- `components/reader/ArticleSmoothScroll.tsx` & `components/reader/ReadingProgressDock.tsx` — Reader-only `lenis` controller and floating bottom progress/citation/bookmark dock.
- `components/ReadingProgress.tsx`, `components/ReadingActions.tsx`, `components/ArticleInteractions.tsx`, `components/AuthorProfileCard.tsx`, `app/post/[slug]/page.tsx`, `cloudflare-pages/src/routes/post.tsx`, `app/paper/[slug]/page.tsx`, `cloudflare-pages/src/routes/paper.tsx` — Dual-runtime `68ch` archival reader integration.

---

## Phase 1 — Design Tokens & Typography

### Task 1: Archival Paper & Obsidian Token Pipeline + RGBA Contrast Gate

**Files:**
- Modify: `lib/tokens/contrast.ts:1-27`
- Modify: `tokens/scripts/check-contrast.mjs:1-53`
- Modify: `tokens/src/primitive.json:1-168`
- Modify: `tokens/src/semantic-light.json:1-76`
- Modify: `tokens/src/semantic-dark.json:1-76`
- Modify: `tokens/src/component.json:1-44`
- Modify: `tokens/scripts/build.mjs:115-135`
- Modify: `DESIGN.md:1-60`
- Modify: `lib/__tests__/tokens-pipeline.test.ts:1-75`
- Modify: `lib/__tests__/i18n-wiring.test.ts:38-45`

**Interfaces:**
- Consumes: `tokens/src/*.json` raw JSON schemas.
- Produces:
  - `compositeOverHex(color: string, backdropHex?: string): string` and `contrastRatio(fg: string, bg: string): number` in `lib/tokens/contrast.ts` (accepts `#RRGGBB` and `rgba(r, g, b, a)`).
  - Regenerated `tokens/generated/tokens.{css,ts,json,scss,video.css,video.json}` with `--reme-canvas`, `--reme-surface`, `--reme-text-primary`, `--reme-text-secondary`, `--reme-border-subtle`, `--reme-action-primary`, `--reme-action-on-primary`.

- [ ] **Step 1: Write the failing token & RGBA contrast assertions**

Extend `lib/__tests__/tokens-pipeline.test.ts` and update `lib/__tests__/i18n-wiring.test.ts`:

```ts
// In lib/__tests__/tokens-pipeline.test.ts:
it('emits exact Archival Paper (light) and Obsidian (dark) palette tokens', () => {
  expect(tokens.semanticLight.canvas).toBe('#FAF9F6');
  expect(tokens.semanticLight.surface).toBe('#F3F1EC');
  expect(tokens.semanticLight['text-primary']).toBe('#121214');
  expect(tokens.semanticLight['text-secondary']).toBe('#5C5C63');
  expect(tokens.semanticLight['border-subtle']).toBe('rgba(18, 18, 20, 0.10)');
  expect(tokens.semanticLight.action.primary).toBe('#1D4ED8');
  expect(tokens.semanticLight.action['on-primary']).toBe('#FFFFFF');

  expect(tokens.semanticDark.canvas).toBe('#0C0D10');
  expect(tokens.semanticDark.surface).toBe('#14161B');
  expect(tokens.semanticDark['text-primary']).toBe('#F2F2F5');
  expect(tokens.semanticDark['text-secondary']).toBe('#9496A1');
  expect(tokens.semanticDark['border-subtle']).toBe('rgba(255, 255, 255, 0.10)');
  expect(tokens.semanticDark.action.primary).toBe('#60A5FA');
  expect(tokens.semanticDark.action['on-primary']).toBe('#0C0D10');
});

it('computes contrast for rgba() hairline tokens composited over canvas and enforces 4.5:1 on action.on-primary', () => {
  expect(contrastRatio('rgba(18, 18, 20, 0.10)', '#FAF9F6')).toBeGreaterThan(1.1);
  expect(contrastRatio(tokens.semanticLight.action['on-primary'], tokens.semanticLight.action.primary)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(tokens.semanticDark.action['on-primary'], tokens.semanticDark.action.primary)).toBeGreaterThanOrEqual(4.5);
});

// In lib/__tests__/i18n-wiring.test.ts:41:
expect(videoCss).toContain('--reme-video-color-action-primary: #1D4ED8');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/tokens-pipeline.test.ts lib/__tests__/i18n-wiring.test.ts`  
Expected: FAIL (`expected '#F8F7F3' to be '#FAF9F6'`).

- [ ] **Step 3: Implement RGBA compositing and update token JSON sources + `DESIGN.md`**

1. In `lib/tokens/contrast.ts` (and mirror in `tokens/scripts/check-contrast.mjs`), add `compositeOverHex(color: string, backdropHex = '#FAF9F6'): string` parsing `rgba(r, g, b, a)` via `Math.round(channel * a + bgChannel * (1 - a))` before computing `relativeLuminance`, passing `bg` as backdrop inside `contrastRatio(fg, bg)`.
2. Update `tokens/src/primitive.json`: neutral ramp anchored on `#FAF9F6` (`50`), `#F3F1EC` (`100`), `#9496A1` (`400`), `#5C5C63` (`600`), `#14161B` (`900`), `#0C0D10` (`950`); `typography.family` set to `'Newsreader', Georgia, serif`, `'Inter', system-ui, sans-serif`, `'JetBrains Mono', monospace`; `layout.max-width.reading` set to `"68ch"`; `shadow.raised` set to `"none"`.
3. Update `tokens/src/semantic-light.json` and `tokens/src/semantic-dark.json` with the exact Global Constraints hex/rgba values (`focus`, `action.primary`, `action.link`, `trust.verified`, `citation.article` all mapped to `#1D4ED8` in light and `#60A5FA` in dark; `text-tertiary` mapped to `#5C5C63` light / `#9496A1` dark so `text-tertiary on surface` passes >= 4.5:1).
4. Update `tokens/scripts/build.mjs` `video.font.bengali` to include `'Noto Serif Bengali', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif`, sync `DESIGN.md` front-matter colors/fonts to match, and run `npm run tokens:build`.

- [ ] **Step 4: Run token checks and tests to verify they pass**

Run: `npm run tokens:build && npm run tokens:check && npx vitest run lib/__tests__/tokens-pipeline.test.ts lib/__tests__/i18n-wiring.test.ts`  
Expected: PASS (`tokens: validate OK`, `tokens: contrast OK`, all Vitest assertions green).

- [ ] **Step 5: Commit**

```bash
git add lib/tokens/contrast.ts tokens/ DESIGN.md lib/__tests__/tokens-pipeline.test.ts lib/__tests__/i18n-wiring.test.ts
git commit -m "feat(tokens): adopt archival paper and obsidian editorial token palette"
```

---

### Task 2: Dual-Target Stylesheets (`68ch`, Hairlines, Bengali Rhythm) & Flash-Free Theme Toggle

**Files:**
- Modify: `app/globals.css:14-570`
- Modify: `cloudflare-pages/src/globals.css:40-604`
- Modify: `app/layout.tsx:70-99`
- Modify: `cloudflare-pages/src/document.tsx:148-168`
- Create: `components/ThemeToggle.tsx`
- Create: `lib/__tests__/theme-typography.test.tsx`

**Interfaces:**
- Consumes: `--reme-*` CSS variables from `tokens/generated/tokens.css` (Task 1).
- Produces:
  - `export type ThemePreference = 'light' | 'dark' | 'system'`
  - `export function resolveEffectiveTheme(pref: ThemePreference, prefersDark: boolean): 'light' | 'dark'` in `components/ThemeToggle.tsx`
  - `export default function ThemeToggle(): React.JSX.Element` in `components/ThemeToggle.tsx`
  - `THEME_STORAGE_KEY = 'rwm-theme'` read by inline `<head>` bootstrap script in both `app/layout.tsx` and `cloudflare-pages/src/document.tsx`.

- [ ] **Step 1: Write the failing stylesheet & `ThemeToggle` test**

Create `lib/__tests__/theme-typography.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LocaleProvider from '@/components/i18n/LocaleProvider';
import ThemeToggle, { resolveEffectiveTheme } from '@/components/ThemeToggle';

describe('Archival typography, 68ch prose, Bengali rhythm & ThemeToggle', () => {
  it.each(['app/globals.css', 'cloudflare-pages/src/globals.css'])('%s enforces font stacks, 68ch, and bn line-height', (file) => {
    const css = readFileSync(join(process.cwd(), file), 'utf8');
    expect(css).toContain('Hind Siliguri');
    expect(css).toContain('Noto Serif Bengali');
    expect(css).toContain('JetBrains Mono');
    expect(css).toContain('68ch');
    expect(css).toMatch(/:root\[lang="bn"\][\s\S]*line-height:\s*1\.7/);
  });

  it('resolves light/dark preference deterministically and renders an accessible 44px button', () => {
    expect(resolveEffectiveTheme('dark', false)).toBe('dark');
    expect(resolveEffectiveTheme('light', true)).toBe('light');
    expect(resolveEffectiveTheme('system', true)).toBe('dark');
    const html = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(ThemeToggle)));
    expect(html).toContain('min-h-11');
    expect(html).toContain('aria-label=');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/theme-typography.test.tsx`  
Expected: FAIL (`Cannot find module '@/components/ThemeToggle'`).

- [ ] **Step 3: Update both `globals.css` files, document shells, and `components/ThemeToggle.tsx`**

1. In both `app/globals.css` and `cloudflare-pages/src/globals.css`:
   - Set `--font-serif: var(--font-newsreader), 'Newsreader', Georgia, serif;`, `--font-sans: var(--font-inter), 'Inter', system-ui, sans-serif;`, `--font-mono: 'JetBrains Mono', monospace;`, `--font-bengali-editorial: 'Noto Serif Bengali', 'Hind Siliguri', sans-serif;`, `--font-bengali-interface: 'Noto Serif Bengali', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;`.
   - Set `body` default `font-family: var(--font-sans)` (`Inter`), keeping `h1`, `h2`, `.font-serif`, and `.reading-prose` on `var(--font-serif)` (`Newsreader`).
   - Change `p` and `.reading-prose` max-width from `72ch` to `min(100%, 68ch)` and add `.reading-column { max-width: 68ch; }`.
   - Scope `:root[lang="bn"]` rules: `--font-mono: 'JetBrains Mono', 'Noto Serif Bengali', 'Hind Siliguri', monospace;`, `body { line-height: 1.72; letter-spacing: 0; }`, `:is(h1, h2, h3, h4) { line-height: 1.3; letter-spacing: 0; }`, `.reading-prose { line-height: 1.82; hyphens: none; }`.
   - Replace light-only `html .text-stone-400` overrides under `.dark` so dark mode uses `--color-text-secondary` (`#9496A1`) and `--color-text-primary` (`#F2F2F5`) cleanly.
2. In `app/layout.tsx` (`viewport` + `<head>` + `<body className="bg-canvas font-sans text-ink antialiased">`) and `cloudflare-pages/src/document.tsx` (`<meta name="color-scheme" content="light dark">`, `<meta name="theme-color" content="#FAF9F6">`, `<body class="bg-canvas font-sans text-ink antialiased">`), inject a synchronous inline `<script>` reading `localStorage.getItem('rwm-theme')` + `matchMedia('(prefers-color-scheme: dark)')` to toggle `document.documentElement.classList.toggle('dark', isDark)` before first paint.
3. Implement `components/ThemeToggle.tsx` with `min-h-11 min-w-11`, `1px` `border-line`, `Sun`/`Moon` icons from `lucide-react`, persisting `'light' | 'dark'` to `rwm-theme` and updating `document.documentElement.classList`.

- [ ] **Step 4: Verify Phase 1 tests and both production builds**

Run: `npm run tokens:check && npm run lint && npm run typecheck && npm test && npm run build && npm run build:pages`  
Expected: PASS on all Vitest suites, `next build`, and `vite build` (`cloudflare-pages/dist/`).

- [ ] **Step 5: Commit**

```bash
git add app/globals.css cloudflare-pages/src/globals.css app/layout.tsx cloudflare-pages/src/document.tsx components/ThemeToggle.tsx lib/__tests__/theme-typography.test.tsx
git commit -m "feat(ui): configure archival typography, 68ch prose, bengali rhythm, and theme toggle"
```

---

## Phase 2 — Navigation, `Cmd+K` Search & Reading List Store

### Task 3: Interactive Dependencies, Shell-Budget Session Split & Persistent Preferences Store (`zustand`)

**Files:**
- Modify: `package.json:55-110`
- Modify: `next.config.ts:74-78`
- Modify: `lib/supabase/use-session.ts:1-147`
- Create: `lib/stores/preferences-store.ts`
- Create: `lib/__tests__/preferences-store.test.ts`

**Interfaces:**
- Consumes: `lib/storage.ts` (`readStringArray`, `readLocalString`, `writeLocal`) for one-time migration of `rwm_saved_posts`, `rwm_saved_papers`, `rwm_liked_posts`, `rwm_newsletter_subscribed`, `rwm_newsletter_email`.
- Produces in `lib/stores/preferences-store.ts`:
  - `export type DigestTopicKey = 'teardowns' | 'papers' | 'clinical' | 'policy'`
  - `export interface DigestPreferences { subscribed: boolean; email: string; topics: Record<DigestTopicKey, boolean>; updatedAt: string | null }`
  - `export interface PreferencesState`:
    - State: `savedPostIds: string[]`, `savedPaperIds: string[]`, `likedPostIds: string[]`, `digest: DigestPreferences`, `theme: 'light' | 'dark' | 'system'`, `hydrated: boolean`, `storagePersisted: boolean`
    - Actions: `toggleSavedPost(id: string): boolean`, `removeSavedPost(id: string): boolean`, `clearSavedPosts(): void`, `toggleSavedPaper(id: string): boolean`, `setPostLiked(id: string, liked: boolean): void`, `subscribeDigest(email: string, topics: Record<DigestTopicKey, boolean>): boolean`, `setDigestTopic(key: DigestTopicKey, enabled: boolean): void`, `unsubscribeDigest(): void`, `setTheme(theme: 'light' | 'dark' | 'system'): void`
  - SSR-safe hooks: `usePreferencesStore`, `useSavedTotalCount(): number` (returns `0` while `!hydrated`), `useDigestSubscribed(): boolean` (returns `false` while `!hydrated`).

- [ ] **Step 1: Install the interactive stack and write the failing store tests (pinning Review Focus #1 & #4a)**

Install packages first so TypeScript/Vitest resolve `zustand`:
```bash
bun add motion cmdk fuse.js @radix-ui/react-popover @radix-ui/react-dialog zustand lenis
```

Create `lib/__tests__/preferences-store.test.ts`:

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { usePreferencesStore, useSavedTotalCount, migrateLegacyPreferences } from '@/lib/stores/preferences-store';

describe('preferences-store (zustand + persist)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreferencesStore.setState({
      savedPostIds: [],
      savedPaperIds: [],
      likedPostIds: [],
      digest: { subscribed: false, email: '', topics: { teardowns: true, papers: true, clinical: false, policy: false }, updatedAt: null },
      theme: 'system',
      hydrated: true,
      storagePersisted: true,
    });
  });

  it('migrates legacy rwm_saved_posts and rwm_newsletter_* keys once when rwm-preferences-v1 is empty', () => {
    window.localStorage.setItem('rwm_saved_posts', JSON.stringify(['post-1', 'post-2']));
    window.localStorage.setItem('rwm_newsletter_subscribed', 'true');
    window.localStorage.setItem('rwm_newsletter_email', 'ada@ox.ac.uk');
    const migrated = migrateLegacyPreferences();
    expect(migrated.savedPostIds).toEqual(['post-1', 'post-2']);
    expect(migrated.digest.subscribed).toBe(true);
    expect(migrated.digest.email).toBe('ada@ox.ac.uk');
  });

  it('Review Focus #1: updates in-memory state and flags storagePersisted=false when localStorage.setItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const ok = usePreferencesStore.getState().toggleSavedPost('post-1');
    expect(ok).toBe(false);
    expect(usePreferencesStore.getState().savedPostIds).toContain('post-1');
    expect(usePreferencesStore.getState().storagePersisted).toBe(false);
    spy.mockRestore();
  });

  it('Review Focus #4a: returns 0 saved count before client hydration so SSR markup matches', () => {
    usePreferencesStore.setState({ savedPostIds: ['post-1'], hydrated: false });
    function Probe() {
      return createElement('span', null, String(useSavedTotalCount()));
    }
    expect(renderToStaticMarkup(createElement(Probe))).toBe('<span>0</span>');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/preferences-store.test.ts`  
Expected: FAIL (`Cannot find module '@/lib/stores/preferences-store'`).

- [ ] **Step 3: Implement `lib/stores/preferences-store.ts`, `next.config.ts` tree-shaking, and deferred `use-session.ts` import**

1. In `next.config.ts`, set `experimental.optimizePackageImports: ['lucide-react', 'motion', '@radix-ui/react-popover', '@radix-ui/react-dialog']`.
2. In `lib/supabase/use-session.ts`, import `hasSupabaseBrowserConfig` from `./config` instead of `./client`, and lazily `const { getSupabaseBrowserClient } = await import('./client')` inside `useEffect` and `signOut` so `@supabase/supabase-js` is excluded from the initial `/` shell when unconfigured or until after first paint.
3. Implement `lib/stores/preferences-store.ts` using `create<PreferencesState>()(persist(..., { name: 'rwm-preferences-v1', storage: safeLocalStorage }))` where `safeLocalStorage` catches `setItem`/`getItem`/`removeItem` exceptions and flips `storagePersisted` accordingly, runs `migrateLegacyPreferences()` on empty initial hydration, and mirrors `savedPostIds`/`savedPaperIds` to `rwm_saved_posts`/`rwm_saved_papers` when writable.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/preferences-store.test.ts lib/__tests__/auth-callback.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock package-lock.json next.config.ts lib/supabase/use-session.ts lib/stores/preferences-store.ts lib/__tests__/preferences-store.test.ts
git commit -m "feat(store): add persistent zustand preferences store and defer session client chunk"
```

---

### Task 4: Hybrid Catalog Search Index (`fuse.js`) & Accessible `Cmd+K` Command Palette (`cmdk` + `@radix-ui/react-dialog`)

**Files:**
- Create: `lib/search/catalog-index.ts`
- Create: `components/search/CommandPalette.tsx`
- Modify: `lib/i18n/messages/en.json:1-37`
- Modify: `lib/i18n/messages/bn.json:1-37`
- Create: `lib/__tests__/command-palette.test.tsx`

**Interfaces:**
- Consumes: `BlogPost`, `Author` (`@/lib/blog-data`), `Publication`, `EditorialMember`, `EDITORIAL_BOARD` (`@/lib/research-data`), `useLocale` (`@/components/i18n/LocaleProvider`).
- Produces:
  - In `lib/search/catalog-index.ts`:
    - `export type CatalogEntityKind = 'article' | 'paper' | 'specialist' | 'route'`
    - `export interface CatalogSearchItem { id: string; kind: CatalogEntityKind; title: string; subtitle: string; href: string; identifiers: string[]; tags: string[]; specialistName?: string; verifiedVia?: 'orcid' | 'github'; category?: string; format?: string }`
    - `export function normalizeIdentifierQuery(raw: string): string`
    - `export function buildCatalogIndex(input: { articles: BlogPost[]; papers: Publication[]; authors: Author[]; board?: EditorialMember[] }): CatalogSearchItem[]`
    - `export function searchCatalog(query: string, items: CatalogSearchItem[], limit?: number): CatalogSearchItem[]`
  - In `components/search/CommandPalette.tsx`:
    - `export interface CommandPaletteProps { open: boolean; onOpenChange: (open: boolean) => void; initialArticles?: BlogPost[]; initialQuery?: string }`
    - `export default function CommandPalette(props: CommandPaletteProps): React.JSX.Element`

- [ ] **Step 1: Write the failing search ranking, i18n parity, and `CommandPalette` tests (pinning Review Focus #2)**

Create `lib/__tests__/command-palette.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BlogPost } from '@/lib/blog-data';
import { buildCatalogIndex, normalizeIdentifierQuery, searchCatalog } from '@/lib/search/catalog-index';

const articles: BlogPost[] = JSON.parse(readFileSync(join(process.cwd(), 'data/articles.json'), 'utf8'));

describe('catalog-index + CommandPalette search', () => {
  it('Review Focus #2: strips URL wrappers/case/trailing punctuation on DOIs, GitHub repos, and ORCIDs and ranks exact match #1', () => {
    expect(normalizeIdentifierQuery('https://doi.org/10.5555/RWM.POST-1.')).toBe('10.5555/rwm.post-1');
    expect(normalizeIdentifierQuery('https://github.com/vllm-project/vllm/')).toBe('vllm-project/vllm');
    expect(normalizeIdentifierQuery('https://orcid.org/0000-0001-9234-8812')).toBe('0000-0001-9234-8812');

    const index = buildCatalogIndex({ articles, papers: [], authors: articles.map((a) => a.author) });
    expect(searchCatalog('https://doi.org/10.5555/RWM.POST-1.', index)[0]?.href).toBe('/post/inside-vllm-and-paged-attention');
    expect(searchCatalog('https://github.com/vllm-project/vllm/', index)[0]?.href).toBe('/post/inside-vllm-and-paged-attention');
    expect(searchCatalog('https://orcid.org/0000-0001-9234-8812', index)[0]?.kind).toBe('specialist');
  });

  it('fuzzy-matches titles, tags, and verified specialists via Fuse.js', () => {
    const index = buildCatalogIndex({ articles, papers: [], authors: articles.map((a) => a.author) });
    expect(searchCatalog('PagedAttention CUDA', index)[0]?.href).toBe('/post/inside-vllm-and-paged-attention');
    expect(searchCatalog('Marcus Vance', index).some((r) => r.kind === 'specialist')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/command-palette.test.tsx`  
Expected: FAIL (`Cannot find module '@/lib/search/catalog-index'`).

- [ ] **Step 3: Implement `lib/search/catalog-index.ts`, `components/search/CommandPalette.tsx`, and bilingual `en`/`bn` keys**

1. Add matching keys to `lib/i18n/messages/en.json` and `lib/i18n/messages/bn.json` (`cmdk.trigger`, `cmdk.placeholder`, `cmdk.empty`, `cmdk.group.articles`, `cmdk.group.papers`, `cmdk.group.specialists`, `cmdk.group.routes`, `nav.readingList`, `nav.digestSubscribed`, `theme.switchLight`, `theme.switchDark`, `reader.cite`, `reader.copyBibtex`, `reader.copyApa`, `reader.copyDoi`, `reader.copied`), ensuring every English string is >= 6 alphabetic chars so `pseudoLocalize()` in `lib/__tests__/i18n.test.ts` expands >= 35%.
2. In `lib/search/catalog-index.ts`:
   - `normalizeIdentifierQuery(raw)` trims, strips leading `https?://(dx\.)?doi\.org/`, `doi:`, `https?://github\.com/`, `https?://orcid\.org/`, `@`, strips trailing `[.,;)\]/]+`, and lowercases.
   - `buildCatalogIndex()` indexes every `BlogPost` with canonical DOI `10.5555/rwm.${post.id}` + `post.reviewedArtifact?.identifier`, every `Publication` with `paper.doi`, deduplicated `Author` + `EDITORIAL_BOARD` entries (marking `verifiedVia`), and the core routes (`/`, `/papers`, `/authors`, `/editions`, `/assistant`, `/bookmarks`, `/cite`).
   - `searchCatalog()` returns curated top items when `query` is empty; otherwise prepends exact/prefix identifier hits before deduplicated `Fuse` hits (`keys: [{ name: 'title', weight: 0.35 }, { name: 'identifiers', weight: 0.30 }, { name: 'tags', weight: 0.15 }, { name: 'specialistName', weight: 0.12 }, { name: 'subtitle', weight: 0.08 }]`, `threshold: 0.34`, `ignoreLocation: true`).
3. In `components/search/CommandPalette.tsx`:
   - Wrap `<Command shouldFilter={false} loop>` inside `@radix-ui/react-dialog` (`Dialog.Root`, `Dialog.Portal`, `Dialog.Overlay`, `Dialog.Content`, sr-only `Dialog.Title` & `Dialog.Description`).
   - Lazy-fetch `/api/articles`, `/api/papers`, `/api/authors` once when `open` becomes `true` (merging over `initialArticles`), render grouped items with `1px` `border-line` dividers, `font-mono` DOI/repo/ORCID badges, single-accent `data-[selected=true]:border-l-2 data-[selected=true]:border-brand data-[selected=true]:bg-surface-subtle` selection, and navigate via `useRouter().push(item.href)` on `onSelect`.

- [ ] **Step 4: Run search and i18n test suites**

Run: `npx vitest run lib/__tests__/command-palette.test.tsx lib/__tests__/i18n.test.ts lib/__tests__/i18n-wiring.test.ts`  
Expected: PASS (exact parity + >= 35% expansion + identifier/fuzzy ranking green).

- [ ] **Step 5: Commit**

```bash
git add lib/search/catalog-index.ts components/search/CommandPalette.tsx lib/i18n/messages/en.json lib/i18n/messages/bn.json lib/__tests__/command-palette.test.tsx
git commit -m "feat(search): add cmdk + fuse.js command palette with normalized identifier ranking"
```

---

### Task 5: Archival Masthead (`BlogHeader`), Store Consumer Wiring & `/articles` Route Preservation

**Files:**
- Modify: `components/i18n/LocaleSwitcher.tsx:1-34`
- Modify: `components/BlogHeader.tsx:1-285`
- Modify: `components/BlogFooter.tsx:1-122`
- Modify: `components/NewsletterSignup.tsx:1-165`
- Modify: `components/BookmarksPanel.tsx:1-278`
- Create: `app/articles/page.tsx`
- Modify: `cloudflare-pages/src/routes.tsx:35-65,165-190`
- Modify: `cloudflare-pages/src/server/route-data.ts:50-78`
- Modify: `test/pages/public-routes.test.ts:55-68`

**Interfaces:**
- Consumes: `usePreferencesStore`, `useSavedTotalCount`, `useDigestSubscribed` (Task 3), `CommandPalette` via `next/dynamic(..., { ssr: false })` (Task 4), `ThemeToggle` (Task 2).
- Produces:
  - Updated `BlogHeader` with `Cmd+K` / `Ctrl+K` global shortcut, `"Search articles and repositories"` trigger button, reactive Reading List count badge, reactive Digest subscribed indicator, `LocaleSwitcher`, and `ThemeToggle`.
  - Preserved `/articles` -> `/` redirect in both Next.js (`app/articles/page.tsx`) and Cloudflare Pages (`RouteId` `'articles'` in `cloudflare-pages/src/routes.tsx` + `serverLoaders` in `route-data.ts`).

- [ ] **Step 1: Write the failing `/articles` route preservation test**

Add to `test/pages/public-routes.test.ts`:

```ts
describe('GET /articles', () => {
  it('redirects /articles cleanly to / so existing navigation targets never 404', async () => {
    const app = createTestApp();
    const res = await app.request('/articles');
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.get('location')).toBe('/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/pages/public-routes.test.ts`  
Expected: FAIL (`expected [301, 302, 307, 308] to contain 404`).

- [ ] **Step 3: Wire `/articles` redirect and refactor `BlogHeader`, `BlogFooter`, `NewsletterSignup`, `BookmarksPanel`, and `LocaleSwitcher`**

1. Create `app/articles/page.tsx` calling `redirect('/')` from `next/navigation`. In `cloudflare-pages/src/routes.tsx`, add `'articles'` to `RouteId` and `{ id: 'articles', path: '/articles', element: <HomeRoute /> }` to `ROUTE_DEFINITIONS`; in `cloudflare-pages/src/server/route-data.ts`, add `articles: () => redirect('/', 308)` inside `serverLoaders`.
2. In `components/BlogHeader.tsx`:
   - Replace `border-b-4 border-double border-stone-900 bg-white` with `border-b border-line bg-canvas/95 backdrop-blur-xs`.
   - Bind `Cmd+K` / `Ctrl+K` (`useEffect` on `keydown`) to `setPaletteOpen((v) => !v)` and mount `const CommandPalette = dynamic(() => import('./search/CommandPalette'), { ssr: false })` only once `paletteEverOpened` is `true`.
   - Render `"Search articles and repositories"` trigger button with `Search` icon + `<kbd className="font-mono text-xs">⌘K</kbd>`, reactive Reading List badge (`savedCount ?? storeSavedCount`) in `bg-brand text-on-primary font-mono`, subtle Digest subscribed badge/dot (`useDigestSubscribed()`), `LocaleSwitcher`, and `ThemeToggle`.
3. In `components/BlogFooter.tsx`: use semantic `bg-surface border-t border-line text-ink`, format `ISSN 2994-0821` and `10.5555/rwm` in `font-mono`, keep `CC BY 4.0` notice, and replace `bg-amber-700` CTA with `bg-ink text-canvas`.
4. In `components/NewsletterSignup.tsx` and `components/BookmarksPanel.tsx`: replace raw `readLocalString` / `readStringArray` state with `usePreferencesStore` actions, displaying the existing storage-blocked alert whenever `!storagePersisted` (preserving `"Your reading list"` heading in `BookmarksPanel` for `test/pages/reader-tools.test.ts`).

- [ ] **Step 4: Verify Phase 2 tests, both builds, and the 200 KB shell budget**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run build:pages && npm run budgets`  
Expected: PASS (`test/contracts/baseline.test.ts` still 24 operations, `test/pages/*.test.ts` all green, `budgets: PASS` <= 200 KB gzip).

- [ ] **Step 5: Commit**

```bash
git add app/articles/page.tsx cloudflare-pages/src/routes.tsx cloudflare-pages/src/server/route-data.ts components/i18n/LocaleSwitcher.tsx components/BlogHeader.tsx components/BlogFooter.tsx components/NewsletterSignup.tsx components/BookmarksPanel.tsx test/pages/public-routes.test.ts
git commit -m "feat(nav): wire cmdk trigger, reactive zustand badges, archival masthead, and /articles alias"
```

---

## Phase 3 — Animated Catalog Filters & Populated/Empty States

### Task 6: Animated 6-Column × 5-Format Catalog (`motion`) & Archival Empty/Populated States

**Files:**
- Modify: `components/BlogHero.tsx:1-135`
- Modify: `components/HomeFeed.tsx:1-199`
- Modify: `components/FeaturedArticle.tsx:1-142`
- Modify: `components/ArticleFeed.tsx:1-343`
- Modify: `components/PapersArchive.tsx:1-355`
- Modify: `components/AuthorSpotlight.tsx:1-106`
- Modify: `components/AuthorDirectory.tsx:1-245`
- Create: `lib/__tests__/catalog-motion.test.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `BlogCategory`, `ArticleFormat`, `BlogPost` (`@/lib/blog-data`), `usePreferencesStore` (Task 3), `LazyMotion`, `domMax`, `MotionConfig`, `LayoutGroup`, `AnimatePresence`, `m` (`motion/react`).
- Produces:
  - Updated `BlogHero` & `ArticleFeed` with in-place animated filtering across all **6 editorial columns** (`All` + `CATEGORIES`) and **5 formats** (`All` + `Paper Review`, `Repo Teardown`, `Deep-Dive Essay`, `Field Notes`, `Case Study`), single-accent `layoutId` active pills, `1px` hairline archival cards, and diagnostic empty states.

- [ ] **Step 1: Write the failing catalog SSR visibility & empty/populated state tests (pinning Review Focus #4b)**

Create `lib/__tests__/catalog-motion.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { BlogPost } from '@/lib/blog-data';
import ArticleFeed from '@/components/ArticleFeed';

const posts: BlogPost[] = JSON.parse(readFileSync(join(process.cwd(), 'data/articles.json'), 'utf8'));

describe('ArticleFeed motion catalog & empty/populated states', () => {
  it('Review Focus #4b: renders populated cards at full visibility in SSR markup (no opacity:0)', () => {
    const html = renderToStaticMarkup(
      createElement(ArticleFeed, {
        posts,
        savedPostIds: [],
        onToggleSave: () => {},
        onLikePost: () => {},
        selectedCategory: 'All',
        selectedFormat: 'All',
        searchQuery: '',
        onClearFilters: () => {},
      }),
    );
    expect(html).toContain('Inside vLLM');
    expect(html).not.toContain('opacity:0');
    expect(html).toContain('CC BY 4.0');
  });

  it('renders diagnostic active filter chips and Reset filters button in empty state', () => {
    const html = renderToStaticMarkup(
      createElement(ArticleFeed, {
        posts: [],
        savedPostIds: [],
        onToggleSave: () => {},
        onLikePost: () => {},
        selectedCategory: 'STEM & Tech',
        selectedFormat: 'Field Notes',
        searchQuery: 'nonexistent-doi',
        onClearFilters: () => {},
      }),
    );
    expect(html).toContain('STEM &amp; Tech');
    expect(html).toContain('Field Notes');
    expect(html).toContain('nonexistent-doi');
    expect(html).toContain('Reset filters');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/catalog-motion.test.tsx`  
Expected: FAIL (empty state does not yet surface the active column/format/query diagnostic chips).

- [ ] **Step 3: Refactor `HomeFeed`, `BlogHero`, `FeaturedArticle`, `ArticleFeed`, `PapersArchive`, `AuthorSpotlight`, and `AuthorDirectory`**

1. In `components/HomeFeed.tsx`: replace `savedPostIds`/`likedPostIds` local `useState` with `usePreferencesStore`; support in-place `selectedCategory` updates alongside `/category/[slug]` navigation links.
2. In `components/BlogHero.tsx`: keep exact `<h1>` text `"Research you can read, check, and reuse."`, render 6-column + 5-format filter strips inside `<LazyMotion features={domMax}><MotionConfig reducedMotion="user"><LayoutGroup>`, using `<m.span layoutId="active-format-pill" className="bg-brand" />` and `<m.span layoutId="active-column-pill" className="bg-brand" />` strictly in the single accent (`#1D4ED8` / `#60A5FA`), and format platform stats + `ISSN 2994-0821` / `CC BY 4.0` in `font-mono` separated by `1px` `border-line` hairlines.
3. In `components/FeaturedArticle.tsx` and `components/ArticleFeed.tsx`:
   - Replace dark gradient category tiles and `hover:border-amber-700` with clean archival index slips (`bg-surface border border-line hover:border-brand`) numbered `01`–`06` in `font-mono`.
   - Wrap the review list in `<m.ul layout>` + `<AnimatePresence mode="popLayout" initial={false}>` with `<m.li key={post.id} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}>`.
   - Style cards with `1px` `border-line`, `bg-surface`, zero drop shadows, `font-mono` identifiers (`post.reviewedArtifact.identifier`, `10.5555/rwm.${post.id}`), and single-accent verified author indicator (`author.verifiedVia`).
   - In the empty state (`posts.length === 0`), render `font-mono` active filter chips (`selectedCategory`, `selectedFormat`, `searchQuery`) and `"Reset filters"`.
4. Apply the same `LazyMotion` + `AnimatePresence initial={false}` + `usePreferencesStore` paper-bookmark wiring and hairline card styling to `components/PapersArchive.tsx`, and update `AuthorSpotlight.tsx` + `AuthorDirectory.tsx` to hairline dividers and single-accent verified badges.

- [ ] **Step 4: Verify Phase 3 tests, Impeccable source scan, and both builds**

Run: `npm run lint && npm run typecheck && npm test && npm run impeccable:source && npm run build && npm run build:pages && npm run budgets`  
Expected: PASS (0 Impeccable findings, all SSR/route/category tests green, shell <= 200 KB gzip).

- [ ] **Step 5: Commit**

```bash
git add components/BlogHero.tsx components/HomeFeed.tsx components/FeaturedArticle.tsx components/ArticleFeed.tsx components/PapersArchive.tsx components/AuthorSpotlight.tsx components/AuthorDirectory.tsx lib/__tests__/catalog-motion.test.tsx
git commit -m "feat(catalog): add motion layout filtering across 6 columns and 5 formats with hairline cards"
```

---

## Phase 4 — Interactive Article Reader, Floating Progress Dock & Citation Popovers

### Task 7: Inline Citation Popover (`@radix-ui/react-popover`), Prose Tokenizer & Specialist Credential Popover

**Files:**
- Create: `components/reader/InlineCitationPopover.tsx`
- Create: `components/reader/SpecialistBadgePopover.tsx`
- Create: `lib/citations-inline.tsx`
- Modify: `components/MarkdownBody.tsx:1-118`
- Modify: `components/AuthorProfileCard.tsx:1-246`
- Create: `lib/__tests__/reader-popovers.test.tsx`

**Interfaces:**
- Consumes: `buildCitation`, `CitationSource` (`@/lib/citations`), `Author`, `BlogPost`, `ReviewedArtifact` (`@/lib/blog-data`), `@radix-ui/react-popover`.
- Produces:
  - In `components/reader/InlineCitationPopover.tsx`:
    - `export interface InlineCitationPopoverProps { label: string; source: CitationSource; citeHref?: string }`
    - `export default function InlineCitationPopover(props: InlineCitationPopoverProps): React.JSX.Element`
  - In `components/reader/SpecialistBadgePopover.tsx`:
    - `export interface SpecialistBadgePopoverProps { author: Pick<Author, 'id' | 'name' | 'role' | 'institution' | 'orcid' | 'github' | 'verifiedVia' | 'verifiedIdentifier'> }`
    - `export default function SpecialistBadgePopover(props: SpecialistBadgePopoverProps): React.JSX.Element | null`
  - In `lib/citations-inline.tsx`:
    - `export function buildArticleCitationMap(article: Pick<BlogPost, 'id' | 'slug' | 'title' | 'author' | 'publishedAt' | 'reviewedArtifact'>): Record<string, CitationSource>`
    - `export function renderWithInlineCitations(text: string, citations: Record<string, CitationSource>, citeHref?: string): React.ReactNode`

- [ ] **Step 1: Write the failing popover, a11y, and hostile-prose tokenizer tests (pinning Review Focus #3)**

Create `lib/__tests__/reader-popovers.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import axe from 'axe-core';
import InlineCitationPopover from '@/components/reader/InlineCitationPopover';
import SpecialistBadgePopover from '@/components/reader/SpecialistBadgePopover';
import MarkdownBody from '@/components/MarkdownBody';
import { renderWithInlineCitations } from '@/lib/citations-inline';

const sampleSource = {
  title: 'Inside vLLM & PagedAttention',
  author: 'Maya Lin',
  year: '2026',
  journal: 'ResearchWithMe',
  doi: '10.5555/rwm.post-1',
};

describe('InlineCitationPopover, SpecialistBadgePopover & safe prose citation tokenizer', () => {
  it('renders accessible citation trigger and specialist badge with zero axe violations', async () => {
    const html = renderToStaticMarkup(
      createElement('main', null,
        createElement('p', null, 'Claim ', createElement(InlineCitationPopover, { label: '[1]', source: sampleSource })),
        createElement(SpecialistBadgePopover, {
          author: { id: 'marcus-vance', name: 'Prof. Marcus Vance', role: 'Fellow', institution: 'Cambridge', orcid: '0000-0001-9234-8812', verifiedVia: 'orcid', verifiedIdentifier: '0000-0001-9234-8812' },
        }),
      ),
    );
    document.body.innerHTML = html;
    const results = await axe.run(document.body, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
    expect(results.violations).toEqual([]);
  });

  it('Review Focus #3: converts matched [1] and DOI references while ignoring code spans, links, unmatched [99], and escaping raw HTML', () => {
    const map = { '1': sampleSource, '10.5555/rwm.post-1': sampleSource };
    const plain = renderToStaticMarkup(
      createElement('div', null, renderWithInlineCitations('See [1], [99], and </script><script>alert(1)</script>', map)),
    );
    expect(plain).toContain('aria-haspopup="dialog"');
    expect(plain).toContain('[99]');
    expect(plain).not.toContain('<script>');

    const md = renderToStaticMarkup(
      createElement(MarkdownBody, {
        markdown: 'Inline `10.5555/rwm.post-1` and [link](https://doi.org/10.5555/rwm.post-1) vs cited 10.5555/rwm.post-1.',
        citations: map,
      }),
    );
    // Only the standalone prose DOI becomes a popover button; code and <a> stay intact
    expect((md.match(/aria-haspopup="dialog"/g) ?? []).length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/reader-popovers.test.tsx`  
Expected: FAIL (`Cannot find module '@/components/reader/InlineCitationPopover'`).

- [ ] **Step 3: Implement `InlineCitationPopover`, `SpecialistBadgePopover`, `lib/citations-inline.tsx`, and wire into `MarkdownBody` & `AuthorProfileCard`**

1. In `components/reader/InlineCitationPopover.tsx`: use `@radix-ui/react-popover` (`Popover.Root`, `Popover.Trigger`, `Popover.Portal`, `Popover.Content`). Trigger uses single-accent styling (`font-mono text-[0.8125rem] text-brand underline decoration-brand/40 underline-offset-4 hover:bg-selection`). Content (`bg-surface-raised border border-line p-4 max-w-sm z-50`) renders source title (`font-serif`), author/year (`font-sans`), DOI (`font-mono`), and three one-click copy buttons (`BibTeX` via `buildCitation('bibtex', source)`, `APA` via `buildCitation('apa', source)`, `DOI` via `https://doi.org/${cleanDoi}`) with visible `"Copied"` state + `aria-live="polite"` announcement.
2. In `components/reader/SpecialistBadgePopover.tsx`: return `null` when `!author.verifiedVia && !author.orcid && !author.github`; otherwise render a `@radix-ui/react-popover` trigger badge (`text-brand border border-brand/30 bg-selection/40 font-sans text-xs font-medium`) that opens on click/keyboard (and pointer enter/leave with 150ms close timer) showing name, role, institution, `font-mono` ORCID (`0000-...`) or GitHub handle with copy button + external registry link + `/author/${author.id}` profile link.
3. In `lib/citations-inline.tsx`: implement `buildArticleCitationMap()` (mapping `'1'` -> `reviewedArtifact` source when present and `'rwm'` / `10.5555/rwm.${article.id}` -> the review's own citation) and `renderWithInlineCitations()` splitting plain string children by `/(\[\d+\]|(?:10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)|(?:arXiv:\d{4}\.\d{4,5}))/g` (stripping trailing `.,;)`), replacing matched tokens with `<InlineCitationPopover>` while leaving unmatched `[99]` untouched.
4. In `components/MarkdownBody.tsx`: accept optional `citations?: Record<string, CitationSource>` and `citeHref?: string`, set prose max-width to `max-w-[68ch]`, and apply `renderWithInlineCitations` only to plain `string` children inside `p` and `li` renderers (`<code>`, `<pre>`, and `<a>` subtrees stay untouched React elements). Wire `SpecialistBadgePopover` into `components/AuthorProfileCard.tsx`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/reader-popovers.test.tsx lib/__tests__/citation-component.test.ts lib/__tests__/a11y.test.ts`  
Expected: PASS (zero `axe-core` violations, exact single popover in Markdown test).

- [ ] **Step 5: Commit**

```bash
git add components/reader/InlineCitationPopover.tsx components/reader/SpecialistBadgePopover.tsx lib/citations-inline.tsx components/MarkdownBody.tsx components/AuthorProfileCard.tsx lib/__tests__/reader-popovers.test.tsx
git commit -m "feat(reader): add radix inline citation and verified specialist popovers"
```

---

### Task 8: `Lenis` Smooth Scroll, Floating Progress Dock & Dual-Runtime `68ch` Reader Integration

**Files:**
- Create: `components/reader/ArticleSmoothScroll.tsx`
- Create: `components/reader/ReadingProgressDock.tsx`
- Modify: `components/ReadingProgress.tsx:1-39`
- Modify: `components/ReadingActions.tsx:1-143`
- Modify: `components/ArticleInteractions.tsx:1-144`
- Modify: `app/post/[slug]/page.tsx:1-366`
- Modify: `cloudflare-pages/src/routes/post.tsx:1-321`
- Modify: `app/paper/[slug]/page.tsx:1-289`
- Modify: `cloudflare-pages/src/routes/paper.tsx:1-271`
- Create: `lib/__tests__/reader-dock-lenis.test.tsx`

**Interfaces:**
- Consumes: `lenis`, `usePreferencesStore` (Task 3), `InlineCitationPopover`, `SpecialistBadgePopover`, `buildArticleCitationMap`, `renderWithInlineCitations` (Task 7).
- Produces:
  - `export function shouldEnableSmoothScroll(mql: Pick<MediaQueryList, 'matches'> | null): boolean` in `components/reader/ArticleSmoothScroll.tsx`
  - `export function focusHashTarget(root: Document, hash: string): HTMLElement | null` in `components/reader/ArticleSmoothScroll.tsx`
  - `export default function ArticleSmoothScroll(): null` in `components/reader/ArticleSmoothScroll.tsx`
  - `export interface ReadingProgressDockProps { itemId: string; itemKind: 'post' | 'paper'; readTime: string; citationSource: CitationSource; citeHref: string; discussionAnchor?: string }`
  - `export default function ReadingProgressDock(props: ReadingProgressDockProps): React.JSX.Element` in `components/reader/ReadingProgressDock.tsx`

- [ ] **Step 1: Write the failing `Lenis` reduced-motion/anchor & `ReadingProgressDock` tests (pinning Review Focus #5)**

Create `lib/__tests__/reader-dock-lenis.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReadingProgressDock from '@/components/reader/ReadingProgressDock';
import { focusHashTarget, shouldEnableSmoothScroll } from '@/components/reader/ArticleSmoothScroll';

describe('ArticleSmoothScroll & ReadingProgressDock', () => {
  it('Review Focus #5: disables Lenis on prefers-reduced-motion and moves keyboard focus to #hash targets', () => {
    expect(shouldEnableSmoothScroll({ matches: true })).toBe(false);
    expect(shouldEnableSmoothScroll({ matches: false })).toBe(true);

    document.body.innerHTML = '<section id="discussion"><h2>Discussion</h2></section>';
    const target = focusHashTarget(document, '#discussion');
    expect(target?.id).toBe('discussion');
    expect(document.activeElement).toBe(target);
  });

  it('renders print-hidden floating progress dock with tabular mono progress, cite popover trigger, and bookmark toggle', () => {
    const html = renderToStaticMarkup(
      createElement(ReadingProgressDock, {
        itemId: 'post-1',
        itemKind: 'post',
        readTime: '9 min read',
        citationSource: {
          title: 'Inside vLLM & PagedAttention',
          author: 'Maya Lin',
          year: '2026',
          journal: 'ResearchWithMe',
          doi: '10.5555/rwm.post-1',
        },
        citeHref: '/cite?article=inside-vllm-and-paged-attention',
        discussionAnchor: '#discussion',
      }),
    );
    expect(html).toContain('print:hidden');
    expect(html).toContain('font-mono');
    expect(html).toContain('0%');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('#discussion');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/reader-dock-lenis.test.tsx`  
Expected: FAIL (`Cannot find module '@/components/reader/ReadingProgressDock'`).

- [ ] **Step 3: Implement `ArticleSmoothScroll`, `ReadingProgressDock`, and integrate into both Next.js and Cloudflare Pages reader routes**

1. In `components/reader/ArticleSmoothScroll.tsx`: export `shouldEnableSmoothScroll(mql: Pick<MediaQueryList, 'matches'> | null): boolean` returning `Boolean(mql && !mql.matches)` and `focusHashTarget(root: Document, hash: string): HTMLElement | null` (resolving `decodeURIComponent(hash.slice(1))`, ensuring `tabIndex = -1` when needed, and calling `target.focus({ preventScroll: true })`). Inside `useEffect`, check `window.matchMedia('(prefers-reduced-motion: reduce)')`; instantiate `new Lenis({ duration: 0.85, smoothWheel: true, syncTouch: false })` only when enabled, listen for `mql.addEventListener('change', ...)` to destroy `Lenis` immediately if reduced motion turns on, intercept same-page `a[href^="#"]` clicks (`lenis.scrollTo(target, { offset: -96 })` + `focusHashTarget(document, hash)`), and cancel `requestAnimationFrame` + `lenis.destroy()` on unmount.
2. In `components/ReadingProgress.tsx`: refine to a crisp `h-[2px] bg-brand` hairline (`role="progressbar"` preserved).
3. In `components/reader/ReadingProgressDock.tsx`: render `aside` (`aria-label="Reading controls"`, `fixed bottom-5 left-1/2 z-40 -translate-x-1/2 print:hidden`) styled with `bg-surface/95 backdrop-blur-xs border border-line px-3 py-1.5`, showing `font-mono` `${Math.round(progress)}% · ${remainingMinutes}m`, `<InlineCitationPopover label="Cite" source={citationSource} citeHref={citeHref} />`, bookmark button bound to `usePreferencesStore` (`toggleSavedPost` / `toggleSavedPaper`), optional `discussionAnchor` link, and scroll-to-top button.
4. Update `components/ReadingActions.tsx` and `components/ArticleInteractions.tsx` to read/write bookmarks & likes through `usePreferencesStore` with hairline `border-line bg-surface` buttons.
5. In **all four** reader route files (`app/post/[slug]/page.tsx`, `cloudflare-pages/src/routes/post.tsx`, `app/paper/[slug]/page.tsx`, `cloudflare-pages/src/routes/paper.tsx`):
   - Mount `<ArticleSmoothScroll />` and `<ReadingProgressDock ... />`.
   - Enforce `max-w-[68ch]` on subtitle, key takeaways, `MarkdownBody` / paragraphs (passing `buildArticleCitationMap(article)` and `renderWithInlineCitations`), artifact slip, and discussion; separate the sticky right metadata rail with `lg:border-l lg:border-line lg:pl-10`.
   - Render `SpecialistBadgePopover` next to verified authors and format `DOI 10.5555/rwm.${article.id}` (or `paper.doi`), `ISSN 2994-0821`, `CC BY 4.0`, and artifact identifiers in `font-mono`.

- [ ] **Step 4: Run full Phase 4 quality, contract, budget, and dual-build verification**

Run:
```bash
npm run quality
npm run build && npm run build:pages
npm run budgets && npm run release:gate
```
Expected:
- `npm run quality`: `tokens:build`, `tokens:check`, `lint`, `typecheck`, `vitest` (all unit, SSR, contract, a11y, i18n, and new tests), and `impeccable:source` (0 findings) PASS.
- `npm run build && npm run build:pages`: Next.js standalone build and Cloudflare Pages Vite build (`cloudflare-pages/dist/`) PASS with zero `server-only` or Node-only client leaks.
- `npm run budgets && npm run release:gate`: `/` shell JS <= 200 KB gzip (`budgets: PASS`) and 11/11 release checks PASS.

- [ ] **Step 5: Commit**

```bash
git add components/reader/ArticleSmoothScroll.tsx components/reader/ReadingProgressDock.tsx components/ReadingProgress.tsx components/ReadingActions.tsx components/ArticleInteractions.tsx app/post/\[slug\]/page.tsx cloudflare-pages/src/routes/post.tsx app/paper/\[slug\]/page.tsx cloudflare-pages/src/routes/paper.tsx lib/__tests__/reader-dock-lenis.test.tsx
git commit -m "feat(reader): integrate lenis smooth scroll, floating progress dock, and 68ch archival layout"
```
