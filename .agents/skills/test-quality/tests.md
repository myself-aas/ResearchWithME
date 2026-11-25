# Structuring tests here

- **Colocate** module tests beside the module when the module is the unit
  (`lib/**/*.test.ts`) and keep cross-cutting contract tests in `test/`
  (`test/seo.test.ts`, `test/mcp-config.test.ts`).
- **One behavior per case**, named for the behavior, not the function:
  "admits failure instead of improvising" beats "composeAnswer works".
- **Fixtures are data, not code paths**: content tests use real frontmatter
  shapes; if a fixture needs a comment to explain why it looks odd, the oddity
  is the test — keep the comment.
- **Determinism is part of the contract** for anything the build renders:
  related posts, tag counts, TOC extraction, retrieval ranking, prompt
  suggestions. A same-input/same-output assertion is never optional for those.
- **`tsc --noEmit` covers test files**, so a type error in a test fails the
  gate; do not weaken it with `as any` — reshape the fixture instead.
- **Repro tests** ("repro" in the name) prove a bug and are deleted when the
  work is done, folding anything worth keeping into the suite.
