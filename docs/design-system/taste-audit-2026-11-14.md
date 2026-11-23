GATE: OFF (no build active)

> Historical record: product sales and billing were retired on 2026-11-20. Commerce references below describe the former implementation, not current requirements. See `docs/commerce-retirement.md`.

# Design-taste audit — ResearchWithMe / reme

**Kind:** scholarly publishing and research software; `software` is the nearest skill classification, not a recommendation to turn the archive into a SaaS sales page.  
**Date:** 2026-11-14  
**Branch:** `arena/7c1641ff-researchwithme`  
**Scope:** repository-wide frontend design-system source audit; no redesign or fixes implemented.

## Summary

**Keep the editorial identity. Repair its contracts, show more of the actual research, and reduce competing chrome.**

The design has a credible subject-specific foundation: readable serif articles, restrained blue actions, explicit citations, source identifiers, and independent research-integrity states. The largest weaknesses are not missing effects or fashionable fonts. They are broken token wiring, inconsistent system documentation, speculative media, missing feedback, and repeated layout/typography recipes.

The recommended sequence is:

1. Repair token naming/theme behavior and domain contrast.
2. Fix reader-facing failures: unnamed tablet sign-in link, unbacked video slots, silent citation-copy errors, skip navigation, fixed overlays, and print attribution.
3. Consolidate typography, controls, layout, and theme recipes.
4. Visually test evidence-led composition and remove nonessential chrome.

## Execution, evidence, and limitations

Ran `npx skills use "https://github.com/leonxlnx/taste-skill" --skill "design-taste-frontend"`. Captured its complete 399-line output to a temporary file and read it in separate chunks after the first tool display truncated it. Resolved references from `/tmp/skills-use-nlpPfD/design-taste-frontend`, including system, motion, copy/voice, and finish-gate guidance.

Ran the supplied finish gate once. Its literal result was **`GATE: OFF (no build active)`**. This is **not a pass**. No new page/build was started for this audit, no waivers were created, and no checker findings were suppressed. Browser consistency, layout, screenshot, and performance checks were not executed: project dependencies are absent and no Chrome/Chromium executable was found on PATH. No live preview or production service was tested. The gate's `OFF` instruction says to report the result rather than rerun it.

### Coverage

- 28 App Router `page.tsx` files inventoried.
- 187 TSX/CSS files inventoried across `app/`, `components/`, and `cloudflare-pages/src/`, totaling 22,895 lines.
- Reviewed product/design briefs, token sources and generated CSS, shared primitives, hero/feed/article compositions, navigation, research actions, video/caption handling, authoring patterns, billing copy, and testing infrastructure.
- Ran a repository-wide source scan of `var(--reme-…)` consumers against generated declarations; found the same 15 missing component-token names as the preceding design-system audit.
- Inspected the actual local `folio-hero.jpeg` and `folio-code.jpeg` assets. These are asset inspections, **not screenshots of rendered pages**.
- Reran token validation and the configured contrast gate: both passed; the latter covers 22 selected semantic pairs, not every component composition.
- Ran the skill's copy linter on two short source-verified excerpts, not on compiled pages: home copy, 55 words; digest copy, 39 words. Each returned **0 FAIL, 0 WARN**. No warnings were retained or waived. These samples exclude dynamic content and are not a site-wide copy certification.

This is a layered, repository-wide review, not exhaustive line-by-line or rendered-state certification. No application, dependency, environment, database, contact information, or skill file was changed.

Related evidence:

- [`audit-2026-11-14.md`](audit-2026-11-14.md): detailed token/system defects and contrast calculations.
- [`../frontend-review-2026-11-14.md`](../frontend-review-2026-11-14.md): responsive layouts and workflow recovery.

## Applying the skill without overriding the product

The downloaded skill is chiefly a company-landing-page kit. It contains useful audit criteria but also strong prescriptions that do not fit this product. Treat these as applicability decisions, not checker waivers: no rendered checker was run.

