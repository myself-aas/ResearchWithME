# Media and Author Identity Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make authored images durable, accessible, crop-safe and responsive across both runtimes without inventing scientific content.

**Architecture:** Preserve legacy cover URLs and Author.avatar while adding structured optional article-media metadata. Keep validation shared by Next/Pages; stage additive schema before writers and keep processing/storage failures recoverable.

**Tech Stack:** Next.js 15.5.28, React 19, TypeScript, Tailwind CSS v4, existing Radix/Motion/Zustand, Vitest, Playwright.

**Spec:** [../specs/2026-11-14-frontend-remediation.md](../specs/2026-11-14-frontend-remediation.md); audit evidence is linked there. This plan implements the indicated requirement IDs; the programme index assigns the other requirements.

## Global Constraints

- Work only on `arena/7c1641ff-researchwithme`; do not create, switch, or rename branches/worktrees in this Arena session.
- Preserve Next.js 15.5.28, React 19, Tailwind CSS v4, and Node >=20.9; use `package-lock.json` and `npm ci` when execution is authorized.
- No new production dependency is required; reuse Radix, Zustand, existing motion utilities, Vitest, and Playwright.
- English only. Do not restore removed localization or retired `/papers`, `/paper/[slug]`, or `/editions` routes.
- Keep light canvas `#FAF9F6`, surface `#F3F1EC`, ink `#121214`, secondary ink `#5C5C63`, and primary action `#1D4ED8`; retain the existing Obsidian dark palette.
- Keep Aptos/Aptos Serif/Aptos Mono as installed-name preferences, bundled fallbacks, and body-reading measure <=68ch. Keep useful scientific captions, citations, identifiers, units, and source attribution.
- Normal text contrast >=4.5:1; large text and non-text focus indicators >=3:1 where applicable. Verify composed/tinted states, not only base tokens.
- Responsive verification widths are 320, 768, 1024, and 1440 CSS px, plus 390px phone and short landscape. At 200% zoom, focused content/actions remain reachable without document-level horizontal overflow; technical tables/code may scroll locally.
- Full/reduced/static motion modes remain supported. Reduced motion removes travel/transform motion without hiding state feedback.
- No fabricated study results, contributor portraits, provenance, testimonials, or delivered-media claims. No new generated imagery is required.
- Reading, citations, bookmarks, and assistant access stay free. Preserve existing billing behaviour; catalogue expansion/pricing changes require a separate owner-approved product plan.
- No production requests, Supabase writes, schema application, deployment, destructive cleanup, or email delivery setup without separate authorization.
- Store rollback paths and backwards-compatible reads accompany additive media changes. Do not delete legacy asset fields or backfill invented metadata.
- A source scan, static markup snapshot, suite-presence check, or historical report is not current rendered conformance evidence.

## Review Focus

- Trusted but unreachable avatar URLs must show a stable fallback, not a URL string (Task 1).
- Failed upload or raw HTML blob image must not publish as persistent media (Task 2).
- Old rows/clients without media metadata must keep rendering without fabricated alternatives (Tasks 3–4).
- Missing or mixed-format variants must never generate nonexistent candidate URLs (Task 5).
- Tiny compressed JPEGs with huge dimensions and failed second uploads must fail safely without orphaning prior published assets (Task 6).

---

## File and execution map

Files are listed per task below; `Create` means proposed, not already present. Tests and implementation stay in the repository's established folders. No global file reorganization. Commit steps are future implementation checkpoints, not commands executed during planning. Provision existing dependencies with authorized `npm ci` before red/green cycles; missing executables are BLOCKED, not a red regression test. Use the current branch for every commit.

### Task 1: Consistent author identity and crop geometry

**Files:**
- Modify: `components/AuthorAvatar.tsx`
- Create: `components/AuthorAvatarImage.tsx`
- Modify: `components/AuthorDirectory.tsx`
- Modify: `components/AuthorSpotlight.tsx`
- Modify: `components/FeaturedArticle.tsx`
- Modify: `components/ArticleFeed.tsx`
- Modify: `components/dashboard/ProfilePhotoCard.tsx`
- Modify: `components/media/ImageCropDialog.tsx`
- Modify: `app/post/[slug]/page.tsx`
- Modify: `cloudflare-pages/src/routes/post.tsx`
- Modify: `lib/__tests__/author-avatar.test.tsx`
- Modify: `lib/__tests__/author-directory-component.test.tsx`

