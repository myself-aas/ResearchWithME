# reme agent instructions context

Use `.agents/agents/reme.agent.md` for research and editorial tasks. Inspect the active environment before invoking optional tools; the agent instructions do not imply a plugin or connector is installed.

## Instructions and skills

- `.agents/instructions/reme-editorial.instructions.md` applies only to article drafts in `docs/articles/**/*.md` and points to the current template; unrelated Markdown files do not inherit editorial requirements.
- `.agents/skills/reme-editorial/SKILL.md` covers grounded drafts and editorial review, with evidence guidance in its `references/` directory.
- `.agents/skills/reme-archive/SKILL.md` covers public, read-only archive retrieval; its `references/mcp-contract.md` summarizes the MCP interface.
- `docs/ResearchWithMe_Template.md` v3 is the human editorial template. `lib/cms/types.ts` and `lib/mcp.ts` remain the actual API contracts.

## Safe operations

Read-only research may call the public archive. Do not probe `POST /agent/auth`, create accounts, publish articles, submit to arXiv, send emails, change DNS or install external skills automatically. Ask for explicit approval and verified credentials in the authorized environment before a separate write task. The `.agents/hooks.json` reme Stop hook runs only an offline structural check on changed `docs/articles/*.md` files; it never publishes or reads network data.

External skills from skills.sh are curated in `.agents/references/skills-sh.md`. They belong to a client agent's workspace, not the public MCP server. Inspect their source/version before use. Public archive skill discovery is documented in `docs/agent-skills.md`.
