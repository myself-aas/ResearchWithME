# Repository review charts — implementation and evidence audit

**Scope:** the ten local unpublished reviews in [the collection](../reviews/repository-review-batch.md). Author: Ashif Ahmed Shuvo. Category/format/publication type remain **GitHub Repo Teardowns / Repo Teardown / review**. No CMS writes or publication.

## Requested skill execution

Executed exactly:

```sh
npx skills use "https://github.com/andy-spike/skills" --skill "recharts"
```

Exit code: 0. Redirected stdout/stderr to a temporary file first and read its complete, non-truncated output. The [retained command output](repository-review-recharts-skill-output.txt) includes the generated instructions and supporting-files location `/tmp/skills-use-oaTG1x/recharts`.

Resolved references from that supporting-files directory, not from this repository: read `references/best_practices.md` in full, and the relevant horizontal bar, axes, sizing and labeling sections of `references/examples.md` and `references/api_reference.md`. Used the existing Recharts integration and dependency declaration rather than adding a second chart library. No illustrative sales data from the skill was inserted into reviews.

## What changed in the reviews

Each review now includes:

1. A horizontal Recharts source-map chart with categorical labels, units, visible counts and a zero-based linear count axis.
2. A Markdown text-equivalent table stating the exact directory roots, include/exclude patterns and counts. The data remains inspectable in the CMS body and Markdown-only representation.
3. A repository-specific interpretation explaining where to inspect next and what the chart cannot establish.
4. A concrete adoption checkpoint connecting the reading map to the review's decision question.
5. A separate `chart-inventory.json` evidence record with a pinned commit, complete-tree API identifiers, exact selectors, every counted blob path/identifier, the chart claim and limitations. The public inspection record includes an aggregate extract, not the long file list.

The ten inventories retain **18,392 matching file paths across 50 selected groups**. They do not claim substantive content review of every counted file. Counts include matching tests, declarations and generated files unless explicitly excluded. No submodule is expanded. Source-root choices are reviewer selections, not an exhaustive denominator; cross-language file counts are not normalized measures of effort or complexity.

### Important review-specific caveats

- **Svelte:** compiler/runtime root sizes do not establish bundle size or reactivity performance.
- **Polars:** planner/engine file counts do not establish query speed, memory use or streaming coverage.
- **NATS:** the direct server-test file group is not test coverage or evidence of executed tests; nested packages are a separate group that may include tests.
- **WSTG:** the tree contains a numbered WebAssembly chapter beyond the twelve active-testing categories listed in the retained introduction. The review now flags this concrete development-snapshot inconsistency. Chapter-page counts are not counts of vulnerabilities, executed tests or necessarily individual scenario IDs.
- **PostHog:** four complete subtrees were fetched directly using tree identities associated with the pin. No chart count comes from the truncated whole-repository response. The selection is not an edition-entitlement or whole-product map.
- **n8n:** base-node files include helpers/tests and are not a count of integrations.
- **RustDesk:** directory counts exclude top-level application files and the separately maintained rendezvous/relay server artifact. Rust/Dart file counts establish no security property.
- **Plane:** API/Python and UI/TypeScript counts show distinct reading surfaces, not normalized service weights or engineering effort.
- **Perspective:** selected Rust roots and chart/grid plugins exclude other implementation roots and must not be read as a whole-project language breakdown.
- **Superset:** selected SQL Lab/security/tasks/UI roots exclude other backend/plugin roots; file count does not predict query capacity, cost or isolation.

No latency, throughput, security, popularity, reliability, maturity or quality score was invented. No upstream product was installed or executed for these figures.

## Recharts integration changes

`lib/charts/spec.ts` adds the optional, validated `layout` field. Existing charts retain their default orientation. `layout: vertical` is supported for bars and means horizontal bars with a numeric x axis and categorical y axis, following Recharts terminology.

`ResearchChart.tsx` retains memoized row data, themed chart tokens, explicit responsive dimensions, disabled animation and accessible data tables. Horizontal source maps get all category labels, visible value labels, a row-dependent plot height, a zero-based linear numeric axis and explicit keyboard accessibility. A logarithmic horizontal bar chart correctly discloses the horizontal rather than vertical numeric axis.

`ChartBlock.tsx` now supplies the real caption and data table through the lazy boundary's server/loading fallback. The previous `ssr: false` loader showed only a loading message, so the table inside the eventual chart component could not provide a true no-JavaScript first paint at that boundary. Per-figure context carries the correct data into the fallback without eagerly importing Recharts. Invalid specs still preserve their author text and error. Chart text remains escaped; raw article HTML is not enabled.

`ChartDataTable.tsx` makes its horizontal overflow region keyboard-focusable and labels it. Color is not the only encoding: category/value labels and the data table carry the information independently.

## Reproducible preparation

`review-chart-data.mjs` validates the inventory identity, full-tree status, selectors, counts, member blob IDs and non-overlapping paths; it generates the chart and text equivalent. `prepare-repository-reviews.mjs` updates only the marked chart section, then regenerates clean CMS bodies, read times and public aggregates. `--check` fails on drift without writing files or contacting a service.

A regression test covers initial insertion of selector strings ending in a dollar sign followed by a Markdown backtick. The generator uses a replacement callback so JavaScript replacement-string substitution cannot duplicate preceding article text. All final drafts are checked to contain exactly one chart and an idempotent generated section.

## Validation results

Machine record: [repository-review-charts-validation.json](repository-review-charts-validation.json).

- **58 offline review tests pass** via `npm run reme:test`, including all prior Airflow/GTA6 regressions and new per-review chart checks.
- **51 targeted chart tests pass** via `npm run article:test:charts`: existing grammar, chart rendering/integration and palette suites plus 23 new source-map tests. These parse the exact ten CMS fences, compare every value to retained inventories, verify server/loading tables, check independent/escaped figures, and draw real Recharts SVGs at a simulated 360px width with every category/value label and zero tick present.
- Focused TypeScript checking passes for the modified chart components, parser and local preview components.
- Batch/Airflow/GTA6 preparation checks, all twelve draft structure checks, script syntax checks and `git diff --check` pass.
- The local Vite preview and its entry/chart modules respond with HTTP 200 on port 4173. It accepts the Arena preview host and does not call a browser-side localhost backend.

Tests used isolated selective dependencies in `/tmp/reme-chart-deps`, linked through ignored local `node_modules`, without changing project dependency declarations or a lockfile. Actual tested versions are recorded in the machine record. This is **not** a complete locked application installation or full-application test run. Existing tests emit React `act` environment warnings; the assertions pass.

## Local preview

```sh
npm run article:preview:repositories
```

`tools/review-preview/` provides a clearly labeled, noindex editorial workbench with all ten draft bodies and a jump-to-chart link. It reuses the real chart parser and components. Its small dynamic-import adapter and styles are preview-only; it does not add a route to the production application or publish local drafts. In Arena, use the **Repository review charts** live preview.

## Remaining publication gates

Human source/rights/privacy review and final approval remain pending. No real mobile/desktop browser, visual regression, assistive-technology audit, complete production reader render, full-app lint/typecheck/test/build, deployment, canonical/sitemap, JSON-LD or live HTML/Markdown parity check was performed for this revision. The narrow-width tests use jsdom's simulated layout, not a real mobile browser.

The title/summary outputs remain unchanged; the added charts carry explanatory prose and a complete text equivalent for extraction. No ranking, indexing, rich-result or AI-citation outcome is promised. Deploy and check the linked evidence before any eventual article publication, stage the real reader, complete full application checks with locked dependencies, and obtain explicit approval before publishing.
