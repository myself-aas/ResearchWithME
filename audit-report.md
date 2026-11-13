# Impeccable Full-Stack Audit — ResearchWithMe

Branch: `arena/b233dbaa-researchwithme`
Date: 2026-11-13
Scope: Next.js App Router + Cloudflare Pages reader surface.

## Score: 15/20 (Good)

| Dimension            | Score | Key Finding                                                                |
|----------------------|-------|----------------------------------------------------------------------------|
| Accessibility        | 3     | WCAG AA mostly met; Markdown-image alt and reader-dock touch targets P1.   |
| Performance          | 3     | 105 kB shared JS; backdrop-blur on sticky header is the only notable cost. |
| Theming              | 3     | Tokens cover the reader; avatar/OG/icon surfaces drift to indigo hexes.    |
| Responsive Design    | 3     | Breakpoints and 44px targets consistent, reader-dock cluster under target. |
| Implementation       | 3     | Truthful-copy clean; all nav links resolve; 676/677 tests pass.            |

## P1

1. Markdown images default to empty alt text (components/MarkdownBody.tsx:128).
2. Reader-dock icon buttons are 36px, below 44px WCAG AA.
3. Avatar fallback gradients hardcode Tailwind indigo/slate/emerald hexes (lib/avatar-fallback.ts:33-60).

## P2

1. OG/apple-icon hardcoded #4F46E5 / #555955 colors bypass πeme tokens.
2. Sticky header backdrop-blur has no at-rest layer hint.
3. Mobile search placeholder still says "DOI".
4. Footer links to internal /motion demo.
5. /api/articles/[id] PATCH has no error toast when 503 fires.
6. Apple/PWA icons use Georgia + #4F46E5, not Aptos Serif + #1D4ED8.

## P3

1. InlineCitationPopover chip focus ring clips inline.
2. Reading progress bar lacks a track.
3. Manifest lacks dark theme-color.
4. Residual RTL isolation CSS is now dead code (keep for future i18n or drop).

## Recommendations (priority order)

1. $impeccable harden  — alt-text fallbacks + PATCH error toasts
2. $impeccable adapt   — 44px touch targets on reader dock/citation popover
3. $impeccable colorize + extract — avatar/OG/icon tokenisation
4. $impeccable optimize — sticky-header compositor cost
5. $impeccable clarify — placeholder/tooltip "DOI" copy sweep
6. $impeccable distill — gate /motion, remove dead CSS
7. $impeccable polish — focus rings, progress track, dark theme-color, final visual pass

Re-run `$impeccable audit` after fixes to see the score improve.
