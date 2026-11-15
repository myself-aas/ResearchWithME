"""Publication figures as vector files, written with the Python standard library only.

Part of the ResearchWithMe Statistical Table Generator (full edition).

Every figure is saved three times: as a PNG image at the resolution you ask
for (300 dpi unless you say otherwise), and as SVG and PDF, which are vector
formats (lines and text, not pixels, so they stay sharp at any size).

The PNG is drawn by this file itself. Because Python's standard library has no
fonts, the lettering in the PNG uses the Hershey Simplex stroke font, so it
looks slightly different from the Helvetica lettering of the SVG and PDF.

Acknowledgement required by the font's licence: the Hershey Fonts were
originally created by Dr. A. V. Hershey while working at the U. S. National
Bureau of Standards. The format of the font data used here was originally
created by James Hurt, Cognition, Inc., 900 Technology Park Drive, Billerica,
MA 01821.

The style follows common journal practice: black and grey only, a sans-serif
face, axes on the left and bottom, no gridlines, no title inside the figure
(the caption belongs in the manuscript).
"""

import math
import struct
import zlib

WIDTH, HEIGHT = 468.0, 324.0          # points: 6.5 in by 4.5 in
LEFT, RIGHT, TOP, BOTTOM = 62.0, 16.0, 14.0, 50.0
HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556,
             556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278,
             500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469,
             556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500,
             278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584]

