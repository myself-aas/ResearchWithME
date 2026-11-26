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
- **Adapted for this repository**: `assistant-ui-docs`, `change-review`,
  `test-quality`, `treeflow`, `update-deps`, `trusted-publishing`, and `variants` were reworked from
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

## Additional user-requested skills

The following packages were installed on 2026-11-26 with `skills@1.9.0`, copied
from their upstream repositories and pinned in `skills-lock.json`. They are
instruction packages, not installed browser binaries, npm dependencies, API
subscriptions, authenticated services, or permission to execute their scripts.
Only the four namespaced collision variants change upstream content: their
frontmatter `name` is unique; the lock records `upstreamName`,
`upstreamComputedHash`, the adaptation, and the installed hash.

All 59 packages below are also installed for the current sandbox user at
`~/.agents/skills/`. Account-wide availability outside this sandbox is not
implied; the project copies persist with this checkout. See
[`SKILLS-INSTALLATION.md`](../../SKILLS-INSTALLATION.md) for request-by-request
status, name collisions, blocked entries, and the user-level restore command.

| Skill | Origin | Use it for |
| --- | --- | --- |
| [`academic-paper`](academic-paper/SKILL.md) | imbad0202/academic-research-skills (vendored) | Plan, draft, revise, and check academic manuscripts; verify every citation. |
| [`academic-paper-reviewer`](academic-paper-reviewer/SKILL.md) | imbad0202/academic-research-skills (vendored) | Review research methods, evidence, and manuscript quality. |
| [`agent-browser`](agent-browser/SKILL.md) | vercel-labs/agent-browser (vendored) | Authorized browser testing and screenshots; browser/runtime setup is separate. |
| [`agents-sdk`](agents-sdk/SKILL.md) | cloudflare/skills (vendored) | Cloudflare Agents SDK guidance when an agent service is explicitly requested. |
| [`ai-ready`](ai-ready/SKILL.md) | johnpapa/ai-ready (vendored) | Assess agent readiness using johnpapa/ai-ready. |
| [`ai-ready-awesome-copilot`](ai-ready-awesome-copilot/SKILL.md) | github/awesome-copilot (name-adapted) | Assess agent readiness using the awesome-copilot procedure. |
| [`ai-seo`](ai-seo/SKILL.md) | coreyhaines31/marketingskills (vendored) | Assess AI-search discoverability and source citation readiness. |
| [`animated-chart`](animated-chart/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Produce standalone animated chart media from exact supplied values. |
| [`animated-infographic`](animated-infographic/SKILL.md) | iart-ai/data-animation-skills (vendored) | Plan and render standalone animated infographics. |
| [`apple-launch-film`](apple-launch-film/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Produce standalone Apple-style launch media, not site chrome. |
| [`brand-intake`](brand-intake/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Gather a motion-project brief; DESIGN.md remains the site authority. |
| [`browser-mcp-agent`](browser-mcp-agent/SKILL.md) | antibrow/anti-detect-browser-skills (vendored) | Authorized browser automation reference; no stealth/evasion without a lawful authorized scope. |
| [`chart-animation`](chart-animation/SKILL.md) | iart-ai/data-animation-skills (vendored) | Animate supplied datasets for standalone media exports. |
| [`chart-designer`](chart-designer/SKILL.md) | claude-office-skills/skills (vendored) | Choose clear charts, labels, scales, and visual encodings. |
| [`chart-visualization`](chart-visualization/SKILL.md) | antvis/chart-visualization-skills (vendored) | Plan chart specifications; external chart services require separate setup. |
| [`claude-md-improver`](claude-md-improver/SKILL.md) | anthropics/claude-plugins-official (vendored) | Audit CLAUDE.md; obtain approval before its proposed edits. |
| [`cloudflare`](cloudflare/SKILL.md) | cloudflare/skills (vendored) | Review Cloudflare platform architecture and implementation. |
| [`create-github-action-workflow-specification`](create-github-action-workflow-specification/SKILL.md) | github/awesome-copilot (vendored) | Write a reviewable Actions workflow specification. |
| [`design-doc-mermaid`](design-doc-mermaid/SKILL.md) | spillwavesolutions/design-doc-mermaid (vendored) | Write design documents with Mermaid diagrams. |
| [`dispatching-parallel-agents`](dispatching-parallel-agents/SKILL.md) | obra/superpowers (vendored) | Split independent work only when agent tooling is actually available. |
| [`documentation-and-adrs`](documentation-and-adrs/SKILL.md) | addyosmani/agent-skills (vendored) | Document architecture decisions and engineering trade-offs. |
| [`documentation-writer`](documentation-writer/SKILL.md) | github/awesome-copilot (vendored) | Structure tutorials, how-to guides, reference, and explanations. |
| [`echarts`](echarts/SKILL.md) | sentimony/skills (vendored) | Chart design and ECharts reference; no automatic runtime dependency. |
| [`excalidraw-diagram-generator`](excalidraw-diagram-generator/SKILL.md) | github/awesome-copilot (vendored) | Create editable Excalidraw diagram artifacts. |
| [`firecrawl-seo-audit`](firecrawl-seo-audit/SKILL.md) | firecrawl/firecrawl-workflows (vendored) | Service-backed SEO audit; needs separately configured Firecrawl access. |
| [`gh-fix-ci`](gh-fix-ci/SKILL.md) | openai/skills (vendored) | Inspect failed GitHub Actions checks and propose/test fixes. |
| [`gh-issue-sync`](gh-issue-sync/SKILL.md) | mitsuhiko/gh-issue-sync (vendored) | Synchronize issues only within an explicitly requested scope. |
| [`gh-stack`](gh-stack/SKILL.md) | github/gh-stack (vendored) | Review stacked-PR workflows; this session stays on its assigned branch. |
| [`git-commit`](git-commit/SKILL.md) | github/awesome-copilot (vendored) | Prepare focused conventional commits when requested. |
| [`github-actions`](github-actions/SKILL.md) | callstackincubator/agent-skills (vendored) | Implement and review GitHub Actions workflows. |
| [`github-issues`](github-issues/SKILL.md) | github/awesome-copilot (vendored) | Draft or manage explicitly requested GitHub issues. |
| [`helm-chart-scaffolding`](helm-chart-scaffolding/SKILL.md) | wshobson/agents (vendored) | Reference for explicitly requested Kubernetes work; not a site deployment change. |
| [`launch-video`](launch-video/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Produce standalone product-launch video media. |
| [`loop-cover`](loop-cover/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Produce a seamlessly looping standalone cover asset. |
| [`milestone-reveal`](milestone-reveal/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Animate verified milestone data for standalone media. |
| [`model-showdown`](model-showdown/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Plan fair model-comparison motion media; model access is separate. |
| [`motion-brief-writer`](motion-brief-writer/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Turn an animation idea into a precise build brief. |
| [`motion-effects`](motion-effects/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Produce standalone motion-effect assets; not a site animation dependency. |
| [`motion-prompt-writer`](motion-prompt-writer/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Write structured motion-design prompts. |
| [`nature-academic-search`](nature-academic-search/SKILL.md) | yuan1z0825/nature-skills (vendored) | Research literature using available sources; verify retrieved evidence. |
| [`newsletter-promo`](newsletter-promo/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Create standalone newsletter promotion media. |
| [`obsidian-markdown`](obsidian-markdown/SKILL.md) | obsidianmd/obsidian-skills (vendored) | Author Obsidian-compatible notes; published MDX still obeys the site pipeline. |
| [`presentation-video`](presentation-video/SKILL.md) | iart-ai/data-animation-skills (vendored) | Convert a supplied presentation into timed standalone video. |
| [`programmatic-seo`](programmatic-seo/SKILL.md) | coreyhaines31/marketingskills (vendored) | Assess data-backed page strategies; avoid duplicate or thin generated pages. |
| [`recharts`](recharts/SKILL.md) | andy-spike/skills (vendored) | Chart composition reference; prefer existing library/SVG under the site JS budget. |
| [`reel-export`](reel-export/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Export supplied media for vertical platforms with codec and safe-area checks. |
| [`reference-to-motion`](reference-to-motion/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Translate supplied references into a motion brief. |
| [`research-paper-writer`](research-paper-writer/SKILL.md) | ailabs-393/ai-labs-claude-skills (vendored) | Structure and draft research papers from verified material. |
| [`research-paper-writing`](research-paper-writing/SKILL.md) | master-cai/research-paper-writing-skills (vendored) | Academic writing and revision workflow. |
| [`seo`](seo/SKILL.md) | affaan-m/ecc (vendored) | Technical/on-page SEO and content strategy from affaan-m/ecc. |
| [`seo-aeo-best-practices`](seo-aeo-best-practices/SKILL.md) | sanity-io/agent-toolkit (vendored) | Review SEO/AEO metadata, structured content, and discoverability. |
| [`seo-audit`](seo-audit/SKILL.md) | coreyhaines31/marketingskills (vendored) | Audit crawling, indexing, metadata, internal links, and content. |
| [`seo-claude`](seo-claude/SKILL.md) | agricidaniel/claude-seo (name-adapted) | SEO procedure from agricidaniel/claude-seo. |
| [`seo-geo`](seo-geo/SKILL.md) | resciencelab/opc-skills (vendored) | Review search and generative-engine visibility. |
| [`seo-iannuttall`](seo-iannuttall/SKILL.md) | iannuttall/seo (name-adapted) | SEO procedure from iannuttall/seo. |
| [`seo-web-quality`](seo-web-quality/SKILL.md) | addyosmani/web-quality-skills (name-adapted) | SEO procedure from addyosmani/web-quality-skills. |
| [`title-sequence-3d`](title-sequence-3d/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Produce standalone cinematic 3D title media; not site runtime code. |
| [`vox-explainer`](vox-explainer/SKILL.md) | charlie947/motion-graphics-skills (vendored) | Produce standalone documentary-style explainer media. |
| [`writing-for-agents`](writing-for-agents/SKILL.md) | mattpocock/skills (vendored) | Write concise, trigger-driven AGENTS.md, skills, and agent-facing docs. |

## Additional maintenance skill (2026-11-26)

| Skill | Source | Task |
| --- | --- | --- |
| [`clean-codebase`](clean-codebase/SKILL.md) | pjt222/agent-almanac (verbatim; commit/hash in `skills-lock.json`) | Behavior-preserving hygiene audit and cleanup; safe mode by default, explicit opt-in before aggressive dead-code deletion. |

The skill's MIT license is included. Its linked optional WSL/R environment guide
is vendored verbatim at [`.agents/guides/setting-up-your-environment.md`](../guides/setting-up-your-environment.md)
and separately hash-pinned in the lock entry. It is reference material, **not**
a requirement to set up R, Windows, MCP, credentials, or services for this Next.js
project. Related sibling skills are not installed by this request.

## Rules

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
