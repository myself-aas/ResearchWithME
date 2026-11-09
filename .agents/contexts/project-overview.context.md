# ResearchWithMe Project Overview

## Project Description
Scholarly research platform: long-form paper reviews, reproducible teardowns, citation-first reading.

## Tech Stack
- **Framework**: Next.js 15 App Router
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Language**: TypeScript
- **Package Manager**: Bun

## Key Directories
- `app/` - Next.js App Router routes
- `components/` - Shared UI components
- `lib/` - Data access, adapters, utilities
- `hooks/` - Custom React hooks
- `data/` - Static data files
- `supabase/` - Database migrations
- `public/` - Static assets
- `scripts/` - Build and deployment scripts
- `videos/` - HyperFrames video content
- `docs/` - Documentation
- `.agents/` - Agent skills and configurations

## Quality Gate
```bash
npm run quality          # lint + typecheck + test + Impeccable source scan
```
Individual commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run impeccable:source`

## Design System
- **Fonts**: Aptos family (Aptos Serif primary, Aptos sans for UI, Aptos Mono for code)
- **Tailwind v4**: No arbitrary values for spacing/color that exist as tokens
- **Design docs**: `DESIGN.md` for surface-level decisions, `.agents/surfaces/` for per-route detail

## Git Conventions
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Never commit `.env` or secrets
- Run `npm run quality` before opening PR

## HyperFrames Video Skills
All seven HyperFrames skills installed globally. Read `/hyperframes` first before generating any video content.