# Hershey Simplex, one string for each character from space to tilde. The first two letters give the left and
# right edge; the rest are x, y pairs counted from the letter R, with ' R' meaning pen up.
HERSHEY = [
    'JZ',
    'MWRFRT RRYQZR[SZRY',
    'JZNFNM RVFVM',
    'H]SBLb RYBRb RLOZO RKUYU',
    'H\\PBP_ RTBT_ RYIWGTFPFMGKIKKLMMNOOUQWRXSYUYXWZT[P[MZKX',
    'F^[FI[ RNFPHPJOLMMKMIKIIJGLFNFPGSHVHYG[F RWTUUTWTYV[X[ZZ[X[VYTWT',
    'E_\\O\\N[MZMYNXPVUTXRZP[L[JZIYHWHUISJRQNRMSKSIRGPFNGMIMKNNPQUXWZY[[[\\Z\\Y',
    'MWRHQGRFSGSIRKQL',
    'KYVBTDRGPKOPOTPYR]T`Vb',
    'KYNBPDRGTKUPUTTYR]P`Nb',
    'JZRLRX RMOWU RWOMU',
    'E_RIR[ RIR[R',
    'NVSWRXQWRVSWSYQ[',
    'E_IR[R',
    'NVRVQWRXSWRV',
    'G][BIb',
    'H\\QFNGLJKOKRLWNZQ[S[VZXWYRYOXJVGSFQF',
    'H\\NJPISFS[',
    'H\\LKLJMHNGPFTFVGWHXJXLWNUQK[Y[',
    'H\\MFXFRNUNWOXPYSYUXXVZS[P[MZLYKW',
    'H\\UFKTZT RUFU[',
    'H\\WFMFLOMNPMSMVNXPYSYUXXVZS[P[MZLYKW',
    'H\\XIWGTFRFOGMJLOLTMXOZR[S[VZXXYUYTXQVOSNRNOOMQLT',
    'H\\YFO[ RKFYF',
    'H\\PFMGLILKMMONSOVPXRYTYWXYWZT[P[MZLYKWKTLRNPQOUNWMXKXIWGTFPF',
    'H\\XMWPURRSQSNRLPKMKLLINGQFRFUGWIXMXRWWUZR[P[MZLX',
    'NVROQPRQSPRO RRVQWRXSWRV',
    'NVROQPRQSPRO RSWRXQWRVSWSYQ[',
    'F^ZIJRZ[',
    'E_IO[O RIU[U',
    'F^JIZRJ[',
    'I[LKLJMHNGPFTFVGWHXJXLWNVORQRT RRYQZR[SZRY',
    'E`WNVLTKQKOLNMMPMSNUPVSVUUVS RQKOMNPNSOUPV RWKVSVUXVZV\\T]Q]O\\L[JYHWGTFQFNGLHJJILHOHRIUJWLYNZQ[T[WZYYZX RXKWSWUXV',
    'I[RFJ[ RRFZ[ RMTWT',
    'G\\KFK[ RKFTFWGXHYJYLXNWOTP RKPTPWQXRYTYWXYWZT[K[',
    'H]ZKYIWGUFQFOGMILKKNKSLVMXOZQ[U[WZYXZV',
    'G\\KFK[ RKFRFUGWIXKYNYSXVWXUZR[K[',
    'H[LFL[ RLFYF RLPTP RL[Y[',
    'HZLFL[ RLFYF RLPTP',
    'H]ZKYIWGUFQFOGMILKKNKSLVMXOZQ[U[WZYXZVZS RUSZS',
    'G]KFK[ RYFY[ RKPYP',
    'NVRFR[',
    'JZVFVVUYTZR[P[NZMYLVLT',
    'G\\KFK[ RYFKT RPOY[',
    'HYLFL[ RL[X[',
    'F^JFJ[ RJFR[ RZFR[ RZFZ[',
    'G]KFK[ RKFY[ RYFY[',
    'G]PFNGLIKKJNJSKVLXNZP[T[VZXXYVZSZNYKXIVGTFPF',
    'G\\KFK[ RKFTFWGXHYJYMXOWPTQKQ',
    'G]PFNGLIKKJNJSKVLXNZP[T[VZXXYVZSZNYKXIVGTFPF RSWY]',
    'G\\KFK[ RKFTFWGXHYJYLXNWOTPKP RRPY[',
    'H\\YIWGTFPFMGKIKKLMMNOOUQWRXSYUYXWZT[P[MZKX',
    'JZRFR[ RKFYF',
    'G]KFKULXNZQ[S[VZXXYUYF',
    'I[JFR[ RZFR[',
    'F^HFM[ RRFM[ RRFW[ R\\FW[',
    'H\\KFY[ RYFK[',
    'I[JFRPR[ RZFRP',
    'H\\YFK[ RKFYF RK[Y[',
    'KYOBOb RPBPb ROBVB RObVb',
    'KYKFY^',
    'KYTBTb RUBUb RNBUB RNbUb',
    'JZRDJR RRDZR',
    'I[Ib[b',
    'NVSKQMQORPSORNQO',
    'I\\XMX[ RXPVNTMQMONMPLSLUMXOZQ[T[VZXX',
    'H[LFL[ RLPNNPMSMUNWPXSXUWXUZS[P[NZLX',
    'I[XPVNTMQMONMPLSLUMXOZQ[T[VZXX',
    'I\\XFX[ RXPVNTMQMONMPLSLUMXOZQ[T[VZXX',
    'I[LSXSXQWOVNTMQMONMPLSLUMXOZQ[T[VZXX',
    'MYWFUFSGRJR[ ROMVM',
    'I\\XMX]W`VaTbQbOa RXPVNTMQMONMPLSLUMXOZQ[T[VZXX',
    'I\\MFM[ RMQPNRMUMWNXQX[',
    'NVQFRGSFREQF RRMR[',
    'MWRFSGTFSERF RSMS^RaPbNb',
    'IZMFM[ RWMMW RQSX[',
    'NVRFR[',
    'CaGMG[ RGQJNLMOMQNRQR[ RRQUNWMZM\\N]Q][',
    'I\\MMM[ RMQPNRMUMWNXQX[',
    'I\\QMONMPLSLUMXOZQ[T[VZXXYUYSXPVNTMQM',
    'H[LMLb RLPNNPMSMUNWPXSXUWXUZS[P[NZLX',
    'I\\XMXb RXPVNTMQMONMPLSLUMXOZQ[T[VZXX',
    'KXOMO[ ROSPPRNTMWM',
    'J[XPWNTMQMNNMPNRPSUTWUXWXXWZT[Q[NZMX',
    'MYRFRWSZU[W[ ROMVM',
    'I\\MMMWNZP[S[UZXW RXMX[',
    'JZLMR[ RXMR[',
    'G]JMN[ RRMN[ RRMV[ RZMV[',
    'J[MMX[ RXMM[',
    'JZLMR[ RXMR[P_NaLbKb',
    'J[XMM[ RMMXM RM[X[',
    'KYTBRCQDPFPHQJRKSMSOQQ RRCQEQGRISJTLTNSPORSTTVTXSZR[Q]Q_Ra RQSSUSWRYQZP\\P^Q`RaTb',
    'NVRBRb',
    'KYPBRCSDTFTHSJRKQMQOSQ RRCSESGRIQJPLPNQPURQTPVPXQZR[S]S_Ra RSSQUQWRYSZT\\T^S`RaPb',
    'F^IUISJPLONOPPTSVTXTZS[Q RISJQLPNPPQTTVUXUZT[Q[O',
]


def text_width(text, size):
    return sum(HELVETICA[ord(c) - 32] if 32 <= ord(c) < 127 else 556 for c in text) * size / 1000.0


