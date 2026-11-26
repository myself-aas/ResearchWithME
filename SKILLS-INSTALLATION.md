# Requested skills installation

Installed **2026-11-26** using `skills@1.9.0` for **Codex** (`-a codex --copy -y`).

## Scope and verified result

- **59 additional unique skill packages** are copied into `.agents/skills/` and
  into the current sandbox user's `~/.agents/skills/` (global scope).
- `skills-lock.json` pins GitHub source, commit, upstream path, and installed hash.
  `.agents/skills/README.md` indexes every installed package and its intended use.
- Global installation used the verified project copies as a local source; the
  project lockfile is the GitHub provenance authority. This is not an install
  into Arena's account settings or another machine. User-home files are not
  preserved in repository snapshots; restore from the checked-in copies below.
- Installation does not execute the skill procedures, install chart/browser/video
  runtimes, connect MCP services, or supply external-service credentials. Packages
  may refer to upstream sibling skills/shared files that the CLI does not copy;
  inspect prerequisites and stop if they are missing before using a procedure.
- No runtime dependencies or site frontend code changed.

## Request-by-request status

| Request | Requested source/skill | Result |
| --- | --- | --- |
| 1 | anthropics/claude-plugins-official · claude-md-improver | Installed |
| 2 | obsidianmd/obsidian-skills · obsidian-markdown | Installed |
| 3 | spillwavesolutions/design-doc-mermaid · design-doc-mermaid | Installed |
| 4 | github/awesome-copilot · documentation-writer | Installed |
| 5 | addyosmani/agent-skills · documentation-and-adrs | Installed |
| 6 | andy-spike/skills · recharts | Installed |
| 7 | wshobson/agents · helm-chart-scaffolding | Installed; Kubernetes reference only for this site |
| 8 | antvis/chart-visualization-skills · chart-visualization | Installed |
| 9 | https://code.deepline.com/ | Blocked: host is outside sandbox network allowlist; no alternate source guessed. Provide a GitHub source URL or upload the skill package. |
| 10 | claude-office-skills/skills · chart-designer | Installed |
| 11 | sentimony/skills · echarts | Installed |
| 12 | iart-ai/data-animation-skills · chart-animation | Installed |
| 13 | iart-ai/data-animation-skills (whole repository) | All 3 discovered skills installed; chart-animation deduplicated |
| 14 | charlie947/motion-graphics-skills (whole repository) | All 15 discovered skills installed |
| 15 | imbad0202/academic-research-skills · academic-paper-reviewer | Installed |
| 16 | yuan1z0825/nature-skills · nature-academic-search | Installed |
| 17 | imbad0202/academic-research-skills · academic-paper | Installed |
| 18 | ailabs-393/ai-labs-claude-skills · research-paper-writer | Installed |
| 19 | master-cai/research-paper-writing-skills · research-paper-writing | Installed |
| 20 | coreyhaines31/marketingskills · seo-audit | Installed |
| 21 | coreyhaines31/marketingskills · ai-seo | Installed |
| 22 | coreyhaines31/marketingskills · programmatic-seo | Installed |
| 23 | firecrawl/firecrawl-workflows · firecrawl-seo-audit | Installed; service setup not performed |
| 24 | iannuttall/seo · seo | Installed as seo-iannuttall |
| 25 | addyosmani/web-quality-skills · seo | Installed as seo-web-quality |
| 26 | resciencelab/opc-skills · seo-geo | Installed |
| 27 | sanity-io/agent-toolkit · seo-aeo-best-practices | Installed |
| 28 | agricidaniel/claude-seo · seo | Installed as seo-claude |
| 29 | affaan-m/ecc · seo | Installed as seo |
| 30 | vercel-labs/agent-browser · agent-browser | Installed; browser binaries not installed |
| 31 | mattpocock/skills · writing-for-agents | Installed |
| 32 | cloudflare/skills · agents-sdk | Installed |
| 33 | obra/superpowers · dispatching-parallel-agents | Installed |
| 34 | antibrow/anti-detect-browser-skills · browser-mcp-agent | Installed; authorized browser testing only |
| 35 | cloudflare/skills · cloudflare | Installed |
| 36 | github/awesome-copilot · ai-ready | Installed as ai-ready-awesome-copilot |
| 37a | johnpapa/ai-ready (whole repository) | The sole discovered skill installed as ai-ready |
| 37b | openai/skills · gh-fix-ci | Installed |
| 37c | mitsuhiko/gh-issue-sync · gh-issue-sync | Installed |
| 37d | github/awesome-copilot · gh-cli | Unavailable: no matching skill in the upstream catalog at installation time. Explicit single-skill check confirmed it; no substitute installed. |
| 37e | github/gh-stack · gh-stack | Installed; current-branch restriction still applies |
| 37f | github/awesome-copilot · git-commit | Installed |
| 37g | github/awesome-copilot · github-issues | Installed |
| 37h | github/awesome-copilot · create-github-action-workflow-specification | Installed |
| 37i | github/awesome-copilot · excalidraw-diagram-generator | Installed |
| 37j | callstackincubator/agent-skills · github-actions | Installed |

## Collision handling

