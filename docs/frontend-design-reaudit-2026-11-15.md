# Frontend design re-audit

**GATE: ERROR** — the requested taste-skill browser checks could not start Chromium (exit 127; missing `libnspr4.so`, `libnss3.so`, and `libnssutil3.so`). The gate could not inspect the rendered page or lint its copy. No gate waivers were applied; its results do not establish a pass or identify visual FAILs. Do not rerun the gate unchanged. A separate static copy check is reported below.

## Scope and approach

The requested command for `design-taste-frontend-v1` returned no matching skill. The repository offered `design-taste-frontend`, which was loaded instead. This is a re-audit of the existing frontend, not permission to redesign or replace the stack. The earlier audit in `docs/frontend-design-audit-2026-11-15.md` remains the broader codebase scan; this pass concentrates on the homepage, its shared design system, built Pages CSS and the skill's practical checks. It is not a manual review of every frontend file or a visual audit of every route.

ResearchWithMe combines a research publication with tools; for the skill's checker the nearest classification was **software**, but its most useful visual material is real review content, citations and artifacts, not invented application mockups. Existing identity: archival paper `#FAF9F6`, surface `#F3F1EC`, ink `#121214`, blue `#1D4ED8`, and domain-specific evidence colors. Editorial text uses the Aptos Serif / Newsreader stack, interface text uses Aptos / Inter, and identifiers use mono. The homepage uses a text-and-search hero, a decorative generated illustration, a lead review and a research index. Its voice is practical and scholarly. No palette, hero, moment or effect was randomly dealt; no assets, stand-ins, copy or contact facts were invented.

## Findings

### P1 — Confirmed missing secondary text utility in the Pages build

The prior audit identified this as a risk. It is now confirmed at the **compiled CSS** level: `cloudflare-pages/src/globals.css` lacks the `--color-ink-secondary` alias defined in `app/globals.css:131`. After `npm run build:pages`, the generated Pages stylesheet contained neither that variable nor a `.text-ink-secondary` rule, even though many shared components use the class (for example `components/BlogHero.tsx:68`, `components/BlogFooter.tsx:31`). The resulting browser appearance was not checked; affected text will lack the intended utility declaration and may inherit another color. Fix the Pages alias and add a compiled-utility parity test before the broader visual refactor.

### P1 — The homepage combines competing actions and controls

`components/BlogHero.tsx:49-191` combines introduction, search, browse action, two chip groups, illustration, statistics and a pricing link. Those are all real functions, but they compete for attention in source order. The static copy check counted 526 words across the server-rendered homepage, including content outside the hero. Actual fold visibility and mobile density could not be checked.

**Recommendation:** keep the real search and research index foremost; assess whether filtering controls belong closer to results and whether supporting counts and pricing can be visually quieter. Preserve existing behavior and test the hierarchy at 320–1440px before moving anything.

### P1 — Button and touch-target inconsistencies remain

The previous finding stands: two React button primitives, DaisyUI buttons and ad hoc actions use different shape, case, size and variants (`components/primitives/Button.tsx`, `components/ui/button.tsx`, `components/BlogHero.tsx:111`, `components/BlogHeader.tsx:216-245,381-388`). The hero clear-search control is 32px square (`components/BlogHero.tsx:98`); filter chips have a 40px minimum height (`:137,173`). These dimensions warrant touch testing, not a blanket claim of noncompliance.

**Recommendation:** establish a common filled-primary / unfilled-secondary action contract, with appropriate exceptions for chips, icon actions and destructive controls. Preserve accessible names and verify actual spacing, keyboard focus and disabled/loading states.

### P2 — Use the actual research work as the visual anchor

The hero illustration is explicitly marked as decorative generated art (`components/BlogHero.tsx:201-204`), while `components/FeaturedArticle.tsx` and `components/ArticleFeed.tsx` contain real reviews and artifacts. Decorative art is not falsely presented as a photograph, which is good; however, it is not itself evidence of the product's value.

**Recommendation:** during the approved future refactor, evaluate giving a genuine review, its source and its author more prominence. Do not invent authors, citations, metrics or customer claims, or introduce stock photography merely to satisfy a generic landing-page checklist.

### P2 — Repeated scroll reveals can compete with reading

`components/HomeFeed.tsx:183,216` wraps major sections in reveal animations and `components/ArticleFeed.tsx:135-144,189` uses stagger/reveal patterns. The hero also has multiple individually delayed `data-enter` elements (`components/BlogHero.tsx:49-121`). The source contains OS reduced-motion support, but this audit could not verify content visibility or the user-selected motion modes in a browser.

**Recommendation:** use motion to explain a user action or a meaningful transition, not as a requirement for every section. Verify initial render, no-JavaScript, reduced and static modes before removing or changing effects.

### P2 — Production Pages bundle needs a budget review

The Pages build succeeded but Vite warned of chunks larger than 500 kB. Its `entry-client` was reported as **900.47 kB minified / 280.04 kB gzip**; the emitted CSS was **213.26 kB / 34.14 kB gzip**. These are build artifact sizes, not measured page-load performance. Determine which code is actually needed on first load and compare with project budgets before changing loading boundaries.

### P2 — Copy and label review should be contextual

The separate static copy lint on the Next homepage response reported **0 FAIL, 1 WARN** (`copy-numbered`: six step numbers). Its HTML input contains serialized Next.js data as well as markup, so this warning needs visual/contextual verification before edits. The hero uses uppercase editorial and format labels and compact metadata; review ordinary instructional labels for readability without stripping meaningful research terminology or real sequences.

## Applying the skill responsibly

Useful checks are a consistent action system, alignment, meaningful visual content, truthful copy, responsive geometry, keyboard access, reduced motion and performance. Some prescribed landing-page rules are a poor automatic fit for a research reading product: forcing each section to a full viewport, removing meaningful figure captions, adding looping decoration or replacing real contact information with placeholders would conflict with the site's content, accessibility or established requirements. Treat those as design prompts, not defects by themselves. Keep meaningful captions and citation context.

## Checks and limitations

- Exact requested `npx skills use ... --skill design-taste-frontend-v1`: no matching skill; available `design-taste-frontend` was used.
- Taste gate against local Next homepage: **GATE: ERROR**, no browser checks completed; the reported missing libraries prevent Chromium from launching. No checker, layout, screenshot or performance score is available. A successful HTTP response alone is not a visual check.
- `copy-lint.mjs` separately on saved server HTML: 0 FAIL, 1 WARN (six step numbers); rendering/context not verified.
- `RWM_BUILD_TARGET=test ... npm run build:pages`: passed with the large-chunk warning noted above. Public Supabase build variables were blanked for this test build.
- Compiled Pages stylesheet search: `.text-ink-secondary` and `--color-ink-secondary` absent; this validates the CSS-emission finding, not a rendered contrast measurement.
- No photos, external assets or new UI dependencies were added. No assumptions about client-provided assets, invented facts, coined names or placeholder contact information were introduced. No refactor was performed.

## Next steps

Fix and test cross-build theme utility parity first; standardize shared button variants second; then review page groups in the agreed small batches. Before visual sign-off, install a working browser environment and inspect both builds at desktop and mobile sizes in light, dark, reduced-motion and keyboard states, including the home, review, search, account/studio, pricing and error routes. Preserve the audit's limitations until those checks actually run.
