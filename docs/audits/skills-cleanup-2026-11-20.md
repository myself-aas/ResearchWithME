# Repository skill cleanup recommendation

Date: 2026-11-20 UTC
Status: **Approved shortlist executed: `svg-logo-designer` removed; other five skills retained**

## Scope and user preferences

- Repository: ResearchWithME, branch `arena/509ad0cc-researchwithme`.
- Agent: user selected “something else”; its transcript format/location is unspecified.
- Retention/removal preferences: use repository relevance and best practices; no skill explicitly marked “never use.”
- Usage window: preceding 30 days, with explicit cutoff **2026-10-21T00:00:00Z**.
- User wants removal only after approving a shortlist.
- Reviewed only the six root-level skills in `.agents/skills/`; no proposal to delete personal/global skills or application functionality.

## Method

1. Executed the requested skills.sh command and read its complete output.
2. Ran the required `k-skill-cleaner` instruction command from the supplied supporting-files directory and read the complete generic-runtime instructions.
3. Ran the required CLI update before using its helper. Output: CLI already latest (`0.11.2`); skill installs refreshed. No repository skill-file changes appeared in Git status.
4. Listed bundled assets and invoked the helper through its prescribed CLI wrapper:

```sh
npx -y @nomadamas/k-skill@0 exec k-skill-cleaner scripts/k_skill_cleaner.py -- \
  --skills-root /home/user/ResearchWithME/.agents/skills \
  --scan-default-logs \
  --since 2026-10-21T00:00:00Z
```

The initial `--days 30` run used a sandbox clock inconsistent with the session date. The final scan uses the explicit cutoff above instead. With no readable logs, there are no observed records to classify inside or outside the requested window.

5. Inspected skill descriptions, tracked-file inventory, `PRODUCT.md`, the skills lockfile, agent declarations, hooks, workflows, and repository-wide references outside skill bodies.

## Evidence and limitations

The helper discovered **6 skills and 0 readable log files**. It emitted `trigger_count: 0` and `action: review` for all six. These are **unavailable usage measurements**, not proof of inactivity. No user-supplied usage JSON was available.

Default sources checked: Claude Code, Codex (including project `.omx` logs), OpenCode, OpenClaw/ClawHub, and Hermes. None contributed readable logs. The unnamed agent may use an unsupported format or keep its logs outside this sandbox. A time-windowed export from that agent would be needed for meaningful counts.

The helper cannot establish that any skill has never been used. Accordingly, there are **no evidence-backed automatic removal candidates**. Repository relevance is a separate qualitative judgment, not a substitute trigger count.

## Ranked review shortlist

| Rank | Skill | Recommendation | Repository evidence and trade-off |
| --- | --- | --- | --- |
| 1 | `svg-logo-designer` | Optional removal, only if approved | Specialized logo/brand-generation guidance, rather than routine publication or application maintenance. Two tracked files, about 24 KiB on disk. Existing brand assets do not depend on these instructions at runtime. Removing it loses specialist guidance for future logo work. At review time it was declared in the agent configuration, so it was not an orphan and could not be called unused based on the scan. |

No skill was explicitly designated “never use,” so this is a **review candidate**, not the helper's stronger `remove` category.

### Exact proposed removal scope

Only after explicit approval of `svg-logo-designer`:

- Remove the directory `.agents/skills/svg-logo-designer/` (its README and SKILL.md).
- Remove the `SVG Logo Designer` entry from `skills-lock.json`.
- Remove `SVG-Logo-Designer` from the skills list, description, and routing-table entry in `.github/agents/reme.agent.md`.
- Re-scan current README, documentation, install instructions, and configuration for dangling references. No `docs/install.md` or `docs/features/` directory was found. Preserve genuinely historical inventory records as historical rather than implying they are current install instructions.
- Do not remove SVG artwork, brand assets, logo components, or any application code.
- Run lint, typecheck, and tests after the approved edit; report actual results and environment limitations rather than claiming a full pass.

## Recommended retention

| Skill | Why retain |
| --- | --- |
| `reme-editorial` | Source-grounded drafts, claim ledgers, citation review, and human-approved publishing are core to the publication. Referenced by editorial templates, workflows, contexts, and draft instructions. |
| `reme-archive` | Read-only discovery/citation of published reviews is a core archive capability. Referenced by agent instructions, documentation, and archive workflow. |
| `impeccable` | Frontend accessibility, responsive reading surfaces, and design-system maintenance remain relevant after storefront removal. Active local hook configuration references its launcher. |
| `supabase` | Database, authentication, storage, and Next.js SSR integrations remain part of the application. General integration guidance is not redundant with Postgres-specific guidance. |
| `supabase-postgres-best-practices` | SQL migrations, RLS, indexing, query behavior, and concurrency need specialized guidance, including safe retirement of legacy commerce access. |

No hosted database, deployment, payment-provider account, or public artifact was changed by this review. Existing commerce-removal changes in the working tree were preserved.

## Approved execution

The user selected **“Remove SVG logo skill only”** in the approval question. Executed exactly that scope:

- Deleted the two files in `.agents/skills/svg-logo-designer/` and removed the directory.
- Removed its lockfile entry and all three active agent declaration/description/routing references.
- Kept all five other skill directories unchanged.
- Kept actual logo assets/components unchanged. No application code was changed by this skill cleanup.
- Remaining mentions are this audit and historical codebase/planning inventories, not active installation or routing instructions.

## Post-removal validation

- Explicit filesystem/configuration assertions **pass**: five expected skills remain, no removed directory/lockfile entry/agent declaration, lockfile parses, retained skills and logo assets have no Git diff.
- `git diff --check` **passes**.
- `npm run lint` **cannot run**: `eslint` is absent from the installed dependencies (exit 127).
- `npm run typecheck` **fails**: missing dependencies (including Zod and Playwright), inferred-type errors, and review-preview `ImportMeta.glob` typing. These were also reported before the approved skill removal.
- `npm run test` **is not fully passing**: 123 files pass and 48 fail; 796 tests pass and 8 fail. Missing dependencies prevent many suites from loading; login tests report an undefined React element. This matches the prior commerce-removal full-suite result, not a new clean bill of health.

No commit, push, deployment, hosted-database mutation, or public posting was performed for this cleanup.

## Clean-install validation follow-up

The subsequent GitHub Actions repair replaced the selective dependency setup with canonical `npm ci`. Full lint, typecheck, all 1,115 Vitest tests, production build, bundle budget, and machine release checks now pass locally. This supersedes the earlier validation failures above; see `docs/audits/github-actions-repair-2026-11-20.md` for scope and remote/browser status.
