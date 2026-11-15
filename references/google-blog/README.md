# Google Blog CSS token reference (partial)

Source: the stylesheet excerpt pasted by the user in this conversation on 2026-11-15, attributed by the user to blog.google. It was not independently fetched or checked against the live site. `core-tokens.json` is a manually transcribed reference, not the original CSS and not a byte-for-byte snapshot. It does not change ResearchWithMe's active theme.

The JSON contains 440 root custom properties covering the pasted color scales, spacing, typography, motion, elevation, geometry, semantic aliases, and selected gradients; responsive overrides at 481px and 1025px; the pasted dark-theme overrides; locale-specific type stacks; legacy font stacks; and registered animation-property initial values. Values such as `var(...)`, CSS strings and original property names are preserved as written; the JSON structure and formatting are new. Note the pasted breakpoint override uses `--typography-title2-size`, which is different from the base `--typography-title-2-size`; no correction has been inferred.

This is **not a complete extraction**. Some gradient definitions, embedded SVG shapes, component-scoped custom properties, other selectors and cascade details are omitted. The excerpt itself may not include all stylesheets or actual computed values on the site. The provided CSS names Google Sans Flex but does not supply font files or a license for bundling them. The excerpt includes both legacy and later layered styles, so copying only literal legacy values cannot prove what is rendered.

To make this complete and machine-verifiable, provide the CSS as a file (or a sanitized HAR containing response bodies) so a CSS parser can retain every declaration, selector, cascade layer, breakpoint and source order, and compare the extracted values to the source. Browser-level verification and font availability are still needed to establish visual parity.

A separate user-pasted font-face stylesheet is indexed in [fonts.md](fonts.md). It is not the earlier custom-property stylesheet and does not resolve that extraction's omissions.

[cookie-notification.css](cookie-notification.css) transcribes the separate user-pasted Glue cookie notification stylesheet from 2026-11-15. It contains component-specific literal values rather than custom-property declarations; its 600px and 1024px breakpoints belong to that component and must not be treated as global token breakpoints. Its live-site provenance and exact byte identity have not been independently verified. It is reference-only and is not imported by the application.

## Pasted homepage HTML (2026-11-15)

The user also supplied homepage HTML identifying `data-version="pr20261029-2131"` and an inline critical stylesheet with a tokens layer. It separately preloads `/static/keyword/css/blog/index.min.css?version=pr20261029-2131`, the font stylesheet and the Glue cookie stylesheet. The inline CSS is therefore not evidence that the deferred stylesheet or other pages contain no additional declarations. Selected missing non-SVG gradients were manually transcribed from the inline CSS into the JSON; SVG data URLs, other gradients and component-local properties remain omitted. The pasted HTML itself has not been saved as a source file or machine-compared with the transcription. Source attribution and live-site equivalence remain unverified.

## Pasted subcategory HTML (2026-11-15)

The user supplied HTML for `/innovation-and-ai/models-and-research/google-deepmind/` with the same reported version `pr20261029-2131`. Its inline stylesheet includes the shared token layer and additional component-scoped declarations for article and subcategory components. Eight previously omitted non-SVG root gradients were manually transcribed into `core-tokens.json`. The full pasted source has not been saved or compared programmatically; no exhaustive comparison with the homepage or deferred CSS has been performed. SVG data URLs and component-scoped properties remain omitted.

## Uploaded saved pages

Eight saved HTML files supplied by the user were inspected. Their inline `<style>` contents have been extracted byte-for-byte (without the HTML tags) and deduplicated under `inline-css/`; `manifest.json` maps each supplied filename and HTML SHA-256 to its style blocks and their hashes. These are source references, not an exhaustive or validated token extraction. The existing `core-tokens.json` remains a partial manual transcription and has not yet been reconciled against these files.

The uploads contained HTML files only, not the accompanying `_files` directories or standalone CSS. The pages link to external stylesheets including `index.min.css` and additional CSS chunks; these are not included in the inline extracts. The Google DeepMind saved page also references its own external site stylesheet. Consequently these uploads do not contain the entire CSS used by the pages. Saved HTML can contain personal or session data, so the original pages were not copied into the repository.
