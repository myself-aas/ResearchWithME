# Frontend refactoring plan

> Historical record: product sales and billing were retired on 2026-11-20. Commerce references below describe the former implementation, not current requirements. See `docs/commerce-retirement.md`.

**Implementation-ready first slice:** [Editorial foundation and reader](superpowers/plans/2026-11-15-editorial-foundation-and-reader.md). This document remains the broader roadmap; later subsystems need separate implementation plans.

## Goal and boundaries

Refactor the existing ResearchWithMe frontend in small, tested batches toward the user-supplied **Google Editorial Clean** light direction and the **Gemini Hydrogen Editorial** dark palette. Article pages use the light editorial layout as their visual reference; retain working theme selection and dark-mode legibility. This is an adaptation, not a claim that the product reproduces blog.google. Preserve the product's scholarly identity, real content and citations, routes, functionality, SSR, performance, enlarged logo and existing uncommitted work. Do not add a mobile bottom navigation or fixed article dock. Material Web is reference material, not a dependency. Avoid unnecessary rewrites and new UI dependencies.

The `repo-intake-and-plan` skill is intended for deep-learning reproduction, not frontend refactoring. Its README-first scan rules are useful for this intake, but inference/training reproduction is not the task: no documented training or model-reproduction workflow was identified, and no such commands are proposed. The user-requested plan below takes precedence over inventing a reproduction workflow.

## Intake and current baseline

