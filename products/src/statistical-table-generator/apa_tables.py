#!/usr/bin/env python3
"""APA-style statistical tables from a CSV file.

Part of the ResearchWithMe Statistical Table Generator. Standard library only:
nothing to install beyond Python 3.8 or later.

    python apa_tables.py describe  data.csv --vars age score
    python apa_tables.py correlate data.csv --vars age score hours
    python apa_tables.py ttest     data.csv --dv score --group condition
    python apa_tables.py ttest     data.csv --paired pre post
    python apa_tables.py anova     data.csv --dv score --group condition
    python apa_tables.py chisq     data.csv --row sex --col passed
    python apa_tables.py regress   data.csv --dv score --ivs age hours

Add --out report.html to save a file that opens in Word with the tables intact.

Every number is computed here, deterministically. The sentence under each table
is filled in from those numbers by a fixed template; no language model is used.
The tool reports. Choosing the right analysis, and judging whether its
assumptions hold for your data, remain your responsibility.
"""

import argparse
import csv
import html
import math
import re
import sys

import statdist as sd

VERSION = '1.0.0'
EDITION = 'full'          # the build sets 'free' in the free edition
FREE_COMMANDS = ('describe', 'correlate', 'ttest')
FULL_ONLY = ('onesample', 'welchanova', 'factorial', 'rmanova', 'mannwhitney', 'wilcoxon', 'kruskal', 'friedman', 'fisher',
             'mcnemar', 'gof', 'logistic', 'reliability', 'normality', 'plot')


# ---------------------------------------------------------------- data access

class DataError(Exception):
    pass


def read_csv(path):
    with open(path, newline='', encoding='utf-8-sig') as handle:
        sample = handle.read(4096)
        handle.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=',;\t')
        except csv.Error:
            dialect = csv.excel
        rows = list(csv.DictReader(handle, dialect=dialect))
    if not rows:
        raise DataError('The file has a header but no data rows.')
    return rows


MISSING = {'', 'na', 'n/a', 'nan', 'null', 'none', '.', '-'}


def is_missing(value):
    return value is None or value.strip().lower() in MISSING


def to_number(value, column):
    try:
        return float(value.strip().replace(',', '.') if value.count(',') == 1 and '.' not in value else value)
    except ValueError:
        raise DataError(f'Column "{column}" contains "{value}", which is not a number.')


def require(rows, columns):
    missing = [c for c in columns if c not in rows[0]]
    if missing:
        raise DataError(f'Column not found: {", ".join(missing)}. Columns in the file: {", ".join(rows[0].keys())}.')


def numeric_complete(rows, columns):
    """Rows complete on every listed column, as lists of floats (listwise deletion)."""
    require(rows, columns)
    out = []
    for row in rows:
        if any(is_missing(row[c]) for c in columns):
            continue
        out.append([to_number(row[c], c) for c in columns])
    return out


def grouped(rows, dv, group):
    require(rows, [dv, group])
    groups = {}
    for row in rows:
        if is_missing(row[dv]) or is_missing(row[group]):
            continue
        groups.setdefault(row[group].strip(), []).append(to_number(row[dv], dv))
    return groups


# ---------------------------------------------------------------- statistics

def mean(xs):
    return sum(xs) / len(xs)


def variance(xs):
    m = mean(xs)
    return sum((x - m) ** 2 for x in xs) / (len(xs) - 1)


def sdev(xs):
    return math.sqrt(variance(xs))


def median(xs):
    s = sorted(xs)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2.0


def skewness(xs):
    """Adjusted Fisher-Pearson skewness (G1), as SPSS and Excel report it."""
    n = len(xs)
    if n < 3:
        return float('nan')
    m, s = mean(xs), sdev(xs)
    if s == 0:
        return float('nan')
    return n / ((n - 1) * (n - 2)) * sum(((x - m) / s) ** 3 for x in xs)


