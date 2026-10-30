#!/usr/bin/env python3
"""Write compositions/captions.html from the measured transcript.

The captions are burned in, so they are also the film's muted read. One caption
host holds every group (`data-track-kind="captions"`), each group is a clip that
opens 0.1 s before its first word and closes exactly when the next opens, and each
word turns from stone-400 to ink on its own time, with the narration's stressed
words pulsing the way the emerald marks do.

    python3 scripts/measure-narration.py --write
    python3 scripts/build-captions.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TIMING = ROOT / "assets" / "timing.json"
OUT = ROOT / "compositions" / "captions.html"

FILM_END = 22.0
LAST_GROUP_END = 21.64
FADE = 0.14

HEAD = """<template>
  <style>
    @font-face {
      font-family: "Inter";
      src: url("assets/fonts/inter-latin-variable.woff2") format("woff2-variations");
      font-weight: 100 900;
      font-style: normal;
      font-display: block;
    }

    #root {
      position: absolute;
      inset: 0;
      background: transparent;
      overflow: visible;
      font-family: "Inter", system-ui, sans-serif;
    }

    .cap {
      position: absolute;
      left: 0;
      width: 100%;
      bottom: 88px;
      text-align: center;
      overflow: visible;
    }

    .cap-inner {
      display: inline-block;
      padding: 8px 18px 10px;
    }

    .w {
      display: inline-block;
      font-size: 48px;
      font-weight: 500;
      line-height: 1.3;
      letter-spacing: 0.002em;
      color: #57534e;
      white-space: pre;
    }
  </style>

  <div id="root" data-composition-id="captions" data-width="1920" data-height="1080">
"""

TAIL = """  </div>

  <script>
    const tl = gsap.timeline({ paused: true });
"""


def main() -> None:
    report = json.loads(TIMING.read_text())
    words = report["words"]
    beats = sorted({round(b, 3) for group in report["groups"] for b in group["beats"]})

    cursor = 0
    body = []
    script = []
    for index, group in enumerate(report["groups"]):
        tokens = group["text"].split()
        matched = words[cursor : cursor + len(tokens)]
        if " ".join(w["word"] for w in matched) != group["text"]:
            raise SystemExit(f"caption group {group['id']} does not match the transcript")
        cursor += len(tokens)

        start = round(group["start"], 3)
        end = LAST_GROUP_END if index == len(report["groups"]) - 1 else round(group["end"], 3)
        duration = round(end - start, 3)

        spans = []
        for word in matched:
            emphasis = " emphasis" if round(word["start"], 3) in beats else ""
            spans.append(
                f'<span class="w{emphasis}" id="{group["id"]}-w{matched.index(word)}">{word["word"]}</span>'
            )

        body.append(
            f'    <div class="cap clip" id="{group["id"]}" data-start="{start}" '
            f'data-duration="{duration}" data-track-index="0">\n'
            f'      <span class="cap-inner" id="{group["id"]}-inner">{" ".join(spans)}</span>\n'
            f"    </div>\n"
        )

        # The group fades in on its first word, the words ink in as they are said.
        script.append(
            f'    tl.fromTo("#{group["id"]}-inner", {{ opacity: 0 }}, '
            f'{{ opacity: 1, duration: 0.12, ease: "power2.out" }}, {start});\n'
        )
        for word in matched:
            at = round(word["start"], 3)
            selector = f'#{group["id"]}-w{matched.index(word)}'
            script.append(
                f'    tl.set("{selector}", {{ color: "#1c1917" }}, {at});\n'
            )
            if round(word["start"], 3) in beats:
                script.append(
                    f'    tl.fromTo("{selector}", {{ scale: 1 }}, '
                    f'{{ scale: 1.06, duration: 0.15, ease: "sine.inOut" }}, {at});\n'
                    f'    tl.fromTo("{selector}", {{ scale: 1.06 }}, '
                    f'{{ scale: 1, duration: 0.15, ease: "sine.inOut" }}, {round(at + 0.15, 3)});\n'
                )
        # The group's own clip window closes at `end`, so the fade on the inner
        # element is the whole exit: never write visibility on a .clip.
        script.append(
            f'    tl.to("#{group["id"]}-inner", {{ opacity: 0, duration: {FADE}, ease: "power2.in" }}, '
            f"{round(end - FADE - 0.01, 3)});\n"
        )

    script.append(
        f'\n    window.__timelines["captions"] = tl;\n    tl.seek(0);\n  </script>\n</template>\n'
    )
    OUT.write_text(HEAD + "".join(body) + TAIL + "".join(script))
    print("wrote", OUT.relative_to(ROOT), len(report["groups"]), "groups")


if __name__ == "__main__":
    main()
