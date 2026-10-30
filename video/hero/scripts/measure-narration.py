#!/usr/bin/env python3
"""Measure the narration and write the film's clock.

The voiceover is the clock (references/sound.md §2), so every scene slot, caption
group and beat in the compositions comes from this table. Re-record a line, run
this again, and paste the new numbers into the scene files.

    python3 scripts/measure-narration.py            # print the table
    python3 scripts/measure-narration.py --write    # also write assets/timing.json

Durations come from the MP3 frame headers (mutagen); word times inside a line are
weighted by characters plus punctuation, so they are an estimate — the line and
group boundaries are exact.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from mutagen.mp3 import MP3

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "assets" / "audio"

# Leading silence before the voice and trailing silence after it, in seconds.
# The TTS clips open and close with a short pad; the clock starts on the voice.
LEAD = 0.18
TAIL = 0.35

# The film's first word, and the gap between lines.
FIRST_LINE_AT = 0.90
GAP = 0.32

LINES = [
    (
        1,
        "Every review here shows its working.",
        [["Every review here", []], ["shows its working.", []]],
    ),
    (
        2,
        "Each one names the reviewer's credential, links the artifact it examined, "
        "and carries citation metadata you can reuse.",
        [
            ["Each one names", []],
            ["the reviewer's credential,", ["credential"]],
            ["links the artifact", ["artifact"]],
            ["it examined, and carries", []],
            ["citation metadata you", []],
            ["can reuse.", ["reuse"]],
        ],
    ),
    (
        3,
        "Read it. Check it. Cite it.",
        [["Read it.", ["Read"]], ["Check it.", ["Check"]], ["Cite it.", ["Cite"]]],
    ),
    (
        4,
        "Research With Me. Free to read, free to publish.",
        [
            ["Research With Me.", []],
            ["Free to read,", ["Free"]],
            ["free to publish.", ["publish"]],
        ],
    ),
]


def weights(words: list[str]) -> list[float]:
    """Characters, plus a pause wherever punctuation closes a clause."""
    out = []
    for word in words:
        weight = len(word.strip(",.;:")) + 1.0
        if word.endswith((",", ";", ":")):
            weight += 1.6
        elif word.endswith("."):
            weight += 2.4
        out.append(weight)
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    lines = []
    at = FIRST_LINE_AT
    for number, text, groups in LINES:
        path = AUDIO / f"narr-{number}.mp3"
        length = MP3(path).info.length
        lines.append(
            {
                "line": number,
                "file": f"assets/audio/{path.name}",
                "text": text,
                "start": round(at, 3),
                "end": round(at + length, 3),
                "duration": round(length, 3),
                "groups": groups,
            }
        )
        at += length + GAP

    film_end = round(lines[-1]["end"] + 0.8, 3)

    word_rows = []
    group_rows = []
    gid = 0
    for line in lines:
        spoken_from = line["start"] + LEAD
        spoken_to = line["end"] - TAIL
        words = line["text"].split()
        span = max(spoken_to - spoken_from, 0.001)
        weights_of = weights(words)
        total = sum(weights_of)
        cursor = spoken_from
        times = []
        for word, weight in zip(words, weights_of):
            length = span * weight / total
            times.append((round(cursor, 3), round(cursor + length, 3)))
            word_rows.append({"word": word, "start": times[-1][0], "end": times[-1][1]})
            cursor += length

        # The groups concatenate to the same words in the same order, so walk them
        # in step rather than matching text (repeated words would take each other's time).
        cursor_word = 0
        for label, emphasis in line["groups"]:
            count = len(label.split())
            matched = words[cursor_word : cursor_word + count]
            if " ".join(matched) != label:
                raise SystemExit(f"group {label!r} does not line up with the line text")
            start = times[cursor_word][0]
            end = times[cursor_word + count - 1][1]
            cursor_word += count
            beats = [
                times[index][0]
                for index, word in enumerate(words)
                if word.strip(",.;:") in emphasis
            ]
            group_rows.append(
                {
                    "id": f"cap-{gid}",
                    "line": line["line"],
                    "text": label,
                    "start": round(max(start - 0.10, 0.0), 3),
                    "voiceEnd": end,
                    "beats": beats,
                }
            )
            gid += 1

    # One group on screen at a time: each closes exactly when the next opens, and
    # the last one closes at the end of the film.
    for index, group in enumerate(group_rows):
        following = group_rows[index + 1] if index + 1 < len(group_rows) else None
        group["end"] = following["start"] if following else film_end

    report = {
        "filmEnd": film_end,
        "lines": lines,
        "words": word_rows,
        "groups": group_rows,
    }

    print(f"{'line':>4} {'start':>7} {'end':>7}  text")
    for line in lines:
        print(f"{line['line']:>4} {line['start']:>7.3f} {line['end']:>7.3f}  {line['text'][:60]}")
    print()
    print(f"{'group':>5} {'start':>7} {'end':>7}  text")
    for group in group_rows:
        print(f"{group['id']:>5} {group['start']:>7.3f} {group['end']:>7.3f}  {group['text']}")
    print()
    print("beats:", ", ".join(f"{b:.2f}" for g in group_rows for b in g["beats"]))
    print("film:", film_end)

    if args.write:
        out = ROOT / "assets" / "timing.json"
        out.write_text(json.dumps(report, indent=2) + "\n")
        print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