def kurtosis(xs):
    """Excess kurtosis (G2), as SPSS and Excel report it."""
    n = len(xs)
    if n < 4:
        return float('nan')
    m, s = mean(xs), sdev(xs)
    if s == 0:
        return float('nan')
    a = n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) * sum(((x - m) / s) ** 4 for x in xs)
    return a - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3))


def pearson(xs, ys):
    mx, my = mean(xs), mean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    if sxx == 0 or syy == 0:
        return float('nan')
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / math.sqrt(sxx * syy)


def ranks(xs):
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    out = [0.0] * len(xs)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        for k in range(i, j + 1):
            out[order[k]] = (i + j) / 2.0 + 1.0
        i = j + 1
    return out


def one_way(groups):
    """F test for a list of samples. Returns F, df1, df2, SS between, SS within."""
    allv = [x for g in groups for x in g]
    grand = mean(allv)
    ssb = sum(len(g) * (mean(g) - grand) ** 2 for g in groups)
    ssw = sum(sum((x - mean(g)) ** 2 for x in g) for g in groups)
    df1, df2 = len(groups) - 1, len(allv) - len(groups)
    f = (ssb / df1) / (ssw / df2) if ssw > 0 and df2 > 0 else float('inf')
    return f, df1, df2, ssb, ssw


def levene(groups):
    """Brown-Forsythe form of Levene's test (deviations from group medians)."""
    devs = [[abs(x - median(g)) for x in g] for g in groups]
    f, df1, df2, _, _ = one_way(devs)
    return f, df1, df2, sd.f_p(f, df1, df2)


def welch(a, b):
    va, vb, na, nb = variance(a), variance(b), len(a), len(b)
    se = math.sqrt(va / na + vb / nb)
    t = (mean(a) - mean(b)) / se if se > 0 else float('inf')
    df = (va / na + vb / nb) ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1)) if se > 0 else na + nb - 2
    return t, df, sd.t_p_two_sided(t, df), se


def cohens_d(a, b):
    na, nb = len(a), len(b)
    pooled = math.sqrt(((na - 1) * variance(a) + (nb - 1) * variance(b)) / (na + nb - 2))
    return (mean(a) - mean(b)) / pooled if pooled > 0 else float('nan')


