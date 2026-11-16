# Impeccable frontend audit — 2026-11-15

## Scope and limits

Code-level review of the shared frontend, Next routes, Pages routes and styles, plus sampled rendered scans. `npx impeccable detect --json app components cloudflare-pages/src styles` scanned source by regex and returned one primary warning and four advisories; this does not inspect computed layouts. Next development pages `/`, `/authors`, `/assistant`, `/bookmarks`, `/cite`, `/settings`, `/pricing`, and `/login` were scanned at 390×844 and 1440×900, except settings mobile was scanned separately. These are public pages with local test configuration, not authenticated account/studio states, all possible content, deployed Worker, or physical-device testing. A Pages/Wrangler axe suite ran 13 public routes at 390px and 1440px. Existing isolated article browser tests cover five widths and theme/save behavior but are not deployed-workerd checks.

Impeccable's context launcher failed with permission denied; existing PRODUCT.md, DESIGN.md and relevant surface briefs were read directly. No independent reviewer or DevTools MCP was available. No claims of complete WCAG conformance, screenshots reviewed by a human, user testing, real-world performance, high-zoom reflow, or completion of every frontend route are made. Scores below are provisional diagnostic judgments, not certifications; insufficient evidence prevents a defensible whole-project score.

## Implementation integrity verdict

**Partial / needs follow-up:** the shared token layer, real content, native theme controls, and shared public components support a coherent scholarly identity. The brand links and pricing metadata contain verified cross-surface correctness defects; remaining authenticated paths and real rendered states need review. The requested font is intentional, so the detector's overused-font warning is a brief-dependent taste warning, not a defect to fix.

| Dimension | Provisional score (0–4) | Evidence / gaps |
| --- | --- | --- |
| Accessibility | 2 | Cross-site visible-label/accessibility-name mismatch on the header and footer; no full keyboard, screen-reader or contrast audit. |
| Performance | 2 | Next shell budget 195.2 KB gzip / 200 KB limit; Pages client about 280 KB gzip, large-chunk warning. No LCP/CLS/INP measurements. |
| Theming | 3 | Shared semantic palettes and theme tests exist; literal print/demo colors remain and all states have not been visually checked. |
| Responsive | 2 | Reader tested 320–1440px; full route/state reflow, 200% zoom and physical touch are not checked. |
| Implementation integrity | 2 | Two verified issues below; broader authenticated and error states still need verification. |

**Provisional sum: 11/20 (acceptable, significant work remains); limited sampled evidence, not a complete project certification.** Verified issues: P0: 0, P1: 2, P2: 1, P3: 0. Unverified detector candidates are kept separate and not counted.

## Verified findings (before remediation)

1. **[P1] Home links omit their visible label in the accessible name.** `components/BlogHeader.tsx:137`, `components/BlogFooter.tsx:26`, `components/BrandLogo.tsx:21`. Axe's `label-content-name-mismatch` flagged both links across all 12 ordinary Pages routes at each of two widths (24 failures; the 404 cases passed). Visible text is “reme.” but the aria-label is “ResearchWithMe home”. Speech-input users may be unable to activate the link using its visible name. Relevant: WCAG 2.5.3 Label in Name. Recommendation: include the visible word in the accessible name, preserve a meaningful home destination, and rerun the real Pages axe suite. Suggested: `$impeccable harden`.
2. **[P1] Pricing structured data gives the second product the wrong price.** `app/pricing/page.tsx` maps every offer to `19.00`, whereas `lib/billing/catalogue.ts` lists the Statistical Table Generator at $5. Search and structured-data consumers can receive misleading price information; checkout pricing is separately controlled by the payment provider. Recommendation: derive or explicitly synchronize structured metadata from the catalogue and test each product. Suggested: `$impeccable harden`.
3. **[P2] Pricing introduction describes one product despite two listed products.** `app/pricing/page.tsx` says “One thing goes further” and its introductory copy describes only the teardown; the same page lists two products. This makes the offer harder to understand. Recommendation: use accurate wording grounded in the existing catalogue. Suggested: `$impeccable clarify`.

## Detector candidates and interpretation

- The approved Plus Jakarta Sans is flagged by the detector in the Pages font declaration and rendered pages. It is a user-selected, locally licensed font, not an actionable defect. No global suppression is recommended.
- Two print-only `#161c1a` values and one MotionLab shadow are outside the metadata palette; their appearance and purpose need contextual review before change. The article's 3.5rem title size is deliberate but absent from the documented type ramp; it is an advisory, not an accessibility failure.
- Desktop detector flagged long lines on authors, assistant, bookmarks and pricing; rendered line lengths deserve visual review at multiple text sizes before prescribing a change. Pricing's availability notices were flagged as nested cards, and one sign-in link as cramped; inspect actual states and geometry before classifying their user impact.
- Existing machine release checks passed; this does not replace human sign-off. Pages client bundle's large-chunk warning and narrow Next budget headroom warrant measurement before changing loading boundaries.

## Positive findings and next actions

Shared tokens, SSR routes and native radio semantics are in place; reduced/static motion, article 404s, reader persistence, and theme behavior have focused coverage. Prioritize (1) `$impeccable harden` for the two verified P1s, (2) `$impeccable clarify` for pricing copy, (3) `$impeccable adapt` for high-zoom and touch review, (4) `$impeccable optimize` only after measuring real load performance, and (5) `$impeccable polish` after remaining state and visual checks. Re-run `$impeccable audit` after fixes to reassess; do not interpret the pre-remediation score as the post-fix score.

## Remediation and recheck

The two verified P1s and the P2 pricing introduction were addressed after the audit. Both home links now include the visible brand in their accessible names. Structured prices come from each existing catalogue price label, and the introduction describes both products. The pricing regression failed before the change for the $5 product and passed afterward. The Pages/Wrangler axe suite went from **24 failures / 2 passes** to **26 passes** across the same 13 routes and two widths; theme and reader-tools browser checks also passed (**34 combined**). Full Vitest: **1071 passed; 15 opt-in browser cases skipped**, then all 15 passed separately in the isolated Pages dispatcher. Typecheck and targeted lint passed. The original provisional scores have not been recalculated: authenticated flows, human review and other stated limitations remain.
