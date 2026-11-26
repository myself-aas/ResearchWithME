# Agent skills

This directory is the skills layer for coding agents working on this
repository: small, self-contained instruction packages in SKILL.md format
(YAML front-matter with `name` + `description`, then the procedure). The
format is the one the `npx skills` CLI and Claude Code read; nothing here is
required to build the site.

Provenance: there are two origins here, and they are kept distinct on purpose.

- **Vendored verbatim** from [`assistant-ui/skills`](https://github.com/assistant-ui/skills)
  at the pinned commit in `skills-lock.json` (`53b2631f…`): `generative-ui`,
  `elements`, `primitives`, `runtime`, and `tools`. These are upstream
  instruction packages — we install them as-is and do not rework their steps.
  The authoring model, primitive inventory, and registry URLs inside them are
  normative for any `/assistant` or figure-library change; `AGENTS.md` §18–§20
  and `assistant-ui-docs` translate them into this site's constraints.
- **Adapted for this repository**: every other skill below was reworked from
  assistant-ui's `.claude/skills/` for a statically generated blog with an
  SEO/AEO contract in `AGENTS.md`, a vitest suite, npm, and Cloudflare
  deploys. Where assistant-ui's original step names a pnpm monorepo mechanism
  that does not exist here, the step is replaced with the npm/`package.json`
  equivalent, not left dangling. `impeccable` is likewise vendored verbatim
  from [pbakaus/impeccable](https://github.com/pbakaus/impeccable).

| Skill | Origin | Use it for |
| --- | --- | --- |
| [`assistant-ui-docs`](assistant-ui-docs/SKILL.md) | adapted + bridge doc | Any change under `components/assistant/` or `lib/assistant/`, and the reme↔assistant-ui architecture bridge in `references/reme-generative-architecture.md` |
| [`generative-ui`](generative-ui/SKILL.md) | vendored (assistant-ui/skills) | Model-composed UI: `present`/`JSONGenerativeUI`, `MessagePrimitive.GenerativeUI` allowlists, A2UI/OpenUI — when the model should design a layout rather than fill one you wrote |
| [`elements`](elements/SKILL.md) | vendored (assistant-ui/skills) | The styled shadcn-style catalog (`r.assistant-ui.com`) and the 120 standalone elements; slot overrides vs forks |
| [`primitives`](primitives/SKILL.md) | vendored (assistant-ui/skills) | Unstyled `@assistant-ui/react` primitives — `MessagePrimitive.Parts`, `AuiIf`, `ActionBarPrimitive`, `BranchPickerPrimitive`, `SuggestionPrimitive`, `AssistantModalPrimitive` |
| [`runtime`](runtime/SKILL.md) | vendored (assistant-ui/skills) | `useLocalRuntime`/`useExternalStoreRuntime`, `useAui`/`useAuiState`, `AuiConfig`/`AuiProvider`, capability scoping |
| [`tools`](tools/SKILL.md) | vendored (assistant-ui/skills) | `"use generative"` toolkit authoring, `withAui`, `AuiConfig({ tools: Tools({ toolkit }) })`, tool UI, approval gates, human tools, MCP |
| [`change-review`](change-review/SKILL.md) | adapted (assistant-ui) | Reviewing a local change or PR before submission |
| [`test-quality`](test-quality/SKILL.md) | adapted (assistant-ui) | Choosing what a test must prove |
| [`treeflow`](treeflow/SKILL.md) | adapted (assistant-ui) | Branch → PR → CI → review flow via `gh` |
| [`update-deps`](update-deps/SKILL.md) | adapted (assistant-ui) | Dependency bumps and lockfile refreshes |
| [`trusted-publishing`](trusted-publishing/SKILL.md) | adapted (assistant-ui) | Only if this repo ever publishes to npm (currently scoped out) |
| [`variants`](variants/SKILL.md) | adapted (assistant-ui) | Comparing UI options in the running app (optional dev-only package) |
| [`impeccable`](impeccable/SKILL.md) | vendored (pbakaus/impeccable, v4.11.0) | Designing, auditing, or polishing any frontend surface — UX review, a11y/perf audits, motion, copy |

Rules that bind every skill here:

1. **`AGENTS.md` wins.** A skill is a procedure, not an exemption. If a step
   conflicts with the contract — budgets (§9), the definition of done (§14),
   the MCP rules (§17) — the contract holds and the skill step is wrong here.
2. **Gates do not move.** No skill skips `npm run quality`, `npm run build`,
   or `npm run check:site`; §16's "change the check in the same commit" rule
   applies to skills the same way it applies to everything else.
3. **Credentials are env vars** (§17 rule 2) and **nothing publishes, merges,
   or deploys from an agent** except `git`/`gh` with the author's request.
4. A new skill lands here with a row in the table above in the same commit;
   a skill no one can find is a skill that will not be used.