class Canvas:
    """Records drawing steps, then writes them as SVG or PDF. Coordinates are points from the top left."""

    def __init__(self, width=WIDTH, height=HEIGHT):
        self.width, self.height, self.items = width, height, []

    def line(self, x1, y1, x2, y2, width=0.8, grey=0.0, dash=None):
        self.items.append(('line', x1, y1, x2, y2, width, grey, dash))

    def rect(self, x, y, w, h, fill=None, stroke=0.0, width=0.8):
        self.items.append(('rect', x, y, w, h, fill, stroke, width))

    def circle(self, x, y, r, fill=None, stroke=0.0, width=0.7):
        self.items.append(('circle', x, y, r, fill, stroke, width))

    def polyline(self, points, width=1.0, grey=0.0, dash=None):
        if len(points) > 1:
            self.items.append(('poly', list(points), width, grey, dash))

    def text(self, x, y, text, size=9.0, anchor='start', rotate=False, grey=0.0):
        self.items.append(('text', x, y, str(text), size, anchor, rotate, grey))

    # ---- SVG

    def svg(self):
        def g(v):
            c = int(round(255 * v))
            return f'#{c:02x}{c:02x}{c:02x}'

        def esc(s):
            return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

        out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.width:g}pt" height="{self.height:g}pt" '
               f'viewBox="0 0 {self.width:g} {self.height:g}" font-family="Helvetica, Arial, sans-serif">',
               f'<rect width="{self.width:g}" height="{self.height:g}" fill="#ffffff"/>']
        for item in self.items:
            kind = item[0]
            if kind == 'line':
                _, x1, y1, x2, y2, w, grey, dash = item
                d = f' stroke-dasharray="{dash}"' if dash else ''
                out.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{g(grey)}" '
                           f'stroke-width="{w:g}"{d}/>')
            elif kind == 'rect':
                _, x, y, w, h, fill, stroke, sw = item
                s = f'stroke="{g(stroke)}" stroke-width="{sw:g}"' if stroke is not None else 'stroke="none"'
                out.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" '
                           f'fill="{g(fill) if fill is not None else "none"}" {s}/>')
            elif kind == 'circle':
                _, x, y, r, fill, stroke, sw = item
                s = f'stroke="{g(stroke)}" stroke-width="{sw:g}"' if stroke is not None else 'stroke="none"'
                out.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:g}" fill="{g(fill) if fill is not None else "none"}" {s}/>')
            elif kind == 'poly':
                _, points, w, grey, dash = item
                d = f' stroke-dasharray="{dash}"' if dash else ''
                pts = ' '.join(f'{x:.2f},{y:.2f}' for x, y in points)
                out.append(f'<polyline points="{pts}" fill="none" stroke="{g(grey)}" stroke-width="{w:g}"{d}/>')
            else:
                _, x, y, text, size, anchor, rotate, grey = item
                t = f' transform="rotate(-90 {x:.2f} {y:.2f})"' if rotate else ''
                out.append(f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size:g}" text-anchor="{anchor}" '
                           f'fill="{g(grey)}"{t}>{esc(text)}</text>')
        out.append('</svg>')
        return '\n'.join(out) + '\n'

    # ---- PDF

    def pdf(self):
        H = self.height
        ops = []

        def dash_op(dash):
            return f'[{dash.replace(",", " ")}] 0 d' if dash else '[] 0 d'

        for item in self.items:
            kind = item[0]
            if kind == 'line':
                _, x1, y1, x2, y2, w, grey, dash = item
                ops.append(f'{grey:g} G {w:g} w {dash_op(dash)} {x1:.2f} {H - y1:.2f} m {x2:.2f} {H - y2:.2f} l S')
            elif kind == 'rect':
                _, x, y, w, h, fill, stroke, sw = item
                paint = 'B' if fill is not None and stroke is not None else 'f' if fill is not None else 'S'
                pre = (f'{fill:g} g ' if fill is not None else '') + (f'{stroke:g} G {sw:g} w [] 0 d ' if stroke is not None else '')
                ops.append(f'{pre}{x:.2f} {H - y - h:.2f} {w:.2f} {h:.2f} re {paint}')
            elif kind == 'circle':
                _, x, y, r, fill, stroke, sw = item
                k, cy = 0.5523 * r, H - y
                path = (f'{x + r:.2f} {cy:.2f} m {x + r:.2f} {cy + k:.2f} {x + k:.2f} {cy + r:.2f} {x:.2f} {cy + r:.2f} c '
                        f'{x - k:.2f} {cy + r:.2f} {x - r:.2f} {cy + k:.2f} {x - r:.2f} {cy:.2f} c '
                        f'{x - r:.2f} {cy - k:.2f} {x - k:.2f} {cy - r:.2f} {x:.2f} {cy - r:.2f} c '
                        f'{x + k:.2f} {cy - r:.2f} {x + r:.2f} {cy - k:.2f} {x + r:.2f} {cy:.2f} c')
                paint = 'b' if fill is not None and stroke is not None else 'f' if fill is not None else 's'
                pre = (f'{fill:g} g ' if fill is not None else '') + (f'{stroke:g} G {sw:g} w [] 0 d ' if stroke is not None else '')
                ops.append(f'{pre}{path} {paint}')
            elif kind == 'poly':
                _, points, w, grey, dash = item
                path = ' '.join(f'{x:.2f} {H - y:.2f} {"m" if i == 0 else "l"}' for i, (x, y) in enumerate(points))
                ops.append(f'{grey:g} G {w:g} w {dash_op(dash)} 1 j {path} S')
            else:
                _, x, y, text, size, anchor, rotate, grey = item
                shift = {'start': 0.0, 'middle': text_width(text, size) / 2, 'end': text_width(text, size)}[anchor]
                safe = ''.join(c if 32 <= ord(c) < 127 else '?' for c in text)
                safe = safe.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
                if rotate:
                    matrix = f'0 1 -1 0 {x:.2f} {H - y - shift:.2f} Tm'
                else:
                    matrix = f'1 0 0 1 {x - shift:.2f} {H - y:.2f} Tm'
                ops.append(f'BT {grey:g} g /F1 {size:g} Tf {matrix} ({safe}) Tj ET')
        stream = zlib.compress('\n'.join(ops).encode('latin-1'))
        objects = [
            b'<< /Type /Catalog /Pages 2 0 R >>',
            b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            (f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.width:g} {self.height:g}] /Contents 4 0 R '
             '/Resources << /Font << /F1 5 0 R >> >> >>').encode(),
            b'<< /Length ' + str(len(stream)).encode() + b' /Filter /FlateDecode >>\nstream\n' + stream + b'\nendstream',
            b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        ]
        out, offsets = bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'), []
        for number, body in enumerate(objects, 1):
            offsets.append(len(out))
            out += f'{number} 0 obj\n'.encode() + body + b'\nendobj\n'
        xref = len(out)
        out += f'xref\n0 {len(objects) + 1}\n0000000000 65535 f \n'.encode()
        for offset in offsets:
            out += f'{offset:010d} 00000 n \n'.encode()
        out += f'trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
        return bytes(out)

    # ---- PNG

    def png(self, dpi=300):
        """An 8-bit greyscale PNG at the given resolution, anti-aliased, with the resolution recorded in the file."""
        k = dpi / 72.0
        raster = Raster(int(round(self.width * k)), int(round(self.height * k)))
        for item in self.items:
            kind = item[0]
            if kind == 'line':
                _, x1, y1, x2, y2, w, grey, dash = item
                raster.path([(x1 * k, y1 * k), (x2 * k, y2 * k)], w * k, grey, dash, k)
            elif kind == 'rect':
                _, x, y, w, h, fill, stroke, sw = item
                if fill is not None:
                    raster.fill_rect(x * k, y * k, (x + w) * k, (y + h) * k, fill)
                if stroke is not None:
                    corners = [(x * k, y * k), ((x + w) * k, y * k), ((x + w) * k, (y + h) * k), (x * k, (y + h) * k), (x * k, y * k)]
                    raster.path(corners, sw * k, stroke, None, k)
            elif kind == 'circle':
                _, x, y, r, fill, stroke, sw = item
                raster.circle(x * k, y * k, r * k, fill, stroke, sw * k)
            elif kind == 'poly':
                _, points, w, grey, dash = item
                raster.path([(x * k, y * k) for x, y in points], w * k, grey, dash, k)
            else:
                _, x, y, text, size, anchor, rotate, grey = item
                shift = {'start': 0.0, 'middle': stroke_width(text, size) / 2, 'end': stroke_width(text, size)}[anchor]
                for stroke in stroke_text(text, size):
                    if rotate:
                        points = [((x + v) * k, (y - (u - shift)) * k) for u, v in stroke]
                    else:
                        points = [((x + u - shift) * k, (y + v) * k) for u, v in stroke]
                    raster.path(points, max(size * 0.085 * k, 1.0), grey, None, k)
        return raster.encode(dpi)

    def save(self, base, dpi=300):
        with open(base + '.svg', 'w', encoding='utf-8') as handle:
            handle.write(self.svg())
        with open(base + '.pdf', 'wb') as handle:
            handle.write(self.pdf())
        with open(base + '.png', 'wb') as handle:
            handle.write(self.png(dpi))
        return [base + '.png', base + '.svg', base + '.pdf']


