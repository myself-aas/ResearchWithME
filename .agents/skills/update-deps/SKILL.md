---
name: update-deps
description: Update dependencies for ResearchWithMe (npm dependencies and GitHub Actions). Use when the user asks to bump, upgrade, or update dependencies, refresh package-lock.json, or repin GitHub Actions before a release.
---

# update-deps

Update npm dependencies and GitHub Actions pins, and prove the site still
holds its contract afterwards. This repository is npm-only: there is no
workspace, no taze orchestration, and no Expo — the assistant-ui original's
monorepo mechanics do not apply.

## npm dependencies

1. From a clean working tree, preview the set:
   ```bash
   npm outdated
   ```
2. Update deliberately, not wholesale: majors are one commit each, reviewed
   against their changelogs. Minors/patches can batch:
   ```bash
   npm install @assistant-ui/react@latest      # or any package@range
   npm update <packages>                       # in-range refresh
   ```
3. `package-lock.json` changes are expected and committed with the manifests.
4. Beware the pins that shape the site:
   - `next` 15.x / React 19.x — majors change the rendering contract (§0);
   - `@assistant-ui/react` — moving major over major changes primitive APIs;
     rerun the [assistant-ui-docs](../assistant-ui-docs/SKILL.md) checks;
   - `tailwindcss` v4 — token wiring in `app/globals.css` depends on its
     `@theme` semantics;
   - `@opennextjs/cloudflare` + `wrangler` — these own the deploy path.
5. Validate the full gates, not just the unit tests:
   ```bash
   npm run quality
   npm run build
   npm run check:site
   ```
   `check:site` re-measures the JS/CSS budgets that a dependency bump moves
   silently — a framework patch can add kilobytes that only §9 notices.

## GitHub Actions

Repin actions to their latest major in `.github/workflows/*.yml` with the
`@vN` ref, one action per commit when the major changed, and read the release
notes for runner or permission changes before pushing.

## Commit

`chore: update dependencies` (or `chore: update <package> to <version>` for a
single deliberate bump). A dependency update never ships alone: if a bump
changes rendered output in a way the contract cares about, the fix belongs in
the same commit.
