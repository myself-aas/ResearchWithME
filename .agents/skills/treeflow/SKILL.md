---
name: treeflow
description: Use when the user asks for treeflow mode, wants a branch-driven implementation flow, or asks to implement a change through PR creation, CI monitoring, and review-thread resolution on ResearchWithME. Merging is never automatic in this repository.
---

# treeflow (ResearchWithME)

Implement the change on its own branch, open a PR, monitor CI and reviews, and
address feedback until the PR is ready to merge. Merging stays with the author:
there is no `auto` mode here — the repository's MCP rules (§17) reserve
merging, deploying, and pushing beyond the working branch for the author's
explicit request.

## Flow

1. `git fetch origin main`.
2. Create the branch from the current base:
   `git checkout -b <branch-name>`.
   If the working environment has already pinned a branch for this session
   (Arena and similar runners do), work on that branch instead of creating
   one — the session tracks exactly that branch name.
3. Install what the change needs with npm (`npm install` for new
   dependencies; this repo is npm-only, there is no workspace).
4. Implement the requested change.
5. Validate with the repository's gates, in order:
   ```bash
   npm run quality        # tokens + lint + typecheck + test
   npm run build
   npm run check:site
   ```
   Narrower checks are fine while iterating; all three pass before the PR.
6. Stage only the intended files with `git add <file>`, then commit
   following the Conventional Commits rule in `CLAUDE.md`
   (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
7. Push with `git push -u origin <branch-name>` — the working branch only.
8. Open the PR non-interactively:
   `gh pr create --title "<title>" --body "<body>"`.
   The body carries: what changed and why, the gates run with their numbers,
   and, for a bug, the failing-before/passing-after evidence
   ([test-quality](../test-quality/SKILL.md)).
9. Monitor with:
   ```bash
   gh pr checks <n>
   gh pr view <n> --json reviews
   gh api graphql -f query='query { repository(owner:"myself-aas",name:"ResearchWithME") { pullRequest(number:<n>) { reviewThreads(first:100) { nodes { id isResolved isOutdated comments(first:50) { nodes { databaseId body author { login } } } } } } } }'
   ```
10. Commit and push follow-up fixes to the same branch; never force-push over
    review context without saying so in the thread.
11. When the merge gate is clear (CI green, threads resolved, contract
    checks pass), stop and report the PR as ready. The author merges
    (`gh pr merge <n> --squash` is the repository's usual shape) — an agent
    merges only when the author asked for that merge in this conversation.

## Screenshots

For UI changes, embed before/after evidence in the PR when the environment can
produce it — the `gh-attach` path (`gh extension install sudosubin/gh-attach`,
then `gh attach <file>`) needs a GitHub browser session, which a headless
runner usually lacks; report the SKIP honestly instead of pasting a dead URL.

## Cleanup

After the author merges, sync and delete the branch:

```bash
git checkout main && git pull origin main
git branch -d <branch-name>
```

A branch with uncommitted changes is inspected, not force-deleted.