- `app/` contains the Next App Router frontend; `cloudflare-pages/src/` contains the separate React Router/Vite Pages frontend. Shared presentation and behavior live in `components/`; not every Next route necessarily has a Pages counterpart. Compare actual route inventories before asserting parity.
- `tokens/src/` is the semantic token source, `tokens/generated/` contains generated consumers, `styles/daisy-themes.css` duplicates Daisy theme values, and both global CSS files define utility aliases. The `stone-*` utilities still draw from the older primitive neutral ramp; inspect usages before changing it globally.
- Existing audit documents are historical snapshots, not proof of the current state. The Pages secondary-ink alias and Pages fallback colors have since been addressed; add regression coverage and review remaining error surfaces rather than repeating those fixes blindly.
- Initial light/dark semantic palettes, Plus Jakarta Sans, pill styles in two button primitives, inline article reading controls, and an editorial pass over both `/post/:slug` implementations already exist in the working tree. They are incomplete and have not received a rendered visual review. Preserve and validate them before further changes. `references/google-blog/` is partial source material, not verified complete site CSS.
- `README.md` documents `npm ci`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run impeccable:source`, and `npm run impeccable:url`. `package.json` additionally provides `tokens:build`, `tokens:check`, `build:pages`, and Playwright commands. README-first skill extraction missed several npm commands, so this inventory is manually checked. Deploy, preview integration and external discovery commands are not refactoring prerequisites and must not be run without authorization.
- Most recent focused checks passed: token validation and configured contrast checks; TypeScript; targeted lint; 10 focused tests; and Pages build. These are not a full test suite or visual sign-off. The prior browser gate failed because sandbox Chromium lacked system libraries; do not assume rendered, keyboard, axe or screenshot checks passed. The Pages build previously warned of a large client chunk.

## Acceptance criteria

1. Related page actions have consistent dimensions, radius, typography and spacing, with filled and unfilled variants; icon-only, destructive and genuinely different-sized actions remain purposeful exceptions. Focus, loading, disabled and error states remain clear.
2. Real article metadata, citations, author links, reviewed artifacts, discussion, share/save/like and reading progress work as before. Reading controls are not a fixed bottom dock; no fictional benchmarks, claims or fake controls are introduced.
3. Next and Pages shared surfaces produce equivalent styling and behavior where both actually support the route; documented differences remain explicit. No broken fallback utilities or inaccessible contrast.
4. Responsive behavior works at 320, 390, 768, 1024 and 1440 CSS pixels without clipped content or horizontal page overflow; body content is readable at zoom and touch controls have adequate size and spacing.
5. Keyboard navigation, focus visibility, semantic landmarks, labels, state announcements, contrast and reduced-motion behavior are checked in both themes. No meaningful content or navigation requires animation or JavaScript merely to be visible.
6. Existing SSR and route/status contracts remain intact, including a real 404 for missing articles; no secrets or server-only modules are shipped to the client. No unjustified bundle growth or loading regression.
7. Document what was changed, what was checked and what remains unverified. Do not describe manual or source-only checks as a complete accessibility or visual audit.

## Ordered batches

### 0. Establish an honest baseline

- Review `git diff` and untracked files; preserve current work. Inventory supported routes, shared components, token consumers and existing tests for each build. Record any known route differences instead of forcing false parity.
- Re-run `npm run tokens:check`, `npm run typecheck`, targeted article/header/theme tests, and `npm run build:pages` with safe local test configuration. Run the full unit suite once to expose regressions, then record actual failures and environment assumptions. Compare generated tokens to their sources without hand-editing generated artifacts.
- Provision a working browser environment if possible and capture baseline Next and Pages screenshots at mobile and desktop; do not rerun the failed browser gate unchanged. If unavailable, record the blocker and defer visual sign-off.
- Exit: reproducible baseline and a list of verified versus unverified behavior; no product behavior changes in this batch.

### 1. Tokens and cross-build parity

- Compare generated semantic tokens, `@theme` aliases, Daisy values and legacy hardcoded colors in both builds. Add a compiled-CSS parity regression for shared utilities including `text-ink-secondary` and focus colors. Check dark, system and explicit theme switching.
- Resolve palette duplication at its source where safe; audit legacy `stone-*` consumers before changing the primitive ramp, and preserve domain status meanings. Rebuild tokens with `npm run tokens:build` and run `npm run tokens:check`. Check fonts and licenses, loading fallbacks and cumulative layout shifts in a browser.
- Exit: documented semantic roles, passing token/contrast and cross-build utility tests; no unresolved newly introduced aliases.

### 2. Shared actions and controls

- Inventory the two React button primitives, Daisy buttons and ad hoc actions. Establish one documented size/variant contract first, then migrate one page group at a time without changing form submission semantics, links, keyboard interaction or motion preference behavior. Match peer buttons on each page; preserve destructive and icon exceptions and 44px default targets.
- Add tests for variants, size, accessible name, focus, disabled/loading and action behavior. Review controls such as filters and search clear buttons separately rather than making every chip a button clone.
- Exit: migrated examples pass component and interaction tests, with remaining exceptions recorded.

### 3. Reader and article pages

- Review the two `/post/:slug` implementations side by side; extract only demonstrably common presentational pieces when it does not compromise their loader, Next metadata, Pages SSR or routing differences. Retain SSR text, citation mapping, artifact links, article progress, discussion and inline controls.
- Refine article hierarchy, metadata, cover, takeaway/related cards, reading measure and responsive spacing using the light editorial reference. Keep existing dark theme usable. Do not copy the example's bottom dock, fabricated sample content, viewport zoom restriction, hidden scrollbar or nonfunctional media/copy actions.
- Exercise article with and without markdown, missing or data-URL image, missing profile/artifact, long title/tags, empty related items and missing slug. Verify keyboard interaction, mobile overflow, text zoom, dark/light and reduced motion; add actual interaction/SSR coverage beyond the existing source-presence tests.
- Exit: both implementations pass article behavior and visual checks where supported, with factual content unchanged.

### 4. Homepage, discovery and author surfaces

- Evaluate `BlogHero`, `HomeFeed`, `ArticleFeed`, `FeaturedArticle`, category and author pages. Prioritize search, real reviews and cited artifacts; simplify density only after responsive inspection. Preserve filtering, search, author attribution, empty/loading states and route URLs.
- Migrate actions and cards in small, reviewable groups. Test mobile tap targets, pagination/filter state, keyboard search and no-JS/SSR fallbacks where applicable.
- Exit: clear hierarchy with equivalent behavior and no invented copy or imagery.

### 5. Tools, account, studio and error surfaces

- Audit citation, bookmarks, assistant, settings, login, pricing, dashboards, writing/editor and public error surfaces against their actual build support. Preserve auth, billing, autosave, publishing, clipboard, citation export and backend contracts; mock external services in tests and do not change Supabase Preview configuration.
- Apply shared visual primitives only where safe; maintain clear form errors, confirmation and destructive actions. Review loading, empty, permission and failure states in keyboard and screen-reader workflows.
- Exit: route-specific regression coverage and documented remaining exceptions; no credential or deployment changes.

### 6. Performance, visual verification and completion

- Review Pages client chunk and CSS output against project budgets; measure before changing dynamic boundaries. Avoid new libraries or asset loads without a justified budget and approval. Check real-world SSR, hydration, theme flash and reduced motion.
- Run full unit suite, lint, typecheck, token checks, both relevant builds, selected Playwright/axe checks and manual keyboard/responsive/theme review. Include 320px, mobile, tablet and desktop; light/dark, reduced motion and high zoom. Compare both builds where routes overlap. Report actual commands, failures, skips, environment and screenshots rather than inferring success from a build.
- Update design documentation and remove obsolete guidance only after confirming the implementation. Maintain a concise follow-up list for untested routes and risks. Changes remain uncommitted unless explicitly requested.

## Risks and decisions to preserve

- The briefs contain conflicting primary colors and radius names; current shared light actions use `#005BBF` and dark actions use `#ADC7FF` with dark text for contrast. Verify any proposed changes rather than blindly using white text on a bright gradient.
- The full blog.google external CSS was not supplied; the extracted inline reference and Material Web snapshots do not establish exact parity. Do not claim byte-identical Google tokens.
- Article controls were moved inline; verify real save, cite, discussion and progress behavior rather than relying solely on source-presence tests. Page implementations differ and must be checked independently.
- Prior audit notes may be superseded by the current working tree. Validate each finding before acting. The previous full suite had one logo assertion failure that was subsequently updated and passed in isolation; the full suite was not rerun afterward.
- Supabase Preview is an external integration; no setting was changed, and disabling it is outside this frontend plan unless an authorized integration control becomes available.
