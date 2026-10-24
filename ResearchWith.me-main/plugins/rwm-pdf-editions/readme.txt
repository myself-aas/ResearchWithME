=== ResearchWith.me PDF & Special Editions ===
Contributors: researchwithme
Tags: pdf, academic, publishing, open-access, editions
Requires at least: 6.5
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Generate downloadable PDFs for every article and compile weekly, monthly, quarterly, half-yearly, and yearly special editions with full licensing and royalty accounting.

== Description ==

This plugin gives an open-science publishing site two capabilities that belong together: a per-article PDF and a compiled edition that collects many articles into one archival document.

**Article PDFs**

* A download button appended to single posts, or placed deliberately with the `rwm/pdf-download` block or `[rwm_pdf_download]` shortcode.
* A dependency-free PDF writer. No external service, no headless Chromium, no remote rendering call — the binary document is assembled in PHP and streamed straight to the reader.
* Scholar-friendly structure: journal masthead, title, author with ORCID, publication date, DOI, structured abstract, keywords, article body, and a rights/licensing appendix.
* A `<head>` document produced by `render_article_html()` with CSS Paged Media, suitable for printing or for a headless renderer if a site later wants richer typography.

**Special Editions**

* Five cadences: weekly, monthly, quarterly, half-yearly, and yearly.
* Twice-daily cron compiles one record per closed period and skips periods that already exist, so repeated runs never duplicate output.
* Selection by tags, categories, and featured/sticky status, with a filter hook for custom query rules.
* Editions are stored as a private `rwm_edition` post type, browsable in the admin, with columns for cadence, article count, and a direct PDF link.
* Front-end index via the `rwm/editions-index` block or `[rwm_special_editions]` shortcode.

**Licensing and royalties**

* Six supported license profiles: CC BY 4.0, CC BY-SA 4.0, CC BY-NC 4.0, CC0 1.0, and All Rights Reserved, plus a site default.
* Per-article license override, defaulting to the site's chosen license.
* DOI minting with a configurable prefix, stable across regenerations.
* Contributor royalty ledger. When an edition carries a royalty pool, each author's share is weighted by article volume and recorded with an HMAC verification token derived from the article set, so a published ledger can be checked later against the same edition.

== Installation ==

1. Upload the `rwm-pdf-editions` folder to `/wp-content/plugins/`.
2. Activate the plugin through the Plugins screen. Activation registers the edition post type and schedules the compiler.
3. Visit Special Editions → Settings to choose the default license, DOI prefix, and enabled cadences.

== Frequently Asked Questions ==

= Do I need a PDF library or an external API? =

No. The bundled writer emits a valid PDF 1.4 document (catalog, page tree, content stream, Helvetica and Helvetica-Bold font dictionaries, xref table, trailer) using only core PHP string handling.

= Will the download links be indexed by search engines? =

No. PDF responses send `X-Robots-Tag: noindex`, and download links carry `rel="nofollow"`.

= Can I restrict downloads to logged-in readers? =

Yes. Use the `rwm_pdf_is_download_allowed` filter. Returning `false` for the current request suppresses both the button and the streamed file.

= How are royalties calculated? =

An article contributes a base of 100 points plus one point per 100 words. Each author's points are divided by the edition total to produce a percentage share, which is multiplied by the royalty pool. The result, including a verification token, is stored as edition meta.

== Screenshots ==

1. Article PDF with journal masthead, abstract block, and licensing appendix.
2. Special Editions admin list with cadence, article count, and PDF link.
3. Settings screen for licensing, DOI prefix, and cadence selection.

== Changelog ==

= 1.0.0 =
* Initial release: article PDFs, five edition cadences, licensing profiles, DOI minting, royalty ledger, and Abilities API integration.

== Upgrade Notice ==

= 1.0.0 =
First public release.
