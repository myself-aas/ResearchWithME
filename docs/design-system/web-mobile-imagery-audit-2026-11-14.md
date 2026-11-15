# Web/mobile imagery and design-system audit

**Date:** 2026-11-14  
**Branch:** `arena/7c1641ff-researchwithme`  
**Scope:** independent fallback audit of the existing frontend system, emphasizing desktop/mobile media contracts. No UI or images generated.

## Requested skills: unavailable

Both requested commands were executed, their outputs captured separately, and their complete outputs read:

```text
npx skills use "https://github.com/leonxlnx/taste-skill" --skill "imagegen-frontend-web"
[SKILLS_USE_NO_MATCHING_SKILL] No matching skill found for: imagegen-frontend-web
╰▶ fix: Available skills:
  - design-taste-frontend
```

```text
npx skills use "https://github.com/leonxlnx/taste-skill" --skill "imagegen-frontend-mobile"
[SKILLS_USE_NO_MATCHING_SKILL] No matching skill found for: imagegen-frontend-mobile
╰▶ fix: Available skills:
  - design-taste-frontend
```

Each command exited **1**. Neither supplied a SKILL.md or supporting-files directory. Therefore no instructions from either named skill could be followed, and no relative support paths existed to resolve. This report is **not** presented as an execution of those unavailable skills. The earlier taste-skill review remains a separate report.

## Executive conclusion

**Use one scholarly design system with responsive media contracts, not separate web/mobile art directions.** Keep the existing typography, quiet canvas, source-first reading, and semantic state vocabulary. The more urgent work is ensuring that the right image is displayed consistently, has truthful context, survives failure, and does not distort evidence on small screens.

The most important new finding is an inconsistent author-avatar contract: profile URLs are rendered as literal text in directory/spotlight tiles even though an image-aware avatar component exists. Other priorities are unbacked video slots, accessible figure metadata, reliable editor uploads, responsive-source parity, and media-specific mobile testing.

## Audit method and limits

The preceding reports provide the repository-wide baseline: 28 App Router pages, 187 TSX/CSS files, and 22,895 lines across app/shared/Pages frontend surfaces. This pass traced media-specific data from profile/CMS models through uploads, crop policy, encoding, URL selection, responsive rendering, generated social/icon routes, and test coverage. Representative implementations were read in detail; this is not exhaustive line-by-line verification of every frontend file.

Reviewed:

- `lib/images/{policy,process,encode,urls}.ts` and `lib/supabase/storage.ts`.
- Avatar mapping, profile-photo upload, directory/spotlight/byline rendering.
- CoverImage, FeaturedArticle, ArticleFeed, article figures, MarkdownBody.
- Crop dialog, editor media insertion, image-related test files.
- Next image configuration, OpenNext/deployment comments, Pages image shim.
- Manifest, Apple icon, PNG icon routes, root/article social-image renderers.
- Existing design/token/motion documentation and prior audit findings.

### Checks actually run

- Read both complete failed skill outputs.
- Parsed local JPEG headers with Python standard-library code to determine actual dimensions and file sizes.
- Reran token reference validation: **PASS**.
- Reran configured semantic contrast gate: **PASS, 22 configured pairs**; not comprehensive component contrast certification.
- Inspected source/test coverage. **Did not execute** Vitest, lint, typecheck, production build, browser tests, runtime accessibility checks, image decoding/cropping, network transfer measurements, or screenshot comparisons.

No live Supabase calls, database changes, deployments, credential inspection, dependency installation, or application edits were needed. No image-generation tool was called because the requested deliverable is an audit, not new imagery.

## Asset baseline

Actual checked-in image dimensions and encoded sizes:

| Asset | Dimensions | Size |
|---|---:|---:|
| `public/images/folio-code.jpeg` | 800×534 | 44.9 KiB |
| `public/images/folio-dashboard.jpeg` | 800×530 | 26.3 KiB |
| `public/images/folio-design.jpeg` | 800×533 | 41.6 KiB |
| `public/images/folio-hero.jpeg` | 800×534 | 67.1 KiB |
| `public/images/folio-process.jpeg` | 800×533 | 62.4 KiB |

These are modest payloads; do not describe them as inherently oversized. Their limitation is source resolution and subject relevance, not simply format. Each has an approximately 3:2 ratio, while uploaded banners are standardized to 16:9 and the article figure frame is 16:9.

Current processed-image policy:

