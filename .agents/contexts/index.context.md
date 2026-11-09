# ResearchWithMe Context Index

This file serves as the main entry point for all ResearchWithMe project contexts. Load specific contexts using `#context-name` in chat.

## Available Contexts

| Context File | Description | When to Use |
|--------------|-------------|-------------|
| `project-overview.context.md` | High-level project description, tech stack, key directories | Starting any task, onboarding |
| `architecture.context.md` | System architecture, data flow, components, database schema | Backend tasks, API design, database changes |
| `workflows.context.md` | Development workflows, quality gates, git practices, testing | Daily development, CI/CD, code reviews |
| `design-system.context.md` | Typography, colors, spacing, components, accessibility | UI/UX tasks, component creation, design reviews |
| `skills.context.md` | Available skills (HyperFrames, SVG-Logo, etc.), custom agents | Video creation, logo design, specialized tasks |
| `api-reference.context.md` | All API routes, request/response types, authentication | API development, integration, debugging |
| `database.context.md` | Supabase schema, RLS policies, functions, migrations | Database changes, queries, migrations |
| `deployment.context.md` | Cloudflare Workers, OpenNext, ISR, monitoring, CI/CD | Deployment, infrastructure, performance |
| `testing.context.md` | Vitest setup, patterns, mocking, coverage targets | Writing tests, debugging test failures |
| `content-editorial.context.md` | Content types, editorial workflow, SEO/AEO/GEO, templates | Content creation, publishing, SEO optimization |
| `hyperframes-video.context.md` | Video creation workflow, registry blocks, render contract | Any video/motion graphics work |
| `agent-instructions.context.md` | Custom instructions, agents, prompt files, context engineering | Agent customization, prompt engineering |
| `quick-reference.context.md` | Commands, file paths, patterns, troubleshooting | Daily reference, quick lookups |

## Loading Contexts

### Explicit Loading (Recommended)
```markdown
# Load specific context
#project-overview

# Load multiple contexts
#architecture #database #api-reference
```

### Via Copilot Instructions
Add to `.github/copilot-instructions.md`:
```markdown
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
* [Agent Instructions](../.github/contexts/agent-instructions.context.md)
* [Quick Reference](../.github/contexts/quick-reference.context.md)
```

## Context Selection Guide

### By Task Type

| Task | Contexts to Load |
|------|------------------|
| New feature development | `project-overview`, `architecture`, `workflows`, `design-system` |
| API endpoint creation | `architecture`, `api-reference`, `database`, `workflows` |
| Database migration | `database`, `architecture`, `workflows` |
| UI component creation | `design-system`, `workflows`, `project-overview` |
| Video creation | `hyperframes-video`, `skills`, `design-system` |
| Article writing | `content-editorial`, `skills` (for reme agent) |
| Testing | `testing`, `workflows`, `architecture` |
| Deployment | `deployment`, `architecture`, `workflows` |
| Code review | `workflows`, `design-system`, `architecture` |
| Debugging | `quick-reference`, `architecture`, `api-reference` |

### By Role

| Role | Essential Contexts |
|------|-------------------|
| Frontend Developer | `design-system`, `workflows`, `architecture`, `quick-reference` |
| Backend Developer | `architecture`, `api-reference`, `database`, `workflows` |
| Full Stack Developer | All contexts |
| Content Creator | `content-editorial`, `hyperframes-video`, `skills` |
| DevOps | `deployment`, `architecture`, `database`, `workflows` |
| QA/Test Engineer | `testing`, `workflows`, `architecture` |

## Context Maintenance

### Update Triggers
- New feature areas added
- Architecture changes
- New skills/agents added
- Workflow changes
- Deployment target changes
- Design system updates

### Update Process
1. Edit relevant `.context.md` file
2. Update this index if new context added
3. Commit with `docs:` prefix
4. Notify team via PR

### Version Tracking
Contexts are versioned with the codebase. Check git history for changes.

## Quick Access

### VS Code
- `Ctrl+P` → type context filename
- `#` in chat → select context
- Drag context file to chat

### Command Line
```bash
# View context
cat .github/contexts/project-overview.context.md

# Search across contexts
grep -r "keyword" .github/contexts/

# List all contexts
ls .github/contexts/
```

## Related Files

### Instructions
- `.github/instructions/reme-article-writing.instructions.md`

### Agents
- `.github/agents/reme.agent.md`

### Workflows
- `.github/workflows/quality.yml`

### Documentation
- `PRODUCT.md`
- `DESIGN.md`
- `docs/ResearchWithMe_Template.md`
- `docs/deployment.md`
- `docs/supabase-cms.md`

---

**Last Updated**: 2026-11-08
**Maintained By**: ResearchWithMe Team