**Interfaces:** Preserves `Author.avatar: string` and existing AuthorAvatar size API; adds optional `decorative?: boolean` default false. `AuthorAvatarImage({src,alt,width,height,fallbackSrc}):ReactElement` is a client leaf handling failed requests/reset-on-src-change. Trust validation remains isProfileImageUrl.

- [ ] **Step 1: Write failing regression `avatar_url_is_image_and_failed_image_keeps_identity_frame`.** Render directory/spotlight with recognized profile URL and assert image src, no URL text. Test initials/unrecognized URL fallback, image error switching once, new src resetting failure, and empty alt when decorative=true. Confirm rounded-square crop preview matches display and copy never promises a circle.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(container.textContent).not.toContain(profileUrl);
expect(container.querySelector("img").getAttribute("src")).toBe(profileUrl);
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/author-avatar.test.tsx lib/__tests__/author-directory-component.test.tsx`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Replace raw avatar interpolation in traced identity consumers, using decorative=true when name is adjacent. Retain fallback SVG/domain identity and stable dimensions. Keep trust boundary and make round crop preview square/rounded-square in avatar mode; no synthesized portraits or schema migration for avatar names.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/author-avatar.test.tsx lib/__tests__/author-directory-component.test.tsx`; expected PASS. Inspect directory/profile/byline at phone/desktop, long names, failed URL, local initial fixtures. Update existing crop-dialog tests for actual mask/copy.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: render consistent author avatars with failure fallback"` on the current branch. Do not push/deploy as part of this task.

### Task 2: Durable editor insertion and publish guards

**Files:**
- Modify: `components/cms/MarkdownEditor.tsx`
- Modify: `lib/cms/schema.ts`
- Modify: `components/cms/PostEditor.tsx`
- Modify: `app/write/page.tsx`
- Create: `lib/media/temporary-images.ts`
- Modify: `lib/__tests__/cms-schema.test.ts`
- Create: `lib/__tests__/editor-media-upload.test.tsx`

**Interfaces:** Produces `findTemporaryImageSources(markdown:string):string[]` covering markdown image destinations and HTML img src. Existing CMS validation result/fieldErrors API remains; publish rejects temporary image sources with content-field error. Upload handlers still return Promise<string> only on persistent success.

- [ ] **Step 1: Write failing regression `failed_upload_does_not_insert_blob_and_publish_rejects_temporary_images`.** Mock uploadBlogImage rejection: handler rejects, error/retry visible, existing markdown unchanged. Assert published inputs with `![figure](blob:abc)` and `<img src="blob:abc">` fail; safe persistent URLs pass. Local preview temporary sources may stay in draft but cannot publish. Retry success inserts once and clears error.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(findTemporaryImageSources("![figure](blob:abc)")).toEqual(["blob:abc"]);
expect(findTemporaryImageSources('<img src="blob:abc">')).toEqual(["blob:abc"]);
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/cms-schema.test.ts lib/__tests__/editor-media-upload.test.tsx`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Remove success-shaped blob fallback after configured upload failure. Retain draft body/file for retry and revoke any preview URLs on replacement/unmount. Use a shared temporary-image detector in normalizePostInput so both server adapters enforce it; reject temporary absolute local-file sources and blob URLs, not legitimate relative bundled image paths. Do not broaden HTML execution/sanitization policy.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/cms-schema.test.ts lib/__tests__/editor-media-upload.test.tsx`; expected PASS. Test authenticated draft edit/publish through existing mocked store patterns; confirm unauthorized writes still fail and draft text survives failure/reload through existing autosave. No production CMS writes.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: block unresolved image publication and surface upload failures"` on the current branch. Do not push/deploy as part of this task.

### Task 3: Additive structured article-media persistence

