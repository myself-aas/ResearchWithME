## Summary

<!-- What changed and why. One or two sentences. -->

## Content checklist

- [ ] Every new or edited file in `content/posts/` passes `npm test` (frontmatter + MDX compilation).
- [ ] `description` is 20–280 characters and reads as a complete sentence.
- [ ] A `cover` is paired with `coverAlt`; every `<Figure>` and `<Video>` has a caption or label.
- [ ] `draft: true` is set for anything not ready to be public.
- [ ] Tags are lowercase and reuse an existing tag where one fits.

## Code checklist

- [ ] `npm run quality` passes (tokens, lint, typecheck, tests).
- [ ] `npm run build` passes.
- [ ] Post pages stay static (`generateStaticParams`, `dynamicParams = false`); no runtime database,
      auth, or write path was introduced.
- [ ] Colour and spacing use semantic tokens (`bg-canvas`, `text-ink`, `border-line`), not raw palette
      families.
- [ ] Interactive controls have accessible names, visible focus, and keyboard support; no status is
      conveyed by colour alone.
- [ ] Any user-facing copy is true: counts and dates come from the content, never invented.

## Test plan

<!-- What you ran, and what you checked by hand (routes, 320px reflow, dark mode, reduced motion). -->
