"""Probability functions used by the ResearchWithMe tools.

Pure Python, standard library only, so the tools run without installing
anything. Algorithms: the regularised incomplete beta function by Lentz's
continued fraction and the regularised incomplete gamma function by series or
continued fraction (both as described in Press et al., "Numerical Recipes").
Results were compared with SciPy when this file was written; see
tests/test_statdist.py in the source repository.
"""

import math

_EPS = 3e-16
_FPMIN = 1e-300


def _betacf(a, b, x):
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < _FPMIN:
        d = _FPMIN
    d = 1.0 / d
    h = d
    for m in range(1, 10000):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        if abs(d) < _FPMIN:
            d = _FPMIN
        c = 1.0 + aa / c
        if abs(c) < _FPMIN:
            c = _FPMIN
        d = 1.0 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        if abs(d) < _FPMIN:
            d = _FPMIN
        c = 1.0 + aa / c
        if abs(c) < _FPMIN:
            c = _FPMIN
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < _EPS:
            break
    return h


def betai(a, b, x):
    """Regularised incomplete beta function I_x(a, b)."""
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    ln_bt = (math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
             + a * math.log(x) + b * math.log(1.0 - x))
    bt = math.exp(ln_bt)
    if x < (a + 1.0) / (a + b + 2.0):
        return bt * _betacf(a, b, x) / a
    return 1.0 - bt * _betacf(b, a, 1.0 - x) / b


def gammaq(a, x):
    """Regularised upper incomplete gamma function Q(a, x)."""
    if x <= 0.0:
        return 1.0
    if x < a + 1.0:
        ap, total, delta = a, 1.0 / a, 1.0 / a
        for _ in range(100000):
            ap += 1.0
            delta *= x / ap
            total += delta
            if abs(delta) < abs(total) * _EPS:
                break
        return 1.0 - total * math.exp(-x + a * math.log(x) - math.lgamma(a))
    b = x + 1.0 - a
    c = 1.0 / _FPMIN
    d = 1.0 / b
    h = d
    for i in range(1, 100000):
        an = -i * (i - a)
        b += 2.0
        d = an * d + b
        if abs(d) < _FPMIN:
            d = _FPMIN
        c = b + an / c
        if abs(c) < _FPMIN:
            c = _FPMIN
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < _EPS:
            break
    return math.exp(-x + a * math.log(x) - math.lgamma(a)) * h


def t_p_two_sided(t, df):
    """Two-sided p value for Student's t."""
    if df <= 0 or math.isnan(t):
        return float('nan')
    if math.isinf(t):
        return 0.0
    return betai(df / 2.0, 0.5, df / (df + t * t))


def f_p(f, df1, df2):
    """Upper-tail p value for the F distribution."""
    if df1 <= 0 or df2 <= 0 or math.isnan(f):
        return float('nan')
    if f <= 0:
        return 1.0
    if math.isinf(f):
        return 0.0
    return betai(df2 / 2.0, df1 / 2.0, df2 / (df2 + df1 * f))


def chi2_p(x, df):
    """Upper-tail p value for the chi-square distribution."""
    if df <= 0 or math.isnan(x):
        return float('nan')
    if x <= 0:
        return 1.0
    return gammaq(df / 2.0, x / 2.0)


def z_p_two_sided(z):
    """Two-sided p value for a standard normal z."""
    return math.erfc(abs(z) / math.sqrt(2.0))


def r_p_two_sided(r, n):
    """Two-sided p value for a Pearson correlation from n pairs."""
    if n < 3 or abs(r) >= 1.0:
        return 0.0 if abs(r) >= 1.0 and n >= 3 else float('nan')
    t = r * math.sqrt((n - 2) / (1.0 - r * r))
    return t_p_two_sided(t, n - 2)


def t_critical(df, confidence=0.95):
    """Two-sided critical value of t, found by bisection."""
    alpha = 1.0 - confidence
    lo, hi = 0.0, 1e6
    for _ in range(200):
        mid = (lo + hi) / 2.0
        if t_p_two_sided(mid, df) > alpha:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2.0
