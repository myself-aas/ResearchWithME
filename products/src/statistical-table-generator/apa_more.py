"""Further analyses and the figures, for the full edition of the Statistical Table Generator.

Loaded by apa_tables.py; not run by itself. Standard library only.
"""

import math

import apa_tables as core
import figures
import statdist as sd

DataError, Table = core.DataError, core.Table
num, no_zero, pval, p_text, df_text = core.num, core.no_zero, core.pval, core.p_text, core.df_text
mean, sdev, variance = core.mean, core.sdev, core.variance


# ---------------------------------------------------------------- numerical helpers

def normal_quantile(p):
    """Inverse of the standard normal distribution function, by bisection on erfc."""
    if not 0.0 < p < 1.0:
        raise ValueError('p must be between 0 and 1')
    lo, hi = -40.0, 40.0
    for _ in range(200):
        mid = (lo + hi) / 2.0
        if 0.5 * math.erfc(-mid / math.sqrt(2.0)) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2.0


def normal_sf(z):
    return 0.5 * math.erfc(z / math.sqrt(2.0))


def tie_term(values):
    """Sum of t^3 - t over groups of tied values."""
    counts = {}
    for v in values:
        counts[v] = counts.get(v, 0) + 1
    return sum(t ** 3 - t for t in counts.values())


def holm(pvalues):
    order = sorted(range(len(pvalues)), key=lambda i: pvalues[i])
    out, running, m = [0.0] * len(pvalues), 0.0, len(pvalues)
    for rank, i in enumerate(order):
        running = max(running, min(1.0, (m - rank) * pvalues[i]))
        out[i] = running
    return out


def ols(x, y):
    """Least squares. Returns coefficients, residual sum of squares, and the inverse of X'X."""
    k = len(x[0])
    xtx = [[sum(row[i] * row[j] for row in x) for j in range(k)] for i in range(k)]
    xty = [sum(row[i] * yi for row, yi in zip(x, y)) for i in range(k)]
    inverse, beta = core.solve(xtx, xty)
    sse = sum((yi - sum(b * v for b, v in zip(beta, row))) ** 2 for row, yi in zip(x, y))
    return beta, sse, inverse


def log_choose(n, k):
    return math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1)


def mean_ci(values):
    m, n = mean(values), len(values)
    half = sd.t_critical(n - 1) * sdev(values) / math.sqrt(n) if n > 1 else 0.0
    return m, m - half, m + half


# ---------------------------------------------------------------- rank tests

def mann_whitney(a, b):
    """U for the first sample, the two-sided p value, the method used, and the rank-biserial correlation.

    Exact when there are no ties and either sample has eight values or fewer; otherwise the normal approximation
    with tie correction and continuity correction. This is the rule SciPy applies by default.
    """
    n1, n2 = len(a), len(b)
    r = core.ranks(a + b)
    u1 = sum(r[:n1]) - n1 * (n1 + 1) / 2.0
    u2 = n1 * n2 - u1
    ties = tie_term(a + b)
    rb = (u1 - u2) / (n1 * n2)
    if ties == 0 and min(n1, n2) <= 8:
        # number of arrangements giving each U, by the standard recurrence
        table = {}

        def ways(m, n, u):
            if u < 0:
                return 0
            if m == 0 or n == 0:
                return 1 if u == 0 else 0
            key = (m, n, u)
            if key not in table:
                table[key] = ways(m - 1, n, u - n) + ways(m, n - 1, u)
            return table[key]

        total = math.comb(n1 + n2, n1)
        small = int(round(min(u1, u2)))
        p = min(1.0, 2.0 * sum(ways(n1, n2, u) for u in range(small + 1)) / total)
        return u1, p, 'exact', rb, None
    n = n1 + n2
    sigma = math.sqrt(n1 * n2 / 12.0 * ((n + 1) - ties / (n * (n - 1.0))))
    if sigma == 0:
        return u1, 1.0, 'normal approximation', rb, 0.0
    z = (max(u1, u2) - n1 * n2 / 2.0 - 0.5) / sigma
    return u1, min(1.0, 2.0 * normal_sf(z)), 'normal approximation', rb, z if u1 >= u2 else -z


