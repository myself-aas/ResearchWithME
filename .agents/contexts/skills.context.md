# ResearchWithMe Agent Skills Context

## Available Skills

### Project Skills (`.agents/skills/`)
- **SVG-Logo-Designer** - Create professional SVG logos from descriptions

### Plugin Skills
- **agent-customization** - Create/update VS Code agent customization files
- **create-canvas** - Create Copilot extension canvases
- **pylance-docs** - Pylance documentation reference
- **pylance-python-profiling** - Python profiling with Pylance
- **pylance-refactoring** - Pylance automated refactorings
- **python-add-type-annotations** - Add inline type annotations
- **python-fact-grounded-coding** - Grounded Python coding
- **python-type-inference** - Single symbol type inference
- **python-write-stubs** - Create .pyi type stubs
- **troubleshoot** - Debug chat agent behavior
- **typescript-setup** - New TypeScript project setup
- **typescript-update** - TypeScript version upgrades
- **add-python-version-support** - Add newer Python version support
- **drop-python-version-support** - Drop older Python versions

### User Skills (Global)
- **figma** - Figma design integration
- **hyperframes** - Video creation with HyperFrames
- **hyperframes-cli** - HyperFrames CLI operations
- **hyperframes-registry** - Pre-built HyperFrames blocks
- **media-use** - Media sourcing for videos
- **remotion-to-hyperframes** - Port animations to HyperFrames
- **slideshow** - HyperFrames presentations

## Skill Usage Guidelines

### When to Use Each Skill

| Task | Skill |
|------|-------|
| Create logo/brand identity | SVG-Logo-Designer |
| UI/UX design, review, polish | impeccable |
| Python type annotations | python-add-type-annotations |
| Python stubs for third-party | python-write-stubs |
| TypeScript project setup | typescript-setup |
| TypeScript upgrade | typescript-update |
| Agent customization files | agent-customization |
| Video creation | hyperframes |
| Video CLI operations | hyperframes-cli |
| Pre-built video blocks | hyperframes-registry |
| Media for videos | media-use |
| Figma to motion | figma |
| Port Remotion/Lottie | remotion-to-hyperframes |
| Presentation decks | slideshow |

### HyperFrames Video Skills (Critical)
**Always read `/hyperframes` FIRST before any video work.**

#### Video Types & Conventions
- **Paper Explainers**: Title → Abstract → Findings → Methodology → Takeaways (60-90s)
- **Edition Trailers**: Compendium promotions
- **Radar Charts**: Author impact visualizations
- **Slideshows**: `/editions` presentations via `/slideshow`

#### Render Contract (Non-negotiable)
- Output: 1920×1080, 30 fps
- Deterministic: No `Date.now()`, `Math.random()`, network fetches
- GSAP: One paused root timeline on `window.__timelines`
- Clips: Must carry `class="clip"`
- Lint: `npx hyperframes lint` after every edit
- Check: `npx hyperframes check` after every edit

## Custom Agents

### reme Agent (`.agents/agents/reme.agent.md`)
ResearchWithMe custom agent for scholarly research platform tasks:
- Article writing (SEO/AEO/GEO optimized)
- Research assistance
- Code implementation
- Platform maintenance

### Agent Configuration
```yaml
---
name: reme
description: ResearchWithMe custom agent for scholarly research platform tasks
tools: [read, write, edit, search, execute, web]
---
```

## Custom Instructions

### Article Writing (`.agents/instructions/reme-article-writing.instructions.md`)
Strict enforcement of ResearchWithMe Template v2 for SEO/AEO/GEO-optimized blog articles.

### Template Reference
- `docs/ResearchWithMe_Template.md` - Full article template
- Applies to: writing, editing, reviewing research articles

## MCP Servers & Connectors

### GitHub MCP
- Repository operations
- Issues, PRs, Actions
- Code search

### Cloudflare Connector
- Workers, Pages, R2, D1, KV
- AI Gateway, Vectorize
- Zero Trust, CDN, DNS

## Skill Invocation

### Explicit Invocation
```
Use the [skill-name] skill to [task]
```

### Automatic Invocation
Skills with `applyTo` patterns trigger automatically on matching files/tasks.

### Skill Discovery
```bash
# List available skills
# Check .agents/skills/ for project skills
# Check plugin skills in VS Code settings
```

## Best Practices

### Skill Selection
1. Check available skills first
2. Use most specific skill for task
3. Combine skills when needed
4. Document skill usage in PR

### Context Engineering
1. Curate project-wide context (custom instructions)
2. Generate implementation plans (custom agents)
3. Implement from plans (specialized agents)
4. Validate with quality gate

### Video Workflow
1. Read `/hyperframes` skill
2. Check `/hyperframes-registry` for blocks
3. Source media via `/media-use`
4. Scaffold with `/hyperframes-cli`
5. Lint and check before render