- JPEG input only for the crop dialog, ≤512 KiB, with extension/type/header checks.
- Banner crop minimum 1200×675; outputs up to 1600×900 plus 800×450, without upscaling.
- Avatar crop minimum 256×256; output up to 512×512.
- WebP encoding with JPEG fallback and per-kind byte budgets.
- Browser canvas re-encoding strips EXIF; crop-dialog object URLs are revoked on replacement/unmount.
- General inline-image uploads are a separate path accepting JPEG/PNG/WebP/AVIF/GIF up to 5 MiB.

These are useful foundations. Do not replace them indiscriminately with a new asset framework.

## Findings

Priority: **P1** broken task or identity/accessibility contract; **P2** significant design-system robustness issue; **P3** refinement. Exposure and uncertainty are noted explicitly.

### WM-01 · P1 · Author photo URLs are rendered as text on some surfaces

**Evidence:** `lib/author-directory-core.ts:44–49` maps `profiles.avatar_url` directly into `author.avatar`. `components/AuthorDirectory.tsx:143–149` and `components/AuthorSpotlight.tsx:64–70` interpolate `{author.avatar}` inside a styled span instead of rendering an image. `AuthorAvatar.tsx` already handles trusted profile image URLs and an SVG fallback, and is used in profile cards.

**Impact:** a published contributor with an uploaded profile photo can show a long URL string in a small directory/spotlight tile instead of the photo. This can also create overflow or an inconsistent identity between directory and profile. Similar raw interpolations exist in article/feed/featured bylines; their supplied author data should be traced individually because CMS post mapping may still provide initials.

**Recommendation:** consolidate all author identity rendering around one typed contract and one avatar component. Prefer explicit `avatarUrl` and `initials` fields over overloading a single string. Provide meaningful missing/broken-photo behavior, stable dimensions, and a consistent size/shape recipe.

**Acceptance:** test initials, null/empty values, trusted photo URL, unsupported origin, failed image request, long names, and updated photo across directory, spotlight, profile, and byline at mobile and desktop widths. Do not fabricate portraits for real contributors.

### WM-02 · P1 · Scientific image semantics are not represented in the cover model

**Evidence:** `lib/cms/types.ts` stores `coverImage: string | null`; the frontend BlogPost model also uses a URL string. There is no dedicated cover alt/caption/source/license/focal-point/dimension record in those interfaces. Article covers commonly render `alt=""`, while data-URI paths use the article title; neither is a universal policy for explanatory scientific content. `MarkdownBody.tsx:124–154` derives missing alt from filenames and also replaces intentional empty alt despite its comment claiming otherwise.

**Impact:** decorative art and evidence-bearing figures are treated too similarly. An article title or filename cannot reliably describe a chart, architecture diagram, or medical figure. Mobile cropping can remove evidence without the data model recording what matters.

**Recommendation:** introduce a media record with asset purpose (`decorative`, `editorial-cover`, `evidence-figure`), intrinsic dimensions, author-written alt, optional caption/long description, source/license/attribution, and crop/focal metadata where appropriate. Preserve explicitly decorative alt. Explanatory figures should have meaningful text equivalents and, for charts, accessible underlying data where feasible.

**Acceptance:** content authors can preview the figure and its text equivalent; decorative figures stay skipped; evidence figures retain labels/units/source context across reflow and print. Do not remove captions just to satisfy a generic landing-page preference.

### WM-03 · P1 · Unpublished videos and temporary editor URLs are still core integrity risks

**Evidence:** article pages always construct `/videos/explainer-${slug}.mp4`; no video files are bundled under `public/`, and the page comments that explainer assets are not published yet. `VideoEmbed` can degrade to “Render pending” with an internal file path. Separately, `components/cms/MarkdownEditor.tsx:88–98` returns a temporary blob URL after a failed upload instead of surfacing failure.

**Recommendation:** only render a video from an actual published media record; synchronize captions with the real video. Prevent publication of unresolved `blob:` images, retain the draft, and show upload retry/manual recovery. No deployed media request was tested in this pass, so the video finding concerns the checked-in local path and missing publication contract, not an observed production response.

### WM-04 · P2 · Next and Pages do not share responsive-source behavior

**Evidence:** `CoverImage` uses `coverLoader` for processed cover URLs. `lib/images/urls.ts` selects an 800px variant for requested widths ≤800, otherwise the primary asset. `cloudflare-pages/src/compat/image.tsx` deliberately drops the loader and forwards `sizes` without generating `srcSet`.

**Impact:** the same cover component can download a different source in each runtime. `sizes` alone does not select a smaller image when no responsive candidates exist. On high-DPR phones even a small CSS image may legitimately need more than 800 source pixels, so choosing only by a nominal phone breakpoint is not sufficient.

