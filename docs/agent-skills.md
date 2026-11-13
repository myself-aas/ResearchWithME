# Agent Skills discovery

`GET /.well-known/agent-skills/index.json` serves the Agent Skills Discovery RFC v0.2.0 index. It lists one `skill-md` artifact at `/.well-known/agent-skills/researchwithme-archive/SKILL.md`: a read-only guide to finding and citing published ResearchWithMe reviews. Both endpoints support `GET` and `HEAD` and are served by the Next.js and Cloudflare Pages runtimes.

The index's SHA-256 digest is computed from the same UTF-8 `SKILL.md` string served as the artifact, so updates cannot leave a stale manually copied hash. Browser-based agents can fetch either document using the public CORS header. The skill requires no credentials and does not grant editorial access.

The πeme agent's **local** editorial and archive skills live at `.agents/skills/pieme-editorial/` and `.agents/skills/pieme-archive/`. Those local instructions, workflow files, hook configuration and external skills.sh references are **not** served by `/mcp` or advertised as additional public artifacts. A client must explicitly load its own skills. The public artifact above stays narrow and read-only; it now documents the MCP catalogue search as one way to find published articles.

After deployment, fetch the index, fetch each listed artifact, compute SHA-256 over the downloaded bytes, and compare with its `digest`. The production scanner result (`checks.discovery.agentSkills.status`) cannot be established from repository tests alone.
