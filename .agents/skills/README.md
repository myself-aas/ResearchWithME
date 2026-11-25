# Agent skills

This directory is the skills layer for coding agents working on this
repository: small, self-contained instruction packages in SKILL.md format
(YAML front-matter with `name` + `description`, then the procedure). The
format is the one the `npx skills` CLI and Claude Code read; nothing here is
required to build the site.

Provenance: the set is adapted from [assistant-ui](https://github.com/assistant-ui/assistant-ui)
(`.claude/skills/` and its `.well-known/agent-skills` document), reworked for
this repository's reality — a statically generated blog with an SEO/AEO
contract in `AGENTS.md`, a vitest suite, npm, and Cloudflare deploys. Where
assistant-ui's original step names a pnpm monorepo mechanism that does not
exist here, the step is replaced with the npm/`package.json` equivalent, not
left dangling.

| Skill | Adapted from | Use it for |
| --- | --- | --- |
| [`assistant-ui-docs`](assistant-ui-docs/SKILL.md) | assistant-ui `agent-skills` | Any change under `components/assistant/` or `lib/assistant/` |
| [`change-review`](change-review/SKILL.md) | assistant-ui `.claude/skills/change-review` | Reviewing a local change or PR before submission |
| [`test-quality`](test-quality/SKILL.md) | assistant-ui `.claude/skills/test-quality` | Choosing what a test must prove |
| [`treeflow`](treeflow/SKILL.md) | assistant-ui `.claude/skills/treeflow` | Branch → PR → CI → review flow via `gh` |
| [`update-deps`](update-deps/SKILL.md) | assistant-ui `.claude/skills/update-deps` | Dependency bumps and lockfile refreshes |
| [`trusted-publishing`](trusted-publishing/SKILL.md) | assistant-ui `.claude/skills/trusted-publishing` | Only if this repo ever publishes to npm (currently scoped out) |
| [`variants`](variants/SKILL.md) | assistant-ui `.claude/skills/variants` | Comparing UI options in the running app (optional dev-only package) |

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
