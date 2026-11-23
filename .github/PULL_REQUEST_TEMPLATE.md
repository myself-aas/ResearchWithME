## Summary

<!-- What changed and why. One or two sentences. -->

## Review checklist

- [ ] **No unit-mismatched anchoring** — a percent or count anchored against a different unit (e.g. "just 40% of jobs") is banned; anchors must name the same unit they measure. Regex cannot catch this, so the author and reviewer both check it.
- [ ] **CTA copy names the action, never the emotion** — no confirmshame, no manufactured urgency, no "we miss you". See `lib/engagement/copy.ts` for the reviewed strings and `lib/__tests__/forbidden-copy.test.ts` for the enforced ban.
- [ ] **Design tokens only** — no raw palette classes; `npm run tokens:check` and `lib/__tests__/design-token-usage.test.ts` pass. Deliberate exceptions are listed in DESIGN.md.
- [ ] **Sign-in chrome only for signed-in users** — engagement chrome renders nothing pre-hydration or signed-out.

## Test plan

<!-- What you ran. npm test? A route smoke? Screenshots for visual changes (not committed). -->
