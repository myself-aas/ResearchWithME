# Ten repository reviews — unpublished draft collection

**Author:** Ashif Ahmed Shuvo · **Email:** shuvo.1807016@bau.edu.bd

**Classification:** GitHub Repo Teardowns / Repo Teardown / review — not editorial

**Inspection date:** 20 November 2026 · **Status:** local drafts awaiting human review

All ten requested repositories have a separate review below. Each uses a pinned default-branch source snapshot, **not a selected release tag**. These are static architecture/adoption reviews: no upstream installations, tests, benchmarks or security probes were performed.

## Read the drafts

| Review | Length | Pinned commit | Supporting files |
| --- | --- | --- | --- |
| [Svelte review: compiler and reactivity trade-offs](../articles/svelte-repo-teardown.md) | 6 min read | `04c5d8da6f0b` | [CMS body](../articles/svelte-repo-teardown.cms.txt) · [Intake](../articles/svelte-repo-teardown.intake.json) · [Evidence](../articles/evidence/svelte-repo-teardown/github-snapshot.json) |
| [Polars review: lazy plans and streaming limits](../articles/polars-repo-teardown.md) | 6 min read | `34f406152c7f` | [CMS body](../articles/polars-repo-teardown.cms.txt) · [Intake](../articles/polars-repo-teardown.intake.json) · [Evidence](../articles/evidence/polars-repo-teardown/github-snapshot.json) |
| [NATS Server review: retention and delivery controls](../articles/nats-server-repo-teardown.md) | 5 min read | `a0385c9af342` | [CMS body](../articles/nats-server-repo-teardown.cms.txt) · [Intake](../articles/nats-server-repo-teardown.intake.json) · [Evidence](../articles/evidence/nats-server-repo-teardown/github-snapshot.json) |
| [OWASP WSTG review: a method, not a security seal](../articles/owasp-wstg-repo-teardown.md) | 6 min read | `31c5bb21658d` | [CMS body](../articles/owasp-wstg-repo-teardown.cms.txt) · [Intake](../articles/owasp-wstg-repo-teardown.intake.json) · [Evidence](../articles/evidence/owasp-wstg-repo-teardown/github-snapshot.json) |
| [PostHog review: self-hosting and license boundaries](../articles/posthog-repo-teardown.md) | 6 min read | `4e10f441e36b` | [CMS body](../articles/posthog-repo-teardown.cms.txt) · [Intake](../articles/posthog-repo-teardown.intake.json) · [Evidence](../articles/evidence/posthog-repo-teardown/github-snapshot.json) |
| [n8n review: workflow execution and license limits](../articles/n8n-repo-teardown.md) | 6 min read | `a857c50bad7e` | [CMS body](../articles/n8n-repo-teardown.cms.txt) · [Intake](../articles/n8n-repo-teardown.intake.json) · [Evidence](../articles/evidence/n8n-repo-teardown/github-snapshot.json) |
| [RustDesk review: connection and build boundaries](../articles/rustdesk-repo-teardown.md) | 6 min read | `eedf39e3cb1a` | [CMS body](../articles/rustdesk-repo-teardown.cms.txt) · [Intake](../articles/rustdesk-repo-teardown.intake.json) · [Evidence](../articles/evidence/rustdesk-repo-teardown/github-snapshot.json) |
| [Plane review: project model and self-hosting costs](../articles/plane-repo-teardown.md) | 6 min read | `da21a8ff8b4b` | [CMS body](../articles/plane-repo-teardown.cms.txt) · [Intake](../articles/plane-repo-teardown.intake.json) · [Evidence](../articles/evidence/plane-repo-teardown/github-snapshot.json) |
| [Perspective review: where analytics should execute](../articles/perspective-repo-teardown.md) | 6 min read | `95535bcbfde4` | [CMS body](../articles/perspective-repo-teardown.cms.txt) · [Intake](../articles/perspective-repo-teardown.intake.json) · [Evidence](../articles/evidence/perspective-repo-teardown/github-snapshot.json) |
| [Apache Superset review: BI and operational boundaries](../articles/apache-superset-repo-teardown.md) | 6 min read | `b44ea299259b` | [CMS body](../articles/apache-superset-repo-teardown.cms.txt) · [Intake](../articles/apache-superset-repo-teardown.intake.json) · [Evidence](../articles/evidence/apache-superset-repo-teardown/github-snapshot.json) |

## New: ten inspectable source-map charts

Every review now has a horizontal Recharts bar chart, a text-equivalent table, exact counting selectors, a pinned-source link, and a concrete adoption checkpoint. **These are selected source-file inventories, not performance, security, integration-count or quality scores.** Matching tests/generated files are included unless the table explicitly excludes them. The counts are not whole-repository denominators or comparable product ratings.

Run `npm run article:preview:repositories` with project dependencies installed, or open the **Repository review charts** live preview in this Arena session. The local preview includes all ten draft bodies and a jump-to-chart link; it is not a CMS page or the production reader.

