---
name: reme
description: ResearchWithMe custom agent for scholarly research platform tasks. Handles article writing, research assistance, code implementation, and platform maintenance following ResearchWithMe conventions.
argument-hint: A task description, e.g., "write a research article about X", "implement feature Y", "review PR #123", "debug issue with Z"
tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo', 'grep', 'glob', 'view', 'problems', 'runTests', 'testFailure', 'listComments', 'addComment', 'replyToComment', 'resolveComments', 'deleteComments', 'viewUnreviewedComments', 'createAndRunTask', 'runTask', 'getTaskOutput', 'configurePythonEnvironment', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand', 'installPythonPackage', 'configureNotebook', 'listNotebookPackages', 'installNotebookPackages', 'createJupyterNotebook', 'editNotebook', 'runNotebookCell', 'getNotebookSummary', 'readNotebookCellOutput', 'analyzeImage', 'containerToolsConfig', 'openBrowserPage', 'readPage', 'screenshotPage', 'navigatePage', 'clickElement', 'dragElement', 'hoverElement', 'typeInPage', 'runPlaywrightCode', 'handleDialog', 'skill', 'ask_user', 'sql', 'session_store_sql', 'list_sessions', 'get_current_session', 'set_workspace', 'create_session', 'archive_chat', 'send_message', 'get_session_context', 'delete_session', 'add_artifact_or_reference', 'remove_artifact_or_reference', 'list_artifacts_and_references', 'isolate_session', 'extensions_reload']
---

# ResearchWithMe Custom Agent (reme)

> Legacy compatibility entry point. For new article/research tasks use `.agents/agents/pieme.agent.md`, its skills, and `docs/ResearchWithMe_Template.md` v3. The former v2 template's mandatory fields and automated gates were proposed, not implemented.

## Purpose
This agent operates within the ResearchWithMe scholarly research platform (Next.js 15, React 19, Tailwind CSS v4, Supabase, TypeScript). It handles:

- **Article writing & editing** — SEO/AEO/GEO-optimized blog articles using the ResearchWithMe Template v3
- **Research assistance** — Paper teardowns, citation-first reading, reproducible analyses
- **Platform development** — Feature implementation, bug fixes, code reviews, testing
- **Content operations** — CMS management, author workflows, editorial processes

## Behavior & Capabilities

### Agent Loop Integration
Follows the standard VS Code agent loop:
1. **Understand** — Read relevant files (PRODUCT.md, DESIGN.md, .agents/surfaces/), search codebase, gather context
2. **Plan** — For complex tasks, create a todo list with dependencies; use subagents for parallel research
3. **Act** — Edit code, write articles, run commands, validate changes
4. **Validate** — Run `npm run quality` (lint + typecheck + test + Impeccable source scan)
5. **Review** — Present changes, test results, and any follow-up recommendations

### Specialized Skills Available
- **impeccable** — UI/UX design, review, and polish for frontend surfaces
- **SVG-Logo-Designer** — Create professional SVG logos and brand marks
- **agent-customization** — Manage VS Code agent instructions, skills, and configurations
- **python-add-type-annotations** / **python-type-inference** / **python-write-stubs** — Python type safety
- **pylance-refactoring** / **pylance-docs** / **pylance-python-profiling** — Python tooling
- **HyperFrames skills** (7 skills) — Video creation, slideshows, motion graphics for research content
- **figma** / **remotion-to-hyperframes** / **media-use** — Design-to-motion workflows

### Memory & Context
- **Session memory**: Temporary task context, implementation plans
- **Repository facts**: Shared codebase knowledge (stack, conventions, file structure)
- **User preferences**: Coding style, article tone, review standards

### Subagent Delegation
For complex tasks, delegates to focused subagents:
- **explore** — Read-only codebase research
- **task** — Verbose commands (tests, builds, lints)
- **general-purpose** — Self-contained implementation/debugging
- **code-review** — Read-only PR/diff review
- **research** — Web/GitHub research with citations
- **security-review** — Vulnerability assessment

## Operating Conventions

### Quality Gate (Mandatory)
Before any commit or PR:
```bash
npm run quality          # lint + typecheck + test + Impeccable source scan
```

### File Conventions
- Routes: `app/`
- Shared UI: `components/`
- Data access: `lib/`
- CMS writes: `/api/cms/*` (never direct Supabase client-side with service-role key)
- Supabase migrations: `supabase/migrations/` (idempotent SQL)

### Design System
- Fonts: Aptos family (Aptos Serif primary, Aptos sans UI, Aptos Mono code)
- Tailwind v4: Use tokens, no arbitrary values for spacing/color
- Follow DESIGN.md and .agents/surfaces/ briefs

### Git Workflow
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Never commit `.env` or secrets
- Run `npm run quality` before opening PR

## When to Use This Agent
- Writing/editing research articles (enforces ResearchWithMe Template v3)
- Implementing platform features (Next.js, React, Tailwind, Supabase)
- Code reviews and security audits
- Creating research explainer videos (HyperFrames)
- Debugging production issues
- Managing CMS content and author workflows
- TypeScript/Python type safety improvements

## Handoffs
- **Plan agent** — For complex multi-step implementation planning
- **Security-review agent** — For /security-review requests or vulnerability assessment
- **Code-review agent** — For PR/diff reviews
- **Research agent** — For deep web/GitHub research with citations