**Files:**
- Create: `lib/media/types.ts`
- Create: `lib/media/schema.ts`
- Modify: `lib/cms/types.ts`
- Modify: `lib/cms/schema.ts`
- Modify: `lib/cms/local-store.ts`
- Modify: `lib/cms/supabase-store.ts`
- Modify: `lib/cms/mapping.ts`
- Modify: `lib/blog-data.ts`
- Modify: `cloudflare-pages/src/server/models.ts`
- Modify: `cloudflare-pages/src/server/stores.ts`
- Create: `supabase/migrations/20261114000300_article_media.sql`
- Modify: `lib/__tests__/cms-schema.test.ts`
- Modify: `lib/__tests__/cms-local-store.test.ts`
- Modify: `lib/__tests__/cms-mapping.test.ts`
- Create: `lib/__tests__/media-schema.test.ts`

**Interfaces:** Produces exact MediaAsset/VideoAsset/ArticleMedia types from spec D3; add `media?: ArticleMedia | null` to existing CMS/blog contracts. `normalizeArticleMedia(value:unknown): {ok:true;value:ArticleMedia|null}|{ok:false;errors:Record<string,string>}`. Nullable JSONB public.posts.media, no default fabricated records; existing RLS unchanged.

- [ ] **Step 1: Write failing regression `media_round_trips_and_old_rows_remain_compatible`.** Round-trip decorative cover and evidence inline metadata through local/mocked Supabase/Pages mapping. Assert missing media=>null, legacy coverImage remains, mismatched coverImage/media.cover.src fails, informative empty-alt fails, decorative nonempty-alt fails, zero/NaN/negative dimensions and out-of-range focal points fail. Safe source/license text round-trips and unexpected executable URLs fail.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(normalizeArticleMedia(null)).toEqual({ ok: true, value: null });
expect(normalizeArticleMedia(informativeEmptyAlt).ok).toBe(false);
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/media-schema.test.ts lib/__tests__/cms-schema.test.ts lib/__tests__/cms-local-store.test.ts lib/__tests__/cms-mapping.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Add shared normalization with integer dimensions 1..8192 and <=16,777,216 pixels, alt<=2000 chars, caption/credit<=4000, URL<=2048, license<=256; variants <=8 and captions <=8, inline records <=200. Use existing upload-origin/bundled path allowlists for media sources and safe http(s) for provenance. Mirror columns/select/insert/update in every durable adapter. Migration is additive `add column if not exists media jsonb`; preserve old clients and no automatic backfill. Document migration-before-writer deployment and app-only rollback.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/media-schema.test.ts lib/__tests__/cms-schema.test.ts lib/__tests__/cms-local-store.test.ts lib/__tests__/cms-mapping.test.ts`; expected PASS. Extend existing mocked Supabase/Pages adapter tests to assert selected/written media. Review migration SQL offline; applying it requires separate authorization. Roll back app writer first; keep nullable column/data, never drop on emergency rollback.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "feat: persist backwards compatible article media metadata"` on the current branch. Do not push/deploy as part of this task.

### Task 4: Authoring and rendering figure semantics and verified video

**Files:**
- Modify: `components/cms/PostEditor.tsx`
- Modify: `app/write/page.tsx`
- Create: `components/cms/MediaMetadataFields.tsx`
- Modify: `components/MarkdownBody.tsx`
- Modify: `app/post/[slug]/page.tsx`
- Modify: `cloudflare-pages/src/routes/post.tsx`
- Modify: `components/VideoEmbed.tsx`
- Create: `components/media/ArticleFigure.tsx`
- Create: `lib/__tests__/article-media-rendering.test.tsx`
- Create: `test/e2e/article-media.spec.ts`

**Interfaces:** Consumes Task 3 ArticleMedia. Produces `ArticleFigure({asset:MediaAsset}):ReactElement`, `MediaMetadataFields({value:ArticleMedia|null,onChange:(next:ArticleMedia|null)=>void,disabled?:boolean}):ReactElement`; MarkdownBody receives optional media map. VideoEmbed renders only supplied VideoAsset, no synthesized path/captions.

