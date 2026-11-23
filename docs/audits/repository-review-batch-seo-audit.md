# Ten repository reviews — draft SEO and extraction audit

Inspection date: 20 November 2026. **Local unpublished drafts only.** Author attribution: Ashif Ahmed Shuvo. Classification: **GitHub Repo Teardowns / Repo Teardown / review**, not editorial.

## Executive summary

The ten distinct repository reviews now have unique adoption questions, primary-source citations, pinned commits, deployment/license boundaries and unmeasured-result disclosures. The actual `lib/seo.ts` `pageMetadata` helper was executed for each draft using Node's `stripTypeScriptTypes`; it preserved every title and description. This verifies the formatter output, not live canonical tags, crawlability, ranking or rich-result eligibility.

The important remaining blockers are human source review, publication approval, evidence-URL deployment, and rendered-reader checks. No CMS post was created or published. No SEO account, indexing request, deployment or account change occurred.

## Context and method

Followed `.agents/skills/reme-editorial/SKILL.md`, its `references/evidence-checklist.md`, `docs/ResearchWithMe_Template.md`, the editorial workflow, content context, and product marketing context. The SEO skill obtained earlier in this session with the exact requested `npx skills use "https://github.com/coreyhaines31/marketingskills" --skill "seo-audit"` command informed the local draft audit. Its title and new-page shipping references were resolved from the installed skill supporting-files directory, not this repository's docs directory. No new claim of live search research or fresh skill execution is made here.

Inputs are the ten `.md` drafts, corresponding intake/CMS files and retained GitHub evidence. The drafts are independent source-based reviews, not claimed hands-on product evaluations. No search-volume, CTR, competitor-SERP, backlink, Search Console, analytics or AI citation measurements were available for this audit.

## Per-draft formatter results

Title figures are unbranded / branded with ` | reme`. Character limits reflect the actual helper's current budget, not a promise of search-result pixel width. Source/claim figures count retained primary files and ledger records, not every file in the repositories.

| Draft | Title characters | Summary characters | Helper result | Sources / claims |
| --- | --- | --- | --- | --- |
| [Svelte](../articles/svelte-repo-teardown.md) | 49 / 56 | 143 | Preserved | 5 / 6 |
| [Polars](../articles/polars-repo-teardown.md) | 46 / 53 | 137 | Preserved | 5 / 6 |
| [NATS Server](../articles/nats-server-repo-teardown.md) | 51 / 58 | 147 | Preserved | 5 / 6 |
| [OWASP WSTG](../articles/owasp-wstg-repo-teardown.md) | 48 / 55 | 152 | Preserved | 5 / 6 |
| [PostHog](../articles/posthog-repo-teardown.md) | 51 / 58 | 143 | Preserved | 5 / 6 |
| [n8n](../articles/n8n-repo-teardown.md) | 49 / 56 | 144 | Preserved | 5 / 6 |
| [RustDesk](../articles/rustdesk-repo-teardown.md) | 48 / 55 | 151 | Preserved | 5 / 6 |
| [Plane](../articles/plane-repo-teardown.md) | 50 / 57 | 146 | Preserved | 5 / 6 |
| [Perspective](../articles/perspective-repo-teardown.md) | 50 / 57 | 152 | Preserved | 6 / 6 |
| [Apache Superset](../articles/apache-superset-repo-teardown.md) | 53 / 60 | 150 | Preserved | 5 / 6 |

Machine-readable actual outputs: [repository-review-batch-seo-evidence.json](repository-review-batch-seo-evidence.json). Proposed `/post/<slug>` values are formatter outputs, not proof that those URLs exist in the CMS or are reachable.

## Findings and priorities

### P0 — Human evidence approval is pending

- **Impact:** High integrity risk if source reports, code observations or recommendations are merged into unsupported product guarantees.
- **Evidence:** Every intake is `draft`; every handoff explicitly requires CITABLE review. The articles distinguish default-branch snapshots from releases and separate untested adoption recommendations from actual observations.
- **Action:** Review the per-article ledger and retained excerpts. Especially check Polars' unpublished-document caveat, WSTG development-versus-stable versioning, PostHog's truncated-tree and mixed-license limits, and n8n's use restrictions. No automated score certifies truth or legal suitability.

### P0 — Linked evidence is bundled, not deployed

- **Impact:** High reader trust/traceability impact if the article is published before its linked evidence exists.
- **Evidence:** Each CMS body links `/evidence/<slug>/inspection-record.json`; the matching public file exists locally, but was not served or deployed.
- **Action:** Deploy and fetch each evidence route before article publication. Public records intentionally omit source excerpts and author email; detailed excerpts remain beside the drafts.

