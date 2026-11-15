# Editorial refresh — initial shared layer

The user-supplied Google Editorial Clean brief is the design direction, not a claim that these values reproduce blog.google. This first batch updates shared light semantic colors and Daisy aliases, the interface and reading font stacks, shared button primitives, Pages fallback colors, and the social image palette. Plus Jakarta Sans is self-hosted from the Google Fonts repository under its accompanying OFL license. The later user-supplied Gemini Hydrogen Editorial brief informs the dark semantic palette.

The brief specifies both `primary: #005bbf` and `#1a73e8` for primary actions. This batch uses `#005bbf` for action text and fills to maintain stronger contrast across neutral surfaces. Its named radii and descriptions also disagree (for example, `md` is 0.75rem in the tokens but described as 8px); buttons use the unambiguous full-pill treatment. Default controls keep a 44px minimum target rather than the 40px suggested in the brief.

The implementation does not yet apply every typography scale, component, spacing rule, or card specification across every page. Existing one-off styles and component variants remain, and no visual review has been completed. Further page-by-page work should preserve research-specific semantics, dark-mode readability, and reduced-motion behavior.

## Dark-mode shared layer

Dark canvas, surfaces, text, primary action, focus, and Daisy aliases were adapted from the Gemini Hydrogen brief. Muted text uses `#AEB4BE` for legibility across elevated surfaces. The light blue `#ADC7FF` with dark text is used for primary controls rather than white text over a blue-to-cyan gradient, which cannot reliably meet normal-text contrast across the gradient. Research-specific status colors and behavior remain intact. This is a shared-token update, not a complete implementation of the proposed cards, gradients, telemetry, typography scales, or layouts; no visual review has been completed.

## Reader verification follow-up

Inline checks now cover action failure/rollback, reading controls, Next component SSR fixtures and Pages loader outcomes. See `docs/editorial-verification-2026-11-15.md` for exact coverage and blockers. Browser and end-to-end 404 verification remain outstanding; no independent review was available.

The reader's Next segment loading boundary was removed after a real missing-article request returned HTTP 200; a dev-server browser test now verifies 404. This trades the route-specific loading skeleton for correct missing-article status. Production/Worker behavior still requires a separate HTTP check.
