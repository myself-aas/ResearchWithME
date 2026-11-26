# Project codebase cleanup report

Date: **2026-11-26**
Baseline: **`95b724f`**, branch `arena/bc10f80d-researchwithme`
Mode: **reviewed dead-code removal**, explicitly selected by the author after the initial safe audit.
Languages: TypeScript/TSX, JavaScript modules, CSS, Python, JSON and templates.

## Skill installation

The requested `clean-codebase` skill from `pjt222/agent-almanac` is installed:

- Project: `.agents/skills/clean-codebase/`, verbatim SKILL.md and MIT license.
- Current user: `~/.agents/skills/clean-codebase/`.
- Source commit: `5907366b93fcfae4988161a1ee16ed7018c4e2be`.
- The linked optional environment guide is copied under `.agents/guides/`
  and `~/.agents/guides/`; it was read, not executed.
- Source, skill-folder hash and supporting-guide hash are recorded in
  `skills-lock.json`. Contract tests validate provenance and discovery.
- `AGENTS.md` routes cleanup tasks to the skill and makes project governance,
  author consent, generated-file ownership and existing gates authoritative.

The user-home installation is sandbox-local. Restore instructions are in
[SKILLS-INSTALLATION.md](SKILLS-INSTALLATION.md); no account-wide Arena setting
or external service was modified.

## Audit coverage and comparable measurements

ESLint was run across the repository using its existing excludes. TypeScript
was checked with unused-local/parameter diagnostics before enabling those same
checks in `tsconfig.json`. A source inventory measured all tracked authored
code/config under `app`, `components`, `lib`, `scripts`, `src`, `test`, `tokens`,
and `templates` with extensions `.ts`, `.tsx`, `.mjs`, `.py`, `.css`, `.json`,
and `.tmpl`, excluding the generated design/token directories. Read-only
analysis included generated content references; generated output was not
hand-edited. This is an authored-code audit, not a claim that third-party
skills, licenses or historical documents should be reformatted.

| Comparable metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| ESLint errors / warnings | 0 / 0 | 0 / 0 | No regressions |
| TS unused-local / parameter findings | 0 | 0 | Checks now enabled by default |
| Authored source files in inventory | 231 | 231 | No file deletions |
| Lines in the same source inventory | 20,388 | 20,352 | −36 (includes added skill-contract tests) |
| Trailing-whitespace / CRLF / EOF defects in that inventory | 0 | 0 | No unnecessary formatting churn |
| Knip default-profile value-export findings | 37 | 16 | −21 |
| Knip default-profile type-export findings | 20 | 16 | −4 |
| Knip default-profile orphan-file candidates | 33 | 33 | Reviewed dynamic/generated/vendor false positives; not deleted |
| Unit tests | 264 passing | 265 passing | +1 skill contract |

The before/after Knip numbers above use the **same default profile**, Knip
5.85.0, not a misleading comparison between different exclusion configurations.
Its counts include redundant exports as well as unused implementations; **21
findings removed does not mean 21 functions deleted**. Five function bodies,
one associated interface, one unused type alias, one constant and one identity
alias were removed. Other changes narrow internal export surfaces only.

Full detail and the session-local deletion backup are documented in
[CLEANUP_LOG.md](CLEANUP_LOG.md). Local JSON measurements/logs/backups live under
`artifacts/codebase-cleanup/` and are excluded from Git.

## Static-analysis review and remaining contracts

A second, project-aware **advisory** inventory is checked in as `knip.jsonc`.
It models OpenNext's filename-loaded config, runtime-loaded MDX, computed test
aliases, and FlatCompat's lint configuration; excludes third-party skill code
and generated-file inventories; and documents its limited toolchain-type
exception. It does **not** turn unused-export findings into automatic deletions
or claim all findings are resolved.

```bash
# Optional audit tool, downloaded on demand; not a project dependency or CI gate:
npx --yes knip@5.85.0 --config knip.jsonc
```

The reviewed profile currently reports:

- **0 orphan authored files** in its configured scope;
- **12 value-export candidates** retained: `adoptedFigures`, six manifest
  extension primitives (`Live`, `Range`, `Field`, `Callout`, `Table`, `Drawer`),
  and five MDX component exports (`Callout`, `Figure`, `Video`, `KeyTakeaways`,
  `Sidenote`). Registry/MDX indirection and intentional component contracts
  make these unsuitable for automatic deletion;
- **15 type-export candidates** retained as component/result/schema contracts:
  `FigureTool`, `FigureInvocation`, `ArticleJsonLdInput`, `FigureTone`,
  `CapabilityReport`, `MaskedGrid`, `SeasonFrame`, `CiteBoxProps`,
  `BenchmarkLegendItem`, `BenchmarkChartProps`, `PipelineControlOption`,
  `PipelineControlGroup`, `PipelineStage`, `PipelineExplorerProps`, `CalloutTone`;
- **3 duplicate-export candidates** in test adapters, where named/default
  exports intentionally support different Next import forms;
- **1 dependency candidate**, Tailwind CSS, retained because the application
  imports Tailwind in CSS and uses the Tailwind 4 PostCSS pipeline.

This advisory command remains nonzero because those findings remain visible.
No packages were added, removed, or upgraded. Knip 6.48.0 could not start in this
sandbox (OXC ArrayBuffer allocation failure); the successful analysis used
pinned Knip 5.85.0. No result from the failed analyzer was treated as a pass.

## Validation

- [x] `npm run quality`: generated content/design checks, legacy token build and
  contrast validation, ESLint, strict typecheck, **265 tests / 20 files**.
- [x] `npm run verify`: production Next build and SEO/AEO/GEO site checks.
- [x] `npm run test:production`: Node production smoke and **10/10 browser tests**.
- [x] `npm run build:worker`: OpenNext adapter build.
- [x] `npm run check:worker`: Wrangler local dry-run packaging and artifact limits.
- [x] `npm run test:worker`: workerd content/search checks and **10/10 browser tests**.
- [x] Generated-artifact verification on Node **20, 22 and 24**; no generated
  design/token/content changes required.
- [x] `git diff --check` for authored changes; vendored source bytes preserved.
- [ ] New remote CI/deployment: **not run for these uncommitted changes**.

No production deployment, merge or push is performed as part of this cleanup.
Build/server helpers were tested through the existing suites, not refactored
into a different architecture.

## Escalations and non-goals

1. **Security updates:** `npm audit` still reports **16 vulnerabilities**:
   8 moderate, 6 high and 2 critical. This is not a clean security audit.
   Dependency remediation needs compatibility and advisory review separately;
   no `npm audit fix --force` was used.
2. **v4.1 compliance:** cleanup does not waive the known initial-JS,
   localization/template, strict-CSP, local-model, dispatch, or manual gates.
   See `docs/design/AUDIT-v4.1.md`; no threshold was relaxed.
3. **Static-analysis limits:** framework hooks, MDX lookups, templates,
   generated surfaces and future extension contracts cannot be proven dead
   solely from today's direct imports. Reviewed candidates above remain
   explicit instead of being archived or suppressed wholesale.
4. **Formatting:** no repository-wide Prettier rewrite was introduced. Existing
   source formatting is retained; verbatim skills, licenses, content and design
   specifications were not normalized.
