# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Academic researchers, computational scientists, graduate scholars, independent open-science investigators, and peer reviewers seeking rigorous technical analyses, reproducible code artifacts, dataset manifests, and open research reviews across computational neuroscience, distributed systems, climate telemetry, and diamond open-access publishing models.

## Product Purpose
ResearchWithMe is an open-access scholarly publication and research engine delivering rigorous, long-form technical syntheses, reproducible code artifacts, dataset manifests, and open peer-review threads without paywalls, commercial metric gamification, or disruptive pop-up modals.

## Positioning
Unlike commercial academic publishers that lock preprints behind paywalls or developer blogs with superficial overviews, ResearchWithMe combines peer-reviewed rigor with live MCP data access, reproducible DOI manifests, verifiable open-science hashes, and dedicated distraction-free reading surfaces.

## Operating Context
Scholars read research papers across desktop and mobile viewports, inspect math formulas and syntax-highlighted code blocks, copy DOI citations in BibTeX format, trigger native mobile share sheets, subscribe to weekly research digests, and query research repositories through a dedicated scholarly assistant interface.

## Capabilities and Constraints
- Dedicated article reading pages (`/post/[slug]`) with full markdown rendering, metadata panels, code syntax highlighting, DOI copy utilities, and related articles based on tag similarity.
- Interactive category-filtered feed with verified topic thumbnail headers for all 6 core disciplines.
- Dedicated scholarly research assistant (`/assistant`) for querying open literature and reproducible repos.
- A dedicated writer application (`/dashboard/access`) where a reader connects a GitHub or ORCID identity and an editor reviews the request.
- Native responsive layout adhering to WCAG AA contrast standards (>= 4.5:1), semantic markup, and clear typographic hierarchy.
- Zero disruptive pop-ups or modal interruptions during reading.

## Brand Commitments
- Name: ResearchWithMe
- Editorial voice: Scholarly, precise, restrained, transparent, evidence-based.
- Typography: The Aptos family. Aptos Serif for headlines and reading copy, Aptos for interface chrome, Aptos Mono for code and data tables. The overall feel is a research journal and newspaper of record.
- Palette: Warm archival stone background, deep amber/ochre accents, emerald verification indicators, high-contrast ink text.

## Evidence on Hand
- Published articles across 6 domains: Computational Neuroscience, Distributed ML Infrastructure, Climate Telemetry, Diamond Open Access, Quantum Algorithms, and Genomic Pipelines.
- Real DOI records, author credentials, citation counts, reading time estimates, and tag metadata.

## Product Principles
1. Content-first reading: The article is sacred; zero intrusive modals or obstructive overlays.
2. Verifiability by default: Every claim, dataset, and code artifact carries citation metadata and reproducible links.
3. Accessible precision: Typography and color choices optimize sustained reading comfort and WCAG AA contrast compliance.
4. Cohesive fullstack experience: Dedicated URLs for every major user intent and task.

## Implementation Status
- The active product is the root Next.js App Router application.
- The editorial studio (`/login`, `/dashboard`) is backed by Supabase when credentials are configured: posts, comments, an image bucket, RLS, and realtime. Without credentials it writes to local JSON so the project stays runnable for review. See `docs/supabase-cms.md`.
- Readers sign in through Supabase Auth with email and password, or Google. Signing in grants reader access only; publishing requires an approved application, which writes the account into `public.editors`.
- Published CMS articles share the same canonical reader, feed, sitemap, and author record as the bundled catalogue. Drafts are private.
- GitHub and ORCID are identity links on an existing account, not sign-in methods. Connecting one never replaces the session the reader applied from.
- The research assistant uses Gemini only when `GEMINI_API_KEY` is configured; otherwise it returns a deterministic, cited response from the local catalog.
- Newsletter and reading-list preferences are stored locally in the browser. No email is sent and no behavioral tracking is used.

## Accessibility & Inclusion
- Strict adherence to WCAG 2.1 AA contrast ratios (>= 4.5:1 for body text, >= 3:1 for large display text).
- Full keyboard navigation with visible focus rings and semantic landmarks.
- Responsive reflow without horizontal scrolling down to 320px viewports.
- Reduced-motion preferences preserve state feedback while removing travel and transform motion.
- All form controls have accessible names; loading, empty, disabled, and error states are announced where they matter.
