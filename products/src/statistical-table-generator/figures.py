"""Publication figures as vector files, written with the Python standard library only.

Part of the ResearchWithMe Statistical Table Generator (full edition).

Every figure is saved twice: as SVG and as PDF. Both are vector formats: they
hold lines and text, not pixels, so they have no resolution and stay sharp at
any size a journal prints them. Word, PowerPoint, LaTeX, and most submission
systems accept one or the other. No PNG or TIFF is written; if a journal
insists on one, open the PDF and export it at the resolution asked for.

The style follows common journal practice: black and grey only, a sans-serif
face, axes on the left and bottom, no gridlines, no title inside the figure
(the caption belongs in the manuscript).
"""

import math
import zlib

WIDTH, HEIGHT = 468.0, 324.0          # points: 6.5 in by 4.5 in
LEFT, RIGHT, TOP, BOTTOM = 62.0, 16.0, 14.0, 50.0
HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556,
             556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278,
             500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469,
             556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500,
             278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584]


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

    def save(self, base):
        with open(base + '.svg', 'w', encoding='utf-8') as handle:
            handle.write(self.svg())
        with open(base + '.pdf', 'wb') as handle:
            handle.write(self.pdf())
        return [base + '.svg', base + '.pdf']


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
