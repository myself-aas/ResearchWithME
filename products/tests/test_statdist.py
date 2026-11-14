"""Reference values for statdist.py.

The expected values were produced with SciPy 1.x (stats.t.sf, stats.f.sf, stats.chi2.sf, stats.norm.sf, stats.t.ppf)
when the module was written, and are fixed here so that the test runs without SciPy.
Run: python3 products/tests/test_statdist.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'shared'))
import statdist as sd

CASES = [
    ('t_p_two_sided', (2.31, 182), 0.022010221210274718),
    ('t_p_two_sided', (2.2, 28), 0.03622548477883782),
    ('t_p_two_sided', (0.5, 3), 0.651447964848151),
    ('t_p_two_sided', (12.0, 7), 6.358310378185098e-06),
    ('t_p_two_sided', (1.96, 100000), 0.04999856319430168),
    ('f_p', (4.1, 2, 57), 0.021695861925566308),
    ('f_p', (5.12, 1, 180), 0.024846356535990696),
    ('f_p', (0.4, 3, 20), 0.7544966731043878),
    ('f_p', (30.0, 4, 400), 7.670905999131622e-22),
    ('chi2_p', (4.9, 1), 0.02685669550752441),
    ('chi2_p', (9.21, 2), 0.01000170200470548),
    ('chi2_p', (45.0, 20), 0.0011034692430283482),
    ('chi2_p', (0.3, 5), 0.9976430862605289),
    ('z_p_two_sided', (1.96,), 0.04999579029644087),
    ('z_p_two_sided', (0.1,), 0.920344325445942),
    ('z_p_two_sided', (4.5,), 6.795346249460107e-06),
    ('r_p_two_sided', (0.42, 184), 2.9365883979710674e-09),
    ('r_p_two_sided', (0.31, 50), 0.02846094537205075),
    ('r_p_two_sided', (-0.9, 7), 0.005751515181902885),
    ('t_critical', (10, 0.95), 2.228138851986274),
    ('t_critical', (182, 0.95), 1.973084077335903),
    ('t_critical', (4, 0.99), 4.604094871349992),
]


def test_reference_values():
    for name, args, expected in CASES:
        got = getattr(sd, name)(*args)
        assert abs(got - expected) <= 1e-9 * abs(expected), (name, args, got, expected)


def test_edges():
    assert sd.t_p_two_sided(0, 10) == 1.0
    assert sd.chi2_p(0, 3) == 1.0
    assert sd.f_p(0, 2, 10) == 1.0
    assert sd.t_p_two_sided(-2.2, 28) == sd.t_p_two_sided(2.2, 28)


if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_'):
            fn(); print('ok', name)
