# ResearchWithMe — Agent Instructions

## Project overview
Scholarly research platform: long-form paper reviews, reproducible teardowns, citation-first reading. Stack: Next.js 15 App Router, React 19, Tailwind CSS v4, Supabase, TypeScript.

Read `PRODUCT.md` and `DESIGN.md` before touching any UI surface. Keep `.impeccable/surfaces/` briefs in sync with every route change.

## Quality gate (must pass before any commit or PR)
```bash
npm run quality          # lint + typecheck + test + Impeccable source scan
```
Individual commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run impeccable:source`.

## HyperFrames video skills

All seven HyperFrames skills are installed globally. Read `/hyperframes` **first** before generating any video, motion graphic, caption overlay, or slideshow for this project.

### When to use each skill
| Request | Skill to read first |
|---|---|
| Any video, launch film, explainer, chart animation | `/hyperframes` |
| CLI scaffold, render, preview, publish | `/hyperframes-cli` |
| Transitions, overlays, titles, kinetic type, charts, 3D | `/hyperframes-registry` |
| Music, SFX, voiceover, avatar, image/icon sourcing | `/media-use` |
| Research paper → slide deck presentation | `/slideshow` |
| Figma design → motion | `/figma` |
| Port Remotion / Lottie / After Effects animation | `/remotion-to-hyperframes` |

### Render contract (non-negotiable)
- Default output: 1920×1080, 30 fps.
- No `Date.now()`, `Math.random()` (unseeded), or network fetches at render time — compositions must be deterministic.
- Each composition registers exactly one paused GSAP root timeline on `window.__timelines`.
- Clips must carry `class="clip"`.
- Run `npx hyperframes lint` and `npx hyperframes check` after every composition edit.

### Research-specific conventions
- Paper explainer videos: title card → abstract → key findings → methodology → takeaways. Target 60–90 s at 30 fps.
- Use `/hyperframes-registry` before hand-building any named visual (charts, overlays, kinetic text).
- Media for academic contexts: prefer `/media-use` to source royalty-free footage rather than stock with attribution requirements.
- Slideshow presentations for `/editions` compendiums: use `/slideshow` to build `hyperframes present`-compatible decks.

## File conventions
- Routes under `app/`, shared UI under `components/`, data-access + adapters under `lib/`.
- CMS writes go through `/api/cms/*` — never directly to Supabase client-side with the service-role key.
- Supabase migrations are idempotent SQL in `supabase/migrations/`.

## Design system
- Fonts: Aptos family. Aptos Serif is primary (headings + body), Aptos (sans) for UI chrome, Aptos Mono for code. Aptos is requested by installed name only (never bundled); self-hosted Newsreader/Inter in `app/fonts/` are the fallbacks. No CDN.
- Tailwind v4: no arbitrary values for spacing or colour that exist as tokens.
- Follow `DESIGN.md` for surface-level design decisions; per-route detail is in `.impeccable/surfaces/`.

## Git
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Never commit `.env` or any file containing secrets.
- Run `npm run quality` and resolve all findings before opening a PR.
