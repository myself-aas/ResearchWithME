# SEO audit: GTA6-KytyPS5-GTA-6 drafted review

**Audit date:** 20 November 2026

**Scope:** [Local article draft](../articles/gta6-kytyps5-repo-teardown.md), [CMS intake](../articles/gta6-kytyps5-repo-teardown.intake.json), and the source code that would publish and render it.

**Intended path:** `/post/gta6-kytyps5-repo-teardown` — not verified as a live page.

**Classification:** GitHub Repo Teardowns / Repo Teardown / `publicationType: review`, not editorial.

**Implementation changes:** None. This audit proposes changes; it does not rewrite or publish the review.

## Implementation update — 20 November 2026

The original assessment below is retained as a before-state audit. The draft has now been improved without publishing it.

| Finding | Implementation status |
| --- | --- |
| O1: title clamping | Fixed with the tested 50-character title; actual metadata-helper execution confirms no shortening. Description and slug retained. |
| O2: duplicate body furniture / authoring syntax | Fixed in the generated CMS body; standalone draft remains mechanically valid. Plain-language callouts replace source/locator/relation annotations. |
| O3: contextual internal links | Added author/category links and a linked inspection record. Actual incoming links/HTTP responses remain a publication check. |
| C2: supporting evidence access | Added a curated public JSON extract with original inspection time, file/release metadata, source URLs, and claim locators. Deployment and live URL verification remain outstanding. |
| T1–T4: publication, canonical, schema, mobile/performance | Still require authorized publication/deployment and live checks; not reported as passed. |
| O4 / C3: reader image behavior / fallback author mapping | Not changed by this content-focused implementation; preview and any template changes remain separately scoped. No invented cover or credentials added. |

Preparation is repeatable with `npm run article:prepare:gta6`; verify with `-- --check`. `npm run reme:test` now runs 10 passing tests. The evidence JSON retains the original measurements and adds `postImplementation` results. See the updated review record for the CMS-body and evidence deployment handoff. No CMS state changed.

## Executive summary

**Assessment: the draft has a credible evidence-first foundation, but is not ready to call an audited, indexable publication.** It answers the repository-specific question, distinguishes emulation from streaming, supplies eight primary-source references, and discloses what was not tested. Its main confirmed metadata issue is that the application's title-shortening function removes the article's distinguishing finding.

### Highest-priority items

1. **Publication is still a prerequisite, not an SEO defect.** Local draft files do not enter the public catalogue or sitemap. Preserve the approval gate, then verify the actual published URL.
2. **Fix the effective title.** The 59-character draft title becomes `GTA6-KytyPS5-GTA-6 teardown | reme`, losing “emulator claims without source.” A tested 50-character alternative preserves the finding.
3. **Prepare a reader-facing CMS body.** The Markdown repeats the page title and byline and exposes authoring notation such as `source="build-manifest"`. The current reader displays these as text, not specialized evidence widgets.
4. **Make the supporting evidence accessible.** The article refers to an accompanying snapshot without a link a public reader can follow. Preserve the primary citations and add a real public snapshot location when available.
5. **Strengthen contextual discovery.** The Markdown body has no internal links, although the reader template supplies category, author, and other links. Add relevant links without inventing related reviews or calling this an established orphan page.

**Quick wins:** use the title proposed below, retain the existing meta description, and replace authoring annotations with plain-language evidence callouts during CMS preparation. No keyword stuffing, fabricated credentials, FAQ schema, or unsupported safety verdict is warranted.

## Method and evidence boundaries

Executed exactly:

```bash
npx skills use "https://github.com/coreyhaines31/marketingskills" --skill "seo-audit"
```

The command exited successfully. Its full output was captured to `/tmp/researchwithme-seo-skill-output.txt` and read. The CLI reported `skills@1.9.0`; the skill identifies itself as version `2.2.9`. Relative references were resolved from the supplied supporting directory, `/tmp/skills-use-sO7Ggh/seo-audit`, not from this repository. Read the full title-tags, rankings-push, and AI-writing-detection references, plus `.agents/product-marketing.md` before evaluating recommendations.

The supplied writing reference is a style heuristic, not proof of AI authorship or a ranking penalty. Punctuation frequency was not scored, and the existing AI-assistance disclosure should remain truthful.

