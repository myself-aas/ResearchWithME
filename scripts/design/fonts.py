#!/usr/bin/env python3
"""Optional fonttools pipeline. See docs/design/MIGRATION.md for setup.

--source-dir must contain the original licensed WOFF2 files. Never subset an
already-subset file to add coverage. --check audits the installed roman fonts.
The type manifest is projected by design:gen into fixtures/fonts.json.
"""
import argparse
import json
from io import BytesIO
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

root = Path(__file__).resolve().parents[2]
config = json.loads((root / 'src/generated/fixtures/fonts.json').read_text())
parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
if not args.check and not args.source_dir:
    parser.error('provide --source-dir with original fonts, or --check')

# Glyph ranges are manifest-owned, including both the arrows and minus sign.
codepoints = {n for lo, hi in config['ranges'] for n in range(lo, hi + 1)}
codepoints.update(map(ord, config['glyphs']))
total = 0
for family, path in config['files'].items():
    target = root / 'public' / path.lstrip('/')
    if not args.check:
        font = TTFont(args.source_dir / target.name, lazy=False, recalcTimestamp=False)
        font.ensureDecompiled()
        axes = {axis.axisTag for axis in font['fvar'].axes}
        pins = {'wght': (config['weightMin'], config['weightMax'])}
        if 'opsz' in axes:
            pins['opsz'] = config['opticalSize']
        font = instantiateVariableFont(font, pins, inplace=False)
        # Reopen after partial instancing so empty gvar entries are materialized
        # before fonttools' subset pass (4.69 lazy-gvar handling).
        buffer = BytesIO()
        font.save(buffer)
        buffer.seek(0)
        font = TTFont(buffer, recalcTimestamp=False)
        options = subset.Options()
        options.flavor = 'woff2'
        options.hinting = False
        options.recalc_timestamp = False
        options.layout_features = ['kern', 'liga', 'clig', 'calt', 'locl']
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=codepoints)
        sub.subset(font)
        font.flavor = 'woff2'
        font.save(target, reorderTables=True)
    font = TTFont(target)
    cmap = font.getBestCmap()
    # A Unicode range is a selection request, not evidence that an upstream
    # font encodes every reserved/control codepoint in that range.
    required = set(range(32, 127))
    # UI symbols use Inter; Newsreader does not encode right-arrow even upstream.
    # The generated serif stack falls back to the bundled Inter for that glyph.
    if family == 'sans':
        required |= set(map(ord, config['glyphs']))
    missing = sorted(n for n in required if n not in cmap)
    if missing:
        raise SystemExit(f'FAIL {family}: missing required glyphs {missing}')
    size = target.stat().st_size
    total += size
    print(f'PASS {family}: {size} bytes; {len(required)} required Latin/UI codepoints covered')
print(f'{"PASS" if total <= config["maxBytes"] else "FAIL"} roman font payload {total} / {config["maxBytes"]} bytes')
if total > config['maxBytes']:
    raise SystemExit(1)
print('Bangla uses system fonts: device glyph coverage is NOT certified by this check.')
