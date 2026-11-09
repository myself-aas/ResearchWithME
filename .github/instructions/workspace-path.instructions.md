---
description: Enforce workspace boundary - all operations must stay within the workspace directory
applyTo: '**'
---

# Workspace Boundary Enforcement

## MANDATORY RULE: All Operations Must Stay Within Workspace Directory

**The agent is STRICTLY FORBIDDEN from performing ANY tasks outside the workspace directory (`G:\Github\ResearchWithME`).**

### Prohibited Actions Outside Workspace
- ❌ Installing packages (npm, bun, pip, cargo, etc.)
- ❌ Installing or managing skills/extensions
- ❌ Creating files or directories
- ❌ Running commands that write outside workspace
- ❌ Modifying system/global configurations
- ❌ Accessing files outside workspace via absolute paths
- ❌ Running scripts that operate outside workspace

### Required Behavior
- ✅ All package installations MUST use workspace-local package managers (bun, npm) within `G:\Github\ResearchWithME`
- ✅ All skill installations MUST target workspace `.github/skills/` or `.agents/skills/`
- ✅ All file operations MUST use paths relative to workspace root
- ✅ All commands MUST execute with workspace as working directory
- ✅ All generated artifacts MUST be placed within workspace

### Enforcement
- Any attempt to operate outside workspace MUST be rejected immediately
- If a task requires external operations, the agent MUST ask the user for explicit permission and provide the exact command/operation
- The agent MUST verify the working directory is `G:\Github\ResearchWithME` before executing any command

### Workspace Root
**Absolute Path:** `G:\Github\ResearchWithME`
**Relative Reference:** `.` (when commands run from workspace root)

This rule applies to ALL tools: powershell, task, bash, edit, create, installPythonPackage, installNotebookPackages, and any other tool that can modify filesystem or execute commands.