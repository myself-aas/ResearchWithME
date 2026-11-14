# Repository intake for frontend remediation

Date: 2026-11-14. Inspection/planning only; no environment provisioning or substantive reproduction commands executed in this intake.

## Skills and paths

- `npx skills use "https://github.com/lllllllama/rigorpilot-skills" --skill "repo-intake-and-plan"`: exit 0; complete captured output read from `/tmp/rwm-intake-skill.txt`. Support root `/tmp/skills-use-pQdmCR/repo-intake-and-plan`.
- Read `references/repo-scan-rules.md` relative to that root. Inspected both helper scripts and ran their scan/extraction operations against this checkout only. No downloads of project assets or environment installation.
- `npx skills use "https://github.com/obra/superpowers" --skill "writing-plans"`: exit 0; complete captured output read from `/tmp/rwm-writing-plans-skill.txt`. No support path printed by the command; materialized SKILL.md located at `/tmp/skills-use-0gh5kL/writing-plans/SKILL.md`. It contains no mandatory relative supporting-file reference.
- The intake skill is scoped to research-reproduction assistance; this is a frontend application, not a training repository. README-first discovery, documented commands, ambiguity/risk handling apply; ML reproduction classifications do not become new project requirements.

## README-first repository map

- `README.md`, `PRODUCT.md`, `DESIGN.md`: product/runtime instructions, route inventory and design intent; some historical statements conflict with current code.
- `package.json` + `package-lock.json`: canonical npm dependency/command sources. Node >=20.9; CI uses Node 22 and npm ci.
- `app/`: active Next App Router, server routes, reader, auth, studio, generated brand images.
- `components/`: shared presentation, primitives, motion, reader/tools, CMS, conditional reference workspace/graph.
- `lib/`: CMS schemas/adapters, image pipeline, persisted preferences, identity mapping, token/motion utilities.
- `tokens/src`, `tokens/scripts`, `tokens/generated`: design data, build/validation, six generated outputs.
- `cloudflare-pages/src`: second SSR/React Router target and compatibility shims; must not be confused with active Next production configuration.
- `lib/__tests__`, `test/e2e`, `test/playwright.config.ts`: unit/markup/JSDOM checks and local workerd browser tooling. Current Playwright defaults to Pages, not Next.
- `supabase/migrations`: versioned schema changes. Proposed nullable media migration must be reviewed/applied separately; this planning session does not access the database.
- `.github/workflows/quality.yml`: npm install, token, lint/typecheck/test/source, build, budget and structural release checks; browser execution is not currently included.
- Common reproduction files checked: no root README alternative, requirements.txt, environment.yml/yaml, pyproject.toml, setup.py/cfg, or Dockerfile found by this intake. `scripts/` is the only detected helper high-signal directory from the supplied scan list.

## Documented command inventory and conservative categories

| Command | Evidence | Category for this repository | Use / risk |
|---|---|---|---|
| `npm ci` | README Run it; CI | Other: setup | Provision locked existing dependencies only at implementation time |
| `npm run dev` | README Run it | Other: application demo | Local server, not ML inference; bind preview to 0.0.0.0 |
| `npm run build && npm start` | README Run it | Other: build/run | Verify Next locally; no deployment implied |
| `npm run lint`, `npm run typecheck`, `npm test` | README Quality checks | Evaluation analogue: software checks | Not model evaluation; executables absent in prior audit |
| `npm run tokens:build`, `npm run tokens:check` | package scripts; CI | Evaluation/other analogue | Build mutates generated files; validation checks only configured contracts |
| `npm run build:pages`, `npm run test:pages` | package scripts; Playwright config | Evaluation analogue | Local deterministic blank-public-config workerd tests |
| `npm run impeccable:source`, `npm run impeccable:url` | README Quality checks | Evaluation analogue | Source versus rendered detector scopes differ |
| `npm run quality` | README + package scripts | Evaluation analogue | README shorthand is incomplete; actual script also includes worker checks and may regenerate worker types |
| `npm run budgets`, `npm run release:gate` | package scripts; CI | Evaluation analogue | Budget/structural evidence; release gate writes manifest and rebuilds tokens |
| `npm run test:staging` | package/config | Evaluation analogue, restricted | Separate authorized HTTPS staging only; do not use production |
| `npm run deploy`, `npm run upload` | README Deploy | Other: high-risk deployment | Not part of remediation planning or local validation |
| README curl production/discovery scanner examples | README API discovery | Other: external requests | Not executed; unrelated to the frontend remediation plan |

**Inference:** no documented ML inference reproduction command. The assistant API is application functionality, not permission to call a live provider. **Training:** no documented training/fine-tuning candidate. **Evaluation:** software verification commands above, not paper metric reproduction.

The supplied command extractor returned four candidates (two curl examples, typecheck, rendered detector); it misses most npm commands because its recognition rules target Python/shell ML workflows. Inventory above supplements it manually from README/package/config rather than trusting incomplete extraction. Temporary machine extraction: `/tmp/rwm-intake-commands.json`.

## Smallest trustworthy implementation/verification path

1. Review the remediation scope and choose a subsystem; do not start all six plans at once.
2. On the existing branch, provision locked dependencies only when implementation is authorized. Use local fixtures/no external services.
3. For each task: add regression, observe its behavioural failure, implement minimally, rerun targeted tests, inspect diff, commit on the current branch.
4. Start with canonical token-name/consumer checks and named navigation. These are bounded and expose system-wide regressions early.
5. Add browser verification for interactive behaviour before claiming fixes. Test Next and Pages separately; existing Pages tests do not certify Next.
6. Keep migration application, staging/live data, provider calls, deployment, email delivery and catalogue changes out of scope without separate approval.

## Ambiguities and risks

- Previous audits are source-based; priorities must be confirmed against actual route exposure and browser behaviour.
- Several requested taste/image skills were unavailable. Their nonexistent instructions are not requirements; only successful skill output guided its associated audit.
- Current docs conflict on palette, locale, old routes, catalogue counts and test evidence. Proposed spec keeps current runtime direction and defers catalogue expansion.
- Media metadata, 16Mi-pixel processing ceiling, explicit filter submission and account-scoped local recovery are proposed implementation decisions needing owner review, not already shipped policy.
- Local draft storage is same-origin/device storage, not encrypted isolation from a person with access to that browser. Account-keying prevents automatic cross-account restore; it is not a claim of forensic privacy.
- No browser/toolchain install or functional implementation occurred while writing these plans. Prior token checks passed; lint/typecheck/Vitest were blocked by missing executables. No new pass is inferred here.