# ---------------------------------------------------------------- PNG drawing

STROKE_SQUEEZE = 0.84     # Hershey Simplex is wider than Helvetica; narrowed so that labels fit the same space


def _stroke_scale(size):
    return size * 0.718 / 21.0      # the capitals are 21 units tall; Helvetica's are 0.718 of the type size


def _glyph(char):
    return HERSHEY[ord(char) - 32] if 32 <= ord(char) < 127 else HERSHEY[ord('?') - 32]


def stroke_width(text, size):
    scale = _stroke_scale(size) * STROKE_SQUEEZE
    return sum(ord(_glyph(c)[1]) - ord(_glyph(c)[0]) for c in text) * scale


def stroke_text(text, size):
    """The pen strokes of a line of text, in points, from the start of the baseline (x to the right, y downwards)."""
    scale = _stroke_scale(size)
    out, pen = [], 0.0
    for char in text:
        glyph = _glyph(char)
        left = ord(glyph[0]) - 82
        stroke = []
        for i in range(2, len(glyph) - 1, 2):
            a, b = glyph[i], glyph[i + 1]
            if a == ' ' and b == 'R':
                if stroke:
                    out.append(stroke)
                stroke = []
            else:
                stroke.append((pen + (ord(a) - 82 - left) * scale * STROKE_SQUEEZE, (ord(b) - 82 - 9) * scale))
        if stroke:
            out.append(stroke)
        pen += (ord(glyph[1]) - ord(glyph[0])) * scale * STROKE_SQUEEZE
    return out