The CLI selects a skill by name, not by source: sequential `seo` or `ai-ready`
installs overwrite earlier copies. Every requested source is preserved:

| Installed name | Upstream source | Upstream name |
| --- | --- | --- |
| `seo-iannuttall` | `iannuttall/seo` | `seo` |
| `seo-web-quality` | `addyosmani/web-quality-skills` | `seo` |
| `seo-claude` | `agricidaniel/claude-seo` | `seo` |
| `seo` | `affaan-m/ecc` | `seo` |
| `ai-ready-awesome-copilot` | `github/awesome-copilot` | `ai-ready` |
| `ai-ready` | `johnpapa/ai-ready` | `ai-ready` |

Only the four namespaced variants change the frontmatter name; instructions and
supporting files remain upstream content. Their upstream and installed hashes
are both recorded. When updating, install the original into an isolated directory,
reapply the unique name, and refresh both hashes; do not let an ordinary repeated
`--skill seo` update overwrite the other providers.

## Whole-repository selections

**iart-ai/data-animation-skills:** animated-infographic, chart-animation,
presentation-video.

**charlie947/motion-graphics-skills:** animated-chart, apple-launch-film,
brand-intake, launch-video, loop-cover, milestone-reveal, model-showdown,
motion-brief-writer, motion-effects, motion-prompt-writer, newsletter-promo,
reel-export, reference-to-motion, title-sequence-3d, vox-explainer.

## Restore user-level installation

From the repository root, this installs the 59 requested, locally pinned copies
into the current user's Codex skill directory. Existing same-name global skills
are replaced; inspect them first. No GitHub download is needed for skill content
(the npx CLI may still require npm registry access).

```bash
npx -y skills@1.9.0 add ./.agents/skills --global --copy -y -a codex --skill \
  academic-paper academic-paper-reviewer agent-browser agents-sdk ai-ready \
  ai-ready-awesome-copilot ai-seo animated-chart animated-infographic apple-launch-film \
  brand-intake browser-mcp-agent chart-animation chart-designer chart-visualization \
  claude-md-improver cloudflare create-github-action-workflow-specification design-doc-mermaid dispatching-parallel-agents \
  documentation-and-adrs documentation-writer echarts excalidraw-diagram-generator firecrawl-seo-audit \
  gh-fix-ci gh-issue-sync gh-stack git-commit github-actions \
  github-issues helm-chart-scaffolding launch-video loop-cover milestone-reveal \
  model-showdown motion-brief-writer motion-effects motion-prompt-writer nature-academic-search \
  newsletter-promo obsidian-markdown presentation-video programmatic-seo recharts \
  reel-export reference-to-motion research-paper-writer research-paper-writing seo \
  seo-aeo-best-practices seo-audit seo-claude seo-geo seo-iannuttall \
  seo-web-quality title-sequence-3d vox-explainer writing-for-agents
```

Verification: compare each global `SKILL.md` and supporting tree to its project
copy; run `npx -y skills@1.9.0 list --global -a codex` to inspect discovery.
The repository contract test verifies installed folder hashes, source pins,
unique names, the README index, and actual Markdown links outside code examples.

## Validation results

- Global CLI discovery: **59 skills** for Codex.
- Global/project comparison: **59 of 59 complete trees match byte-for-byte**.
- `npm run quality`: passed tokens, lint, typecheck, and **213 tests**.
- `npm run verify`: passed production build and every site contract check.
- Existing non-blocking ESLint warning: `.eslintignore` is deprecated; vendored
  skill scripts remain excluded through the flat ESLint configuration.

## Local operating constraints

`AGENTS.md` §19 routes tasks to these packages on demand. It remains authoritative
for evidence/citations, accessible SSR figures, reme tokens, article JS budgets,
SEO/AEO checks, credentials, and author-approved GitHub/deployment operations.
Standalone video instructions do not authorize adding motion/chart runtimes to
the site. Browser skills do not authorize bypassing access controls or anti-bot
protections. Installing `gh-stack` does not permit changing this session's branch.


## clean-codebase follow-up (2026-11-26)

Installed the requested `pjt222/agent-almanac` **clean-codebase** skill from
commit `5907366b93fcfae4988161a1ee16ed7018c4e2be`, upstream path
`skills/clean-codebase/SKILL.md`. The requested GitHub URL encodes slashes as
`%2F`; it refers to that path, not a differently named package.

- Verbatim project copy: `.agents/skills/clean-codebase/SKILL.md`, with MIT license.
- User copy: `~/.agents/skills/clean-codebase/` (current sandbox user).
- Linked optional guide: `.agents/guides/setting-up-your-environment.md`, also
  copied to `~/.agents/guides/`, with a SHA-256 in the skill's lock entry.
- Skill folder content hash, source commit and supporting-guide provenance are
  pinned in `skills-lock.json`; AGENTS.md routes cleanup tasks to safe mode.
- No setup commands in the guide were executed. No runtime dependency, service,
  credential, architecture change or publishing action is authorized by installation.

To restore this user-level installation from a later repository snapshot:

```bash
mkdir -p ~/.agents/skills ~/.agents/guides
cp -R .agents/skills/clean-codebase ~/.agents/skills/
cp .agents/guides/setting-up-your-environment.md ~/.agents/guides/
```