def solve(matrix, rhs):
    """Invert a symmetric positive-definite matrix by Gauss-Jordan; returns (inverse, solution)."""
    n = len(matrix)
    aug = [list(map(float, matrix[i])) + [1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(aug[r][col]))
        if abs(aug[pivot][col]) < 1e-12:
            raise DataError('The predictors are perfectly collinear (one is a combination of the others). Remove one.')
        aug[col], aug[pivot] = aug[pivot], aug[col]
        p = aug[col][col]
        aug[col] = [v / p for v in aug[col]]
        for r in range(n):
            if r != col and aug[r][col] != 0.0:
                factor = aug[r][col]
                aug[r] = [v - factor * w for v, w in zip(aug[r], aug[col])]
    inverse = [row[n:] for row in aug]
    solution = [sum(inverse[i][j] * rhs[j] for j in range(n)) for i in range(n)]
    return inverse, solution


# ---------------------------------------------------------------- formatting

def num(x, places=2):
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return '-'
    if isinstance(x, float) and math.isinf(x):
        return 'inf'
    text = f'{x:.{places}f}'
    return '0.' + '0' * places if float(text) == 0 and text.startswith('-') else text


def no_zero(x, places=2):
    """APA: no leading zero for statistics that cannot exceed 1 (r, p, R2, eta2)."""
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return '-'
    text = f'{x:.{places}f}'
    if text.startswith('0.'):
        return text[1:]
    if text.startswith('-0.'):
        return '-' + text[2:]
    return text


def pval(p):
    if p is None or math.isnan(p):
        return '-'
    return '< .001' if p < 0.001 else no_zero(p, 3)


def p_text(p):
    if math.isnan(p):
        return 'p = -'
    return 'p < .001' if p < 0.001 else f'p = {no_zero(p, 3)}'


def stars(p):
    if math.isnan(p):
        return ''
    return '***' if p < 0.001 else '**' if p < 0.01 else '*' if p < 0.05 else ''


def df_text(df):
    return f'{df:.0f}' if abs(df - round(df)) < 1e-9 else f'{df:.2f}'


class Table:
    def __init__(self, number, title, header, rows, notes=(), sentence='', checks=()):
        self.number, self.title, self.header, self.rows = number, title, header, rows
        self.notes, self.sentence, self.checks = list(notes), sentence, list(checks)

    def markdown(self):
        out = [f'Table {self.number}', f'*{self.title}*', '']
        out.append('| ' + ' | '.join(self.header) + ' |')
        out.append('|' + '|'.join([' --- '] + [' ---: '] * (len(self.header) - 1)) + '|')
        out += ['| ' + ' | '.join(str(c) for c in row) + ' |' for row in self.rows]
        out.append('')
        out += [f'*Note.* {note}' for note in self.notes]
        if self.sentence:
            out += ['', f'Draft sentence: {self.sentence}']
        for check in self.checks:
            out += ['', f'Check: {check}']
        return '\n'.join(out) + '\n'

    def html(self):
        e = html.escape
        cells = ''.join(f'<th>{e(h)}</th>' for h in self.header)
        body = ''.join('<tr>' + ''.join(
            f'<td class="{"l" if i == 0 else "r"}">{e(str(c))}</td>' for i, c in enumerate(row)) + '</tr>'
            for row in self.rows)
        notes = ''.join(f'<p class="note"><em>Note.</em> {e(n)}</p>' for n in self.notes)
        sentence = f'<p class="draft"><strong>Draft sentence.</strong> {e(self.sentence)}</p>' if self.sentence else ''
        checks = ''.join(f'<p class="check"><strong>Check.</strong> {e(c)}</p>' for c in self.checks)
        return (f'<p class="num"><strong>Table {self.number}</strong></p><p class="title"><em>{e(self.title)}</em></p>'
                f'<table><thead><tr>{cells}</tr></thead><tbody>{body}</tbody></table>{notes}{sentence}{checks}')


CSS = """
body{font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;margin:1in;color:#000}
table{border-collapse:collapse;border-top:1.5pt solid #000;border-bottom:1.5pt solid #000;margin:0 0 6pt 0}
th{border-bottom:1pt solid #000;font-weight:normal;padding:4pt 12pt;text-align:center}
td{padding:2pt 12pt}td.l{text-align:left}td.r{text-align:right}
p{margin:0 0 6pt 0}p.num{margin-top:24pt}p.check{color:#7a1f1f}
.method{margin-top:36pt;border-top:1pt solid #999;padding-top:8pt;font-size:10pt}
"""


def write_html(path, tables, method, source):
    e = html.escape
    parts = ['<!doctype html><html lang="en"><head><meta charset="utf-8">',
             f'<title>Statistical tables: {e(source)}</title><style>{CSS}</style></head><body>']
    parts += [t.html() for t in tables]
    parts.append(f'<div class="method"><p><strong>Method.</strong> {e(method)}</p>'
                 f'<p>Produced by apa_tables.py {VERSION} (ResearchWithMe Statistical Table Generator), '
                 'Python standard library only. Draft sentences are filled in from the numbers above by a fixed '
                 'template and must be checked and rewritten by the author.</p></div></body></html>')
    with open(path, 'w', encoding='utf-8') as handle:
        handle.write('\n'.join(parts))


# ---------------------------------------------------------------- analyses

def describe(rows, args):
    table_rows = []
    for var in args.vars:
        xs = [r[0] for r in numeric_complete(rows, [var])]
        if len(xs) < 2:
            raise DataError(f'"{var}" has fewer than two values.')
        table_rows.append([var, len(xs), num(mean(xs)), num(sdev(xs)), num(median(xs)), num(min(xs)), num(max(xs)),
                           num(skewness(xs)), num(kurtosis(xs))])
    checks = []
    for row in table_rows:
        try:
            if abs(float(row[7])) > 2 or abs(float(row[8])) > 7:
                checks.append(f'{row[0]} has skewness {row[7]} and kurtosis {row[8]}; the mean and SD may describe '
                              'it poorly. Consider reporting the median and range.')
        except ValueError:
            pass
    table = Table(1, 'Descriptive Statistics', ['Variable', 'n', 'M', 'SD', 'Mdn', 'Min', 'Max', 'Skew', 'Kurtosis'],
                  table_rows, ['Skew and kurtosis are the sample-adjusted statistics (G1 and excess G2).'], checks=checks)
    return [table], 'Descriptive statistics computed per variable on all available values (pairwise).'


def correlate(rows, args):
    data = numeric_complete(rows, args.vars)
    n = len(data)
    if n < 4:
        raise DataError('Fewer than four complete rows; a correlation table would not be meaningful.')
    cols = [[row[i] for row in data] for i in range(len(args.vars))]
    used = [ranks(c) for c in cols] if args.method == 'spearman' else cols
    table_rows, strongest = [], None
    for i, var in enumerate(args.vars):
        line = [f'{i + 1}. {var}', num(mean(cols[i])), num(sdev(cols[i]))]
        for j in range(len(args.vars)):
            if j >= i:
                line.append('-' if j == i else '')
                continue
            r = pearson(used[i], used[j])
            p = sd.r_p_two_sided(r, n)
            line.append(no_zero(r) + stars(p))
            if not math.isnan(r) and (strongest is None or abs(r) > abs(strongest[0])):
                strongest = (r, p, args.vars[i], args.vars[j])
        table_rows.append(line)
    name = "Spearman's rho" if args.method == 'spearman' else "Pearson's r"
    symbol = 'r_s' if args.method == 'spearman' else 'r'
    sentence = ''
    if strongest:
        r, p, a, b = strongest
        sentence = (f'The strongest association was between {a} and {b}, {symbol}({n - 2}) = {no_zero(r)}, {p_text(p)}.')
    table = Table(1, f'Means, Standard Deviations, and Correlations ({name})',
                  ['Variable', 'M', 'SD'] + [str(i + 1) for i in range(len(args.vars))], table_rows,
                  [f'N = {n} (listwise deletion). * p < .05. ** p < .01. *** p < .001.'], sentence,
                  ['Correlations describe linear (Pearson) or monotonic (Spearman) association only. Plot each pair '
                   'before interpreting, and note that these p values are not corrected for multiple comparisons.'])
    return [table], (f'{name} correlations with two-sided p values from the t distribution with N - 2 degrees of '
                     'freedom; cases with a missing value on any listed variable were excluded.')


def ttest(rows, args):
    if args.paired:
        a_name, b_name = args.paired
        data = numeric_complete(rows, [a_name, b_name])
        if len(data) < 3:
            raise DataError('Fewer than three complete pairs.')
        a, b = [r[0] for r in data], [r[1] for r in data]
        diffs = [x - y for x, y in zip(a, b)]
        n = len(diffs)
        se = sdev(diffs) / math.sqrt(n)
        t = mean(diffs) / se if se > 0 else float('inf')
        p = sd.t_p_two_sided(t, n - 1)
        crit = sd.t_critical(n - 1)
        dz = mean(diffs) / sdev(diffs) if sdev(diffs) > 0 else float('nan')
        table = Table(1, f'Paired-Samples t Test: {a_name} and {b_name}',
                      ['Measure', 'n', 'M', 'SD', 't', 'df', 'p', "Cohen's d_z", '95% CI of difference'],
                      [[a_name, n, num(mean(a)), num(sdev(a)), num(t), n - 1, pval(p), num(dz),
                        f'[{num(mean(diffs) - crit * se)}, {num(mean(diffs) + crit * se)}]'],
                       [b_name, n, num(mean(b)), num(sdev(b)), '', '', '', '', '']],
                      ['d_z is the mean difference divided by the standard deviation of the differences.'],
                      (f'{a_name} (M = {num(mean(a))}, SD = {num(sdev(a))}) and {b_name} (M = {num(mean(b))}, '
                       f'SD = {num(sdev(b))}) differed by {num(mean(diffs))} on average, t({n - 1}) = {num(t)}, '
                       f'{p_text(p)}, d_z = {num(dz)}.'),
                      [f'The differences have skewness {num(skewness(diffs))}; with a small sample and strongly skewed '
                       'differences, consider a Wilcoxon signed-rank test.'] if n < 30 else [])
        return [table], 'Paired-samples t test on complete pairs, two-sided.'
    if not (args.dv and args.group):
        raise DataError('Give either --paired A B, or --dv and --group.')
    groups = grouped(rows, args.dv, args.group)
    if len(groups) != 2:
        raise DataError(f'"{args.group}" has {len(groups)} groups ({", ".join(groups)}); a t test needs exactly two. '
                        'Use the anova command for three or more.')
    (name_a, a), (name_b, b) = groups.items()
    if min(len(a), len(b)) < 2:
        raise DataError('Each group needs at least two values.')
    t, df, p, se = welch(a, b)
    crit = sd.t_critical(df)
    diff = mean(a) - mean(b)
    d = cohens_d(a, b)
    lf, l1, l2, lp = levene([a, b])
    checks = []
    if lp < 0.05:
        checks.append(f"Levene's test indicates unequal variances, F({l1}, {l2}) = {num(lf)}, {p_text(lp)}. "
                      "Welch's t test, reported here, does not assume equal variances.")
    if min(len(a), len(b)) < 30:
        checks.append('At least one group has fewer than 30 values. Inspect the distributions; if they are strongly '
                      'skewed, consider a Mann-Whitney U test.')
    table = Table(1, f'{args.dv} by {args.group}: Welch\'s Independent-Samples t Test',
                  [args.group, 'n', 'M', 'SD', 't', 'df', 'p', "Cohen's d", '95% CI of difference'],
                  [[name_a, len(a), num(mean(a)), num(sdev(a)), num(t), df_text(df), pval(p), num(d),
                    f'[{num(diff - crit * se)}, {num(diff + crit * se)}]'],
                   [name_b, len(b), num(mean(b)), num(sdev(b)), '', '', '', '', '']],
                  ["Welch's t test (equal variances not assumed). Cohen's d uses the pooled standard deviation."],
                  (f'{args.dv} was {"higher" if diff > 0 else "lower"} in the {name_a} group (M = {num(mean(a))}, '
                   f'SD = {num(sdev(a))}) than in the {name_b} group (M = {num(mean(b))}, SD = {num(sdev(b))}), '
                   f't({df_text(df)}) = {num(t)}, {p_text(p)}, d = {num(d)}.'), checks)
    return [table], ("Welch's independent-samples t test, two-sided; Levene's test computed in its Brown-Forsythe "
                     'form (deviations from group medians).')


def anova(rows, args):
    groups = grouped(rows, args.dv, args.group)
    if len(groups) < 3:
        raise DataError(f'"{args.group}" has {len(groups)} groups; use the ttest command for two.')
    if any(len(g) < 2 for g in groups.values()):
        raise DataError('Each group needs at least two values.')
    names, samples = list(groups), list(groups.values())
    f, df1, df2, ssb, ssw = one_way(samples)
    p = sd.f_p(f, df1, df2)
    eta2 = ssb / (ssb + ssw) if ssb + ssw > 0 else float('nan')
    lf, l1, l2, lp = levene(samples)
    desc = Table(1, f'{args.dv} by {args.group}: Descriptive Statistics', [args.group, 'n', 'M', 'SD'],
                 [[n, len(g), num(mean(g)), num(sdev(g))] for n, g in groups.items()])
    checks = []
    if lp < 0.05:
        checks.append(f"Levene's test indicates unequal variances, F({l1}, {l2}) = {num(lf)}, {p_text(lp)}. The "
                      "standard F test assumes equal variances; use the welchanova command, which does not assume them.")
    main = Table(2, f'One-Way Analysis of Variance of {args.dv} by {args.group}',
                 ['Source', 'SS', 'df', 'MS', 'F', 'p', 'eta squared'],
                 [['Between groups', num(ssb), df1, num(ssb / df1), num(f), pval(p), no_zero(eta2)],
                  ['Within groups', num(ssw), df2, num(ssw / df2), '', '', ''],
                  ['Total', num(ssb + ssw), df1 + df2, '', '', '', '']], [],
                 (f'{args.dv} {"differed" if p < 0.05 else "did not differ significantly"} across levels of '
                  f'{args.group}, F({df1}, {df2}) = {num(f)}, {p_text(p)}, eta squared = {no_zero(eta2)}.'), checks)
    pairs = [(i, j) for i in range(len(names)) for j in range(i + 1, len(names))]
    post_rows = []
    for i, j in pairs:
        t, df, pw, se = welch(samples[i], samples[j])
        post_rows.append([f'{names[i]} - {names[j]}', num(mean(samples[i]) - mean(samples[j])), num(t), df_text(df),
                          pval(min(1.0, pw * len(pairs))), num(cohens_d(samples[i], samples[j]))])
    post = Table(3, 'Pairwise Comparisons (Bonferroni-Adjusted)', ['Comparison', 'Mean difference', 't', 'df',
                                                                  'Adjusted p', "Cohen's d"], post_rows,
                 [f"Welch's t tests; p values multiplied by the number of comparisons ({len(pairs)}) and capped at 1."],
                 checks=['Interpret pairwise comparisons only if the overall F test supports doing so.'])
    return [desc, main, post], ("One-way between-groups ANOVA with eta squared; Levene's test in its Brown-Forsythe "
                                "form; post hoc pairwise Welch's t tests with Bonferroni adjustment.")


def chisq(rows, args):
    require(rows, [args.row, args.col])
    counts = {}
    for row in rows:
        if is_missing(row[args.row]) or is_missing(row[args.col]):
            continue
        key = (row[args.row].strip(), row[args.col].strip())
        counts[key] = counts.get(key, 0) + 1
    r_levels = sorted({k[0] for k in counts})
    c_levels = sorted({k[1] for k in counts})
    if len(r_levels) < 2 or len(c_levels) < 2:
        raise DataError('Each variable needs at least two categories.')
    n = sum(counts.values())
    r_tot = {r: sum(counts.get((r, c), 0) for c in c_levels) for r in r_levels}
    c_tot = {c: sum(counts.get((r, c), 0) for r in r_levels) for c in c_levels}
    chi2, low = 0.0, 0
    for r in r_levels:
        for c in c_levels:
            expected = r_tot[r] * c_tot[c] / n
            if expected < 5:
                low += 1
            chi2 += (counts.get((r, c), 0) - expected) ** 2 / expected
    df = (len(r_levels) - 1) * (len(c_levels) - 1)
    p = sd.chi2_p(chi2, df)
    v = math.sqrt(chi2 / (n * min(len(r_levels) - 1, len(c_levels) - 1)))
    table_rows = [[r] + [f'{counts.get((r, c), 0)} ({100 * counts.get((r, c), 0) / r_tot[r]:.1f}%)' for c in c_levels]
                  + [r_tot[r]] for r in r_levels]
    table_rows.append(['Total'] + [c_tot[c] for c in c_levels] + [n])
    checks = []
    cells = len(r_levels) * len(c_levels)
    if low:
        checks.append(f'{low} of {cells} cells have an expected count below 5. The chi-square approximation may be '
                      "poor; for a 2 x 2 table use Fisher's exact test, which this tool does not compute.")
    table = Table(1, f'{args.row} by {args.col}', [args.row] + c_levels + ['Total'], table_rows,
                  ['Percentages are within rows. No continuity correction was applied.'],
                  (f'{args.row} and {args.col} were {"" if p < 0.05 else "not "}significantly associated, '
                   f'chi-square({df}, N = {n}) = {num(chi2)}, {p_text(p)}, Cramer\'s V = {no_zero(v)}.'), checks)
    return [table], "Pearson's chi-square test of independence without continuity correction; Cramer's V as effect size."


def regress(rows, args):
    cols = [args.dv] + args.ivs
    data = numeric_complete(rows, cols)
    n, k = len(data), len(args.ivs)
    if n <= k + 2:
        raise DataError(f'{n} complete rows is too few for {k} predictors.')
    y = [r[0] for r in data]
    x = [[1.0] + r[1:] for r in data]
    xtx = [[sum(row[i] * row[j] for row in x) for j in range(k + 1)] for i in range(k + 1)]
    xty = [sum(row[i] * yi for row, yi in zip(x, y)) for i in range(k + 1)]
    inverse, beta = solve(xtx, xty)
    fitted = [sum(b * v for b, v in zip(beta, row)) for row in x]
    sse = sum((yi - fi) ** 2 for yi, fi in zip(y, fitted))
    sst = sum((yi - mean(y)) ** 2 for yi in y)
    if sst == 0:
        raise DataError(f'"{args.dv}" does not vary.')
    dfe = n - k - 1
    mse = sse / dfe
    r2 = 1.0 - sse / sst
    adj = 1.0 - (1.0 - r2) * (n - 1) / dfe
    f = ((sst - sse) / k) / mse if mse > 0 else float('inf')
    pf = sd.f_p(f, k, dfe)
    crit = sd.t_critical(dfe)
    sy = sdev(y)
    table_rows = []
    for i, name in enumerate(['(Intercept)'] + args.ivs):
        se = math.sqrt(mse * inverse[i][i])
        t = beta[i] / se if se > 0 else float('inf')
        std = '' if i == 0 else num(beta[i] * sdev([row[i] for row in x]) / sy)
        table_rows.append([name, num(beta[i]), num(se), std, num(t), pval(sd.t_p_two_sided(t, dfe)),
                           f'[{num(beta[i] - crit * se)}, {num(beta[i] + crit * se)}]'])
    checks = ['Linear regression assumes a linear relationship, independent errors, constant error variance, and '
              'approximately normal residuals. Add --fig NAME to save a residual plot and a Q-Q plot, and look at them '
              'before reporting.']
    for i in range(k):
        others = [j for j in range(k) if j != i]
        if not others:
            continue
        xi = [row[i + 1] for row in x]
        zx = [[1.0] + [row[j + 1] for j in others] for row in x]
        ztz = [[sum(r[a] * r[b] for r in zx) for b in range(len(others) + 1)] for a in range(len(others) + 1)]
        zty = [sum(r[a] * v for r, v in zip(zx, xi)) for a in range(len(others) + 1)]
        _, g = solve(ztz, zty)
        res = sum((v - sum(c * w for c, w in zip(g, r))) ** 2 for v, r in zip(xi, zx))
        tot = sum((v - mean(xi)) ** 2 for v in xi)
        vif = tot / res if res > 0 else float('inf')
        if vif > 5:
            checks.append(f'{args.ivs[i]} has a variance inflation factor of {num(vif)}; it overlaps heavily with the '
                          'other predictors, so its coefficient is unstable.')
    table = Table(1, f'Linear Regression Predicting {args.dv}', ['Predictor', 'B', 'SE', 'Beta', 't', 'p', '95% CI for B'],
                  table_rows, [f'N = {n}. R squared = {no_zero(r2)}, adjusted R squared = {no_zero(adj)}, '
                               f'F({k}, {dfe}) = {num(f)}, p {pval(pf) if pf < 0.001 else "= " + pval(pf)}. '
                               'Beta is the standardised coefficient.'],
                  (f'The model explained {100 * r2:.1f}% of the variance in {args.dv}, R squared = {no_zero(r2)}, '
                   f'F({k}, {dfe}) = {num(f)}, {p_text(pf)}.'), checks)
    return [table], 'Ordinary least squares regression on complete cases (listwise deletion), two-sided tests.'


# ---------------------------------------------------------------- command line

def build_parser():
    parser = argparse.ArgumentParser(description='APA-style statistical tables from a CSV file.')
    parser.add_argument('--version', action='version', version=f'apa_tables.py {VERSION}')
    sub = parser.add_subparsers(dest='command', required=True)

    def add(name, helptext):
        p = sub.add_parser(name, help=helptext)
        p.add_argument('csv', help='path to the CSV file (first row must be column names)')
        p.add_argument('--out', help='also write an HTML report that opens in Word')
        p.add_argument('--fig', metavar='NAME', help='also save figures as NAME-....svg and NAME-....pdf (full edition)')
        return p

    p = add('describe', 'n, mean, SD, median, range, skew, kurtosis')
    p.add_argument('--vars', nargs='+', required=True)
    p = add('correlate', 'correlation matrix with means and SDs')
    p.add_argument('--vars', nargs='+', required=True)
    p.add_argument('--method', choices=['pearson', 'spearman'], default='pearson')
    p = add('ttest', "Welch's independent-samples or paired-samples t test")
    p.add_argument('--dv')
    p.add_argument('--group')
    p.add_argument('--paired', nargs=2, metavar=('A', 'B'))
    p = add('anova', 'one-way ANOVA with Bonferroni pairwise comparisons')
    p.add_argument('--dv', required=True)
    p.add_argument('--group', required=True)
    p = add('chisq', 'chi-square test of independence')
    p.add_argument('--row', required=True)
    p.add_argument('--col', required=True)
    p = add('regress', 'linear regression')
    p.add_argument('--dv', required=True)
    p.add_argument('--ivs', nargs='+', required=True)
    more = load_more()
    if more:
        COMMANDS.update(more.register(add))
    else:
        for name in FULL_ONLY:
            sub.add_parser(name, help='full edition').add_argument('rest', nargs=argparse.REMAINDER)
    return parser


def load_more():
    """The further analyses and the figures, which ship with the full edition only."""
    if EDITION != 'full':
        return None
    try:
        import apa_more
        return apa_more
    except ImportError:
        return None


COMMANDS = {'describe': describe, 'correlate': correlate, 'ttest': ttest, 'anova': anova, 'chisq': chisq,
            'regress': regress}


def main(argv=None):
    args = build_parser().parse_args(argv)
    more = load_more()
    if args.command not in FREE_COMMANDS and not more:
        print(f'The free edition runs {", ".join(FREE_COMMANDS)}. The {args.command} command is in the full edition.',
              file=sys.stderr)
        return 2
    if getattr(args, 'fig', None) and not more:
        print('Figures are in the full edition. Run the command again without --fig.', file=sys.stderr)
        return 2
    try:
        rows = read_csv(args.csv)
        tables, method = COMMANDS[args.command](rows, args)
        drawn = []
        if getattr(args, 'fig', None):
            single = getattr(args, '_single_figure', None)
            drawn = [('', single)] if single is not None else more.figures_for(args.command, rows, args)
    except DataError as error:
        print(f'Cannot run this analysis: {error}', file=sys.stderr)
        return 2
    except OSError as error:
        print(f'Cannot read the file: {error}', file=sys.stderr)
        return 2
    for table in tables:
        print(table.markdown())
    print(f'Method: {method} (apa_tables.py {VERSION}, {EDITION} edition)')
    if args.out and tables:
        write_html(args.out, tables, method, args.csv)
        print(f'\nSaved {args.out}. Open it in Word, or copy the tables from a browser.')
    saved = []
    for name, canvas in drawn:
        safe = re.sub(r'[^A-Za-z0-9._-]+', '_', name)
        saved += canvas.save(f'{args.fig}-{safe}' if safe else args.fig)
    if saved:
        print('\nSaved figures (vector files, sharp at any size):')
        for path in saved:
            print(f'  {path}')
    elif getattr(args, 'fig', None):
        print('\nThis command has no figure.')
    return 0


if __name__ == '__main__':
    # Run as the module, so that the further analyses and this file share one set of classes.
    import apa_tables
    sys.exit(apa_tables.main())
