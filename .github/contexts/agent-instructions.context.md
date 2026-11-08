# ResearchWithMe Agent Instructions Context

## Custom Instructions Files

### 1. Article Writing (`.github/instructions/reme-article-writing.instructions.md`)
**Purpose**: Strict enforcement of ResearchWithMe Template v2 for SEO/AEO/GEO-optimized blog articles.

**Applies When**:
- Writing new research articles
- Editing existing articles
- Reviewing article submissions
- Creating paper explainer content

**Key Rules**:
- Follow `docs/ResearchWithMe_Template.md` structure exactly
- SEO: Title 50-60 chars, meta description 150-160 chars
- AEO: FAQ sections, HowTo schema, DefinedTerm schema
- GEO: Entity definitions, causal explanations, procedural content
- Citations: ResearchWithMe format with DOI links
- Accessibility: Proper headings, alt text, contrast

### 2. Project Instructions (`.github/copilot-instructions.md` - if exists)
**Purpose**: Project-wide guidelines for all agent interactions.

**Should Include**:
- Product vision and goals (`PRODUCT.md`)
- System architecture (`ARCHITECTURE.md` or this context)
- Contributing guidelines (`CONTRIBUTING.md`)
- Design system (`DESIGN.md`)
- Quality gate requirements

## Custom Agents

### reme Agent (`.github/agents/reme.agent.md`)
**Description**: ResearchWithMe custom agent for scholarly publication platform tasks.

**Capabilities**:
- Article writing (SEO/AEO/GEO optimized)
- Research assistance
- Code implementation
- Platform maintenance

**Configuration**:
```yaml
---
name: reme
description: 'ResearchWithMe custom agent for scholarly publication platform tasks. Handles article writing, research assistance, code implementation, and platform maintenance following ResearchWithMe conventions.'
tools: [read, write, edit, search, execute, web]
---
```

**When to Use**:
- Writing/editing research articles
- Research assistance tasks
- Platform feature implementation
- Content strategy questions

## Prompt Files (Future)

### Planned Prompt Files
```
.github/prompts/
  article-write.prompt.md      # Invoke reme for article writing
  paper-explainer.prompt.md    # Create paper explainer video plan
  feature-plan.prompt.md       # Generate implementation plan
  code-review.prompt.md        # Review PR against standards
```

### Prompt File Format
```markdown
---
agent: reme
description: Write a research article following ResearchWithMe Template v2
---
Write a research article about {{topic}} following the ResearchWithMe Template v2.
Target audience: {{audience}}
Key points to cover: {{keyPoints}}
SEO keywords: {{keywords}}
```

## Agent Customization Workflow

### Creating New Instructions
1. Identify recurring problem/pattern
2. Create `.github/instructions/[name].instructions.md`
3. Add `applyTo` glob pattern
4. Test with agent
5. Refine based on behavior

### Creating New Agents
1. Define agent purpose and scope
2. Create `.github/agents/[name].agent.md`
3. Specify tools, handoffs, prompt
4. Test with sample tasks
5. Document in this context

### Creating Prompt Files
1. Define reusable workflow
2. Create `.github/prompts/[name].prompt.md`
3. Specify agent and parameters
4. Test with slash command `/prompt-name`

## Context Engineering Principles

### Layered Context
1. **Project-wide** (`.github/copilot-instructions.md`) - Always loaded
2. **Task-specific** (context files in `.github/contexts/`) - Loaded via `#context-name`
3. **Session-specific** (conversation history) - Automatic
4. **File-specific** (attached files) - Explicit `#file`

### Context Loading Strategy
```markdown
# In copilot-instructions.md
* [Project Overview](../.github/contexts/project-overview.context.md)
* [Architecture](../.github/contexts/architecture.context.md)
* [Workflows](../.github/contexts/workflows.context.md)
* [Design System](../.github/contexts/design-system.context.md)
* [Skills](../.github/contexts/skills.context.md)
* [API Reference](../.github/contexts/api-reference.context.md)
* [Database](../.github/contexts/database.context.md)
* [Deployment](../.github/contexts/deployment.context.md)
* [Testing](../.github/contexts/testing.context.md)
* [Content & Editorial](../.github/contexts/content-editorial.context.md)
* [HyperFrames Video](../.github/contexts/hyperframes-video.context.md)
```

### Verification
- Use `#context-name` to explicitly load
- Ask agent to summarize loaded context
- Check for conflicts between contexts
- Update contexts when project changes

## Best Practices

### Instruction Design
- **Concise**: Rules, not tutorials
- **Actionable**: "Do X" not "Consider X"
- **Specific**: File paths, command names, exact patterns
- **Prioritized**: Most critical rules first

### Agent Design
- **Single responsibility**: One agent per workflow
- **Clear handoffs**: Defined transitions between agents
- **Tool minimalism**: Only necessary tools
- **Prompt clarity**: Unambiguous instructions

### Context Maintenance
- **Review monthly**: Update for project changes
- **Version control**: Track in git
- **Team sync**: Share via PR reviews
- **Metrics**: Track agent success/failure patterns

## Troubleshooting Agent Behavior

### Common Issues
1. **Agent ignores instructions**: Check `applyTo` pattern, file location
2. **Wrong context loaded**: Verify `#context-name` syntax
3. **Conflicting rules**: Check instruction priority
4. **Missing tools**: Verify agent `tools` array

### Debugging Steps
1. Ask agent: "What instructions are you following?"
2. Check `.github/instructions/` for applicable files
3. Verify `copilot-instructions.md` includes context links
4. Test with minimal reproduction

### Resources
- [VS Code Agent Customization](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
- [Custom Agents](https://code.visualstudio.com/docs/agent-customization/custom-agents)
- [Prompt Files](https://code.visualstudio.com/docs/agent-customization/prompt-files)
- [Context Engineering Guide](https://code.visualstudio.com/docs/agents/guides/context-engineering-guide)