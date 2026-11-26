---
name: test-quality
description: Design and review meaningful tests for ResearchWithMe bug fixes, behavior changes, and pull requests that add, change, or remove tests. Use to choose test boundaries, prove regressions, and assess mocks and assertions. Editorial-only changes do not require new tests.
---

# test quality

Keep tests that protect supported site behavior. This repository's suite lives
in `test/` and `lib/**/*.test.ts(x)` under vitest:

- `frontmatter-schema.test.ts`, `content-loader.test.ts`,
  `content-integrity.test.ts` — the content contract;
- `seo.test.ts`, `toc.test.ts`, `search.test.ts` — derivations and loaders;
- `mcp-config.test.ts` — the `.mcp.json`/docs/AGENTS.md §17 trio;
- `assistant-retrieval.test.ts` — the assistant's reasoning layer.

## Choose the behavior and boundary

Identify the supported behavior and a realistic regression the test should
catch. Read the owning implementation and nearby tests before adding coverage.
Extend an existing case when it already exercises the relevant behavior; add a
case when the failure mode or boundary differs.

Use the smallest existing interface that exercises the mechanism: a pure
function (`toPlainText`, `extractToc`, `retrievePassages`), a loader with its
fixture corpus, or — only when the behavior is genuinely rendered output — a
component against the stubs in `test/stubs/`. Do not add public exports or
test-only methods solely to reach private state.

## Prove the regression and fix

Work through one behavior at a time. For a bug, run the focused test against
the unfixed behavior and confirm its assertion fails for the reported reason.
A missing import, broken fixture, or unrelated timeout is not regression
evidence. Apply the smallest fix and rerun the test and the relevant gates
(`npm run quality` at minimum, `npm run build && npm run check:site` when the
rendered site changed).

## Review before the PR

Assess added, changed, and removed tests against the production diff:

- Which supported behavior does each case protect, and would reverting the fix
  make it fail?
- Does the assertion observe the real mechanism with an independently
  specified expectation?
- Would an internal refactor that preserves the contract require rewriting the
  assertion?
- Do changed expectations or deletions remove protection for behavior that
  remains supported?

Flag concrete missing coverage or weak assertions within the change; do not
turn a focused PR into a cleanup of the whole suite. In the PR description,
name the protected behavior, the exact checks and results, and — for a bug —
the failing-before/passing-after evidence. Report any verification limitation
instead of implying that a passing suite proves an untested path.

See [mocking.md](mocking.md) when choosing test doubles and
[tests.md](tests.md) when structuring suites.