| Review | Chart groups and matching file counts | Detailed inventory |
| --- | --- | --- |
| [Svelte](../articles/svelte-repo-teardown.md) | Compiler: **244**, Client runtime: **89**, Server runtime: **17**, Reactivity: **16** | [Counted paths](../articles/evidence/svelte-repo-teardown/chart-inventory.json) |
| [Polars](../articles/polars-repo-teardown.md) | Lazy API: **32**, Planner: **275**, Streaming: **217**, Memory engine: **34** | [Counted paths](../articles/evidence/polars-repo-teardown/chart-inventory.json) |
| [NATS Server](../articles/nats-server-repo-teardown.md) | Server code: **69**, Server tests: **75**, Subpackages: **60** | [Counted paths](../articles/evidence/nats-server-repo-teardown/chart-inventory.json) |
| [OWASP WSTG](../articles/owasp-wstg-repo-teardown.md) | Info gathering: **11**, Configuration: **16**, Identity: **5**, Authentication: **14**, Authorization: **7**, Sessions: **11**, Injection: **38**, Errors: **2**, Cryptography: **4**, Business logic: **12**, Client-side: **21**, API: **8**, WebAssembly: **2** | [Counted paths](../articles/evidence/owasp-wstg-repo-teardown/chart-inventory.json) |
| [PostHog](../articles/posthog-repo-teardown.md) | Legacy API: **397**, Legacy models: **428**, Replay backend: **84**, Flags product: **326** | [Counted paths](../articles/evidence/posthog-repo-teardown/chart-inventory.json) |
| [n8n](../articles/n8n-repo-teardown.md) | Workflow model: **141**, Execution core: **264**, CLI services: **4424**, Base nodes: **5038** | [Counted paths](../articles/evidence/n8n-repo-teardown/chart-inventory.json) |
| [RustDesk](../articles/rustdesk-repo-teardown.md) | Client modules: **12**, Server modules: **42**, Platform code: **22**, Flutter UI: **142** | [Counted paths](../articles/evidence/rustdesk-repo-teardown/chart-inventory.json) |
| [Plane](../articles/plane-repo-teardown.md) | API: **776**, Main web: **1860**, Admin UI: **95**, Public space: **166**, Live service: **62** | [Counted paths](../articles/evidence/plane-repo-teardown/chart-inventory.json) |
| [Perspective](../articles/perspective-repo-teardown.md) | Rust server: **6**, Rust client: **42**, Rust viewer: **255**, Chart plugin: **175**, Grid plugin: **79** | [Counted paths](../articles/evidence/perspective-repo-teardown/chart-inventory.json) |
| [Apache Superset](../articles/apache-superset-repo-teardown.md) | SQL Lab: **17**, Security: **10**, Async tasks: **31**, Web UI: **2219** | [Counted paths](../articles/evidence/apache-superset-repo-teardown/chart-inventory.json) |

WSTG's chart reveals a numbered WebAssembly chapter beyond the twelve active-testing categories in the retained introduction; the review flags that development-snapshot inconsistency rather than hiding it. PostHog's counts use four directly retrieved **complete subtrees**, not its truncated whole-repository response.

[Chart implementation and verification audit](../audits/repository-review-charts-audit.md)

## What accompanies each article?

- Standalone Markdown draft with the requested author, summary, findings, adoption verdict, source/version scope, trade-off table, limitations and references.
- Separate clean `.cms.txt` body without duplicate reader H1, byline, category or key takeaways.
- `.intake.json` with supported CMS metadata, `status: draft`, `publicationType: review`, artifact information and write blockers. It is not an API request; body content is a separate file.
- An evidence snapshot with source identifiers, verified full-file Git blob hashes, selected line-numbered excerpts and six claim-ledger records.
- A human `review-record.txt` with CITABLE questions and unresolved evaluation work.
- Curated `public/evidence/<slug>/inspection-record.json` with source identifiers and claims, excluding raw source excerpts and author account details. These local assets are not deployed yet.

The batch retains **51 primary source-file references and 60 prose claim records**, plus **10 separate chart-inventory claims**. Each chart retains its own pinned Git-tree provenance and counted paths. This is selected-source inspection, not comprehensive code coverage or a legal/security audit. PostHog's recursive tree response was truncated; its selected files were retrieved directly at the commit and no exhaustive repository claim is made. WSTG's reviewed development snapshot is not its stable 4.2 release. Polars' retained streaming document includes a publication-exclusion comment, which the review explicitly discloses.

## SEO, GEO and AEO handoff

[Draft SEO/extraction audit](../audits/repository-review-batch-seo-audit.md) · [Actual metadata-helper outputs](../audits/repository-review-batch-seo-evidence.json)

Titles and summaries are unique and preserved by the actual application metadata helper. Claims are traceable and prose remains readable without interactive media. Live indexing, rendered JSON-LD, mobile layout, canonical/sitemap behavior and search or AI citation outcomes have **not** been verified.

## Validation

```sh
npm run article:prepare:repositories -- --check
npm run article:prepare:airflow -- --check
npm run article:prepare:gta6 -- --check
npm run reme:check
npm run reme:test
npm run article:test:charts
node --check scripts/prepare-repository-reviews.mjs
git diff --check
```

The updated local checks pass: **58 offline review tests** and **51 targeted chart tests** (109 total). Focused TypeScript checking of the modified chart components, parser and preview also passes. The chart tests use isolated temporary dependencies, not a complete locked application install. Initial full-app checks were blocked by missing dependencies ([historical results](../audits/repository-review-batch-app-checks.json)); full-app lint/typecheck/test/build and a real browser check remain pending.

## Before publication

Human evidence, author, rights/privacy and final article approval remain required. Deploy and verify each linked evidence asset, stage the clean CMS body, inspect the real reader and rerun full application checks in a dependency-complete environment. Publish only after explicit approval; then check canonical, sitemap, Article JSON-LD and published HTML/Markdown parity. No CMS article writes, deployment or publication were performed. Earlier Airflow and GTA6 work is preserved.