**Recommendation:** centralize responsive media metadata and candidate construction across runtimes, retaining intrinsic dimensions. Verify browser `currentSrc`, transferred bytes, and visual sharpness at representative width/DPR combinations. Honor the existing precomputed variants before proposing an image transformation service.

**Deployment caveat:** `next.config.ts` enables AVIF/WebP in the Next optimizer, but `wrangler.jsonc` explicitly documents a free-plan setup without image transformation bindings and serving originals. Configuration intent is not proof of deployed optimization. Test actual response content type/cache/size in the authorized deployment environment before claiming optimizer savings.

### WM-05 · P2 · Cover assets and crop recipes do not share one aspect/resolution contract

**Evidence:** bundled folio sources are 800px wide and about 3:2. Uploaded banners use 16:9. Article frames use `aspect-[16/9]` with `object-cover`. Featured-image layout uses a flexible height rather than a single shared cover aspect. Desktop and high-DPR displays can require more source resolution than an 800px source contains.

**Impact:** photography may crop differently across surfaces or appear soft at large sizes. Upscaling through an optimizer cannot add real detail. For scientific diagrams, cover-cropping is often inappropriate altogether.

**Recommendation:** separate crop-safe editorial covers from uncropped evidence figures. Preview cover crops in card, feature, and reader contexts; preserve a focal point where useful. Use `object-contain`, intrinsic sizing, or a dedicated full-figure viewer for diagrams rather than applying `object-cover` universally. Source higher-resolution assets only where actual display/DPR requires them; do not increase every payload.

### WM-06 · P2 · Inline figures have weaker layout/performance guarantees than covers

**Evidence:** `MarkdownBody` lazy-loads native images with async decoding but does not reserve intrinsic width/height/aspect. General inline uploads allow a 5 MiB original and do not use the banner variant pipeline.

**Impact:** late image decoding can shift technical prose and citation locations; large inline screenshots can dominate mobile transfer even when covers are small. Repeated heavy images may outweigh improvements to the hero.

**Recommendation:** persist dimensions and responsive variants where appropriate; reserve layout before load. Keep code/chart labels sharp when compressing. Avoid lazy-loading an image proven to be the page's LCP candidate, but do not eagerly load every article figure. Measure actual CLS and transfer on representative articles.

### WM-07 · P2 · Mobile media-input and processing constraints need explicit UX

**Evidence:** the crop dialog only accepts JPEG ≤512 KiB, while phone photo selections are often larger or use other formats; `validateJpegInput` enforces the documented restriction. `cropAndEncode` decodes the image and allocates rotated/cropped/output canvases; there is no explicit decoded-pixel/dimension ceiling in the inspected pipeline. Small compressed input size alone does not bound decoded memory.

**Recommendation:** do not silently relax validation. Either retain the JPEG restriction with clear conversion/resizing guidance, or explicitly approve additional formats with decoder/security/server-policy coverage. Add a decoded-dimension/pixel budget before allocating large intermediate canvases, and test processing failures on low-memory phones. If future generated covers arrive as PNG/WebP, deliberately route or convert them rather than assuming the banner picker accepts them.

The crop dialog already has labeled zoom, rotate/reset, busy/error feedback, and URL cleanup. Verify drag/keyboard operation and save reachability on short screens; do not discard these existing controls.

### WM-08 · P2 · Multi-variant cover upload has no partial-failure cleanup

**Evidence:** `uploadCover` in `lib/supabase/storage.ts` uploads variants sequentially and throws immediately on an error. It does not remove previously uploaded variants. By comparison, `lib/profile-photo.ts` includes rollback when profile update fails.

**Impact:** a failed second upload can leave an unused primary object; repeated retries create orphaned assets. This is asset lifecycle debt rather than proof of a currently broken published image.

**Recommendation:** track successful object paths and clean them up best-effort on failure, preserving the original failure message. Publish/store the cover URL only when all required variants are available. Add a test for failure of the second upload and cleanup failure. No storage objects were queried or modified during this audit.

### WM-09 · P2 · Avatar crop preview, display shape, and fallback behavior diverge

**Evidence:** avatar crop preview is circular, profile-photo helper copy says “crop it to a circle,” while `AuthorAvatar` renders a rounded rectangle (`rounded-xl`). Its trusted URL branch has no failed-request fallback. Elsewhere identity is represented as initials in square spans.

**Recommendation:** approve one identity shape policy or explicitly document different crop masks by context. Preview the actual display mask, not a misleading circle. Separate invalid URL fallback from valid-but-unreachable image fallback, keep the frame stable, and decide whether nearby visible author text makes repeated image alt redundant.

