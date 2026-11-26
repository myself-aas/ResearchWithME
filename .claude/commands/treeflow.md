---
description: Branch → PR → CI → review flow via gh, ending with a ready-to-merge report (no auto-merge on this repository)
---

Use the treeflow skill at `.agents/skills/treeflow/SKILL.md` to implement this
change: work on its own branch (or the session's pinned branch), validate with
`npm run quality`, `npm run build`, and `npm run check:site`, open the PR with
`gh pr create`, then monitor checks and review threads until the merge gate is
clear, and report the PR as ready. Do not merge — the author merges.