| Skill prescription | Decision for this repository |
|---|---|
| Show the actual subject, not generic visual filler | Apply. Prefer an actual review, source trail, method, dataset, or repository artifact. |
| Equal content edges and coherent controls | Apply within each layout family. A reading column and a workspace can legitimately have different widths. |
| Clear actions, truthful claims, real success feedback | Apply across reader, assistant, purchase, and authoring flows. |
| No caption under any image | Do **not** apply to scientific figures. Keep explanatory captions, source attribution, methods, and applicable license requirements. Replace generic captions with useful ones. |
| Every section exactly one or two screens | Do **not** impose on articles, tables, API docs, forms, or error states. Their height should follow content and accessibility needs. |
| Every page needs a dealt moment/hero animation; tech needs an effect | Do **not** add these to satisfy a quota. Existing `docs/motion-system.md` says motion explains state and rules out decorative telemetry. |
| Copy the kit assets/system; make Next a static export | Do **not** do this in an audit. The active Next app has server rendering, authenticated routes, APIs, and an existing reme system. A second CSS/motion framework would increase inconsistency. |
| One accent/no violet in every circumstance | Preserve approved semantic research states; do not recolor scientific data, third-party marks, or domain meaning merely for a style ban. |
| Full-color product logos | Use authentic logos only for actual third-party identities/integrations. Keep Lucide UI controls monochrome and semantic. |
| `.example` contacts and reduced address detail | Do not replace the repository's existing real contact channels or canonical domain with stand-ins. No contact data was invented. |
| One primary conversion on every page | Adapt to one **primary user task**: find/read a review, cite it, ask a question, or edit a draft. Buying is not the archive's default goal. |

**Retained direction instead of a new deal:** archival paper `#FAF9F6`, surface `#F3F1EC`, ink `#121214`, secondary ink `#5C5C63`, reference blue `#1D4ED8`, and existing semantic status roles. Aptos Serif/Aptos/Aptos Mono remain requested by installed name, with the existing fallback stacks. No palette/font randomization, shader, scene, stand-in photograph, coined brand, or new animation was introduced.

**Voice card:** scholarly and direct; name the review, source, method, and limitation; keep actions literal; use consistent terms; do not claim verification, delivery, or success without the corresponding evidence/state.

## Findings

Priority: **P1** broken contract or core accessibility/task issue; **P2** significant usability/consistency improvement; **P3** refinement. Source-derived layout risks still need browser reproduction.

### T-01 · P1 · Tablet sign-in link has no accessible name

**Evidence:** `components/BlogHeader.tsx:241–247`: the unsigned-user auth group is visible from `md` (768px), but “Sign in” is inside `hidden xl:inline` (visible only from 1280px). Its LogIn icon is `aria-hidden="true"`, and the anchor has neither `aria-label` nor other accessible text.

**Impact:** from 768–1279px, the control is visually icon-only and has no accessible name. This is a concrete breakpoint-dependent semantic defect, not a preference about icon styling.

**Recommendation:** preserve text with `sr-only xl:not-sr-only`, or name the link explicitly. Verify the signed-out header with browser accessibility snapshots at 768, 1024, and 1279px; keep account/editor states covered too.

### T-02 · P1 · Article pages render video slots without bundled videos

**Evidence:** `app/post/[slug]/page.tsx:234–246` unconditionally creates `/videos/explainer-${slug}.mp4`. No `.mp4` or `.webm` assets exist under `public/`. The same page comments that explainer videos are not published assets yet (`:109`). `components/VideoEmbed.tsx:27–35` falls back to “Render pending” and a raw file path after an error.

**Impact:** on the checked-in local asset path, an ordinary article requests a missing media resource and can display an unfinished-looking box before the key takeaways. A poster is not proof of a playable video. No deployed HTTP failure is claimed here; externally provisioned deployment assets would need separate verification.

**Recommendation:** condition video display on a published-media record with an actual playable URL. Until then, omit the slot rather than reserve a failed demonstration. For published videos, use explicit play, a suitable poster, captions, and a transcript/recovery path. Test successful load and 404/timeout states in both runtimes.