### WM-10 · P2 · Social/icon branding still uses parallel hardcoded recipes

**Evidence:** root OG image and `lib/og/brand-image.tsx` use the earlier canvas/ink (`#F8F7F3` / `#161C1A`), while current web tokens use `#FAF9F6` / `#121214`. Apple icon also uses the earlier canvas; the 512px PNG icon uses the current one. Social renderers name fonts without supplying bundled font data, unlike the browser layout's self-hosted fonts.

**Recommendation:** use an image-renderer-safe brand adapter from approved tokens. Provide supported font data explicitly if consistent rendering is required, or document the fallback as an intentional channel exception. Test longest titles, special scientific symbols, apostrophes, and the pi mark. Check the manifest's maskable icon with a maskable safe-zone preview rather than assuming that a square PNG is suitable.

Do not claim that generated social previews match browser typography until rendered and inspected.

## Broader system findings remain open

The media pass does not supersede the prior design-system audit:

- 15 component CSS variables have a generated/consumed prefix mismatch.
- Component aliases resolve fixed light colors instead of theme-aware references.
- Light Emerging/Uncertain badge combinations need contrast-safe foreground recipes beyond the configured contrast gate.
- Normative spec, route briefs, token data, email/social rendering, and implementation disagree on some current brand values.
- Typography/control/spacing/motion recipes need one governed contract, not another skill stylesheet.
- Duplicate main targets, unnamed tablet sign-in, silent citation-copy failure, fixed dock/menu sizing, and print attribution need regression coverage.

Preserve the existing serif reading measure, accessible semantic colors where verified, local fonts, responsive card grids, reduced-motion infrastructure, and shared server-resolved content. No evidence supports a wholesale cosmetic redesign before those defects are repaired.

## Asset policy for any later image-generation work

This is independent fallback guidance, **not a claim about the unavailable skills**:

1. Generate editorial illustration only when explicitly requested and appropriate; label its purpose/provenance where relevant.
2. Never synthesize study results, benchmark plots, trial figures, screenshots of purported real findings, contributor portraits, or verification evidence and pass them off as authentic.
3. Use real data and deterministic accessible chart rendering for scientific results. Keep original values/units/source metadata inspectable.
4. Keep UI text, citations, labels, logos, and controls in real HTML/SVG where feasible, not baked into decorative images.
5. Prefer a single approved asset with responsive renditions/crops over separately invented desktop/mobile scenes that imply different evidence.
6. Keep source, permission/license, alt/caption, dimensions, variants, and generated-vs-authentic status with the media record.
7. Do not generate replacements merely to fill every visual slot. Omit a nonessential unsupported visual rather than inventing proof.

## Verification plan

### Browser matrix

- Desktop 1440×900 and 1024×768; tablet 820×1180 and 768×1024; phone 390×844 and 320px; short landscape.
- DPR 1/2/3 where source selection matters.
- Light/dark/system; full/reduced/static motion; enlarged text and browser zoom.
- First load, cached load, slow/failed image, missing variant, failed decode, blocked clipboard, unsupported upload type, failed second variant upload, and unavailable storage.

### Required assertions

- No URL string is displayed where an avatar should be.
- Aspect is reserved before load; no unjustified text shift from figures.
- `currentSrc` and transfer size match the intended candidates in Next and Pages.
- Diagrams preserve axes, labels, units, and source text without destructive cropping.
- Every explanatory figure has an appropriate text equivalent; decorative figures remain decorative.
- Crop controls/save/close remain reachable in short viewports and by keyboard.
- Upload failure never masquerades as a successful persistent image.
- Video slots exist only for published playable media; caption timing is verified.
- Social cards/icons remain legible with long titles and actual platform masks.

Existing image-policy, encoder, URL, crop-dialog, avatar-upload, and cover-upload tests are good starting points. They were inspected, **not run**. Extend them with browser and failure-path coverage rather than treating mocked uploads or JSDOM as evidence of visual correctness.

## Recommended sequence

1. **Identity and integrity:** unify avatars; prevent unresolved media publication; show correct image semantics.
2. **Responsive behavior:** shared candidate metadata, crop contracts, dimensions, mobile processing bounds.
3. **Lifecycle:** upload cleanup, broken-image fallback, verified media availability.
4. **Brand integration:** renderer-safe tokens/fonts for social images and icons; reconcile documentation.
5. **Visual sign-off:** real browser evidence before changing imagery or declaring release conformance.

**Deliverable:** audit only. The requested skills could not be loaded, no instructions were fabricated, and no application files were changed.
