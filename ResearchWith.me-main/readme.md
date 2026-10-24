# ReMe

ReMe is the WordPress theme for ResearchWithMe. It is a fast, accessible theme for publishing research, with a drag-and-drop header and footer builder, global colors and typography, per-page layout settings and full block editor support.

ReMe is a fork of [Neve](https://github.com/Codeinwp/neve) 4.2.17 by ThemeIsle. Compared with Neve it has:

- no upsells, promotions or onboarding notices,
- no usage tracking and no ThemeIsle SDK,
- no Neve Pro integration,
- no WooCommerce support.

## Requirements

- WordPress 5.5 or later (tested up to 7.1)
- PHP 7.0 or later

## Installation

Copy this directory to `wp-content/themes/reme` and activate **ReMe** under Appearance → Themes. The folder name should be `reme` so it matches the `reme` text domain.

## Development notes

- Only compiled JavaScript and CSS ship with the theme (`assets/apps/*/build`, `assets/js/build`, `style-main-new*.css`). The sources were not part of the Neve release this fork started from, so the bundles were renamed in place.
- Identifiers were renamed from Neve: PHP namespace `ReMe\`, constants `REME_*`, functions, hooks, options and theme mods `reme_*`, the short prefix `rm-`/`rm_` (Neve's `nv-`/`nv_`), CSS custom properties `--rm-*`, and the `reme` text domain.
- Tests: `cd tests && npm ci && npm run install-browser && npm test` (see [tests/README.md](tests/README.md)).
- Build a theme zip without tests and docs: `git archive -o reme.zip --prefix=reme/ HEAD`.
- See [docs/codebase](docs/codebase) for an architecture map.

## License

GPLv2 or later. ReMe © 2026 ResearchWithMe. Based on Neve © 2018 Themeisle, also GPLv2 or later. See [LICENSE.txt](LICENSE.txt).
