---
name: variants
description: Compare UI design options side by side inside the running site before committing to one. Requires the optional @assistant-ui/variants dev dependency; read before a design-system iteration when the author asks for options rather than a single take.
---

# variants (design-option comparison)

The assistant-ui repository compares competing UI options in the running app
with `@assistant-ui/variants`: wrap each candidate in a `<Variants>` block,
browse `?variants=<group>` to see every option at once, and let the author
choose with `/variants choose`. On this site the package is **not installed**;
the flow below is how to run the same discipline with what the repository has.

## The flow without the package

1. **One candidate per commit on the same branch.** Build candidate A, run
   `npm run build && npm run check:site`, record the budget numbers, commit
   (`feat(design): candidate A — …`). Repeat for candidate B.
2. **Present, do not merge.** Report the options with their §9 budget deltas
   (JS/CSS KB, any CLS-affecting layout change) and a short note on what each
   candidate optimises for. The author picks; the picked candidate becomes the
   tip of the branch (or its own PR), the rest are reverted.
3. **Tokens first.** A palette or spacing candidate is usually a
   `tokens/src/*.json` change, not a component rewrite — the token build
   (`npm run tokens:build`) plus `tokens:check` is the fastest loop.
4. **If the author asks for the real thing**, install the optional dev-only
   package (`npm install -D @assistant-ui/variants`), wrap the candidates in
   `<Variants>`, and — this is the hard rule inherited from upstream — **ship
   nothing with a `@assistant-ui/variants` import or `@variants-note` comment
   left in it**. `npm run quality` must fail on such a leftover, not tolerate
   it.

## What never varies

Accessibility (§12), the semantic-token layer, and the article path's budget
are not candidate dimensions. Variants differ in appearance and structure, not
in whether they honor the contract.
