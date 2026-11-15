---
version: 1
slug: "app-settings-page-tsx"
primary_target: "app/settings/page.tsx"
related_targets: ["components/SettingsPage.tsx", "components/ThemeToggle.tsx"]
---

# Settings

Mode: Operate

## Purpose
Let readers choose light, dark, or device-following appearance without requiring an account.

## Direction
Show one clearly labelled appearance control with the selected preference and current effective theme. Preserve the choice locally when storage is available; work in memory otherwise. Keep the supplied Material light and dark icons decorative.

## Constraints
- Accessible radio controls, visible focus, keyboard operation, and semantic landmarks.
- Reflow to 320px; do not hide the choice behind a hover interaction.
- Preserve theme across both frontend builds and respect device changes in system mode.

## Checks
Test explicit choices, reload, operating-system changes, denied storage, and light/dark contrast.
