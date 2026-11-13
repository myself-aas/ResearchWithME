# Token Inventory — Stage 0

## Current state (after `c522005`)

Single CSS source: `app/globals.css` (`@theme inline` + base layers). The πeme v3.1 front-matter values are implemented there:

- **Primitives:** πeme neutral ramp overrides Tailwind `stone` 50–950; indigo/emerald/cyan/amber/red/violet use Tailwind defaults, which match the spec at the defined steps.
- **Semantic light/dark:** canvas/surface(+subtle/raised/inverse), text-primary/secondary/tertiary/inverse, border-subtle/strong, focus, selection — dark map applied under `.dark` (`color-scheme: dark`), plus `@custom-variant dark`.
- **Action:** primary `#4F46E5`, hover `#4338CA`, pressed `#312E81`, on-primary, destructive `#DC2626`, link, visited.
- **Domain palettes:** knowledge / trust / provenance / workflow / collaboration / citation + graph node/edge tokens, all exposed as `--color-*`.
- **Component aliases:** `paper`, `ink`, `ink-muted`, `line`, `brand`, `brand-hover`, `brand-pressed`, `verified` — all `var()` references to semantic tokens (no primitive literals in stable utilities).
- **Radius:** 0.25/0.375/0.5/0.75/1/1.5rem + full. **Shadows:** raised/floating/dialog. **Breakpoints:** sm 36rem; md–2xl default. **Motion:** ease standard/enter/exit/emphasize; durations as `--pieme-duration-*`; reveal = 200ms standard. **Focus:** 2px/2px. **Layout:** `--pieme-max-reading/workspace/graph`.
- **Emails:** `palette` object in `emails/_layout.tsx` mirrors the semantic tokens (migrated in `6932467`).

## Raw / duplicated values still present

- `emails/support-reply.tsx` has two inline hexes (now πeme values, but still literals — should reference shared constants).
- `lib/avatar-fallback.ts` domain gradient themes (slate/emerald/teal/fuchsia…) are per-domain avatar art, not UI tokens — intentional, documented inline.
- `app/opengraph-image.tsx` inline styles use πeme hexes (image route can't read CSS vars — acceptable, guarded by Impeccable schema).
- Legacy `--color-stone-*` override means the *name* "stone" is now an alias for the πeme neutral ramp; a future rename to `neutral-*` is a migration item (R-07).

## Gaps vs spec §35 (token pipeline)

- No single machine-readable source of truth; no generated CSS/SCSS/TS/JSON/Tailwind-preset/Remotion/Hyperframes outputs; no CI checks for broken refs, cycles, missing dark tokens, contrast, or primitive leakage in component tokens.
- **Phase 1 (this stage) closes this:** `tokens/src/*.json` source → `tokens/scripts/build.mjs` → `tokens/dist/{tokens.css,tokens.scss,tokens.ts,tokens.json}` + `validate.mjs` + `check-contrast.mjs`, wired into `npm run quality`.

## Contrast verification

All semantic light/dark text-on-surface pairs ≥ 4.5:1 (weakest: light text-tertiary `#737571` on white = 4.65:1); focus `#4F46E5` on canvas = 5.87:1; dark focus `#A5B4FC` on `#0B100F` = 9.62:1. Re-checked automatically by `tokens:check` after phase 1.
