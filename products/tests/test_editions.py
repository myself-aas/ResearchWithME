"""The free edition's limits, and that the full edition has none of them."""
import io, os, sys, tempfile, contextlib
SRC = os.path.join(os.path.dirname(__file__), '..', 'src')
for folder in ('manuscript-check', 'reference-check', 'response-to-reviewers-check'):
    sys.path.insert(0, os.path.join(SRC, folder))
import manuscript_check as mc
import reference_check as rc
import response_check as rs


def quiet(fn, *args):
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        return fn(*args)


def test_sources_ship_as_full():
    assert mc.EDITION == rc.EDITION == rs.EDITION == 'full'


def test_manuscript_free_runs_four_checks():
    doc = mc.Document(mc.read_text(os.path.join(SRC, 'manuscript-check', 'sample-manuscript.md')))
    mc.EDITION = 'free'
    try:
        report, summary = mc.build_report(doc, 'sample')
    finally:
        mc.EDITION = 'full'
    ran = [title[0] for title, findings in summary if findings is not None]
    assert ran == ['1', '2', '5', '6']
    assert 'Not run in the free edition' in report and 'Reverse outline\n' not in report
    assert 'not peer review' in report
    assert len([1 for _, f in mc.build_report(doc, 'sample')[1] if f is not None]) == 9


def test_reference_free_checks_sixty():
    folder = tempfile.mkdtemp()
    bib = os.path.join(folder, 'r.bib')
    with open(bib, 'w') as handle:
        for i in range(65):
            handle.write('@article{k%d, title={A Study of Topic Number %d}, author={Doe, J.}, year={2020}}\n' % (i, i))
    seen = []
    original = rc.check
    rc.check = lambda entries, client, progress=None: seen.append(len(entries)) or []
    try:
        rc.EDITION = 'free'
        assert quiet(rc.main, [bib, '--email', 'a@b.org', '--out', os.path.join(folder, 'free')]) == 0
        rc.EDITION = 'full'
        assert quiet(rc.main, [bib, '--email', 'a@b.org', '--out', os.path.join(folder, 'full')]) == 0
    finally:
        rc.EDITION, rc.check = 'full', original
    assert seen == [60, 65]
    assert '5 further references' in open(os.path.join(folder, 'free.md')).read()
    assert not os.path.exists(os.path.join(folder, 'free.csv')) and os.path.exists(os.path.join(folder, 'full.csv'))


def test_response_free_splits_but_does_not_check():
    folder = tempfile.mkdtemp()
    reviews = os.path.join(SRC, 'response-to-reviewers-check', 'sample-reviews.txt')
    letter = os.path.join(SRC, 'response-to-reviewers-check', 'sample-response.txt')
    rs.EDITION = 'free'
    try:
        assert quiet(rs.main, ['split', reviews, '--out', os.path.join(folder, 's')]) == 0
        assert quiet(rs.main, ['check', reviews, letter, '--out', os.path.join(folder, 'c')]) == 2
    finally:
        rs.EDITION = 'full'
    assert os.path.exists(os.path.join(folder, 's-tracker.csv')) and not os.path.exists(os.path.join(folder, 'c.md'))


if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_'):
            fn(); print('ok', name)