- [ ] **Step 1: Write failing regression `figures_preserve_authored_alternatives_and_absent_video_is_omitted`.** Explicit markdown alt="" remains empty; authored informative alt survives without filename fallback. Structured evidence figure gets alt/caption/source/credit, intrinsic dimensions and uncropped image. Legacy cover-only row still renders. No media.video=>no video element/Render pending path; supplied video/caption metadata renders its exact sources. Metadata form requires informative alt and preserves values after failed save.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(container.querySelector("video")).toBeNull(); // media.video absent
expect(container.querySelector("img")?.getAttribute("alt")).toBe(""); // explicitly decorative fixture
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/article-media-rendering.test.tsx lib/__tests__/cms-schema.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Add cover purpose/alt/dimensions/caption/source/credit/license and inline destination selection to both authoring entrypoints, reusing one form component. Enforce D3 normalization, preserve old fields, and preview the published crop. Use semantic figure/figcaption and object-contain/intrinsic sizing for evidence. Remove unconditional video construction from both runtimes; only render explicit verified metadata with controls and user-initiated playback (`autoPlay=false`, preload="metadata"). Omit unverified caption tracks; no ambient autoplay mode is introduced. Mark missing legacy metadata for editorial review rather than generating scientific descriptions.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/article-media-rendering.test.tsx lib/__tests__/cms-schema.test.ts`; expected PASS. Run article-media browser spec at 320/1440 with chart labels and long captions. Confirm alt/empty-alt intent, reserved layout, no destructive crop, print attribution, no missing-video requests; original caption files are not proof of a verified published video.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "feat: author and render accessible verified article media"` on the current branch. Do not push/deploy as part of this task.

### Task 5: Shared responsive image candidates

**Files:**
- Create: `lib/images/responsive.ts`
- Modify: `components/media/CoverImage.tsx`
- Modify: `cloudflare-pages/src/compat/image.tsx`
- Modify: `lib/images/urls.ts`
- Modify: `lib/supabase/storage.ts`
- Modify: `lib/__tests__/image-urls.test.ts`
- Create: `lib/__tests__/responsive-images.test.tsx`
- Modify (created in Task 4): `test/e2e/article-media.spec.ts`

**Interfaces:** Consumes MediaAsset variants. Produces `imageCandidates(asset:MediaAsset):Array<{src:string;width:number}>` and `imageSrcSet(asset:MediaAsset):string`; `uploadCoverAsset(images:EncodedImage[]):Promise<MediaAsset>` returns actual persisted primary/variant paths with decorative default. Existing uploadCover Promise<string> stays as wrapper for old callers.

- [ ] **Step 1: Write failing regression `responsive_candidates_use_only_real_assets_in_both_runtimes`.** Assert candidates sorted/deduplicated, primary included, missing variants never invented, mixed JPEG/WebP URLs retain actual extensions. Render Pages shim with srcSet and assert forwarded; processed legacy loader support still selects known -800 compatibility only under existing policy. Browser currentSrc resolves within actual candidates at DPR1/2/3; no requested nonexistent variant.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(imageCandidates(asset).map(({ src }) => src)).toEqual(expectedActualUrls);
expect(imageSrcSet(asset)).not.toContain("invented-800");
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/image-urls.test.ts lib/__tests__/responsive-images.test.tsx lib/__tests__/upload-cover.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Persist actual returned candidate metadata on new covers and use shared srcSet/sizes explicitly in both runtimes. Do not infer a variant extension from primary when upload formats differ. Avoid Next optimizer width URLs unsupported by the deployed free-plan configuration; keep native candidate selection for preprocessed media. Legacy nonprocessed originals retain single-src behavior. Do not claim configured AVIF guarantees transformed production responses.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/image-urls.test.ts lib/__tests__/responsive-images.test.tsx lib/__tests__/upload-cover.test.ts`; expected PASS. Run browser request assertions and inspect downloaded dimensions/bytes with real local fixtures. Evidence figures use contain, covers use approved focal crop; high-DPR requirements may choose primary, not always the 800px variant.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: share explicit responsive media candidates"` on the current branch. Do not push/deploy as part of this task.

