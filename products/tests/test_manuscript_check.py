"""Tests for manuscript_check.py against the sample manuscript, whose defects are planted."""
import os, sys, zipfile, tempfile
SRC = os.path.join(os.path.dirname(__file__), '..', 'src', 'manuscript-check')
sys.path.insert(0, SRC)
import manuscript_check as mc


def load():
    return mc.Document(mc.read_text(os.path.join(SRC, 'sample-manuscript.md')))


def test_planted_defects_are_found():
    doc = load()
    report, summary = mc.build_report(doc, 'sample')
    counts = dict(summary)
    assert 'Whitfield and Osei (2020)' in report and 'Lindqvist' in report
    assert counts['2. Citations and reference list'] == 2
    assert 't(182) = 2.31, p = .004' in report and 'p = .022' in report
    assert counts['3. Reported statistics'] == 1          # the four correct results are not flagged
    assert 'Figure 3 is mentioned' in report and 'Table 1 has a caption but is never mentioned' in report
    assert 'LMS is used' in report and 'RCT is used' not in report   # RCT is defined in the text
    assert 'Ethics statement: NOT FOUND' in report and 'Funding statement: found' in report
    assert '81% appears in the abstract but not in the body' in report
    assert 'Sentence of' in report
    assert 'not peer review' in report
    for banned in ('we suggest', 'rewrite as', 'consider rephrasing', 'will be accepted', 'likely to be rejected'):
        assert banned not in report.lower(), banned


def test_statistics_rules():
    def run(text):
        doc = mc.Document([mc.Paragraph('Results', True), mc.Paragraph(text)])
        return mc.check_statistics(doc)
    assert run('t(28) = 2.20, p = .036; F(2, 57) = 4.10, p = .022; r(48) = .31, p = .028; z = 1.96, p = .050.')[1] == 0
    assert run('The effect held, t(28) = 2.20, p < .05, and F(2, 57) = 0.40, p > .05.')[1] == 0
    lines, n = run('The effect held, t(28) = 1.20, p = .03.')
    assert n == 1 and 'changes which side of .05' in ' '.join(lines)
    lines, n = run('The effect held, t(28) = 1.80, p = .041.')
    assert n == 1 and 'one-sided' in ' '.join(lines)
    assert run('A chi-square test was significant, χ2(2, N = 120) = 9.21, p = .010.')[1] == 0
    assert run('F(1, 40) = 3.00, p < .001')[1] == 1


def test_numbered_citations_and_docx():
    doc = mc.Document([mc.Paragraph('Introduction', True), mc.Paragraph('Earlier work [1, 3-4] and later work [7].'),
                       mc.Paragraph('References', True)] + [mc.Paragraph(f'[{i}] Author {i}. Title {i}. 2020.') for i in range(1, 6)])
    lines, n = mc.check_citations(doc)
    text = ' '.join(lines)
    assert 'numbered' in text and '[7]' in text and 'Never cited in the text: [2]' in text and n == 3
    body = ''.join(f'<w:p><w:pPr><w:pStyle w:val="{style}"/></w:pPr><w:r><w:t>{t}</w:t></w:r></w:p>' for style, t in
                   [('Heading1', 'Abstract'), ('Normal', 'We studied 250 people and found an effect.'),
                    ('Heading1', 'Peculiar Custom Heading'), ('Normal', 'Body text mentions 250 people.')])
    xml = ('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
           f'<w:body>{body}</w:body></w:document>')
    path = os.path.join(tempfile.mkdtemp(), 'x.docx')
    with zipfile.ZipFile(path, 'w') as z:
        z.writestr('word/document.xml', xml)
    doc = mc.Document(mc.read_docx(path))
    assert [s[0] for s in doc.sections] == ['Abstract', 'Peculiar Custom Heading']
    assert mc.check_abstract_numbers(doc)[1] == 0


if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_'):
            fn(); print('ok', name)
