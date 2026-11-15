"""Offline tests for reference_check.py: the indexes are replaced by canned answers."""
import io, json, os, sys, urllib.error, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'reference-check'))
import reference_check as rc

WATSON = {'title': ['Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid'],
          'author': [{'family': 'WATSON', 'given': 'J. D.'}, {'family': 'CRICK'}], 'issued': {'date-parts': [[1953, 4]]},
          'container-title': ['Nature'], 'DOI': '10.1038/171737a0'}
SHANNON = {'title': ['A Mathematical Theory of Communication'], 'author': [{'family': 'Shannon', 'given': 'C. E.'}],
           'issued': {'date-parts': [[1948, 7]]}, 'container-title': ['Bell System Technical Journal'],
           'DOI': '10.1002/j.1538-7305.1948.tb01338.x'}
RETRACTED = {'title': ['A Study Later Withdrawn'], 'author': [{'family': 'Doe'}], 'issued': {'date-parts': [[2010]]},
             'container-title': ['Some Journal'], 'DOI': '10.1000/retracted', 'updated-by': [{'type': 'retraction'}]}
UNRELATED = {'title': ['Something Else Entirely About Crystals'], 'author': [{'family': 'Other'}],
             'issued': {'date-parts': [[2001]]}, 'DOI': '10.1000/other'}


class Reply(io.BytesIO):
    def __enter__(self): return self
    def __exit__(self, *a): return False


def opener(request, timeout=30):
    url = urllib.parse.unquote(request.full_url)
    assert 'mailto=' in url and 'ResearchWithMe-ReferenceCheck' in request.get_header('User-agent')
    def ok(body): return Reply(json.dumps(body).encode())
    if 'boom' in url:
        raise urllib.error.HTTPError(url, 400, 'bad', {}, None)
    if url.startswith(rc.CROSSREF + '/10.1038/171737a0'): return ok({'message': WATSON})
    if url.startswith(rc.CROSSREF + '/10.1000/retracted'): return ok({'message': RETRACTED})
    if url.startswith(rc.CROSSREF + '/10.1000/other'): return ok({'message': UNRELATED})
    if url.startswith(rc.CROSSREF + '/'): raise urllib.error.HTTPError(url, 404, 'nf', {}, None)
    if url.startswith(rc.CROSSREF + '?'):
        if 'mathematical theory' in url.lower(): return ok({'message': {'items': [UNRELATED, SHANNON]}})
        return ok({'message': {'items': [UNRELATED]}})
    if url.startswith(rc.OPENALEX + '/https://doi.org/'):
        if '10.1038/171737a0' in url: return ok({'id': 'W1', 'is_retracted': False})
        raise urllib.error.HTTPError(url, 404, 'nf', {}, None)
    if url.startswith(rc.OPENALEX + '?'): return ok({'results': []})
    raise AssertionError('unexpected url ' + url)


def run(entries):
    return rc.check(entries, rc.Client('t@example.org', pause=0, opener=opener))


def test_sample_file():
    here = os.path.join(os.path.dirname(__file__), '..', 'src', 'reference-check', 'sample-references.bib')
    entries = rc.parse_file(here)
    assert [e['label'] for e in entries] == ['watson1953', 'shannon1948', 'placeholder2021']
    assert entries[0]['doi'] == '10.1038/171737a0' and entries[0]['first_author'] == 'Watson'
    results = run(entries)
    assert [r['status'] for r in results] == ['verified', 'verified', 'not found'], [r['status'] for r in results]
    # Shannon: year off by one is reported but does not demote the entry, and the DOI is offered.
    assert any(d[0].startswith('year (off') for d in results[1]['diffs'])
    assert any('10.1002/j.1538-7305.1948.tb01338.x' in n for n in results[1]['notes'])
    report = rc.markdown_report(results, 'x.bib', '2026-01-01')
    assert 'does not mean' in report
    for word in ('fake', 'fabricat', 'invented', 'hallucinat'):
        assert word not in report.lower().replace('wrong or invented', ''), word


def test_plain_text_ris_and_statuses():
    plain = rc.parse_plain('1. Shannon, C. E. (1948). A mathematical theory of communication. Bell Syst. Tech. J., 27.\n'
                           '[2] Doe, J. (2010). A study later withdrawn. Some Journal. https://doi.org/10.1000/retracted.\n'
                           '3. Smith, A. (2015). A mathematical theory of communication. https://doi.org/10.1000/other\n'
                           '4. ibid.\n'
                           '5. Lost, B. (2019). A paper whose lookup fails boom boom boom. Journal.\n'
                           '6. Shannon CE. A mathematical theory of communication. 1948.')
    assert plain[1]['doi'] == '10.1000/retracted' and plain[0]['year'] == '1948' and plain[0]['first_author'] == 'Shannon'
    results = run(plain)
    statuses = [r['status'] for r in results]
    assert statuses == ['verified', 'retracted', 'verified with differences', 'could not parse', 'lookup failed',
                        'verified'], statuses
    assert any(d[0] == 'title' for d in results[2]['diffs']) and 'different title' in ' '.join(results[2]['notes'])
    assert 'Possible duplicate' in ' '.join(results[5]['notes'])
    ris = rc.parse_ris('TY  - JOUR\nAU  - Shannon, C. E.\nTI  - A Mathematical Theory of Communication\nPY  - 1948\n'
                       'JO  - Bell System Technical Journal\nER  - \n')
    assert ris[0]['first_author'] == 'Shannon' and run(ris)[0]['status'] == 'verified'


def test_wrong_year_and_author_are_differences():
    entry = rc.parse_bibtex('@article{x, author={Nyquist, H.}, title={A Mathematical Theory of Communication}, year={1962}}')
    result = run(entry)[0]
    assert result['status'] == 'verified with differences'
    assert {d[0] for d in result['diffs']} == {'year', 'first author'}


if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_'):
            fn(); print('ok', name)
