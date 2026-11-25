---
name: change-review
description: Apply ResearchWithME's existing review standards to a local change or pull request before submission and after substantive revisions. Use to compare the requested behavior with the diff, trace affected SEO/AEO paths, and assess evidence without duplicating repository policy.
---

# change review

## Use the existing standards

Read the applicable sources rather than maintaining another checklist here:

- [`AGENTS.md`](../../../AGENTS.md) owns the site contract: the four-layer
  model (§1), hard rules (§2), budgets (§9), and the definition of done (§14).
- [`DESIGN.md`](../../../DESIGN.md) governs anything visual; design tokens
  live in `tokens/src/*.json` and never as hex literals in CSS.
- [`CLAUDE.md`](../../../CLAUDE.md) carries the short-form agent rules.
- [test-quality](../test-quality/SKILL.md) owns test design and regression
  evidence when the diff adds or changes tests.

## Establish the review boundary

Identify the requested behavior from the user's request or linked issue. For a
PR review, use the PR's declared base and head; for local work, use the
intended target branch's merge-base plus the task's staged, unstaged, and new
files. Keep unrelated workspace changes outside the review.

## Trace the affected behavior

This is a statically generated site, so most regressions are SEO/AEO
regressions rather than runtime ones. Trace the diff through the layer it
touches:

- **Content changes** — does the post still open with a 40–60 word answer, link
  three primary sources and three internal pages, and keep frontmatter inside
  the Zod schema? (`npm test` compiles every post; do not eyeball this.)
- **Page/metadata changes** — canonical, title, description, sitemap decision,
  and reachability from `/`. `npm run check:site` is the cheapest reviewer.
- **Component/CSS changes** — one `h1`, semantic elements for controls, focus
  visible, motion under `prefers-reduced-motion`, and no token drift.
- **Assistant changes** — answers still quote the archive; no new network
  request; the article path's JS is untouched (§9).

Run the gates locally in the order §14 lists them and report the numbers, not
just the exit codes. Keep the result in the current conversation unless
publishing review feedback was requested.
