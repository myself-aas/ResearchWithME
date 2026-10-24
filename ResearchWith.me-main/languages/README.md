# Translating ReMe

ReMe uses the `reme` text domain. Translations live in this folder as `reme-{locale}.po`/`.mo` files built from `reme.pot`.

## Regenerating the template

With WP-CLI, from the theme root:

```sh
wp i18n make-pot . languages/reme.pot --domain=reme --exclude=docs,vendor,tests
```