### Task 6: Bounded decoding and transactional cover cleanup

**Files:**
- Modify: `lib/images/policy.ts`
- Modify: `lib/images/process.ts`
- Create: `lib/images/jpeg-dimensions.ts`
- Modify: `components/media/ImageCropDialog.tsx`
- Modify: `lib/supabase/storage.ts`
- Modify: `lib/__tests__/image-policy.test.ts`
- Modify: `lib/__tests__/image-crop-dialog.test.tsx`
- Modify: `lib/__tests__/upload-cover.test.ts`

**Interfaces:** Produces `readJpegDimensions(file:File):Promise<{width:number;height:number}>`, `MAX_IMAGE_PIXELS=16777216`, `MAX_IMAGE_EDGE=8192`; preflight used before cropper/bitmap. Task 5 uploadCoverAsset shares cleanup with uploadCover wrapper. Existing input/output byte/crop limits unchanged.

- [ ] **Step 1: Write failing regression `oversized_decoded_image_and_partial_upload_fail_without_leaks`.** JPEG SOF fixture with 10000x10000 dimensions but tiny compressed body rejects before createImageBitmap/canvas; malformed/truncated headers reject. Test exactly 8192 edge/16777216 pixels boundaries, EXIF rotation, decoded mismatch and bitmap.close on error. Fail second upload => remove only first path from this attempt; remove failure preserves original upload error and never returns primary URL. Missing public URL after upload cleans the attempted paths too.

Assertion excerpt (inside the named test, using its fixtures):
```ts
expect(createImageBitmap).not.toHaveBeenCalled(); // oversized SOF rejected first
expect(remove).toHaveBeenCalledWith([firstUploadedPath]); // second upload fails
```

- [ ] **Step 2: Verify red.** Run `npm test -- lib/__tests__/image-policy.test.ts lib/__tests__/image-crop-dialog.test.tsx lib/__tests__/upload-cover.test.ts`. Expected: the new contract assertion fails for the documented defect; an unimplemented new symbol is acceptable, a missing runner/dependency is not.
- [ ] **Step 3: Implement the smallest change.** Parse bounded JPEG marker headers before decoding; enforce dimensions/pixels and recheck decoder output. Maintain JPEG <=512KiB, no upscale, encoder budgets, URL/bitmap cleanup and cancellation. Show honest JPEG conversion guidance for unsupported phone formats. Track successful upload paths and best-effort remove only those on any later error; avoid deleting prior covers. Do not log sensitive source paths publicly.
- [ ] **Step 4: Verify green.** Run `npm test -- lib/__tests__/image-policy.test.ts lib/__tests__/image-crop-dialog.test.tsx lib/__tests__/upload-cover.test.ts`; expected PASS. Run existing image-encode/profile-photo tests too. Low-memory real-phone cropping remains a manual gate; these limits reduce risk, not guarantee memory safety. Do not access live storage during tests.
- [ ] **Step 5: Review and commit.** Inspect `git diff --check` and the task diff; stage only the files above plus any generated outputs explicitly named there, then `git commit -m "fix: bound image decoding and clean partial cover uploads"` on the current branch. Do not push/deploy as part of this task.

## Completion gate

- [ ] Run `npm run lint`, `npm run typecheck`, and `npm test`; record real results and blockers.
- [ ] Verify the task-specific browser cases with `npm run test:pages` when the existing browser/runtime is available. Read its config: it builds locally with blank public Supabase settings. Do not substitute production or authorized staging without approval.
- [ ] Keep unchanged UI screenshot comparisons strict; require owner review for deliberate visual changes.
- [ ] Report exactly which spec IDs were delivered, tests run, tests blocked, residual risks, and commit IDs. No blanket WCAG or runtime-parity pass from unit results.

## Self-review

Checked requirement coverage, file responsibilities, interface names, five review-focus conditions, and red/green commands. Every focus condition has an owning test below; global cross-system evidence is owned by the governance plan. Requirements outside this plan are mapped in the programme index, not implicitly dropped. Execution must stop on incompatible product/schema decisions rather than improvising them.
