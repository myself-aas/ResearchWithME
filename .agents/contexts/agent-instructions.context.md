# πeme agent instructions context

Use `.agents/agents/pieme.agent.md` for new research and editorial tasks. `.agents/agents/reme.agent.md` remains a legacy entry point; its older plugin/tool lists are not a guarantee of current availability. Inspect the active environment before invoking tools.

## Instructions and skills

- `.agents/instructions/pieme-editorial.instructions.md` applies only to article drafts in `docs/articles/**/*.md`. The legacy `reme-article-writing.instructions.md` now delegates to the same current template, without imposing speculative v2 CMS fields on unrelated Markdown files.
- `.agents/skills/pieme-editorial/SKILL.md` covers grounded drafts and editorial review, with evidence guidance in its `references/` directory.
- `.agents/skills/pieme-archive/SKILL.md` covers public, read-only archive retrieval; its `references/mcp-contract.md` summarizes the MCP interface.
- `docs/ResearchWithMe_Template.md` v3 is the human editorial template. `lib/cms/types.ts` and `lib/mcp.ts` remain the actual API contracts.

## Safe operations

Read-only research may call the public archive. Do not probe `POST /agent/auth`, create accounts, publish articles, submit to arXiv, send emails, change DNS or install external skills automatically. Ask for explicit approval and verified credentials in the authorized environment before a separate write task. The `.agents/hooks.json` πeme Stop hook runs only an offline structural check on changed `docs/articles/*.md` files; it never publishes or reads network data.

External skills from skills.sh are curated in `.agents/references/skills-sh.md`. They belong to a client agent's workspace, not the public MCP server. Inspect their source/version before use. Public archive skill discovery is documented in `docs/agent-skills.md`.
