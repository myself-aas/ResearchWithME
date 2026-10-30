# πeme — hero film (SPEC)

Director's brief to myself. Every adjective is a number. Build from this; check against it; change it when a review changes the film.

## GOAL

A researcher watching the homepage hero understands, in one pass and with sound off, that every πeme review names the person who wrote it, cites the artifact it examined, and carries citation metadata they can reuse — then clicks through to read one.

## OUTPUT

HyperFrames, 1920 × 1080, 30 fps, five scenes, one narration, burned-in captions, 22.0 s (660 frames).

## TIME

660 frames. The narration is the clock: every scene slot is measured from the audio (`scripts/measure-narration.py --write` → `assets/timing.json`), and each cut lands on a sentence end or a clause boundary, not on a round number.

| # | Scene       | File                         | Host slot (s) | Local length | Narration in the slot                                                                                      |
| - | ----------- | ---------------------------- | ------------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| 1 | masthead    | `compositions/masthead.html` | 0.00 – 4.95   | 4.95 s       | "Every review here shows its working." (0.900 – 4.308)                                                      |
| 2 | record      | `compositions/record.html`   | 4.45 – 7.90   | 3.45 s       | "Each one names the reviewer's credential," (4.628 – ~7.48)                                                 |
| 3 | verify      | `compositions/verify.html`   | 7.55 – 13.05  | 5.50 s       | "links the artifact it examined, and carries citation metadata you can reuse." (~7.96 – 12.45)              |
| 4 | cite        | `compositions/cite.html`     | 12.70 – 17.20 | 4.50 s       | "Read it. Check it. Cite it." (12.772 – 16.300)                                                             |
| 5 | end card    | `compositions/endcard.html`  | 16.70 – 22.00 | 5.30 s       | "Research With Me. Free to read, free to publish." (16.620 – 21.228)                                        |

