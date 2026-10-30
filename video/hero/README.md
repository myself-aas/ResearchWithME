# πeme — hero film

The homepage hero as an HTML composition, built with [HyperFrames](https://hyperframes.heygen.com): five scenes, a TTS narration as the clock, burned-in captions, and a design taken from this repository's `DESIGN.md`.

```bash
npx hyperframes check --json                     # lint, runtime, layout, motion, contrast, craft
npx hyperframes snapshot --review                # contact sheets: beats, every cut, phone width
npx hyperframes snapshot --at 3.2,12.8,19       # exact frames
npx hyperframes render                           # MP4 (needs ffmpeg + ffprobe on PATH)
npx hyperframes preview --background             # Studio preview, then `preview --stop`
```

Run them from this folder. The CLI is pinned in `package.json` (`hyperframes@0.8.222`), so a re-render is the same render. `npm run check` and `npm run render` here are the same commands.

## What is where

| Path                     | What it holds                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `index.html`             | The root timeline: the film's variables, the five scene hosts, the four narration clips                     |
| `compositions/*.html`    | One scene per file — `masthead`, `record`, `verify`, `cite`, `endcard`, plus the one `captions` track        |
| `assets/audio/narr-*.mp3`| The narration, one file per line (the clock)                                                                |
| `assets/fonts/`          | Newsreader and Inter, the self-hosted OFL faces this repo already ships in `app/fonts/`                      |
| `assets/timing.json`     | The measured clock: line starts, every word's time, every caption group                                     |
| `scripts/`               | `measure-narration.py` (writes `timing.json`) and `build-captions.py` (writes `compositions/captions.html`)  |
| `SPEC.md`                | The director's brief: look, numbers, shots, banned defaults, QA frames                                      |
| `REVIEW.md`              | What the review pass found, what it fixed, and what is still weak                                           |
| `design.md`              | Symlink to this repository's `DESIGN.md`; the look is read from it                                          |
| `preview/`               | The last review sheets: `beats.jpg` (every scene, start and middle) and `phone-360.jpg`                     |

## Changing it

- **Words and colours** are variables on `<html>` in `index.html` (`brand`, `siteLine`, `tagline`, `url`, `licence`, `recordTitle`, `recordAuthor`, `recordCredential`, `recordArtifact`, `accent`, `verify`, `ink`, `ground`). Scenes bind them with `data-var-text` and `var(--accent)`-style custom properties, so one edit retitles the film. `npx hyperframes render --variables '{"url":"example.org"}'` renders a variant without touching a file.
- **Timing** is narration-first. Re-record a line into `assets/audio/narr-N.mp3`, run `python3 scripts/measure-narration.py --write`, paste the new numbers into the scene files (each scene's local times are commented), then `python3 scripts/build-captions.py`.
- **The headline** in scene 1 is per-word HTML spans, not a variable, because each word is animated separately. Edit the spans and the tween timings together.

## Environment notes

- The sandbox that wrote this has no `ffprobe`, so `check` reports `audio_source_unreadable` for the four narration files and `render` cannot mix the soundtrack. Everything else in `check` passes. Install ffmpeg (`ffprobe` included) and both go away.
- No browser is downloadable here either; set `HYPERFRAMES_BROWSER_PATH` to a Chrome/Chromium you already have before `check`, `snapshot` or `render`.
- `π` (U+03C0) is not in the Latin Newsreader or Inter files, exactly as on the site: the glyph comes from the system serif, so the wordmark's `π` can differ between machines. Anywhere the film must be pixel-identical (a printed frame, a still), set the wordmark in a face that carries Greek.
- `hyperframes preview` writes a `data-hf-id` attribute onto every element it touches, so the Studio can address them. That rewrites the composition files (166 lines here). Run `git checkout -- .` after a Studio session if you did not change anything there, or commit the ids deliberately.
- The preview server binds `127.0.0.1` only and has no `--host` flag, so it cannot be proxied as a remote preview; open Studio on the machine that holds the project.
