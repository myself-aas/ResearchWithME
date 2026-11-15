# Frontend refactor execution plan

Scope: continue the user-approved vibrant creative refactor without changing routes, content, permissions, or integrations; preserve Next and Cloudflare Pages parity. The user's checklist in the current conversation is the governing brief. Existing uncommitted work predates this plan and must be preserved.

## Task 1: Editor conflict recovery selection
- Exercise both versions when their field values are identical. Selecting either must show exactly the chosen version, and resolution must still require a selection for every field and a rationale.
- Add an interaction regression test, verify it fails for the defect, fix it, and rerun it along with the existing annotation tests and full suite.
- Do not commit the accumulated work without an explicit request; this worktree contains prior uncommitted changes.

## Task 2: Remaining surfaces and branding
- Audit the remaining dashboard, public, article, specialized scholarly, graph, media, table, state and theme surfaces; prioritize real user-facing defects and cover changes with tests. Check both runtime consumers.

## Task 3: Interaction, accessibility, and device verification
- Exercise the listed user flows and modal/mobile-dock interactions, including error and permission states. Record environment limitations rather than substituting build checks for real-device testing.

## Task 4: Motion, selective 3D and performance
- Audit lazy loading and reduced-motion behavior; assess the value and cost of selective 3D. Record measurements and any unavailable field/device data honestly.

## Task 5: Regression and release evidence
- Verify both builds, full tests, browser/accessibility checks, LinkedIn workflow status, and dependency audit; document gaps. Final review must cover all accumulated work, not only new files.

## Verification record

See [refactor-verification.md](refactor-verification.md) for current evidence, failed gates, and work that remains open.
