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
- Dedicated standalone verification page (`/verify`) for checking DOI manifests, cryptographic hashes, and citation records.
- Native responsive layout adhering to WCAG AA contrast standards (>= 4.5:1), semantic markup, and clear typographic hierarchy.
- Zero disruptive pop-ups or modal interruptions during reading.

## Brand Commitments
- Name: ResearchWithMe
- Editorial voice: Scholarly, precise, restrained, transparent, evidence-based.
- Typography: Editorial serif headings with modern high-legibility sans-serif body and crisp monospace for code and data tables.
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
- The active product is the root Next.js App Router application. `ResearchWith.me-main/` is a legacy WordPress theme archive and is outside the active build.
- Article and comment data are stored in local JSON for this prototype; writes are best-effort and fall back to immutable bundled data on read-only deployments.
- Contributor verification is a clearly labeled local prototype, not production OAuth. No credentials are sent to ORCID, GitHub, an institution, or Google.
- The research assistant uses Gemini only when `GEMINI_API_KEY` is configured; otherwise it returns a deterministic, cited response from the local catalog.
- Newsletter and identity preferences are stored locally in the browser. No email is sent and no behavioral tracking is used.

## Accessibility & Inclusion
- Strict adherence to WCAG 2.1 AA contrast ratios (>= 4.5:1 for body text, >= 3:1 for large display text).
- Full keyboard navigation with visible focus rings and semantic landmarks.
- Responsive reflow without horizontal scrolling down to 320px viewports.
- Reduced-motion preferences preserve state feedback while removing travel and transform motion.
- All form controls have accessible names; loading, empty, disabled, and error states are announced where they matter.