### P1 — On-page metadata and body preparation are checked locally

- **Impact:** Reduces avoidable truncation and duplicate-reader-furniture risk; no ranking effect measured.
- **Evidence:** Ten unique titles, summaries, slugs and review questions. All titles fit the 53-character unbranded helper budget; all summaries are within 115–158 characters. Helper results preserve the intended text, Open Graph type is `article`, and canonical paths match the proposed article slugs.
- **Implemented:** Answer-first verdicts, meaningful trade-off tables, precise repository entities/commits, source-bound recommendations, limits and references. The CMS body removes the standalone H1, byline, classification and repeated takeaways because the reader supplies them.
- **Remaining:** Verify the reader's single H1, byline, key takeaways, tables and title suffix on actual staged HTML and mobile. Character counts are not rendered-width tests.

### P1 — Discovery and technical SEO are unverified, not diagnosed as broken

- **Impact:** Potentially high if eventual publication has a wrong canonical, missing sitemap entry, blocked route, broken internal link or content-rendering failure.
- **Evidence:** No live page, robots, sitemap, browser, indexing or crawler checks were performed. Draft-only records should not be inserted into the published catalogue or sitemap.
- **Action after approval:** Verify status 200, self-canonical, intended robots directives, published-only sitemap inclusion, SSR content and HTML/`Accept: text/markdown` parity. Add relevant inbound links from approved existing pages; outbound author/category links alone do not solve orphaning. Choose those pages from the real published catalogue, not invented URLs.

### P1 — Initial full application validation was blocked by missing dependencies

- **Evidence:** `npm run lint`, `npm run typecheck` and `npm run test` each exited 127 because `eslint`, `tsc` and `vitest` are not installed. `npm run build` exited 1 because the local Next CLI is missing. See [app-checks.json](repository-review-batch-app-checks.json).
- **Action:** Install the project's locked dependencies in the normal build environment and rerun the full application checks. No dependencies were installed or lockfile changes made for this draft batch.
- **Passing local scope:** Batch preparation and `--check`, all article structure checks, all **47** `reme:test` tests, new-script syntax and whitespace diff checks. Existing Airflow and GTA6 review tests remain passing. These offline tests do not substitute for the full app build or upstream product tests.

### P2 — GEO/AEO extraction is designed, not measured

- **Implemented:** Each article states the question, audience, repository and commit; answers the adoption question directly; includes plain-text explanations, tables, citations, scope limitations and concrete follow-up checks. Product claims are attributed rather than restated as reviewer measurements. There are no artificial FAQ blocks, fabricated author credentials, invented structured fields, keyword repetitions or pasted JSON-LD scripts.
- **Remaining:** Check the real Article JSON-LD rendered by the application and confirm its metadata describes the published review. Do not infer missing schema from a static fetch, and do not promise a search feature, indexing or citation by an AI system. Cover images are null; no rights-unverified image asset was added. Validate the shared fallback image in the rendered reader if used.

## Prioritized publication handoff

1. Complete human CITABLE, author, privacy, rights and licensing review; resolve the per-article verification questions.
2. Deploy and verify the curated evidence assets. Load each separate `.cms.txt` as CMS content through the authorized studio, maintaining `draft` and `publicationType: review` until approval.
3. Run full app validation in a dependency-complete environment and inspect the actual draft reader on mobile/desktop.
4. Obtain explicit publication approval; only then publish through the supported CMS flow. Do not treat this preparation script as a publishing pipeline.
5. Verify canonical, sitemap, robots, Article JSON-LD, internal links and HTML/Markdown parity after deployment. Measure search and AI discovery only using actual observations or account data; none is guaranteed by this audit.

## Chart revision follow-up

The ten drafts now include source-derived Recharts file maps, explanatory adoption checkpoints, inline Git-tree provenance and complete Markdown data tables. Each chart has a caption, units, a zero-based linear scale and explicit limits; no benchmark or quality score was fabricated. Lazy loading now preserves an actual server-rendered table instead of an empty loading box. All ten captions, data and SVG category/value labels pass targeted tests.

The original title/summary helper outputs remain unchanged. The current checks pass **58 offline review tests plus 51 targeted chart tests**, and focused chart/preview TypeScript checking. Selective dependencies were installed under a temporary directory, without changing the project lockfile or dependency declarations; this does not supersede full-app validation. See [chart audit](repository-review-charts-audit.md) and its [machine record](repository-review-charts-validation.json). Production HTML, mobile browser rendering, canonical/sitemap/schema checks, indexing and AI-citation outcomes are still unverified.
