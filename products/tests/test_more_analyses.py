"""The further analyses of the full edition, compared with values from SciPy 1.17.1 and statsmodels 0.15.0.

The reference numbers below were computed once from sample-data.csv with those libraries and are stored here, so the
test itself needs only the standard library. Run: python3 tests/test_more_analyses.py
"""

import argparse
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, '..', 'src', 'statistical-table-generator')
sys.path.insert(0, SOURCE)

import apa_more as more  # noqa: E402
import apa_tables as core  # noqa: E402
import figures  # noqa: E402

DATA = os.path.join(SOURCE, 'sample-data.csv')
ROWS = core.read_csv(DATA)


def ns(**kw):
    return argparse.Namespace(**kw)


def cells(table):
    return table.rows


class RankTests(unittest.TestCase):
    def test_mann_whitney_normal(self):
        groups = core.grouped(ROWS, 'post_score', 'sex')
        a, b = groups.values()
        u, p, method, _, _ = more.mann_whitney(a, b)
        self.assertEqual(method, 'normal approximation')
        self.assertIn(u, (1132.0, len(a) * len(b) - 1132.0))
        self.assertAlmostEqual(p, 0.24555348810778999, places=9)

    def test_mann_whitney_exact(self):
        u, p, method, _, _ = more.mann_whitney([56.7, 64.3, 60.1, 47.0, 53.3], [58.4, 69.1, 71.6, 45.1, 51.3, 78.1, 59.4])
        self.assertEqual((u, method), (13.0, 'exact'))
        self.assertAlmostEqual(p, 0.5303030303030304, places=12)
        # a tie switches to the normal approximation, as SciPy does
        u, p, method, _, _ = more.mann_whitney([56.7, 64.3, 60.1, 47.0, 53.3, 64.3], [58.4, 69.1, 71.6, 45.1, 51.3, 78.1, 59.4])
        self.assertEqual((u, method), (17.0, 'normal approximation'))
        self.assertAlmostEqual(p, 0.6165905559145692, places=10)

    def test_wilcoxon(self):
        d = core.numeric_complete(ROWS, ['pre_score', 'post_score'])
        t, p, method, _, _, _ = more.wilcoxon_signed([r[0] for r in d], [r[1] for r in d])
        self.assertEqual((t, method), (479.5, 'normal approximation'))
        self.assertAlmostEqual(p / 4.690704752368965e-10, 1.0, places=6)
        t, p, method, _, _, _ = more.wilcoxon_signed([r[0] for r in d[:12]], [r[1] for r in d[:12]])
        self.assertEqual((t, method), (22.0, 'exact'))
        self.assertAlmostEqual(p, 0.20361328125, places=12)

    def test_kruskal_and_friedman(self):
        tables, _ = more.cmd_kruskal(ROWS, ns(dv='post_score', group='condition'))
        self.assertIn('H(2) = 6.01, p = .049', tables[0].notes[0])
        tables, _ = more.cmd_friedman(ROWS, ns(vars=['pre_score', 'post_score', 'followup_score']))
        self.assertIn('N = 87. Chi-square(2) = 35.63, p < .001', tables[0].notes[0])


class MeansTests(unittest.TestCase):
    def test_one_sample(self):
        tables, _ = more.cmd_onesample(ROWS, ns(var='post_score', mu=60.0))
        self.assertEqual(cells(tables[0])[0][4:7], ['0.33', 88, '.740'])

    def test_welch_anova(self):
        f, df1, df2, p = more.welch_anova(list(core.grouped(ROWS, 'post_score', 'condition').values()))
        self.assertAlmostEqual(f, 2.7684253123715115, places=9)
        self.assertAlmostEqual(df2, 57.04833643221001, places=8)
        self.assertAlmostEqual(p, 0.07120549381606378, places=8)

    def test_factorial_type_three(self):
        tables, _ = more.cmd_factorial(ROWS, ns(dv='post_score', factors=['condition', 'sex'], covariates=None))
        got = {r[0]: r for r in cells(tables[1])}
        self.assertEqual(got['condition'][1:6], ['723.96', 2, '361.98', '3.10', '.050'])
        self.assertEqual(got['sex'][1:6], ['173.18', 1, '173.18', '1.48', '.227'])
        self.assertEqual(got['condition x sex'][1:6], ['127.59', 2, '63.79', '0.55', '.581'])

    def test_ancova(self):
        tables, _ = more.cmd_factorial(ROWS, ns(dv='post_score', factors=['condition', 'sex'], covariates=['pre_score']))
        got = {r[0]: r for r in cells(tables[1])}
        self.assertEqual((got['pre_score'][1], got['pre_score'][4]), ('7838.57', '347.87'))
        self.assertEqual((got['condition'][1], got['condition'][4], got['condition'][5]), ('1018.04', '22.59', '< .001'))
        self.assertEqual((got['sex'][4], got['sex'][5]), ('2.78', '.099'))
        self.assertEqual((got['condition x sex'][4], got['condition x sex'][5]), ('0.14', '.866'))

    def test_repeated_measures(self):
        tables, _ = more.cmd_rmanova(ROWS, ns(vars=['pre_score', 'post_score', 'followup_score']))
        row = cells(tables[1])[0]
        self.assertEqual((row[2], row[4], row[5]), (2, '23.30', '< .001'))
        self.assertEqual(cells(tables[1])[1][2], 172)


