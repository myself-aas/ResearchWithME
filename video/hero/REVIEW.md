# REVIEW — πeme hero film (22.0 s)

Written after the review pass (`check` + `snapshot --review`), before any render. The next turn reads this first.

## Creative calls

- **One idea per scene, all of them the product's own.** Masthead → the record → the check → the cite → the end card. Every object on screen exists in this repository: the wordmark (`components/BrandLogo.tsx`), the hero headline and tagline (`components/BlogHero.tsx`), a real review record from `data/articles.json` (Prof. Marcus Vance, `arXiv:2501.12948`, ORCID `0000-0001-9234-8812`), the copyable citation block, `CC BY 4.0`.
- **The film speaks the headline, then proves it.** The narration says "every review here shows its working", then names the three things the record shows. The verbs land on the words: *credential* draws the circle, *artifact* stamps the first tick, *reuse* stamps the second and turns the licence emerald.
- **Craft over effects.** Four transition kinds, each caused by something on screen: blur swap (masthead → record), colour flood (record → verify, paper to white), directional cut on the card's exit (verify → cite), page wipe (cite → end card). One camera move in the whole film (a 1.05 push in the verify scene). No glow, no gradients, no glass, no particles — the banned-by-default list in `SPEC.md` is the checklist.
- **Storylines I did not build:** (a) a reader's-eye walkthrough of one article, scrolling a real page; (b) a residency on the reviewer — a portrait, an ORCID check, a claim being contested; (c) the economics of diamond open access, with the $2.4B APC figure from `the-hidden-tax-on-open-science-commercial-apcs`. (b) and (c) want music and a narrator with more time than a hero loop should take.

## Measured, looked at, not checked

- **Measured:** `check --json` — lint 0 errors / 1 warning, runtime, layout, motion, contrast and craft all clean. 22.0 s at 30 fps, 660 frames, five scene slots, 14 caption groups, 4 narration clips. Narration line starts 0.900 / 4.628 / 12.772 / 16.620 s, all taken from the files themselves, not estimated (`scripts/measure-narration.py`). Word times inside a line are weighted by characters, so they are close but not transcript-exact.
- **Looked at:** every beat frame, all eight seam strips, the 360 px phone sheet, and frames at 4.9 s, 16.85 s and 17.15 s for the two seams I changed last. Fixes that came out of looking: the caption scrim read as a grey bar on the white scenes (removed); the scribble and the hand-drawn circle were colliding with each other (moved into their own rows); the card sat in the top third of an empty frame (raised, rows 62 px, title 46 px); the citation block's rule printed before the block arrived (now they arrive together); the end-card wipe left ~0.4 s of bare paper (sped up, content lands behind it).
- **Checked after the render:** `npx hyperframes render` produced 22.0 s / 660 frames / 1920×1080 at 30 fps in 42 s wall, and `npx hyperframes audio` measured it: voice, first onset 1.195 s, tail 20.854 s, −15.9 LUFS integrated, true peak −1.7 dBFS, zero clipped samples. The silent stretches fall exactly on the scene cuts (12.065–13.04 s, 20.86–22.0 s). Frames pulled from the MP4 at 3.2, 12.8, 15.4 and 19.2 s match the snapshots: fonts, rules, ticks, captions.
- **Still not checked frame by frame:** the motion between the beats. The contact sheets sample instants; the exit of the headline in scene 1 (4.28–4.78 s) and the push in scene 3 (8.7–9.6 s) were judged from their endpoints only. The render is continuous, so anything that stutters there is in the timeline, not the encoder.

## Sound

The voice is the only sound: no music bed, because no licensed source is reachable from this machine and the skill forbids writing a score in code. That is the one deliberate gap in a film over 15 s. When a bed is available, enter it on a strong bar around 8.0 s (the white flood), hold it under the narration at about 0.14, and re-derive the beats with `npx hyperframes beats` instead of the baked constants.

The audio-reactive work therefore runs on the narration's own stressed words — *credential*, *artifact*, *reuse*, *Read*, *Check*, *Cite*, *Free*, *publish* — baked as constants from `assets/timing.json` and driving a 1.045 → 1 settle on the marks, the verbs and the licence line, plus the word-by-word inking in the captions. Deterministic, seekable, and honest: they are word beats, not frequency analysis.

## Weakest shot

The verify scene (7.55–13.05 s). The card is dense at this size, the two ticks sit on the far right where the eye has to travel, and the push is gentle enough to be almost invisible on a phone. With more time I would crop the card to the three rows that matter, bring each verified row forward as it lands (a 40 px nudge, 0.3 s), and put the second tick on the licence line's own baseline rather than the row's right edge.

## Warnings kept on purpose

- `timeline_track_too_dense` — one host holds all 14 caption groups. That is the contract: one `data-track-kind="captions"` host for every caption group, so they read as one track in Studio.
- `content_overlap` is silenced with `data-layout-allow-overlap` where two scenes deliberately share a frame during a crossfade (the masthead and the card carry the same geometry across a seam), and on the end-card content, which crosses the outgoing citation block during the wipe.

## State

Approved as shot and shipped. `check`: lint 0 errors, 1 warning (above); runtime, layout, motion, contrast, craft and audio clean. Rendered once and measured: −15.9 LUFS, no clipping. The MP4 is `public/videos/hero.mp4` (1.8 MB), the poster is `public/images/hero-film-poster.jpg` (frame 6.9 s), and the homepage hero plays it poster-first, on a click.

Regenerate with the four commands under "Shipping the render" in `README.md` after any change.