class Raster:
    """A greyscale page of pixels with anti-aliased drawing. 255 is white."""

    def __init__(self, width, height):
        self.w, self.h = width, height
        self.px = bytearray(b'\xff') * (width * height)

    def blend(self, x, y, cover, shade):
        if cover > 0 and 0 <= x < self.w and 0 <= y < self.h:
            i = y * self.w + x
            if cover >= 1:
                self.px[i] = shade
            else:
                self.px[i] = int(self.px[i] + (shade - self.px[i]) * cover + 0.5)

    def fill_rect(self, x1, y1, x2, y2, grey):
        xa, xb = max(0, int(round(min(x1, x2)))), min(self.w, int(round(max(x1, x2))))
        ya, yb = max(0, int(round(min(y1, y2)))), min(self.h, int(round(max(y1, y2))))
        if xb > xa:
            row = bytes([int(round(255 * grey))]) * (xb - xa)
            for y in range(ya, yb):
                self.px[y * self.w + xa:y * self.w + xb] = row

    def circle(self, cx, cy, r, fill, stroke, width):
        reach = r + width / 2 + 1
        for y in range(int(cy - reach), int(cy + reach) + 2):
            for x in range(int(cx - reach), int(cx + reach) + 2):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if fill is not None:
                    self.blend(x, y, min(1.0, r + 0.5 - d), int(round(255 * fill)))
                if stroke is not None:
                    self.blend(x, y, min(1.0, width / 2 + 0.5 - abs(d - r)), int(round(255 * stroke)))

    def path(self, points, width, grey, dash, k):
        shade = int(round(255 * grey))
        if not dash:
            for a, b in zip(points, points[1:]):
                self.segment(a, b, width, shade)
            return
        pattern = [float(v) * k for v in dash.split(',')]
        index, left, on = 0, pattern[0], True
        for (x1, y1), (x2, y2) in zip(points, points[1:]):
            length = math.hypot(x2 - x1, y2 - y1)
            done = 0.0
            while length - done > 1e-9:
                step = min(left, length - done)
                if on:
                    t1, t2 = done / length, (done + step) / length
                    self.segment((x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1), (x1 + (x2 - x1) * t2, y1 + (y2 - y1) * t2), width, shade, False)
                done += step
                left -= step
                if left <= 1e-9:
                    index = (index + 1) % len(pattern)
                    left, on = pattern[index], not on

    def segment(self, a, b, width, shade, round_ends=True):
        """A straight stroke. Each pixel is shaded by how much of it the stroke covers."""
        (x1, y1), (x2, y2) = a, b
        half = max(width / 2.0, 0.5)
        weight = min(1.0, width)            # strokes thinner than a pixel are drawn lighter, not narrower
        dx, dy = x2 - x1, y2 - y1
        length2 = dx * dx + dy * dy
        blend = self.blend

        def shade_pixel(x, y):
            qx, qy = x + 0.5 - x1, y + 0.5 - y1
            t = (qx * dx + qy * dy) / length2 if length2 else 0.0
            if not round_ends and (t < 0 or t > 1):
                return
            t = max(0.0, min(1.0, t))
            d = math.hypot(qx - t * dx, qy - t * dy)
            blend(x, y, min(1.0, half + 0.5 - d) * weight, shade)

        reach = half + 1.5
        if abs(dy) >= abs(dx):
            if dy < 0:
                x1, y1, x2, y2, dx, dy = x2, y2, x1, y1, -dx, -dy
            span = reach * (math.sqrt(length2) / dy if dy else 1.0)
            for y in range(max(0, int(y1 - reach)), min(self.h, int(y2 + reach) + 1)):
                t = max(0.0, min(1.0, (y + 0.5 - y1) / dy)) if dy else 0.0
                centre = x1 + t * dx
                for x in range(int(centre - span), int(centre + span) + 1):
                    shade_pixel(x, y)
        else:
            if dx < 0:
                x1, y1, x2, y2, dx, dy = x2, y2, x1, y1, -dx, -dy
            span = reach * math.sqrt(length2) / dx
            for x in range(max(0, int(x1 - reach)), min(self.w, int(x2 + reach) + 1)):
                t = max(0.0, min(1.0, (x + 0.5 - x1) / dx))
                centre = y1 + t * dy
                for y in range(int(centre - span), int(centre + span) + 1):
                    shade_pixel(x, y)

    def encode(self, dpi):
        def chunk(kind, data):
            return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

        rows = bytearray()
        for y in range(self.h):
            rows += b'\x00' + self.px[y * self.w:(y + 1) * self.w]
        per_metre = int(round(dpi / 0.0254))
        return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', self.w, self.h, 8, 0, 0, 0, 0))
                + chunk(b'pHYs', struct.pack('>IIB', per_metre, per_metre, 1))
                + chunk(b'IDAT', zlib.compress(bytes(rows), 6)) + chunk(b'IEND', b''))