**Related integrity issue:** `app/videos/captions/[slug]/route.ts` generates fixed six-second title/takeaway cues from article metadata, not a verified transcript of media. Do not present these as synchronized captions without checking the final video.

### T-03 · P1 · Citation clipboard failure is silently swallowed

**Evidence:** `components/reader/InlineCitationPopover.tsx:71–84` catches clipboard failure with only a comment. The same component advertises copy chips and success feedback.

**Impact:** copying a citation is a core scholarly task. A failed clipboard API call provides no failure/recovery signal, even though `ReadingActions` and the assistant already offer failure feedback in their own implementations.

**Recommendation:** retain the citation text and announce a local, polite failure message with a selectable/manual-copy alternative. Do not display success unless writing actually completes. Consolidate a shared clipboard-state pattern across DOI, APA, BibTeX, answer, and link-copy controls.

### T-04 · P1 · Token contracts remain broken despite base checks passing

**Evidence:** custom source scan reconfirmed **15 undefined component CSS variables** in `lib/scholarly/source-card.ts`, `evidence-card.ts`, and `claim-card.ts`. `tokens/scripts/build.mjs:72` emits `--reme-component-component-*` while consumers request `--reme-component-*`. Component source aliases resolve `semantic.light.*` to literals, with no dark component overrides.

**Recommendation:** fix the prefix and theme behavior together, not in separate visual patches. This affects the reference scholarly components/future consumers; do not infer every ordinary article card is broken.

The previous audit's contrast calculations also remain relevant: light Emerging/Uncertain small-text badges on their 10% tinted surfaces are approximately **2.92:1 / 2.56:1**, below 4.5:1. The configured gate does not include those compositions. Add consumer-resolution, theme-switching, and composed-state contrast tests.

### T-05 · P2 · Generic work photographs do not substantiate research claims

**Evidence:** directly inspected `public/images/folio-hero.jpeg` (people with laptops around a table) and `folio-code.jpeg` (person working at a laptop). `components/ArticleFeed.tsx:35–63` assigns the former to Health & Medicine, and reuses other folio images across disciplines. `FeaturedArticle` and article pages use `folio-hero.jpeg` as a cover fallback.

**Assessment:** these photos can provide general context, but they do not show the actual reviewed paper, trial evidence, benchmark, or repository architecture. Their visual quality alone cannot establish relevance or provenance. No claim is made here about who created them or their license status.

**Recommendation:** prefer source-authorized figures, real repository diagrams, relevant data visualizations, or intentionally typographic covers that identify the work. Use supplied source/license metadata and author-written alt/caption text. Keep decorative photos explicitly decorative; do not make a generic photo's alt text assert a scientific finding.

**Do not** replace them with invented study screenshots or photorealistic “evidence.” No replacement assets were generated or sourced for this audit.

### T-06 · P2 · The first useful research result competes with several orientation layers

**Evidence:** `components/HomeFeed.tsx:173–220` orders hero, featured review, unfiltered product band, article feed, and author spotlight. `BlogHero` includes introductory copy, search, category chips, format chips, summary counts, and a products link. The feed itself also introduces category cards before article cards.

**Risk:** a first-time phone reader may spend substantial space navigating promises, filters, and taxonomy before comparing reviews. Exact fold/scroll distance is unmeasured.

**Recommendation:** test a compact introduction plus search and a real lead review; progressively disclose advanced filters. Keep the product band hidden under active filters as it is now. Do not blindly remove product placements that the brief explicitly requests, or force all content into one full-screen hero.

**Acceptance:** measure how far a reader scrolls to open a relevant review at 390px; test topic/format selection without losing context or introducing layout jumps.

### T-07 · P2 · Too many typography dialects weaken hierarchy

**Evidence:** `Text.tsx` combines house and spec scales; hero/article titles add further recipes. Eyebrows, mono metadata, uppercase buttons, badges, and scholarly labels repeat across compositions. Global CSS also patches small sizes and padding after the fact.

**Recommendation:** publish one role map for editorial title, page title, section heading, interface heading, reading text, metadata, and identifiers. Make category/format labels sentence case unless there is a deliberate archival-index exception. Keep DOI/BibTeX/code mono; not every label needs mono. Remove a redundant label before deleting useful attribution.

