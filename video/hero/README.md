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

## Shipping the render

The homepage plays `../../public/videos/hero.mp4` and shows `../../public/images/hero-film-poster.jpg` until it is pressed. `lib/videos.ts` only advertises files that existed at build time, so the manifest is the switch that turns the hero film on.

```bash
npx hyperframes render -o ../../public/videos/hero.mp4 -q standard -w 2   # 22 s, ~1.8 MB
ffmpeg -y -ss 6.9 -i ../../public/videos/hero.mp4 -frames:v 1 \
  -vf scale=1280:-2 -q:v 4 ../../public/images/hero-film-poster.jpg      # poster = end of the record scene
npm --prefix ../.. run videos:manifest                                   # rewrites lib/video-manifest.json
```

Re-run `videos:manifest` after any re-render. If the MP4 is absent the hero silently drops the whole figure, which is why the poster is committed next to it.

## Environment notes

- **GSAP is vendored.** `index.html` loads `assets/vendor/gsap.min.js` (3.15.0). The compiler runs offline and a CDN `<script>` fails the render at ~90 % with `sub_timeline_script_failure`; do not put the `jsdelivr` tag back.
- `check`, `snapshot` and `render` need a Chrome/Chromium and `ffprobe` on `PATH`. In a bare sandbox: `HYPERFRAMES_BROWSER_PATH=/path/to/chromium`, plus `LD_LIBRARY_PATH` for the bundled libraries. Without `ffprobe` the audio checks report `audio_source_unreadable`; with it they pass.
- `π` (U+03C0) is not in the Latin Newsreader or Inter files, exactly as on the site: the glyph comes from the system serif, so the wordmark's `π` can differ between machines. Anywhere the film must be pixel-identical (a printed frame, a still), set the wordmark in a face that carries Greek.
- `hyperframes preview` writes a `data-hf-id` attribute onto every element it touches, so the Studio can address them. That rewrites the composition files (166 lines here). Run `git checkout -- .` after a Studio session if you did not change anything there, or commit the ids deliberately.
- The preview server binds `127.0.0.1` only and has no `--host` flag, so it cannot be proxied as a remote preview; open Studio on the machine that holds the project.