def wilcoxon_signed(a, b):
    """Wilcoxon signed-rank test on pairs. Zero differences are dropped. Exact for up to 50 pairs without ties."""
    d = [x - y for x, y in zip(a, b) if x != y]
    n = len(d)
    if n < 1:
        raise DataError('Every pair is identical; there is nothing to test.')
    r = core.ranks([abs(v) for v in d])
    plus = sum(rank for rank, v in zip(r, d) if v > 0)
    minus = sum(rank for rank, v in zip(r, d) if v < 0)
    t = min(plus, minus)
    ties = tie_term([abs(v) for v in d])
    rb = (plus - minus) / (n * (n + 1) / 2.0)
    if ties == 0 and n <= 50:
        counts = [1] + [0] * (n * (n + 1) // 2)
        for rank in range(1, n + 1):
            for s in range(len(counts) - 1, rank - 1, -1):
                counts[s] += counts[s - rank]
        p = min(1.0, 2.0 * sum(counts[:int(round(t)) + 1]) / 2.0 ** n)
        return t, p, 'exact', rb, n, None
    sigma = math.sqrt(n * (n + 1) * (2 * n + 1) / 24.0 - ties / 48.0)
    z = (t - n * (n + 1) / 4.0 + 0.5) / sigma if sigma > 0 else 0.0
    return t, min(1.0, 2.0 * normal_sf(abs(z))), 'normal approximation', rb, n, z


def cmd_mannwhitney(rows, args):
    groups = core.grouped(rows, args.dv, args.group)
    if len(groups) != 2:
        raise DataError(f'"{args.group}" has {len(groups)} groups; this test needs exactly two. Use kruskal for more.')
    (na, a), (nb, b) = groups.items()
    u, p, method, rb, z = mann_whitney(a, b)
    table = Table(1, f'{args.dv} by {args.group}: Mann-Whitney U Test', [args.group, 'n', 'Mdn', 'Mean rank', 'U', 'z', 'p', 'r_rb'],
                  [[na, len(a), num(core.median(a)), num(mean(core.ranks(a + b)[:len(a)])), num(u), '' if z is None else num(z),
                    pval(p), no_zero(rb)],
                   [nb, len(b), num(core.median(b)), num(mean(core.ranks(a + b)[len(a):])), '', '', '', '']],
                  [f'U is for the {na} group. p is two-sided, {method}. r_rb is the rank-biserial correlation; positive '
                   f'means higher values in the {na} group.'],
                  (f'{args.dv} was {"higher" if rb > 0 else "lower"} in the {na} group (Mdn = {num(core.median(a))}) than in '
                   f'the {nb} group (Mdn = {num(core.median(b))}), U = {num(u)}, {p_text(p)}, r_rb = {no_zero(rb)}.'))
    return [table], f'Mann-Whitney U test, two-sided, {method}' + (' with tie and continuity corrections.' if z is not None else '.')


def cmd_wilcoxon(rows, args):
    an, bn = args.paired
    data = core.numeric_complete(rows, [an, bn])
    a, b = [r[0] for r in data], [r[1] for r in data]
    t, p, method, rb, n, z = wilcoxon_signed(a, b)
    table = Table(1, f'Wilcoxon Signed-Rank Test: {an} and {bn}', ['Measure', 'Pairs', 'Mdn', 'T', 'z', 'p', 'r_rb'],
                  [[an, len(a), num(core.median(a)), num(t), '' if z is None else num(z), pval(p), no_zero(rb)],
                   [bn, len(b), num(core.median(b)), '', '', '', '']],
                  [f'T is the smaller sum of signed ranks; {len(a) - n} pairs with no difference were left out. p is '
                   f'two-sided, {method}. r_rb is the matched-pairs rank-biserial correlation; positive means {an} is higher.'],
                  (f'{an} (Mdn = {num(core.median(a))}) and {bn} (Mdn = {num(core.median(b))}) '
                   f'{"differed" if p < 0.05 else "did not differ significantly"}, T = {num(t)}, {p_text(p)}, r_rb = {no_zero(rb)}.'))
    return [table], f'Wilcoxon signed-rank test, two-sided, {method}; zero differences excluded.'


def cmd_kruskal(rows, args):
    groups = core.grouped(rows, args.dv, args.group)
    if len(groups) < 3:
        raise DataError(f'"{args.group}" has {len(groups)} groups; use mannwhitney for two.')
    names, samples = list(groups), list(groups.values())
    everything = [v for g in samples for v in g]
    n = len(everything)
    r = core.ranks(everything)
    h, start, mean_ranks = 0.0, 0, []
    for g in samples:
        rs = r[start:start + len(g)]
        start += len(g)
        mean_ranks.append(mean(rs))
        h += sum(rs) ** 2 / len(g)
    h = 12.0 / (n * (n + 1)) * h - 3 * (n + 1)
    correction = 1.0 - tie_term(everything) / (n ** 3 - n)
    if correction == 0:
        raise DataError(f'"{args.dv}" does not vary.')
    h /= correction
    df = len(samples) - 1
    p = sd.chi2_p(h, df)
    eps = h / (n - 1)
    main = Table(1, f'{args.dv} by {args.group}: Kruskal-Wallis Test', [args.group, 'n', 'Mdn', 'Mean rank'],
                 [[name, len(g), num(core.median(g)), num(mr)] for name, g, mr in zip(names, samples, mean_ranks)],
                 [f'H({df}) = {num(h)}, p {pval(p) if p < 0.001 else "= " + pval(p)}, epsilon squared = {no_zero(eps)}. '
                  'H is corrected for ties.'],
                 (f'{args.dv} {"differed" if p < 0.05 else "did not differ significantly"} across levels of {args.group}, '
                  f'H({df}) = {num(h)}, {p_text(p)}, epsilon squared = {no_zero(eps)}.'))
    pairs = [(i, j) for i in range(len(names)) for j in range(i + 1, len(names))]
    results = [mann_whitney(samples[i], samples[j]) for i, j in pairs]
    adjusted = holm([res[1] for res in results])
    post = Table(2, 'Pairwise Mann-Whitney U Tests (Holm-Adjusted)', ['Comparison', 'U', 'p', 'Adjusted p', 'r_rb'],
                 [[f'{names[i]} - {names[j]}', num(res[0]), pval(res[1]), pval(adj), no_zero(res[3])]
                  for (i, j), res, adj in zip(pairs, results, adjusted)],
                 ["Holm's step-down adjustment across all comparisons."],
                 checks=['Interpret pairwise comparisons only if the overall test supports doing so.'])
    return [main, post], 'Kruskal-Wallis test with tie correction; pairwise Mann-Whitney U tests with Holm adjustment.'


def within_matrix(rows, names):
    data = core.numeric_complete(rows, names)
    if len(names) < 3:
        raise DataError('Give at least three measures. For two, use ttest --paired or wilcoxon.')
    if len(data) < 3:
        raise DataError('Fewer than three complete cases.')
    return data


def cmd_friedman(rows, args):
    data = within_matrix(rows, args.vars)
    n, k = len(data), len(args.vars)
    ranked = [core.ranks(row) for row in data]
    sums = [sum(r[j] for r in ranked) for j in range(k)]
    chi = 12.0 / (n * k * (k + 1)) * sum(s * s for s in sums) - 3 * n * (k + 1)
    ties = sum(tie_term(row) for row in data)
    correction = 1.0 - ties / (n * k * (k * k - 1.0))
    if correction == 0:
        raise DataError('The measures do not differ within any case.')
    chi /= correction
    p = sd.chi2_p(chi, k - 1)
    w = chi / (n * (k - 1))
    table = Table(1, 'Friedman Test', ['Measure', 'Mdn', 'Mean rank'],
                  [[name, num(core.median([row[j] for row in data])), num(sums[j] / n)] for j, name in enumerate(args.vars)],
                  [f'N = {n}. Chi-square({k - 1}) = {num(chi)}, p {pval(p) if p < 0.001 else "= " + pval(p)}, '
                   f"Kendall's W = {no_zero(w)}. Corrected for ties."],
                  (f'The measures {"differed" if p < 0.05 else "did not differ significantly"}, chi-square({k - 1}, N = {n}) = '
                   f"{num(chi)}, {p_text(p)}, Kendall's W = {no_zero(w)}."))
    return [table], "Friedman test on complete cases, corrected for ties, with Kendall's W."


# ---------------------------------------------------------------- t and ANOVA family

def cmd_onesample(rows, args):
    data = [r[0] for r in core.numeric_complete(rows, [args.var])]
    n = len(data)
    if n < 3:
        raise DataError('Fewer than three values.')
    s = sdev(data)
    if s == 0:
        raise DataError(f'"{args.var}" does not vary.')
    t = (mean(data) - args.mu) / (s / math.sqrt(n))
    p = sd.t_p_two_sided(t, n - 1)
    d = (mean(data) - args.mu) / s
    _, lo, hi = mean_ci(data)
    table = Table(1, f'One-Sample t Test of {args.var} Against {args.mu:g}', ['Variable', 'n', 'M', 'SD', 't', 'df', 'p', "Cohen's d", '95% CI of M'],
                  [[args.var, n, num(mean(data)), num(s), num(t), n - 1, pval(p), num(d), f'[{num(lo)}, {num(hi)}]']], [],
                  (f'{args.var} (M = {num(mean(data))}, SD = {num(s)}) {"differed" if p < 0.05 else "did not differ significantly"} '
                   f'from {args.mu:g}, t({n - 1}) = {num(t)}, {p_text(p)}, d = {num(d)}.'))
    return [table], 'One-sample t test, two-sided.'


def welch_anova(samples):
    k = len(samples)
    w = [len(g) / variance(g) for g in samples]
    total = sum(w)
    grand = sum(wi * mean(g) for wi, g in zip(w, samples)) / total
    lam = sum((1 - wi / total) ** 2 / (len(g) - 1) for wi, g in zip(w, samples))
    f = (sum(wi * (mean(g) - grand) ** 2 for wi, g in zip(w, samples)) / (k - 1)) / (1 + 2 * (k - 2) / (k * k - 1.0) * lam)
    df2 = (k * k - 1.0) / (3 * lam)
    return f, k - 1, df2, sd.f_p(f, k - 1, df2)


def cmd_welchanova(rows, args):
    groups = core.grouped(rows, args.dv, args.group)
    if len(groups) < 3:
        raise DataError(f'"{args.group}" has {len(groups)} groups; use ttest for two.')
    if any(len(g) < 2 or variance(g) == 0 for g in groups.values()):
        raise DataError('Each group needs at least two values that are not all the same.')
    names, samples = list(groups), list(groups.values())
    f, df1, df2, p = welch_anova(samples)
    main = Table(1, f"{args.dv} by {args.group}: Welch's Analysis of Variance", [args.group, 'n', 'M', 'SD'],
                 [[name, len(g), num(mean(g)), num(sdev(g))] for name, g in groups.items()],
                 [f"Welch's F({df1}, {df_text(df2)}) = {num(f)}, p {pval(p) if p < 0.001 else '= ' + pval(p)}. "
                  'Equal variances are not assumed.'],
                 (f'{args.dv} {"differed" if p < 0.05 else "did not differ significantly"} across levels of {args.group}, '
                  f"Welch's F({df1}, {df_text(df2)}) = {num(f)}, {p_text(p)}."))
    pairs = [(i, j) for i in range(len(names)) for j in range(i + 1, len(names))]
    tests = [core.welch(samples[i], samples[j]) for i, j in pairs]
    adjusted = holm([t[2] for t in tests])
    post = Table(2, "Pairwise Welch's t Tests (Holm-Adjusted)", ['Comparison', 'Mean difference', 't', 'df', 'Adjusted p', "Cohen's d"],
                 [[f'{names[i]} - {names[j]}', num(mean(samples[i]) - mean(samples[j])), num(t[0]), df_text(t[1]), pval(adj),
                   num(core.cohens_d(samples[i], samples[j]))] for (i, j), t, adj in zip(pairs, tests, adjusted)],
                 ["Holm's step-down adjustment across all comparisons."],
                 checks=['Interpret pairwise comparisons only if the overall test supports doing so.'])
    return [main, post], "Welch's one-way ANOVA; pairwise Welch's t tests with Holm adjustment."


def effect_codes(levels, value):
    """Deviation (sum-to-zero) coding: one column for each level but the last."""
    if value == levels[-1]:
        return [-1.0] * (len(levels) - 1)
    return [1.0 if value == level else 0.0 for level in levels[:-1]]


def cmd_factorial(rows, args):
    """Two-way between-groups ANOVA with Type III sums of squares; covariates make it an ANCOVA."""
    fa, fb = args.factors
    covs = args.covariates or []
    core.require(rows, [args.dv, fa, fb] + covs)
    cases = []
    for row in rows:
        if any(core.is_missing(row[c]) for c in [args.dv, fa, fb] + covs):
            continue
        cases.append((core.to_number(row[args.dv], args.dv), row[fa].strip(), row[fb].strip(),
                      [core.to_number(row[c], c) for c in covs]))
    la, lb = sorted({c[1] for c in cases}), sorted({c[2] for c in cases})
    if len(la) < 2 or len(lb) < 2:
        raise DataError('Each factor needs at least two levels.')
    cells = {}
    for y, a, b, _ in cases:
        cells.setdefault((a, b), []).append(y)
    if len(cells) < len(la) * len(lb):
        raise DataError('At least one combination of the two factors has no cases; the interaction cannot be estimated.')
    blocks = {'a': [], 'b': [], 'ab': [], 'cov': []}
    for _, a, b, cv in cases:
        ca, cb = effect_codes(la, a), effect_codes(lb, b)
        blocks['a'].append(ca)
        blocks['b'].append(cb)
        blocks['ab'].append([x * z for x in ca for z in cb])
        blocks['cov'].append(cv)
    y = [c[0] for c in cases]
    n = len(y)

    def design(leave_out=None, leave_cov=None):
        out = []
        for i in range(n):
            row = [1.0]
            for key in ('a', 'b', 'ab'):
                if key != leave_out:
                    row += blocks[key][i]
            row += [v for j, v in enumerate(blocks['cov'][i]) if j != leave_cov]
            out.append(row)
        return out

    full = design()
    _, sse, _ = ols(full, y)
    dfe = n - len(full[0])
    if dfe < 1:
        raise DataError('Too few cases for this design.')
    mse = sse / dfe
    table_rows, sentences = [], []
    terms = [(c, None, j, 1) for j, c in enumerate(covs)] + [(fa, 'a', None, len(la) - 1), (fb, 'b', None, len(lb) - 1),
                                                             (f'{fa} x {fb}', 'ab', None, (len(la) - 1) * (len(lb) - 1))]
    for label, key, cov, df in terms:
        _, reduced, _ = ols(design(key, cov), y)
        ss = reduced - sse
        f = (ss / df) / mse if mse > 0 else float('inf')
        p = sd.f_p(f, df, dfe)
        eta = ss / (ss + sse) if ss + sse > 0 else float('nan')
        table_rows.append([label, num(ss), df, num(ss / df), num(f), pval(p), no_zero(eta)])
        sentences.append(f'{label}, F({df}, {dfe}) = {num(f)}, {p_text(p)}, partial eta squared = {no_zero(eta)}')
    table_rows.append(['Error', num(sse), dfe, num(mse), '', '', ''])
    desc = Table(1, f'{args.dv} by {fa} and {fb}: Cell Means', [fa, fb, 'n', 'M', 'SD'],
                 [[a, b, len(cells[(a, b)]), num(mean(cells[(a, b)])), num(sdev(cells[(a, b)])) if len(cells[(a, b)]) > 1 else '-']
                  for a in la for b in lb])
    sizes = {len(v) for v in cells.values()}
    checks = ['If the interaction is reliable, interpret it before the main effects.']
    if len(sizes) > 1:
        checks.append('Cell sizes are unequal. Type III sums of squares are reported; other software may default to a different type.')
    if covs:
        checks.append('ANCOVA assumes the covariate has the same slope in every cell. This tool does not test that.')
    main = Table(2, ('Analysis of Covariance' if covs else 'Two-Way Analysis of Variance') + f' of {args.dv}',
                 ['Source', 'SS', 'df', 'MS', 'F', 'p', 'partial eta squared'], table_rows,
                 [f'N = {n}. Type III sums of squares with deviation coding.'], 'Effects: ' + '; '.join(sentences) + '.', checks)
    return [desc, main], ('Two-way between-groups ' + ('ANCOVA' if covs else 'ANOVA') +
                          ' fitted by least squares with deviation coding; Type III sums of squares; partial eta squared.')


def cmd_rmanova(rows, args):
    data = within_matrix(rows, args.vars)
    n, k = len(data), len(args.vars)
    grand = mean([v for row in data for v in row])
    cond = [mean([row[j] for row in data]) for j in range(k)]
    subj = [mean(row) for row in data]
    ss_cond = n * sum((m - grand) ** 2 for m in cond)
    ss_subj = k * sum((m - grand) ** 2 for m in subj)
    ss_total = sum((v - grand) ** 2 for row in data for v in row)
    ss_err = ss_total - ss_cond - ss_subj
    df1, df2 = k - 1, (k - 1) * (n - 1)
    if ss_err <= 0:
        raise DataError('There is no residual variation; the test cannot be computed.')
    f = (ss_cond / df1) / (ss_err / df2)
    p = sd.f_p(f, df1, df2)
    cov = [[sum((row[i] - cond[i]) * (row[j] - cond[j]) for row in data) / (n - 1) for j in range(k)] for i in range(k)]
    row_means = [mean(r) for r in cov]
    overall = mean(row_means)
    centred = [[cov[i][j] - row_means[i] - row_means[j] + overall for j in range(k)] for i in range(k)]
    eps = sum(centred[i][i] for i in range(k)) ** 2 / ((k - 1) * sum(v * v for r in centred for v in r))
    eps = max(1.0 / (k - 1), min(1.0, eps))
    p_gg = sd.f_p(f, eps * df1, eps * df2)
    eta = ss_cond / (ss_cond + ss_err)
    desc = Table(1, 'Descriptive Statistics by Measure', ['Measure', 'n', 'M', 'SD'],
                 [[name, n, num(cond[j]), num(sdev([row[j] for row in data]))] for j, name in enumerate(args.vars)])
    main = Table(2, 'One-Way Repeated-Measures Analysis of Variance', ['Source', 'SS', 'df', 'MS', 'F', 'p', 'p (G-G)', 'partial eta squared'],
                 [['Measure', num(ss_cond), df1, num(ss_cond / df1), num(f), pval(p), pval(p_gg), no_zero(eta)],
                  ['Error', num(ss_err), df2, num(ss_err / df2), '', '', '', '']],
                 [f'N = {n}. Greenhouse-Geisser epsilon = {no_zero(eps)}; p (G-G) uses degrees of freedom multiplied by epsilon '
                  f'({num(eps * df1)}, {num(eps * df2)}).'],
                 (f'The measures {"differed" if p_gg < 0.05 else "did not differ significantly"}, F({num(eps * df1)}, {num(eps * df2)}) = '
                  f'{num(f)}, {p_text(p_gg)}, partial eta squared = {no_zero(eta)} (Greenhouse-Geisser corrected).'),
                 ['With three or more measures the test assumes sphericity. The Greenhouse-Geisser p does not; report it '
                  'when epsilon is well below 1.'])
    return [desc, main], 'One-way repeated-measures ANOVA on complete cases with the Greenhouse-Geisser correction.'


# ---------------------------------------------------------------- categorical

def crosstab(rows, r, c):
    core.require(rows, [r, c])
    counts = {}
    for row in rows:
        if core.is_missing(row[r]) or core.is_missing(row[c]):
            continue
        counts[(row[r].strip(), row[c].strip())] = counts.get((row[r].strip(), row[c].strip()), 0) + 1
    rn, cn = sorted({k[0] for k in counts}), sorted({k[1] for k in counts})
    return rn, cn, [[counts.get((a, b), 0) for b in cn] for a in rn]


def cmd_fisher(rows, args):
    rn, cn, t = crosstab(rows, args.row, args.col)
    if len(rn) != 2 or len(cn) != 2:
        raise DataError(f"Fisher's exact test here needs a 2 by 2 table; this one is {len(rn)} by {len(cn)}. Use chisq.")
    a, b, c, d = t[0][0], t[0][1], t[1][0], t[1][1]
    r1, r2, c1, n = a + b, c + d, a + c, a + b + c + d

    def pmf(x):
        return math.exp(log_choose(r1, x) + log_choose(r2, c1 - x) - log_choose(n, c1))

    observed = pmf(a)
    p = min(1.0, sum(pmf(x) for x in range(max(0, c1 - r2), min(r1, c1) + 1) if pmf(x) <= observed * (1 + 1e-7)))
    if b * c == 0 or a * d == 0:
        ratio, ci = float('nan'), '-'
        note = 'The odds ratio is not defined because a cell is zero.'
    else:
        ratio = a * d / (b * c)
        se = math.sqrt(1 / a + 1 / b + 1 / c + 1 / d)
        ci = f'[{num(math.exp(math.log(ratio) - 1.959964 * se))}, {num(math.exp(math.log(ratio) + 1.959964 * se))}]'
        note = 'The odds ratio is the sample cross-product ratio, with a 95% confidence interval by the log (Woolf) method.'
    table = Table(1, f"{args.row} by {args.col}: Fisher's Exact Test", [args.row] + cn + ['Total'],
                  [[rn[0], a, b, r1], [rn[1], c, d, r2], ['Total', a + c, b + d, n]],
                  [f'Two-sided exact p {pval(p) if p < 0.001 else "= " + pval(p)}. Odds ratio = {num(ratio)}, 95% CI {ci}. ' + note],
                  (f'{args.row} and {args.col} were {"" if p < 0.05 else "not significantly "}associated, '
                   f"Fisher's exact test, {p_text(p)}" + ('' if math.isnan(ratio) else f', odds ratio = {num(ratio)}, 95% CI {ci}') + '.'))
    return [table], "Fisher's exact test, two-sided (sum of the probabilities of tables no more likely than the one observed)."


def cmd_mcnemar(rows, args):
    an, bn = args.paired
    rn, cn, t = crosstab(rows, an, bn)
    levels = sorted(set(rn) | set(cn))
    if len(levels) != 2:
        raise DataError(f"McNemar's test needs two measures that each take the same two values; found {', '.join(levels)}.")
    cell = {(a, b): 0 for a in levels for b in levels}
    for i, a in enumerate(rn):
        for j, b in enumerate(cn):
            cell[(a, b)] = t[i][j]
    b, c = cell[(levels[0], levels[1])], cell[(levels[1], levels[0])]
    m = b + c
    p = 1.0 if m == 0 else min(1.0, 2.0 * sum(math.exp(log_choose(m, i) + m * math.log(0.5)) for i in range(min(b, c) + 1)))
    table = Table(1, f"McNemar's Test: {an} and {bn}", [an, f'{bn}: {levels[0]}', f'{bn}: {levels[1]}'],
                  [[levels[0], cell[(levels[0], levels[0])], b], [levels[1], c, cell[(levels[1], levels[1])]]],
                  [f'{m} pairs changed ({b} and {c}). Exact two-sided binomial p {pval(p) if p < 0.001 else "= " + pval(p)}.'],
                  (f'The proportion of {levels[1]} {"differed" if p < 0.05 else "did not differ significantly"} between {an} and {bn}, '
                   f"McNemar's exact test, {p_text(p)}."))
    return [table], "McNemar's test for paired proportions, exact binomial, two-sided."


def cmd_gof(rows, args):
    core.require(rows, [args.var])
    counts = {}
    for row in rows:
        if not core.is_missing(row[args.var]):
            counts[row[args.var].strip()] = counts.get(row[args.var].strip(), 0) + 1
    names = sorted(counts)
    k, n = len(names), sum(counts.values())
    if k < 2:
        raise DataError(f'"{args.var}" has only one category.')
    if args.expected:
        if len(args.expected) != k or any(v <= 0 for v in args.expected):
            raise DataError(f'Give {k} positive expected proportions, in this order: {", ".join(names)}.')
        total = sum(args.expected)
        expected = [n * v / total for v in args.expected]
    else:
        expected = [n / k] * k
    chi = sum((counts[name] - e) ** 2 / e for name, e in zip(names, expected))
    p = sd.chi2_p(chi, k - 1)
    checks = ['At least one expected count is below 5; the chi-square approximation may be poor.'] if min(expected) < 5 else []
    table = Table(1, f'Chi-Square Goodness-of-Fit Test for {args.var}', [args.var, 'Observed', 'Expected', 'Residual'],
                  [[name, counts[name], num(e), num(counts[name] - e)] for name, e in zip(names, expected)],
                  [f'N = {n}. Expected counts are ' + ('from the proportions supplied' if args.expected else 'equal across categories') + '.'],
                  (f'The distribution of {args.var} {"differed" if p < 0.05 else "did not differ significantly"} from the expected one, '
                   f'chi-square({k - 1}, N = {n}) = {num(chi)}, {p_text(p)}.'), checks)
    return [table], 'Chi-square goodness-of-fit test.'


# ---------------------------------------------------------------- models and scales

def cmd_logistic(rows, args):
    core.require(rows, [args.dv] + args.ivs)
    kept = [row for row in rows if not any(core.is_missing(row[c]) for c in [args.dv] + args.ivs)]
    levels = sorted({row[args.dv].strip() for row in kept})
    if len(levels) != 2:
        raise DataError(f'"{args.dv}" must take exactly two values; it takes {len(levels)}.')
    try:
        numeric = sorted(float(v) for v in levels)
        event = levels[0] if float(levels[0]) == numeric[1] else levels[1]
    except ValueError:
        event = levels[1]
    y = [1.0 if row[args.dv].strip() == event else 0.0 for row in kept]
    x = [[1.0] + [core.to_number(row[c], c) for c in args.ivs] for row in kept]
    n, k = len(y), len(args.ivs)
    if n <= k + 2:
        raise DataError(f'{n} complete rows is too few for {k} predictors.')
    beta = [0.0] * (k + 1)

    def loglik(b):
        total = 0.0
        for row, yi in zip(x, y):
            eta = sum(c * v for c, v in zip(b, row))
            total += yi * eta - (math.log1p(math.exp(eta)) if eta < 30 else eta)
        return total

    inverse = None
    for _ in range(60):
        probs = []
        for row in x:
            eta = max(-30.0, min(30.0, sum(c * v for c, v in zip(beta, row))))
            probs.append(1.0 / (1.0 + math.exp(-eta)))
        info = [[sum(p * (1 - p) * row[i] * row[j] for p, row in zip(probs, x)) for j in range(k + 1)] for i in range(k + 1)]
        score = [sum((yi - p) * row[i] for yi, p, row in zip(y, probs, x)) for i in range(k + 1)]
        try:
            inverse, step = core.solve(info, score)
        except DataError:
            raise DataError('The model cannot be fitted: the predictors are collinear, or they separate the two outcomes perfectly.')
        beta = [b + s for b, s in zip(beta, step)]
        if max(abs(s) for s in step) < 1e-10:
            break
    else:
        raise DataError('The model did not converge. A predictor may separate the two outcomes perfectly.')
    if any(abs(b) > 25 for b in beta[1:]) and any(math.sqrt(inverse[i][i]) > 100 for i in range(1, k + 1)):
        raise DataError('A predictor separates the two outcomes perfectly or almost so; the estimates are not meaningful.')
    events = sum(y)
    ll, ll0 = loglik(beta), events * math.log(events / n) + (n - events) * math.log(1 - events / n)
    lr = 2 * (ll - ll0)
    p_model = sd.chi2_p(lr, k)
    mcfadden = 1 - ll / ll0
    cox = 1 - math.exp(-lr / n)
    nagelkerke = cox / (1 - math.exp(2 * ll0 / n))
    table_rows = []
    for i, name in enumerate(['(Intercept)'] + args.ivs):
        se = math.sqrt(inverse[i][i])
        z = beta[i] / se
        ratio = '' if i == 0 else num(math.exp(beta[i]))
        ci = '' if i == 0 else f'[{num(math.exp(beta[i] - 1.959964 * se))}, {num(math.exp(beta[i] + 1.959964 * se))}]'
        table_rows.append([name, num(beta[i]), num(se), num(z), pval(sd.z_p_two_sided(z)), ratio, ci])
    checks = []
    if min(events, n - events) < 10 * k:
        checks.append(f'The rarer outcome has {int(min(events, n - events))} cases for {k} predictors; estimates may be unstable '
                      '(a common guide is at least 10 per predictor).')
    table = Table(1, f'Logistic Regression Predicting {args.dv} = {event}', ['Predictor', 'B', 'SE', 'z', 'p', 'Odds ratio', '95% CI for odds ratio'],
                  table_rows, [f'N = {n}; {int(events)} cases with {args.dv} = {event}. Likelihood-ratio chi-square({k}) = {num(lr)}, '
                               f'p {pval(p_model) if p_model < 0.001 else "= " + pval(p_model)}. McFadden R squared = {no_zero(mcfadden)}, '
                               f'Nagelkerke R squared = {no_zero(nagelkerke)}. Wald tests and Wald confidence intervals.'],
                  (f'The model {"fitted better than" if p_model < 0.05 else "did not fit significantly better than"} the intercept-only model, '
                   f'chi-square({k}) = {num(lr)}, {p_text(p_model)}, Nagelkerke R squared = {no_zero(nagelkerke)}.'), checks)
    return [table], 'Binary logistic regression by maximum likelihood (iteratively reweighted least squares) on complete cases.'


def cronbach(columns):
    k = len(columns)
    totals = [sum(col[i] for col in columns) for i in range(len(columns[0]))]
    vt = variance(totals)
    return float('nan') if vt == 0 else k / (k - 1.0) * (1 - sum(variance(c) for c in columns) / vt)


def cmd_reliability(rows, args):
    data = core.numeric_complete(rows, args.vars)
    k, n = len(args.vars), len(data)
    if k < 2:
        raise DataError('Give at least two items.')
    if n < 3:
        raise DataError('Fewer than three complete cases.')
    cols = [[row[j] for row in data] for j in range(k)]
    alpha = cronbach(cols)
    table_rows = []
    for j, name in enumerate(args.vars):
        rest = [sum(row[i] for i in range(k) if i != j) for row in data]
        dropped = cronbach([c for i, c in enumerate(cols) if i != j]) if k > 2 else float('nan')
        table_rows.append([name, num(mean(cols[j])), num(sdev(cols[j])), no_zero(core.pearson(cols[j], rest)), no_zero(dropped)])
    checks = []
    if any(core.pearson(cols[j], [sum(row[i] for i in range(k) if i != j) for row in data]) < 0 for j in range(k)):
        checks.append('An item correlates negatively with the rest of the scale. Check whether it needs reverse scoring; '
                      'this tool does not reverse-score items.')
    table = Table(1, 'Scale Reliability', ['Item', 'M', 'SD', 'Item-rest correlation', 'Alpha if item deleted'], table_rows,
                  [f"N = {n}, {k} items. Cronbach's alpha = {no_zero(alpha)}."],
                  f"The {k}-item scale had a Cronbach's alpha of {no_zero(alpha)}.", checks)
    return [table], "Cronbach's alpha from item variances on complete cases; corrected item-rest correlations."


def shapiro_wilk(values):
    """Shapiro-Wilk W and p by Royston's (1995) approximation, for 4 to 5000 values."""
    x = sorted(values)
    n = len(x)
    if not 4 <= n <= 5000:
        raise DataError('The Shapiro-Wilk test here needs between 4 and 5000 values.')
    m = [normal_quantile((i - 0.375) / (n + 0.25)) for i in range(1, n + 1)]
    msq = sum(v * v for v in m)
    u = 1.0 / math.sqrt(n)
    a = [0.0] * n
    a[n - 1] = -2.706056 * u ** 5 + 4.434685 * u ** 4 - 2.071190 * u ** 3 - 0.147981 * u ** 2 + 0.221157 * u + m[n - 1] / math.sqrt(msq)
    a[0] = -a[n - 1]
    if n > 5:
        a[n - 2] = (-3.582633 * u ** 5 + 5.682633 * u ** 4 - 1.752461 * u ** 3 - 0.293762 * u ** 2 + 0.042981 * u
                    + m[n - 2] / math.sqrt(msq))
        a[1] = -a[n - 2]
        phi = (msq - 2 * m[n - 1] ** 2 - 2 * m[n - 2] ** 2) / (1 - 2 * a[n - 1] ** 2 - 2 * a[n - 2] ** 2)
        inner = range(2, n - 2)
    else:
        phi = (msq - 2 * m[n - 1] ** 2) / (1 - 2 * a[n - 1] ** 2)
        inner = range(1, n - 1)
    for i in inner:
        a[i] = m[i] / math.sqrt(phi)
    centre = mean(x)
    ss = sum((v - centre) ** 2 for v in x)
    if ss == 0:
        raise DataError('The values do not vary.')
    w = min(1.0, sum(ai * xi for ai, xi in zip(a, x)) ** 2 / ss)
    if n <= 11:
        gamma = -2.273 + 0.459 * n
        if gamma - math.log(1 - w) <= 0:
            return w, 0.0
        mu = 0.5440 - 0.39978 * n + 0.025054 * n ** 2 - 0.0006714 * n ** 3
        sigma = math.exp(1.3822 - 0.77857 * n + 0.062767 * n ** 2 - 0.0020322 * n ** 3)
        z = (-math.log(gamma - math.log(1 - w)) - mu) / sigma
    else:
        ln = math.log(n)
        mu = -1.5861 - 0.31082 * ln - 0.083751 * ln ** 2 + 0.0038915 * ln ** 3
        sigma = math.exp(-0.4803 - 0.082676 * ln + 0.0030302 * ln ** 2)
        z = (math.log(1 - w) - mu) / sigma if w < 1 else -40.0
    return w, normal_sf(z)


def cmd_normality(rows, args):
    table_rows, checks = [], []
    for name in args.vars:
        data = [r[0] for r in core.numeric_complete(rows, [name])]
        w, p = shapiro_wilk(data)
        table_rows.append([name, len(data), num(core.skewness(data)), num(core.kurtosis(data)), no_zero(w, 3), pval(p)])
        if len(data) > 300:
            checks.append(f'{name} has {len(data)} values. In large samples the test flags departures too small to matter; '
                          'rely on the Q-Q plot and on skewness and kurtosis.')
    table = Table(1, 'Tests of Normality', ['Variable', 'n', 'Skew', 'Kurtosis', 'Shapiro-Wilk W', 'p'], table_rows,
                  ['A small p indicates a departure from a normal distribution.'], checks=checks)
    return [table], "Shapiro-Wilk test by Royston's (1995) approximation."


# ---------------------------------------------------------------- figures

def figures_for(command, rows, args):
    """Figures that go with a command, as (name, canvas) pairs."""
    out = []
    if command in ('describe', 'normality'):
        for name in args.vars:
            data = [r[0] for r in core.numeric_complete(rows, [name])]
            out.append((f'histogram-{name}', figures.histogram(data, name)))
            out.append((f'qq-{name}', figures.qq_plot(data, normal_quantile, name)))
    elif command == 'onesample':
        data = [r[0] for r in core.numeric_complete(rows, [args.var])]
        out.append((f'histogram-{args.var}', figures.histogram(data, args.var)))
    elif command == 'correlate':
        data = core.numeric_complete(rows, args.vars)
        cols = [[row[j] for row in data] for j in range(len(args.vars))]
        if getattr(args, 'method', 'pearson') == 'spearman':
            cols = [core.ranks(c) for c in cols]
        matrix = [[1.0 if i == j else core.pearson(cols[i], cols[j]) for j in range(len(cols))] for i in range(len(cols))]
        out.append(('correlations', figures.heatmap(args.vars, matrix)))
        if len(args.vars) == 2:
            raw = [[row[j] for row in data] for j in range(2)]
            out.append(('scatter', figures.scatter(raw[0], raw[1], args.vars[0], args.vars[1])))
    elif command in ('ttest', 'wilcoxon', 'mcnemar') and getattr(args, 'paired', None) and command != 'mcnemar':
        data = core.numeric_complete(rows, list(args.paired))
        cols = {name: [row[j] for row in data] for j, name in enumerate(args.paired)}
        out += paired_figures(cols)
    elif command in ('rmanova', 'friedman'):
        data = core.numeric_complete(rows, args.vars)
        out += paired_figures({name: [row[j] for row in data] for j, name in enumerate(args.vars)})
    elif command in ('ttest', 'anova', 'welchanova', 'mannwhitney', 'kruskal'):
        groups = core.grouped(rows, args.dv, args.group)
        cis = [mean_ci(g) for g in groups.values()]
        out.append(('means', figures.means_plot(list(groups), [c[0] for c in cis], [c[1] for c in cis], [c[2] for c in cis],
                                                f'Mean {args.dv} (95% CI)', args.group)))
        out.append(('boxplot', figures.boxplot(groups, args.dv, args.group)))
    elif command == 'factorial':
        fa, fb = args.factors
        cells = {}
        for row in rows:
            if any(core.is_missing(row[c]) for c in (args.dv, fa, fb)):
                continue
            cells.setdefault((row[fa].strip(), row[fb].strip()), []).append(core.to_number(row[args.dv], args.dv))
        la, lb = sorted({k[0] for k in cells}), sorted({k[1] for k in cells})
        grid = [[mean(cells[(a, b)]) if (a, b) in cells else None for b in lb] for a in la]
        out.append(('interaction', figures.interaction_plot(la, lb, grid, f'Mean {args.dv}', fa, fb)))
    elif command in ('chisq', 'fisher'):
        rn, cn, t = crosstab(rows, args.row, args.col)
        out.append(('counts', figures.grouped_bars(rn, cn, t, 'Count', args.row, args.col)))
    elif command == 'regress':
        data = core.numeric_complete(rows, [args.dv] + args.ivs)
        y = [r[0] for r in data]
        x = [[1.0] + r[1:] for r in data]
        beta, _, _ = ols(x, y)
        fitted = [sum(b * v for b, v in zip(beta, row)) for row in x]
        resid = [yi - fi for yi, fi in zip(y, fitted)]
        out.append(('residuals', figures.scatter(fitted, resid, 'Fitted values', 'Residuals', reference='zero')))
        out.append(('qq-residuals', figures.qq_plot(resid, normal_quantile, 'Residual quantiles')))
        if len(args.ivs) == 1:
            out.append(('scatter', figures.scatter([r[1] for r in data], y, args.ivs[0], args.dv, fit=(beta[0], beta[1]))))
    return out


def paired_figures(cols):
    cis = [mean_ci(v) for v in cols.values()]
    return [('means', figures.means_plot(list(cols), [c[0] for c in cis], [c[1] for c in cis], [c[2] for c in cis],
                                         'Mean (95% CI)', 'Measure', connect=True)),
            ('boxplot', figures.boxplot(cols, 'Value', 'Measure'))]


def cmd_plot(rows, args):
    """One figure, with no test."""
    kind = args.kind

    def need(*names):
        for n in names:
            if not getattr(args, n):
                raise DataError(f'--kind {kind} needs --{n}.')

    if kind in ('hist', 'qq'):
        need('x')
        data = [r[0] for r in core.numeric_complete(rows, [args.x])]
        canvas = figures.histogram(data, args.x) if kind == 'hist' else figures.qq_plot(data, normal_quantile, args.x)
    elif kind == 'scatter':
        need('x', 'y')
        data = core.numeric_complete(rows, [args.x, args.y])
        xs, ys = [r[0] for r in data], [r[1] for r in data]
        fit = None
        if args.line:
            beta, _, _ = ols([[1.0, v] for v in xs], ys)
            fit = (beta[0], beta[1])
        canvas = figures.scatter(xs, ys, args.x, args.y, fit=fit)
    else:
        need('y', 'group')
        groups = core.grouped(rows, args.y, args.group)
        if kind == 'box':
            canvas = figures.boxplot(groups, args.y, args.group)
        else:
            cis = [mean_ci(g) for g in groups.values()]
            canvas = figures.means_plot(list(groups), [c[0] for c in cis], [c[1] for c in cis], [c[2] for c in cis],
                                        f'Mean {args.y} (95% CI)', args.group)
    args.fig = args.fig or f'figure-{kind}'
    args._single_figure = canvas
    return [], f'Figure only ({kind}); no test was run.'


# ---------------------------------------------------------------- registration

def register(add):
    p = add('onesample', 'one-sample t test against a fixed value')
    p.add_argument('--var', required=True)
    p.add_argument('--mu', type=float, required=True)
    p = add('welchanova', "Welch's one-way ANOVA with Holm-adjusted comparisons")
    p.add_argument('--dv', required=True)
    p.add_argument('--group', required=True)
    p = add('factorial', 'two-way ANOVA, or ANCOVA with --covariates')
    p.add_argument('--dv', required=True)
    p.add_argument('--factors', nargs=2, required=True, metavar=('A', 'B'))
    p.add_argument('--covariates', nargs='+')
    p = add('rmanova', 'one-way repeated-measures ANOVA')
    p.add_argument('--vars', nargs='+', required=True)
    p = add('mannwhitney', 'Mann-Whitney U test')
    p.add_argument('--dv', required=True)
    p.add_argument('--group', required=True)
    p = add('wilcoxon', 'Wilcoxon signed-rank test')
    p.add_argument('--paired', nargs=2, required=True, metavar=('A', 'B'))
    p = add('kruskal', 'Kruskal-Wallis test with Holm-adjusted comparisons')
    p.add_argument('--dv', required=True)
    p.add_argument('--group', required=True)
    p = add('friedman', 'Friedman test')
    p.add_argument('--vars', nargs='+', required=True)
    p = add('fisher', "Fisher's exact test for a 2 by 2 table")
    p.add_argument('--row', required=True)
    p.add_argument('--col', required=True)
    p = add('mcnemar', "McNemar's test for paired proportions")
    p.add_argument('--paired', nargs=2, required=True, metavar=('A', 'B'))
    p = add('gof', 'chi-square goodness-of-fit test')
    p.add_argument('--var', required=True)
    p.add_argument('--expected', nargs='+', type=float)
    p = add('logistic', 'binary logistic regression')
    p.add_argument('--dv', required=True)
    p.add_argument('--ivs', nargs='+', required=True)
    p = add('reliability', "Cronbach's alpha and item statistics")
    p.add_argument('--vars', nargs='+', required=True)
    p = add('normality', 'Shapiro-Wilk test')
    p.add_argument('--vars', nargs='+', required=True)
    p = add('plot', 'one figure, with no test')
    p.add_argument('--kind', required=True, choices=['hist', 'qq', 'box', 'means', 'scatter'])
    p.add_argument('--x')
    p.add_argument('--y')
    p.add_argument('--group')
    p.add_argument('--line', action='store_true', help='add the least-squares line to a scatter plot')
    return {'onesample': cmd_onesample, 'welchanova': cmd_welchanova, 'factorial': cmd_factorial, 'rmanova': cmd_rmanova,
            'mannwhitney': cmd_mannwhitney, 'wilcoxon': cmd_wilcoxon, 'kruskal': cmd_kruskal, 'friedman': cmd_friedman,
            'fisher': cmd_fisher, 'mcnemar': cmd_mcnemar, 'gof': cmd_gof, 'logistic': cmd_logistic,
            'reliability': cmd_reliability, 'normality': cmd_normality, 'plot': cmd_plot}