# ---------------------------------------------------------------- axes

def nice_ticks(low, high, target=6, whole=False):
    if high <= low:
        high = low + (abs(low) if low else 1.0)
    raw = (high - low) / max(target - 1, 1)
    power = 10 ** math.floor(math.log10(raw))
    step = min((1, 2, 5, 10) if whole else (1, 2, 2.5, 5, 10), key=lambda m: abs(m * power - raw)) * power
    if whole:
        step = max(1.0, float(round(step)))
    start, end = math.floor(low / step) * step, math.ceil(high / step) * step
    count = int(round((end - start) / step))
    return [round(start + i * step, 10) for i in range(count + 1)]


def tick_label(value, ticks):
    step = abs(ticks[1] - ticks[0]) if len(ticks) > 1 else 1.0
    fraction = f'{step:.6f}'.rstrip('0').split('.')[1]
    places = len(fraction)
    text = f'{value:.{places}f}'
    return '0' if float(text) == 0 else text


class Axes:
    """A plot area with a numeric y axis and either a numeric or a category x axis."""

    def __init__(self, canvas, ylab, xlab, yrange, xrange=None, categories=None, yzero=False, legend=0.0):
        self.c = canvas
        self.x0, self.x1 = LEFT, canvas.width - RIGHT - legend
        self.y0, self.y1 = canvas.height - BOTTOM, TOP
        low, high = yrange
        if yzero:
            low = min(low, 0.0)
        pad = (high - low) * 0.06 or 0.5
        self.yt = nice_ticks(low, high, whole=True) if yzero and low == 0 else nice_ticks(low - pad, high + pad)
        self.ylo, self.yhi = self.yt[0], self.yt[-1]
        self.categories = categories
        if categories is None:
            lo, hi = xrange
            pad = (hi - lo) * 0.04 or 0.5
            self.xt = nice_ticks(lo - pad, hi + pad)
            self.xlo, self.xhi = self.xt[0], self.xt[-1]
        c = canvas
        c.line(self.x0, self.y0, self.x1, self.y0)
        c.line(self.x0, self.y0, self.x0, self.y1)
        for t in self.yt:
            y = self.py(t)
            c.line(self.x0 - 4, y, self.x0, y)
            c.text(self.x0 - 7, y + 3, tick_label(t, self.yt), 9, 'end')
        if categories is None:
            for t in self.xt:
                x = self.px(t)
                c.line(x, self.y0, x, self.y0 + 4)
                c.text(x, self.y0 + 15, tick_label(t, self.xt), 9, 'middle')
        else:
            width = (self.x1 - self.x0) / len(categories)
            size = 9.0
            while size > 6 and any(text_width(str(k), size) > width - 4 for k in categories):
                size -= 0.5
            for i, name in enumerate(categories):
                x = self.cx(i)
                c.line(x, self.y0, x, self.y0 + 4)
                label = str(name)
                while text_width(label, size) > width - 2 and len(label) > 4:
                    label = label[:-2]
                c.text(x, self.y0 + 15, label if label == str(name) else label + '.', size, 'middle')
        c.text(self.x0 + (self.x1 - self.x0) / 2, c.height - 12, xlab, 10, 'middle')
        c.text(16, self.y1 + (self.y0 - self.y1) / 2, ylab, 10, 'middle', rotate=True)

    def py(self, v):
        return self.y0 - (v - self.ylo) / (self.yhi - self.ylo) * (self.y0 - self.y1)

    def px(self, v):
        return self.x0 + (v - self.xlo) / (self.xhi - self.xlo) * (self.x1 - self.x0)

    def cx(self, i):
        return self.x0 + (i + 0.5) * (self.x1 - self.x0) / len(self.categories)

    def band(self):
        return (self.x1 - self.x0) / len(self.categories)


def _quantile(sorted_values, q):
    """Linear interpolation between order statistics (the default of R, NumPy, and Excel's QUARTILE.INC)."""
    pos = (len(sorted_values) - 1) * q
    lo, hi = int(math.floor(pos)), int(math.ceil(pos))
    return sorted_values[lo] + (sorted_values[hi] - sorted_values[lo]) * (pos - lo)


def _mean(xs):
    return sum(xs) / len(xs)