Seams overlap by 0.35 – 0.50 s so each transition has both frames to work with. **Four transition kinds, each with a cause:** blur swap (1→2, the headline blurs out while the record rises), colour flood (2→3, paper to white under a card that does not move), directional cut (3→4, the card leaves left as the first verb lands), page wipe (4→5, a sheet of the film's own paper crosses the frame). No music bed; see `REVIEW.md`.

## LOOK

Read from the repo's `DESIGN.md` (symlinked here as `design.md`); hex values quoted exactly.

- **Ground** `#fafaf9` (stone-50) for scenes 1, 2, 5; `#ffffff` for scenes 3 and 4, reached by a 0.4 s colour flood. Flat fills — no gradients, no grain, no vignette, no shadow.
- **Ink** `#1c1917` (stone-900) for reading text; `#57534e` (stone-600) for labels, the masthead line and the URL; `#e7e5e4` (stone-200) for hairlines and the card border; `#f5f5f4` (stone-100) for the citation well.
- **One accent, two jobs:** `#78350f` (amber-900) for structural rules, the marker rules and the hand-drawn marks; `#047857` (emerald-700) only for verification ticks, the verified licence and the closing licence line.
- **Type.** Display and reading: Newsreader 700 (the `Aptos Serif, Newsreader (self-hosted fallback), Georgia, serif` stack; the OFL file ships in `assets/fonts/`). Interface: Inter (`Aptos, Inter (self-hosted fallback)`), variable file in `assets/fonts/`. Data, DOI strings and citations: JetBrains Mono (bundled substitute for Aptos Mono; named in `REVIEW.md`).
  - Hero headline 104 px / 1.08 / -0.012em. Card title 46 px. Row labels 28 px Inter 500, row values 28 px mono. Verbs 72 px. Wordmark 56 px in the masthead, 200 px on the end card, both at -0.04em.
  - Nothing below 28 px (the type floor at 1080), captions 48 px.
  - No italic accent words, no "01 / 02" chapter numbers, no monospace caps eyebrows, no pill chips.
- **Medium: a printed journal page on warm paper.** Structure is drawn, not decorated: four 1 px hairline columns, the masthead's 4 px double rule, a 3 px card radius, amber rules under what is being said. Every object is a real part of the product — the wordmark, the hero headline, a review record from `data/articles.json`, a verification tick, the copyable citation block, the licence.

## VARIABLES

Declared on `<html>` in `index.html`; scenes bind them with `data-var-text` and `var(--id)`, so one edit retitles the film and `render --variables '{…}'` renders a variant without touching a file.

`brand`, `siteLine`, `tagline`, `url`, `licence`, `recordTitle`, `recordAuthor`, `recordCredential`, `recordArtifact` (strings); `accent`, `verify`, `ink`, `ground` (colors). The scene-1 headline is per-word HTML spans instead, because each word animates on its own.

## MOTION

- **Enter** `expo.out` 0.45 s; words 0.09 s apart, `blur(6px)` → 0, no translate; the wordmark's letters 0.06 s apart.
- **Exit** `power3.in` 0.22 – 0.4 s (≈45 % of its entrance).
- **Camera / colour / mask** `power2.inOut` 0.4 – 0.9 s.
- **Marker rules** `expo.out` 0.32 s, scaleX from the left. **Scribble** `power2.out` 0.3 s, dashoffset 500 → 0. **Hand-drawn circle** `power2.inOut` 0.55 s, dashoffset 1200 → 0, drawn from ten o'clock. **Ticks** `back.out(1.4)` 0.3 s, dashoffset 90 → 0.
- **Audio-reactive:** the narration's stressed words (*credential*, *artifact*, *reuse*, *Read*, *Check*, *Cite*, *Free*, *publish*) drive a 1.045 → 1 settle on the marks, the verbs and the closing licence line, and the word-by-word inking in the captions. Baked from `assets/timing.json`; timeline time only, no audio analysis at runtime.
- One move per beat; secondary moves 60 % as far and 0.12 s later; everything else holds still. Nothing drifts after it lands.

## SHOTS

1. **0.00 – 4.95 — Masthead.** Frame 0 is already printed: paper, four hairline columns, the double rule, `πeme`. That frame is the thumbnail. The headline "Research you can read, check, and reuse." arrives word by word from 0.95, the tagline at 2.1. Hero move: the headline's arrival. Hands off by blurring the words out from 4.28 while the record's page crossfades in.
2. **4.45 – 7.90 — The record.** The record card rises 130 px into the frame (0.55 s, expo.out); its title is already on it, the divider prints, the four rows fill 0.075 s apart. On "reviewer's" a scribble underlines the reviewer; on "*credential*" a hand-drawn circle closes around the ORCID. Hero move: the card's rise. Hands off with an unchanged card as the ground floods white.
3. **7.55 – 13.05 — The check.** The card does not move, only the ground floods. One 1.05 push from 1.15 to 2.05. On "*artifact*" the first emerald tick stamps at 8.0 s; on "*reuse*" the second at 11.60 s and the licence value turns emerald. Hero move: the first stamp. Hands off as the card leaves left at 12.27.
4. **12.70 – 17.20 — Cite it.** "Read it.", "Check it.", "Cite it." land on their spoken words, each with its amber rule; the citation block prints its rule and cascades APA then BibTeX; the `Copy BibTeX` control presses in at 15.1; `CC BY 4.0` settles at 15.75. Hero move: the three-verb ladder. Hands off as a sheet of paper wipes the frame.
5. **16.70 – 22.00 — End card.** The wipe reveals the double rule printing, then `πeme` at 200 px landing letter by letter, `researchwith.me` wiping in, `CC BY 4.0 · Diamond open access` settling. Dead still after 18.3 s; the last caption closes at 21.64.

## BANNED

Dark or navy void as ground; glow, bloom, neon, lens flare, floating particles; purple or blue gradients, mesh gradients, glass cards; "01 / 02" chapter labels; small monospace caps eyebrows; pill-shaped chips; the logo docked in a corner; three cards in a row; KPI grids; a title over a dimmed screenshot; everything fading and sliding up at once; titles that drift after they land; camera moves over static text; invented product UI; an empty frame anywhere in the film (the thumbnail and every seam included).

## QA

Frames checked at 0.10, 1.20, 3.20, 5.10, 7.60, 9.50, 12.80, 15.40, 19.00, 21.90 s, plus all eight seams at ±0.2 s and the 360 px phone sheet. What each must show:

- **0.10 s** — printed page: paper, hairlines, double rule, full wordmark. Not empty.
- **3.20 s** — full headline and tagline, caption "shows its working." inside the 80 % title-safe box.
- **4.90 s** — the card rising with its title already on it; the headline gone.
- **7.60 s** — the card complete, scribble under the reviewer, circle around the ORCID, no collision between them.
- **9.50 s** — white ground, first tick stamped on the artifact row, nothing cropped by the push.
- **12.80 s** — the card leaving left; "Read it." landing on the cut.
- **15.40 s** — three verbs, both citation rows, `Copy BibTeX` pressed in, readable at 360 px.
- **17.00 s** — the wipe half-cleared, the wordmark already arriving behind it: no bare paper.
- **21.90 s** — end card complete, still, nothing clipped; captions closed.