**Do not** treat 12px metadata or serif type as intrinsically defective. Test legibility, contrast, hierarchy, and enlargement in context; the skill's blanket 13px/62-character prescriptions are not product requirements.

### T-08 · P2 · “One system” should mean semantic recipes, not one visual for every task

**Evidence:** buttons use brand-filled, inverse-filled, bordered, text, destructive, and bespoke CMS recipes; Card/Box padding names and token radius recipes differ. Inline citation links, navigation links, article links, and calls to action have different behaviors.

**Recommendation:** keep justified roles but define them explicitly: primary action, secondary action, destructive action, inline reference, navigation, and article navigation. Align size/density names, hit areas, focus behavior, and state feedback across primitives and `cms/styles.ts`. Do not collapse error actions or citation links into one indiscriminate pill-button style.

Add a specimen with loading, error, disabled, focus, pressed, selected, long-label, and narrow-screen states. Supported props must not emit conflicting classes; additive `className` behavior should be documented.

### T-09 · P2 · Motion effort exceeds its governance in places

**Evidence:** CSS main entrance, staged hero, feed/spotlight Reveal wrappers, card hover effects, and Lenis article smooth scrolling are separate mechanisms. `docs/motion-system.md` says motion explains change; `lib/motion/tokens.ts` still manually duplicates generated durations/easings.

**Recommendation:** prioritize state transitions—filter selection, saved state, citation disclosure, error recovery. Keep research content readable at rest and without JavaScript. Benchmark native article scrolling before retaining Lenis on low-end devices; avoid adding the taste kit's motion runtime alongside the existing one. Do not add loops or “dealt moments” to meet a quota.

Existing reduced/static-mode infrastructure and SSR-safe Reveal behavior are strengths; preserve them while reducing unnecessary choreography.

### T-10 · P2 · Fixed UI and edge alignment need layout-family contracts

**Evidence:** repeated `max-w-7xl`, `max-w-5xl`, `max-w-4xl`, and 68ch recipes; a centered reading dock with no viewport-width/safe-area bound; an expanding sticky-header mobile menu without a height limit; separate custom Dialog and Radix dialog implementations.

**Recommendation:** define three intentional families—index, reader, workspace—with shared symmetric gutters and documented rail behavior. Different max widths are not failures by themselves. Bound fixed overlays to usable dynamic viewport height/width, preserve safe areas, and tie reading clearance to actual persistent controls. Verify focus visibility, open-menu scrolling, keyboard-open search, and long identifiers rather than masking overflow globally.

The duplicate `main-content` IDs and global print `header` hiding from the earlier review remain high-priority accessibility/attribution issues.

### T-11 · P2 · Copy consistency needs behavioral evidence, not just a lint pass

- **Digest:** `NewsletterSignup.tsx` says “One Tuesday dispatch” and “Subscribe to the digest,” but saves local preferences only. The selected excerpt passed copy-lint, which demonstrates why lexical quality is not factual verification. No route consumer of `NewsletterSignup` was found in the current source scan, so treat this as a dormant-component issue before reuse, not an observed live signup failure.
- **Verification language:** `BlogHero` says reviews are written by “ORCID and GitHub attested domain specialists.” Make sure account identity links are not presented as independent validation of subject-matter competence. Show the scope of each attestation in author details; do not invent a new verification claim in copy.
- **Product inventory:** `PRODUCT.md` implementation prose says one paid product, while `lib/billing/catalogue.ts` currently contains The Teardown System ($19) and Statistical Table Generator ($5). The shared frontend catalogue is useful; reconcile stale reference copy and verify price/delivery statements against fulfillment, without changing offers during an audit.
- **Vocabulary:** choose consistent reader-facing names for reviews/articles, writers/authors, and reading list/bookmarks; technical route names may differ, but navigation should not suggest separate concepts unintentionally.

### T-12 · P2 · Existing visual tooling is useful but not a release certificate