def _sd(xs):
    m = _mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1)) if len(xs) > 1 else 0.0


# ---------------------------------------------------------------- charts

def histogram(values, label, normal_curve=True):
    """Histogram with Sturges' number of bins and, optionally, the normal curve with the sample's mean and SD."""
    n = len(values)
    lo, hi = min(values), max(values)
    bins = max(4, int(math.ceil(math.log2(n) + 1)))
    edges = nice_ticks(lo, hi, bins + 1)
    counts = [0] * (len(edges) - 1)
    for v in values:
        i = min(int((v - edges[0]) / (edges[1] - edges[0])), len(counts) - 1)
        counts[i] += 1
    c = Canvas()
    ax = Axes(c, 'Frequency', label, (0, max(counts)), (edges[0], edges[-1]), yzero=True)
    for i, count in enumerate(counts):
        if count:
            x, x2 = ax.px(edges[i]), ax.px(edges[i + 1])
            c.rect(x, ax.py(count), x2 - x, ax.y0 - ax.py(count), fill=0.78, stroke=0.0, width=0.6)
    m, s = _mean(values), _sd(values)
    if normal_curve and s > 0:
        step = edges[1] - edges[0]
        points = []
        for k in range(121):
            v = ax.xlo + (ax.xhi - ax.xlo) * k / 120
            dens = n * step * math.exp(-0.5 * ((v - m) / s) ** 2) / (s * math.sqrt(2 * math.pi))
            if dens <= ax.yhi:
                points.append((ax.px(v), ax.py(dens)))
        c.polyline(points, 1.0)
    return c


def boxplot(groups, ylab, xlab):
    """Tukey box plots: box from first to third quartile, line at the median, whiskers to the most extreme value
    within 1.5 times the interquartile range, and every value beyond that drawn as a point."""
    names = list(groups)
    everything = [v for g in groups.values() for v in g]
    c = Canvas()
    ax = Axes(c, ylab, xlab, (min(everything), max(everything)), categories=names)
    half = min(ax.band() * 0.28, 34)
    for i, name in enumerate(names):
        s = sorted(groups[name])
        q1, med, q3 = _quantile(s, 0.25), _quantile(s, 0.5), _quantile(s, 0.75)
        iqr = q3 - q1
        inside = [v for v in s if q1 - 1.5 * iqr <= v <= q3 + 1.5 * iqr]
        low, high = min(inside), max(inside)
        x = ax.cx(i)
        c.line(x, ax.py(high), x, ax.py(q3))
        c.line(x, ax.py(q1), x, ax.py(low))
        c.line(x - half / 2, ax.py(high), x + half / 2, ax.py(high))
        c.line(x - half / 2, ax.py(low), x + half / 2, ax.py(low))
        c.rect(x - half, ax.py(q3), 2 * half, ax.py(q1) - ax.py(q3), fill=0.86, stroke=0.0)
        c.line(x - half, ax.py(med), x + half, ax.py(med), 1.6)
        for v in s:
            if v < low or v > high:
                c.circle(x, ax.py(v), 2.2, fill=None, stroke=0.0)
    return c


def means_plot(names, means, lows, highs, ylab, xlab, connect=False):
    """Means as points with error bars (pass the limits of the interval you want shown)."""
    c = Canvas()
    ax = Axes(c, ylab, xlab, (min(lows), max(highs)), categories=names)
    if connect:
        c.polyline([(ax.cx(i), ax.py(m)) for i, m in enumerate(means)], 0.9)
    for i, m in enumerate(means):
        x = ax.cx(i)
        c.line(x, ax.py(lows[i]), x, ax.py(highs[i]), 1.0)
        c.line(x - 5, ax.py(lows[i]), x + 5, ax.py(lows[i]), 1.0)
        c.line(x - 5, ax.py(highs[i]), x + 5, ax.py(highs[i]), 1.0)
        c.circle(x, ax.py(m), 3.4, fill=0.0, stroke=0.0)
    return c


def scatter(xs, ys, xlab, ylab, fit=None, reference=None):
    """Scatter plot. fit=(intercept, slope) draws a solid line; reference='zero' or 'identity' draws a dashed one."""
    c = Canvas()
    ax = Axes(c, ylab, xlab, (min(ys), max(ys)), (min(xs), max(xs)))
    if reference == 'zero' and ax.ylo < 0 < ax.yhi:
        c.line(ax.x0, ax.py(0), ax.x1, ax.py(0), 0.7, 0.45, '4,3')
    if reference == 'identity':
        lo, hi = max(ax.xlo, ax.ylo), min(ax.xhi, ax.yhi)
        if hi > lo:
            c.line(ax.px(lo), ax.py(lo), ax.px(hi), ax.py(hi), 0.7, 0.45, '4,3')
    for x, y in zip(xs, ys):
        c.circle(ax.px(x), ax.py(y), 2.3, fill=None, stroke=0.15)
    if fit:
        a, b = fit
        ends = []
        for x in (min(xs), max(xs)):
            ends.append((ax.px(x), ax.py(min(max(a + b * x, ax.ylo), ax.yhi))))
        c.polyline(ends, 1.2)
    return c


