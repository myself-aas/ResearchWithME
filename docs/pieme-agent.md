# πeme agent kit

πeme is a **repository-local assistant configuration** for ResearchWithMe, not a deployed autonomous bot. Start with `.agents/agents/pieme.agent.md`; the older `reme` agent remains for compatibility. The article template is `docs/ResearchWithMe_Template.md` v3. No third-party skill, MCP client, CMS publisher, Search Console integration, or Cloudflare agent is installed by this kit.

| Surface | File | Purpose |
| --- | --- | --- |
| Agent and context | `.agents/agents/pieme.agent.md`, `.agents/contexts/pieme.context.md` | Routes tasks and states privileges/limits |
| Local skills | `.agents/skills/pieme-editorial/SKILL.md`, `.agents/skills/pieme-archive/SKILL.md` | Editorial drafting and read-only published archive lookup |
| References | Each skill's `references/` and `.agents/references/skills-sh.md` | Evidence checklist, MCP contract and reviewed optional skills.sh skills |
| Instructions | `.agents/instructions/pieme-editorial.instructions.md` | Narrow draft-file rule; legacy reme instructions delegate here |
| Workflows | `.agents/workflows/pieme-editorial.md`, `.agents/workflows/pieme-archive.md` | Human-approved publishing and read-only lookup |
| Hooks/automation | `.agents/hooks.json`, `scripts/pieme-check.mjs`, `.github/workflows/quality.yml` | Offline structural check; no network or writes |
| Public discovery | `lib/agent-skills.ts`, `docs/agent-skills.md` | Narrow public archive skill and digest; separate from local editorial skill |

## Try it safely

```sh
npx skills add . --list                # Discover the two πeme skills without installing them
npm run pieme:check                    # Check all tracked/untracked docs/articles/*.md drafts
npm run pieme:check -- --file docs/articles/my-review.md
npm run pieme:test                     # Offline checker tests
npm run test -- test/pages/agent-skills.test.ts
```

The agent Stop hook checks only **changed** drafts; the CI/npm check scans **all** drafts so a clean checkout cannot silently skip committed files. The validator checks title, summary, references heading and placeholder URLs; it never claims a citation is real or a publication is approved. Never put credentials in draft Markdown. If your client does not support `.agents/hooks.json`, run the npm command manually; a skill file alone does not install a hook.

## skills.sh and MCP

The skills.sh CLI recognizes the local `pieme-archive` and `pieme-editorial` skills. For a separate agent client, inspect and explicitly install only the desired skill. Use `.agents/references/skills-sh.md` to select vetted external *development* guidance; external skill instructions are not copied into the Worker. The public MCP endpoint supports only the operations in `lib/mcp.ts`, and client-side skills do not change its permissions. Public agent discovery exposes the archive-reading skill, **not** the editorial skill or internal workflows. Live availability remains to be checked after deployment.

## Review the skills

The two `evals/evals.json` files contain realistic prompts for a later human/agent review (missing primary source, unsupported citation, archive lookup and unsafe registration request). They are **test cases, not completed model evaluations**. Confirm the output with a client that can load the skills; compare it with a run without the skill and review the citations and safety decisions. The offline script tests only deterministic checker behavior. If installing a skill outside the repository, resolve `references/` relative to its supporting-files directory and repository paths from the repository root.

## Before an actual publish

Use the template and evidence checklist; have an authorized human inspect claims, identifiers, authorship and rights. Only then use the CMS studio to publish. The assistant must not turn a passive audit, hook, prompt, or search into `POST /agent/auth`, CMS writes, DNS writes, email sending, IndexNow or arXiv submission. When OAuth metadata is unavailable, consult `/auth.md`; do not invent a flow.
