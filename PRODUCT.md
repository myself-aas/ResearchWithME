# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Academic researchers, computational scientists, graduate students, independent open-science investigators, and peer reviewers. They come for technical analyses, reproducible code artifacts, dataset manifests, and open review threads in computational neuroscience, distributed systems, climate telemetry, and diamond open-access publishing.

## Product Purpose
ResearchWithMe is an open-access publication and research engine. It publishes long-form technical reviews with the code, datasets, and DOI records behind them, and it hosts the discussion that follows. Readers pay nothing, and no pop-up interrupts an article.

## Positioning
Commercial publishers put preprints behind paywalls, and developer blogs summarize work without checking it. ResearchWithMe keeps the review standard and adds what a paper alone cannot show: the artifact that was examined, the credentials of the person who examined it, and citation metadata a reader can copy.

## Operating Context
Scholars read on desktop and mobile, inspect formulas and syntax-highlighted code, copy BibTeX citations, use the native share sheet, save a digest preference, and query the catalog through the research assistant.

## Capabilities and Constraints
- Article readers at `/post/[slug]` with rendered Markdown, a metadata panel, syntax highlighting, DOI copy, and related reviews chosen by tag overlap.
- A feed filtered by field, with a topic header for each of the six disciplines.
- A research assistant at `/assistant` that answers from published reviews and open repositories.
- A `/verify` page that models contributor identity checks as a local prototype, with no credentials leaving the browser.
- Responsive layout to WCAG AA contrast (4.5:1 for body text), semantic markup, and a clear type hierarchy.
- No modal, overlay, or pop-up during reading.

## Brand Commitments
- Name: ResearchWithMe. The wordmark is set as πeme.
- Editorial voice: scholarly, precise, restrained, transparent. Claims carry evidence.
- Typography: the Aptos family. Aptos Serif for headlines and reading copy, Aptos for interface chrome, Aptos Mono for code and data. It should read like a research journal and a newspaper of record.
- Palette: warm archival stone, deep amber and ochre accents, emerald for verification, high-contrast ink text.

## Evidence on Hand
- Published reviews across six fields: Computational Neuroscience, Distributed ML Infrastructure, Climate Telemetry, Diamond Open Access, Quantum Algorithms, and Genomic Pipelines.
- DOI records, author credentials, citation counts, reading-time estimates, and tag metadata.

## Product Principles
1. The article comes first. Nothing overlays it.
2. Every claim, dataset, and code artifact carries citation metadata and a reproducible link.
3. Typography and colour are chosen for long reading sessions, at WCAG AA contrast.
4. Every major task has its own URL.

## Implementation Status
- The active product is the root Next.js App Router application. `ResearchWith.me-main/` is a legacy WordPress theme archive and sits outside the build.
- The article studio (`/login`, `/dashboard`) runs on Supabase when credentials are configured: posts, comments, an image bucket, RLS, and realtime. Without credentials it writes to local JSON so the project still runs for review. See `docs/supabase-cms.md`.
- Readers sign in through Supabase Auth with Google, GitHub, ORCID, or email (password or magic link). Studio access needs an administrator to add the account to `public.editors`; signing in alone grants reader access only.
- Published CMS articles share the reader, feed, sitemap, and author record with the bundled catalogue. Drafts stay private.
- The `/verify` contributor check is a clearly labelled local prototype, not production OAuth. No credentials go to ORCID, GitHub, an institution, or Google.
- The research assistant uses Gemini only when `GEMINI_API_KEY` is set; otherwise it returns a deterministic, cited answer built from the local catalogue.
- Newsletter and reading-list preferences live in the browser. No email is sent and no behavioural tracking is used.

## Accessibility & Inclusion
- WCAG 2.1 AA contrast throughout: 4.5:1 for body text, 3:1 for large display text.
- Full keyboard navigation, visible focus rings, and semantic landmarks.
- Reflow without horizontal scrolling down to 320px.
- Reduced-motion preferences keep state feedback and drop travel and transform motion.
- Every form control has an accessible name, and loading, empty, disabled, and error states are announced when they matter.