def qq_plot(values, normal_quantile, label='Sample quantiles'):
    """Normal Q-Q plot with plotting positions (i - 0.375) / (n + 0.25) and a line through the quartiles."""
    s = sorted(values)
    n = len(s)
    theory = [normal_quantile((i + 1 - 0.375) / (n + 0.25)) for i in range(n)]
    q1, q3 = _quantile(s, 0.25), _quantile(s, 0.75)
    t1, t3 = normal_quantile(0.25), normal_quantile(0.75)
    slope = (q3 - q1) / (t3 - t1)
    c = scatter(theory, s, 'Theoretical normal quantiles', label, fit=(q1 - slope * t1, slope))
    return c


def interaction_plot(levels_x, levels_line, cell_means, ylab, xlab, legend_title):
    """Cell means of a two-factor design: one line for each level of the second factor."""
    values = [m for row in cell_means for m in row if m is not None]
    c = Canvas()
    ax = Axes(c, ylab, xlab, (min(values), max(values)), categories=levels_x, legend=92.0)
    dashes = [None, '6,3', '2,2', '8,3,2,3', '1,3', '10,4']
    fills = [0.0, 1.0, 0.55, 0.0, 1.0, 0.55]
    for j, name in enumerate(levels_line):
        pts = [(ax.cx(i), ax.py(cell_means[i][j])) for i in range(len(levels_x)) if cell_means[i][j] is not None]
        c.polyline(pts, 1.0, 0.0, dashes[j % 6])
        for x, y in pts:
            c.circle(x, y, 3.0, fill=fills[j % 6], stroke=0.0)
        ly = ax.y1 + 10 + 13 * (j + 1)
        lx = ax.x1 + 12
        c.line(lx, ly - 3, lx + 24, ly - 3, 1.0, 0.0, dashes[j % 6])
        c.circle(lx + 12, ly - 3, 3.0, fill=fills[j % 6], stroke=0.0)
        c.text(lx + 30, ly, str(name)[:11], 8.5)
    c.text(ax.x1 + 12, ax.y1 + 10, str(legend_title)[:16], 8.5)
    return c


def grouped_bars(row_names, col_names, counts, ylab, xlab, legend_title):
    """Counts of a two-way table as bars: one cluster for each row category."""
    c = Canvas()
    ax = Axes(c, ylab, xlab, (0, max(max(r) for r in counts)), categories=row_names, yzero=True, legend=92.0)
    cluster = ax.band() * 0.72
    bar = cluster / len(col_names)
    for i in range(len(row_names)):
        for j in range(len(col_names)):
            shade = 0.25 + 0.6 * j / max(len(col_names) - 1, 1)
            x = ax.cx(i) - cluster / 2 + j * bar
            top = ax.py(counts[i][j])
            c.rect(x, top, bar, ax.y0 - top, fill=shade, stroke=0.0, width=0.5)
    lx = ax.x1 + 12
    c.text(lx, ax.y1 + 10, str(legend_title)[:16], 8.5)
    for j, name in enumerate(col_names):
        shade = 0.25 + 0.6 * j / max(len(col_names) - 1, 1)
        ly = ax.y1 + 10 + 13 * (j + 1)
        c.rect(lx, ly - 8, 10, 9, fill=shade, stroke=0.0, width=0.5)
        c.text(lx + 15, ly, str(name)[:14], 8.5)
    return c


def heatmap(names, matrix):
    """Correlation matrix as shaded cells with the coefficient printed in each (darker means stronger)."""
    k = len(names)
    c = Canvas(WIDTH, WIDTH * 0.78)
    left, top = 96.0, 16.0
    size = min((c.width - left - 16) / k, (c.height - top - 60) / k)
    for i in range(k):
        label = str(names[i])[:16]
        c.text(left - 6, top + (i + 0.5) * size + 3, label, 9, 'end')
        c.text(left + (i + 0.5) * size, top + k * size + 14, label if text_width(label, 9) < size else label[:6] + '.', 9, 'middle')
        for j in range(k):
            r = matrix[i][j]
            shade = 1.0 - 0.75 * min(abs(r), 1.0)
            c.rect(left + j * size, top + i * size, size, size, fill=shade, stroke=1.0, width=1.0)
            text = f'{r:.2f}'.replace('0.', '.', 1) if i != j else '1'
            c.text(left + (j + 0.5) * size, top + (i + 0.5) * size + 3, text, 9, 'middle', grey=1.0 if shade < 0.5 else 0.0)
    c.text(left, top + k * size + 34, 'Shading shows the size of the coefficient, not its sign; negative values carry a minus sign.', 7.5, grey=0.3)
    return c
