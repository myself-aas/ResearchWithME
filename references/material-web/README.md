# Material Web token snapshot

- Source: https://github.com/material-components/material-web/tree/37aa14b843dcaeb3a46f898679fa6fcd109b1905/tokens
- Commit: `37aa14b843dcaeb3a46f898679fa6fcd109b1905` (upstream `main`, retrieved 2026-11-15).
- License: Apache-2.0; see `LICENSE`. The upstream copyright and SPDX notices remain in the individual files.
- Contents: an unchanged copy of the upstream `tokens/` directory (446 files), including top-level Sass APIs, component tokens, reference palette/typeface tokens, semantic system tokens and versioned generated files. `diff -qr` and `cmp` found no differences from the downloaded commit for the token directory and license.

## Where to start

- `tokens/_index.scss`: public Sass token forwards.
- `tokens/_md-ref-palette.scss` and `tokens/_md-ref-typeface.scss`: reference palette and typeface accessors.
- `tokens/_md-sys-color.scss`: light/dark system colors; `tokens/_md-sys-typescale.scss`, `_md-sys-shape.scss`, `_md-sys-elevation.scss`, `_md-sys-motion.scss` and `_md-sys-state.scss` cover other roles.
- `tokens/_md-comp-filled-button.scss` and `_md-comp-outlined-button.scss`: component-specific button tokens.
- `tokens/versions/v0_192/`: upstream generated Material 3 v0.192 values. Upstream warns in `tokens/versions/README.md` that this internal versioned API may change across minor or patch versions.

These files are a **reference snapshot**, not an active theme: nothing imports them into ResearchWithMe, and its existing generated tokens were not changed. The Sass definitions include references, defaults and CSS custom-property fallbacks; converting them to the project's JSON/CSS token model would be a separate implementation and would not be byte-for-byte identical files.

Material Web's default Material 3 palette and Roboto typography are not evidence of the actual tokens used on blog.google. For example, v0.192's default light primary resolves to `#6750a4` (purple). Applying those defaults would be a material visual change and would not establish an exact match to Google's blog.