class CategoricalAndModelTests(unittest.TestCase):
    def test_fisher(self):
        tables, _ = more.cmd_fisher(ROWS, ns(row='sex', col='passed'))
        self.assertIn('Two-sided exact p = .525. Odds ratio = 1.43', tables[0].notes[0])

    def test_mcnemar(self):
        tables, _ = more.cmd_mcnemar(ROWS, ns(paired=['passed_pre', 'passed']))
        self.assertIn('p = .004', tables[0].notes[0])

    def test_goodness_of_fit(self):
        tables, _ = more.cmd_gof(ROWS, ns(var='condition', expected=None))
        self.assertIn('chi-square(2, N = 90) = 0.00, p = 1.000', tables[0].sentence)
        with self.assertRaises(core.DataError):
            more.cmd_gof(ROWS, ns(var='condition', expected=[0.5, 0.5]))

    def test_logistic(self):
        tables, _ = more.cmd_logistic(ROWS, ns(dv='passed', ivs=['study_hours', 'age']))
        rows = cells(tables[0])
        self.assertEqual([r[1] for r in rows], ['-2.24', '0.23', '0.04'])
        self.assertEqual([r[2] for r in rows], ['1.61', '0.11', '0.05'])
        self.assertIn('chi-square(2) = 5.21', tables[0].notes[0])
        self.assertIn('McFadden R squared = .04', tables[0].notes[0])

    def test_reliability(self):
        d = core.numeric_complete(ROWS, ['q1', 'q2', 'q3', 'q4'])
        self.assertAlmostEqual(more.cronbach([[r[j] for r in d] for j in range(4)]), 0.8228255773660287, places=12)

    def test_shapiro_wilk(self):
        x = [r[0] for r in core.numeric_complete(ROWS, ['post_score'])]
        w, p = more.shapiro_wilk(x)
        self.assertAlmostEqual(w, 0.9832998435059137, places=4)
        self.assertAlmostEqual(p, 0.3104430729109695, places=2)
        w, p = more.shapiro_wilk(x[:9])
        self.assertAlmostEqual(w, 0.938702390680124, places=4)
        self.assertAlmostEqual(p, 0.5683075915471636, places=2)

    def test_holm(self):
        self.assertEqual([round(v, 4) for v in more.holm([0.01, 0.04, 0.03])], [0.03, 0.06, 0.06])

    def test_normal_quantile(self):
        self.assertAlmostEqual(more.normal_quantile(0.975), 1.959963984540054, places=10)


class FigureTests(unittest.TestCase):
    def test_every_command_with_a_figure_writes_valid_files(self):
        runs = [['describe', DATA, '--vars', 'age'], ['correlate', DATA, '--vars', 'age', 'post_score'],
                ['ttest', DATA, '--dv', 'post_score', '--group', 'sex'],
                ['ttest', DATA, '--paired', 'pre_score', 'post_score'],
                ['anova', DATA, '--dv', 'post_score', '--group', 'condition'],
                ['factorial', DATA, '--dv', 'post_score', '--factors', 'condition', 'sex'],
                ['rmanova', DATA, '--vars', 'pre_score', 'post_score', 'followup_score'],
                ['chisq', DATA, '--row', 'condition', '--col', 'passed'],
                ['regress', DATA, '--dv', 'post_score', '--ivs', 'pre_score'],
                ['plot', DATA, '--kind', 'box', '--y', 'age', '--group', 'sex']]
        out = sys.stdout
        with tempfile.TemporaryDirectory() as folder:
            for i, run in enumerate(runs):
                sys.stdout = open(os.devnull, 'w')
                try:
                    code = core.main(run + ['--fig', os.path.join(folder, f'f{i}')])
                finally:
                    sys.stdout.close()
                    sys.stdout = out
                self.assertEqual(code, 0, run)
                made = [n for n in os.listdir(folder) if n.startswith(f'f{i}')]
                self.assertTrue(any(n.endswith('.svg') for n in made) and any(n.endswith('.pdf') for n in made), run)
                for name in made:
                    with open(os.path.join(folder, name), 'rb') as handle:
                        data = handle.read()
                    if name.endswith('.pdf'):
                        self.assertTrue(data.startswith(b'%PDF-1.4') and data.rstrip().endswith(b'%%EOF'))
                        self.assertNotIn(b'/Image', data)
                    else:
                        self.assertTrue(data.startswith(b'<svg') and b'<image' not in data)

    def test_ticks_and_width(self):
        self.assertEqual(figures.nice_ticks(0, 10), [0, 2, 4, 6, 8, 10])
        self.assertEqual(figures.tick_label(0.25, [0, 0.25, 0.5]), '0.25')
        self.assertAlmostEqual(figures.text_width('Mean', 10), 25.01, places=2)


if __name__ == '__main__':
    unittest.main(verbosity=1)