Executed the actual `pageMetadata()` function from `lib/seo.ts` using Node's TypeScript stripping facility, with the draft's real title and summary. Captured its output and basic document counts in [SEO evidence JSON](gta6-kytyps5-draft-seo-evidence.json). This was a source-level execution, **not a rendered-page test**.

Not available or not performed:

- A published article response, rendered browser DOM, HTTP-header inspection, mobile preview, or crawler export.
- Search Console, Bing Webmaster Tools, analytics, backlinks, current SERPs, or keyword-volume data.
- PageSpeed Insights, real-user Core Web Vitals, or a performance trace.
- Rich Results Test or browser inspection of published JSON-LD.
- A fresh Supabase-state check in this audit. Draft state comes from the local intake and preceding workflow record.

Accordingly, there is no SEO score, traffic estimate, ranking diagnosis, competitive-superiority claim, or assertion that Google has indexed or rejected the article. Repository API facts were already captured in the article's source ledger; this is an SEO audit, not a new runtime/security review of the external software.

## Search intent and topic alignment

**Proposed primary topic:** `GTA6-KytyPS5-GTA-6 review`.

**Supporting questions:** whether the repository supplies emulator source; PS5 emulation versus streaming; reproducible-build evidence; what is and is not known about the download.

These are content-derived targeting hypotheses, not measured search demand. The article is an investigative repository review, not a download page, installation guide, or “best GTA 6 emulator” roundup. Do not optimize it into promising functionality it does not establish.

The repository name appears in the title, opening summary, and first 100 words. The body naturally covers GTA VI, GTA 6, PS5, Kyty, source code, release provenance, and streaming. This is already sufficient entity coverage; repeating variants throughout every heading would reduce readability.

## Technical SEO findings

### T1 — Publication and indexability remain unverified

- **Impact:** High for launch readiness; expected while drafting.
- **Evidence:** The intake is `status: draft`. `lib/cms/read.ts` filters public records to `published`; `lib/cms/catalogue.ts` builds the reader catalogue from those records. `app/sitemap.ts` likewise consumes published posts. `app/post/[slug]/page.tsx` calls `notFound()` when its catalogue lookup fails.
- **Fix:** After human review, save and publish through the authorized CMS workflow. Then verify a real HTTP 200, server-rendered article content, one canonical URL, index/follow directives, internal discovery links, and the sitemap entry. Confirm HTML and negotiated Markdown agree. Do not force drafts into the sitemap or assume that a file committed to Git is published.
- **Priority:** P1, launch gate. The current production response is unknown, not a measured 404.

### T2 — Canonical and robots foundations are present in source

- **Impact:** High if misconfigured at deployment; no defect demonstrated here.
- **Evidence:** `pageMetadata()` supplies `/post/<slug>` as the canonical path; root `metadataBase` derives from `SITE_URL`. `app/robots.ts` allows public paths, disallows `/api/`, `/dashboard`, and `/login`, and references `/sitemap.xml`. The root layout declares `lang="en"`, a mobile viewport, and index/follow defaults.
- **Fix:** Check that the deployed base URL is the intended HTTPS origin and that the canonical resolves to the actual published URL without unwanted host/redirect variants. Inspect final robots and sitemap responses, including any deployment-level overrides. Do not add geographical or multilingual signals to this single English review without genuine locale versions.
- **Priority:** P1 verification after publication; no source change requested.

### T3 — Article schema is implemented; rendered validity is unknown

- **Impact:** Medium.
- **Evidence:** The article route calls `articleJsonLd()` and writes an `application/ld+json` script. `lib/seo/jsonld.ts` constructs an Article entity with the author, publisher, canonical identity, and publication date. This is positive source evidence, not a rendered-schema validation.
- **Fix:** Inspect the published browser DOM and validate using a rendering-aware schema tool. Compare author/profile URL, date, image, headline, and canonical with visible content. Do not report “no schema” from a Markdown fetch or add unsupported Product, FAQ, star-rating, or SoftwareApplication claims.
- **Priority:** P2 verification.

### T4 — Speed, mobile behavior, HTTPS, and status behavior need live testing