**Evidence:** `scripts/visual-parity.mjs` already captures real screenshots at five widths, supports light/dark via environment, pins static motion, and compares pixels. This is stronger than markup snapshots and should be retained. However, its default routes still include `/papers` and `/editions`, absent from the active root App Router page inventory. `test/playwright.config.ts` runs the Pages target; `.github/workflows/quality.yml` does not run the browser suite or parity capture.

**Recommendation:** make active Next route coverage explicit, verify intended redirects for old routes rather than assuming them, and add current article, login, dashboard/editor, and pricing states. Capture both themes, font-ready state, menu/search open, failed media, and 320px reflow. Check errors/status codes and relevant headings so a screenshot of an error page cannot count as success.

The taste gate and its screen-height/style rules are not a substitute for the product's accessible-reader test matrix.

## Route-family review map

| Family | Preserve | Next review/fix |
|---|---|---|
| Home/category/articles | Search, real lead article, filter-aware hiding of offers | Pre-result density, relevant imagery, consistent taxonomy and URL state |
| Article | 68ch reading, citations, artifact metadata, author attribution | Missing media, copy failure feedback, print header, dock/safe area, long DOI/code/table reflow |
| Authors/author archive | Credentials and published work | Attestation scope, long names/affiliations, meaningful avatar/figure alternatives |
| Assistant | Cited answers, visible limitations | Request cancellation/timeouts, clear failure state, keyboard-open layout |
| Citation/bookmarks | Dedicated task pages, device-local persistence | Shared clipboard recovery, long output, consistent reading-list terminology |
| Login/account | Native fields and clear auth separation | Tablet accessible name, autofill, validation focus, theme and input size |
| Dashboard/write | Actual publishing permissions and draft state | Canonical writer entry point, durable upload/draft recovery, compact toolbar |
| Pricing/contact | Shared product catalogue and explicit free offering | Current inventory, verified fulfillment, consistent action labels; preserve real contacts |
| About/privacy/API docs | Content-specific section navigation and reading widths | Long examples, sticky offsets, enlarged text, current brand/system statements |
| Error/loading/motion lab | Recovery actions and existing motion modes | No raw internal paths, meaningful live feedback, no blank/hiding content |

## Remediation and verification plan

### 1. Repair before restyling

- Token naming + theme-aware aliases + domain foreground contrast.
- Named sign-in at intermediate breakpoints.
- Publish-aware media rendering and actual caption verification.
- Clipboard failure feedback, unique main target, correct print attribution.
- Responsive menu/dock/dialog bounds.

### 2. Consolidate the system

- Resolve normative-spec/implemented-token/route-brief disagreements.
- Define title/control/density/radius/icon/clipboard recipes and a component specimen.
- Derive motion adapters from generated data; complete System theme handling.
- Share Next/Pages CSS where possible and document email/video adaptations.

### 3. Review visually in the real app

Test 1440×900, 1024×768, 820×1180, 768×1024, 390×844, plus 320px, short landscape, 200% text, and zoom/reflow scenarios. Use explicit light/dark/system themes, full/reduced/static motion, keyboard-only use, failed APIs/clipboard/media, unavailable storage, long scholarly identifiers, and open overlays.

Record actual screenshots, computed styles, browser axe results, manual keyboard checks, and performance traces. The pass condition is coherent research tasks with no obscured focus or broken state feedback—not conformity to a landing-page effect quota.

## Closing disclosures

- **Gate:** OFF; no rendered consistency/layout/performance pass claimed.
- **Checker waivers/open checker FAILs:** none produced because browser checks were not run. Source-audit findings above remain unresolved.
- **Copy lint:** selected excerpts only; 0 FAIL / 0 WARN. No site-wide wording pass or factual certification.
- **New facts/names/contacts/prices:** none invented. Existing two-product catalogue observed, not independently certified against checkout.
- **New photographs, stand-ins, client slots, effects, or scenes:** none added. Future research-specific imagery needs actual source/permission/caption metadata; no replacement-photo quota is proposed.
- **Changes:** this audit document only for this pass. Earlier audit documents remain intact; application source is unchanged.
