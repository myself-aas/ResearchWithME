# Changelog

## 1.0.0 (2026-10-23)

Initial release, forked from [Neve 4.2.17](https://github.com/Codeinwp/neve/releases/tag/v4.2.17).

### Renamed

- Theme name, text domain, PHP namespace (`Neve\` → `ReMe\`), constants (`NEVE_` → `REME_`), functions, hooks, options and theme mods (`neve_` → `reme_`), and the short prefix used by CSS classes, custom properties, block palette slugs and REST routes (`nv` → `rm`).

### Removed

- ThemeIsle SDK, usage tracking, the Site Health API probe and the admin dashboard page.
- Upsells, upgrade notices, Black Friday banners and starter-site onboarding.
- Neve Pro integration (loader, license checks, conditional headers, white-label filters).
- WooCommerce support (templates, Customizer sections, cart component, styles and scripts).

### Changed

- The footer copyright text can be edited in the Customizer without an add-on.
- The Abilities API (`reme/*`) only advertises fields the theme implements.

For changes made before the fork, see the [Neve changelog](https://github.com/Codeinwp/neve/blob/master/CHANGELOG.md).