- **Impact:** Potentially high; not measured.
- **Evidence:** Source includes server-rendered article content, responsive layout, local fonts, bounded image dimensions, and scrolling table/code containers. These choices cannot establish LCP, INP, CLS, certificate validity, mobile usability, redirect correctness, or a real missing-page status.
- **Fix:** After publication, inspect mobile and desktop behavior, wide tables/code, final headers, HTTPS redirects, and an intentionally missing article. Measure performance rather than claiming a pass from source. If using the skill's CWV targets, treat them as test targets, not current results.
- **Priority:** P2 verification.

## On-page SEO findings

### O1 — The metadata formatter removes the main finding

- **Impact:** Medium: a weaker relevance/click proposition, not a proven ranking loss.
- **Evidence:** The source title has 59 characters. `clampSeoTitle()` reserves seven characters for ` | reme`, leaving 53. Because the title exceeds that budget and contains an eligible colon, the helper returns only the prefix. The page and root layout are configured to produce the shortened branded title below; OG/Twitter output was directly evaluated.
- **Fix:** Use a title that fits the current helper, or separately design an SEO-title override. For this draft, the title-only remedy is sufficient and avoids a site-wide formatter change.
- **Priority:** P1 before publication.

| Element | Current | Proposed |
| --- | --- | --- |
| Article title | GTA6-KytyPS5-GTA-6 teardown: emulator claims without source | GTA6-KytyPS5-GTA-6 review: emulator source missing |
| Effective branded metadata title | GTA6-KytyPS5-GTA-6 teardown \| reme | GTA6-KytyPS5-GTA-6 review: emulator source missing \| reme |
| Canonical slug | `gta6-kytyps5-repo-teardown` | Keep unchanged |

The proposed title is **50 characters** before branding and **57 after branding**. Executing `pageMetadata()` confirmed that it is not shortened. “Source missing” must remain bounded by the opening's inspected-commit qualification, not presented as a timeless assertion. Character counts are implementation evidence, not a promise about search-result pixel truncation or Google's chosen title.

**Meta description: retain.** It is 157 characters, includes the repository name, states the evidence gap and streaming discrepancy, and retains the safety limitation. The formatter leaves it unchanged. A sales-style call to action is unnecessary for this research review.

### O2 — CMS presentation will repeat title/byline and expose authoring notation

- **Impact:** Low for search directly; Medium for clarity and trust.
- **Evidence:** The source draft contains one `#` title, ten `##` headings, and one `###` heading. The reader already renders a page H1, byline, category, and key takeaways. `MarkdownBody` maps the Markdown H1 to an H2, so the current implementation does **not** create a second H1 from the draft, but it does repeat the title. Callout metadata such as `source="build-manifest" locator="…"` is ordinary visible Markdown text.
- **Fix:** Keep the standalone draft's required H1 for the reme checker. Prepare a separate CMS body that omits redundant title/byline/category scaffolding while preserving the contact line if desired. Use plain-language evidence and limitation labels, keeping precise citations and locators useful to readers. Do not paste custom JSX expecting it to become a live widget.
- **Priority:** P2 before publication.

### O3 — Body-level internal links are absent; full-page orphan status is not established

- **Impact:** Low to Medium.
- **Evidence:** No relative Markdown links occur in the body. The template provides a category breadcrumb, an author-profile link in the compact author card, citation tools, and related-review slots. An empty inline-link count therefore does not mean the entire page has no internal links.
- **Fix:** Add a natural author-profile link and, if useful to the reader, a link to the GitHub Repo Teardowns category. Ensure the published page is actually discoverable from the home feed, category archive, and author archive. Add contextual links from future related reviews when they genuinely exist; do not invent three related articles to meet a checklist quota.
- **Priority:** P2 launch verification; P3 contextual-link improvement.

### O4 — Null cover does not mean an image-free reader page

- **Impact:** Low for search; relevant to presentation and expectations.
- **Evidence:** The body has zero images and intake `coverImage` is null. Nevertheless, `cmsPostToArticle()` falls back to `/images/folio-hero.jpeg`; the reader displays a figure labelled “Editorial figure.” `generateMetadata()` does not pass a cover to `pageMetadata()`, so OG/Twitter default to `/opengraph-image`.
- **Fix:** Preview this behavior. Use clearly decorative imagery or an original explanatory asset with accurate text, never a fabricated gameplay screenshot. If the generic figure is unwanted, handle that as a separate reader-template change. “Editorial figure” is template copy, not evidence that `publicationType` became `editorial`.
- **Priority:** P3. No need to add an image just to satisfy an SEO checklist.

