# reme archive lookup (read-only)

1. Load `.agents/skills/reme-archive/SKILL.md` and `.agents/skills/reme-archive/references/mcp-contract.md`.
2. If the MCP client has connected to the server card endpoint, list its tools/resources; call `search_reviews` with the user's topic. Otherwise use `GET /api/articles?search=TERM` for public discovery. Do not guess that production is deployed from repository code.
3. Read the full published article via its returned link before making detailed scientific claims. Check original primary sources where possible and separate article assertions from verified evidence.
4. Respond with article title, author, canonical URL, relevant answer, limitations and whether the server/primary source was actually reachable. If no results, say the archive returned no matches—not that no research exists.

No registration probes (`POST /agent/auth`), private studio requests, OAuth assumptions, or automatically written DNS/CMS records. The archive MCP exposes no prompts, arbitrary skill discovery, or editorial write actions.
