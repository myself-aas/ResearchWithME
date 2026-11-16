# Editorial refresh — initial shared layer

The user-supplied Google Editorial Clean brief is the design direction, not a claim that these values reproduce blog.google. This first batch updates shared light semantic colors and Daisy aliases, the interface and reading font stacks, shared button primitives, Pages fallback colors, and the social image palette. Plus Jakarta Sans is self-hosted from the Google Fonts repository under its accompanying OFL license. The later user-supplied Gemini Hydrogen Editorial brief informs the dark semantic palette.

The brief specifies both `primary: #005bbf` and `#1a73e8` for primary actions. This batch uses `#005bbf` for action text and fills to maintain stronger contrast across neutral surfaces. Its named radii and descriptions also disagree (for example, `md` is 0.75rem in the tokens but described as 8px); buttons use the unambiguous full-pill treatment. Default controls keep a 44px minimum target rather than the 40px suggested in the brief.

The implementation does not yet apply every typography scale, component, spacing rule, or card specification across every page. Existing one-off styles and component variants remain, and no visual review has been completed. Further page-by-page work should preserve research-specific semantics, dark-mode readability, and reduced-motion behavior.

## Dark-mode shared layer

Dark canvas, surfaces, text, primary action, focus, and Daisy aliases were adapted from the Gemini Hydrogen brief. Muted text uses `#AEB4BE` for legibility across elevated surfaces. The light blue `#ADC7FF` with dark text is used for primary controls rather than white text over a blue-to-cyan gradient, which cannot reliably meet normal-text contrast across the gradient. Research-specific status colors and behavior remain intact. This is a shared-token update, not a complete implementation of the proposed cards, gradients, telemetry, typography scales, or layouts; no visual review has been completed.

## Reader verification follow-up

Inline checks now cover action failure/rollback, reading controls, Next component SSR fixtures and Pages loader outcomes. See `docs/editorial-verification-2026-11-15.md` for exact coverage and blockers. Browser and end-to-end 404 verification remain outstanding; no independent review was available.

The reader's Next segment loading boundary was removed after a real missing-article request returned HTTP 200; a dev-server browser test now verifies 404. This trades the route-specific loading skeleton for correct missing-article status. Production/Worker behavior still requires a separate HTTP check.

The homepage search clear control now has a 44px touch target and focus outline. A Pages in-process browser harness covers a seeded article and the mobile search control; it does not substitute for real workerd article testing or visual review.

Homepage editorial and format filters now use 44px minimum targets. Browse and filter-reset scrolling respects OS and reader motion preferences, including the root scroller in reduced/static modes.

Discovery filter-reset actions now share pill geometry and typography, retaining their existing behavior and filled/outlined visual distinction.

The contributor directory now uses pill search and identifier filters, and profile Share/Writer studio actions have matching geometry with outlined and filled treatments. Existing attribution, filtering and sharing behavior remain unchanged.

### Citation tool follow-up
External-paper citations no longer inherit internal article details or the ResearchWithMe BibTeX publisher; an entered title is required before copying or downloading. Source/style controls use the editorial pill shape. Source details still need independent publisher verification; see the verification log for coverage and remaining limitations.

### Reading list follow-up
Reading-list actions use consistent pill treatments. Confirmation feedback remains visible in the empty state, and blocked storage writes are reported instead of falsely claiming persistent deletion.

### Settings follow-up
Theme choices use consistent pill targets while retaining native radio keyboard interaction. Multiple selector instances use separate radio groups and stay synchronized with the existing theme preference mechanism.

### Audit follow-up
The shared brand links now include their visible label in their accessible names, and pricing metadata and introduction match the two-product catalogue. See `docs/impeccable-frontend-audit-2026-11-15.md` for the audit, measured coverage, and remaining limitations.

### Assistant follow-up
Clipboard failure is reported beside the existing answer rather than as a failed research request, avoiding a misleading retry that sends the question again. The manual-copy fallback and normal request retry remain available in their respective error states.

### Reader provenance follow-up
Article pages no longer claim a reviewed artifact is linked when none exists. When an artifact is available, its existing link and verification guidance remain.

### Reader media follow-up
Article routes no longer construct explainer-video URLs for articles with no published video asset. Real video support should be restored only when an actual asset is represented in article data.

### Citation provenance follow-up
The citation builder uses the selected review's actual publication year and URL rather than a fixed year or its reviewed artifact's DOI. Unknown author, venue and publisher are not filled with fabricated values; separate inline citation mapping still requires review.