## Content and authority findings

### C1 — Evidence-first content is a strength

- **Impact:** Positive foundation; no ranking guarantee.
- **Evidence:** Eight reference entries; full commit pins; observed file sizes; distinction between source statements and inspection results; reproducible read-only commands; release mutability and safety limitations; AI-assistance disclosure.
- **Recommendation:** Preserve these. Do not replace “unverified” with “scam,” “malware,” or “working emulator.” Retain the distinction between source inspection and runtime testing. No extra word count, generic FAQ, or fabricated expert biography is needed.
- **Priority:** Maintain during edits.

### C2 — Supporting snapshot is not publicly linked

- **Impact:** Medium for independent auditability and reader trust.
- **Evidence:** The text mentions an accompanying source snapshot, but its link is absent. The JSON is local under `docs/articles/evidence/gta6-kytyps5-repo-teardown/`, not automatically a public website asset. The eight primary references remain usable independently.
- **Fix:** Publish a rights-appropriate snapshot and claim ledger at a real stable URL, then link with descriptive text. Alternatively, change the passage to state that a retained review record is available on request. Do not create a link to a nonexistent `/docs/` website path. Recheck mutable release/workflow claims before release and distinguish original inspection time from later updates.
- **Priority:** P2.

### C3 — Author identity is linked, but expertise must not be inferred

- **Impact:** Medium for trust.
- **Evidence:** The intake records `authorId: ashif-ahmed-shuvo` and a published profile matched to the supplied account email. That is not professional credential verification. The local CMS mapper uses `fallbackAuthor()` when an author is absent from the bundled `AUTHORS` record and sets the role to “Contributing editor”; it does not hydrate biography or role from `public.profiles` here.
- **Fix:** Preview the actual byline/card and avoid presenting fallback copy as a verified credential or editorial classification. Consider profile hydration or a neutral fallback in a separate implementation task. Add only author-supplied, verified experience when available; leave affiliations and qualifications unstated otherwise. The compact card already provides a profile link, so a missing header link is not an entirely missing author path.
- **Priority:** P2 for preview/truthfulness; broader data-mapping change is separate.

## Prioritized action plan

### Before publication

1. Obtain human source review and article approval; retain `publicationType: review`.
2. Adopt the tested title or approve an equivalent title that survives the formatter.
3. Prepare reader-facing CMS content from the standalone draft, removing redundant authoring scaffolding without deleting citations or limitations.
4. Decide how to expose or accurately describe the supporting snapshot.
5. Save and publish through the authorized CMS workflow, not by treating this audit as publication approval.

### Immediately after publication

1. Verify HTTP status, final canonical, indexability, sitemap inclusion, and server-rendered article body.
2. Confirm discovery from the homepage, category, and author archive, including mobile/no-JavaScript reading.
3. Inspect rendered JSON-LD and the visible author/card/date/image information for agreement.
4. Compare HTML and negotiated Markdown; check wide code/table behavior, HTTPS, and performance.
5. If Search Console is available, inspect the URL and request indexing once after the page is truly ready. No repeated submission promise.

### After enough real data exists

- Review Search Console queries, impressions, clicks, CTR, and position for this exact canonical page; compare like-for-like periods.
- Validate the targeting hypothesis against current results and actual reader queries before expanding the article.
- Add relevant incoming contextual links as the review archive grows. Diagnose authority versus on-page issues from evidence, not repeated speculative rewrites.
- For an isolated title/description experiment, record its baseline and allow roughly 3–4 weeks before judging. This is an observation window, not a promised ranking schedule.

## Validation and delivery

- Executed the actual metadata helper for the current and proposed title.
- Confirmed the current description is unchanged by the helper.
- Counted Markdown headings, body internal links, body images, and reference entries.
- No article, CMS state, permissions, schema implementation, or reader UI was changed during this audit.
- Live crawl, schema validation, Search Console, mobile, and performance results remain outstanding. They must not be marked “passed” based on this report.
