# Accessibility Baseline — Stage 0

## Current (measured)

- Target today: **WCAG 2.1 A/AA** (repo docs); spec requires **WCAG 2.2 AA**.
- `docs/audit-2026-10-25.md`: axe-core 0 violations on 14 routes; 0 Impeccable findings source + rendered (1280×800, 390×844, 320×720); CLS 0; named form controls, landmarks, skip link, visible focus; 44px coarse-pointer targets; no horizontal scroll at 320px; reduced-motion honored.
- Current focus ring: 2px solid focus token, 2px offset (matches spec focus token after retokenization).
- Status always paired with text label (dot + word), no color-only meaning in CMS status.

## WCAG 2.2 AA deltas to close (2.2-specific criteria)

| Criterion | Status | Action |
|---|---|---|
| 2.4.11 Focus Not Obscured (AA) | Likely pass (2px ring) — verify sticky header overlap | Add to rendered audit checklist |
| 2.4.13 Focus Appearance (AAA in 2.2; 2.4.7 AA is the bar) | 2px ring w/ offset passes 2.4.7 | Keep; add forced-colors check |
| 2.5.7 Dragging Movements (AA) | n/a unless drag added (graph/editor) | Design graph keyboard-first (spec §) |
| 2.5.8 Target Size Minimum 24px (AA) | 44px on coarse; desktop pointers may be < 24px | Enforce ≥24px on all pointer targets |
| 3.2.6 Consistent Help (A) | Footer links exist | Audit help placement consistency |
| 3.3.7 Redundant Entry (A) | Forms re-ask data? | Audit multi-step flows |
| 3.3.8 Accessible Authentication (AA) | Email+password and Google OAuth | Passwordless/magic-link or no cognitive test — OAuth path satisfies; document |
| Forced colors mode | Untested | Add `forced-color-adjust` pass + test (spec §31) |
| 200% zoom / 320px reflow | Reflow verified at 320; 200% zoom unverified | Add zoom test to e2e phase |
| Screen readers | No automated SR smoke tests | Add NVDA/VoiceOver/TalkBack smoke list for critical flows (phase: testing) |
| Graphs/charts | Radar chart lacks table alternative + keyboard access | Refactor `AuthorImpactRadarChart` with list/table alternative (spec §32) |

## Known gaps vs spec §4

- No axe-core in the automated test suite (manual audit only).
- No visual regression, no e2e, no localization/RTL tests (no i18n exists yet).
- `prefers-reduced-motion` contract now matches spec §9 (0.01ms collapse).
- Toast/live-region patterns: `PageState` uses live regions; verify announcements on route change.
