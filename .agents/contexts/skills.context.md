# ResearchWithMe skill context

Discover repository skills without installation: `npx skills add . --list`. The local inventory currently includes `reme-archive`, `reme-editorial`, and `impeccable`; check the CLI each time before claiming a skill is available. Skills in `.agents/skills/` are instructions for compatible agent clients, not permissions or tools exposed by `/mcp`.

## Select for the task

| Task | Local skill / reference |
| --- | --- |
| Published review discovery via public MCP/API | `.agents/skills/reme-archive/SKILL.md` |
| Source-grounded article draft, citation audit or corrections | `.agents/skills/reme-editorial/SKILL.md` and `docs/ResearchWithMe_Template.md` v3 |
| UI design/review | `.agents/skills/impeccable/SKILL.md` when present |
| MCP/Worker development or skill authoring | Review `.agents/references/skills-sh.md`; external skill use is opt-in |

Use `.agents/contexts/reme.context.md` for permissions and the difference between agent skills and MCP. Do not assume an external editor plugin, MCP connector, Cloudflare credential, video service, or user-level skill is installed just because an older document lists it. The read-only public archive skill is documented separately at `docs/agent-skills.md`; it is not the editorial skill.
