#!/usr/bin/env python3
"""Mechanical pre-submission checks on a research manuscript.

Part of the ResearchWithMe Manuscript Check. Standard library only: nothing to
install beyond Python 3.8 or later. It runs on your own computer; the manuscript
is not uploaded anywhere.

    python manuscript_check.py paper.docx
    python manuscript_check.py paper.md --out my-report.md

It reads a .docx, .txt, or .md file and writes a report of things a careful
reader would check by hand:

  1. which standard sections and declarations are present
  2. citations that have no reference, and references that are never cited
  3. reported statistics whose p value does not match the test statistic
  4. numbers in the abstract that do not appear in the body
  5. figures and tables that are cited but missing, or present but never cited
  6. abbreviations used without being defined
  7. very long paragraphs and sentences
  8. a reverse outline: the first sentence of every paragraph, section by section
  9. sentences in the abstract and introduction that make a claim, listed so you
     can check each one against your results

This is software applying fixed rules. It is not peer review, it does not judge
the science, and a short report does not mean the paper is sound. It rewrites
nothing and suggests no wording. Every finding shows where it came from so you
can check it yourself; some will be false alarms.
"""

import argparse
import datetime
import math
import re
import sys
import zipfile
from xml.etree import ElementTree

import statdist as sd

VERSION = '1.0.0'
EDITION = 'full'          # the build sets 'free' in the free edition
FREE_CHECKS = ('1', '2', '5', '6')
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

SECTIONS = [
    ('Abstract', r'abstract|summary'),
    ('Introduction', r'introduction|background'),
    ('Methods', r'(materials?\s+and\s+)?methods?|methodology|experimental(\s+(setup|section|procedures?))?|'
                r'patients\s+and\s+methods|participants\s+and\s+methods'),
    ('Results', r'results?(\s+and\s+discussion)?|findings|experiments(\s+and\s+results)?|evaluation'),
    ('Discussion', r'discussion(\s+and\s+conclusions?)?|results\s+and\s+discussion|general\s+discussion'),
    ('Conclusion', r'conclusions?|concluding\s+remarks|discussion\s+and\s+conclusions?'),
    ('References', r'references|bibliography|works\s+cited|literature\s+cited|reference\s+list'),
]
DECLARATIONS = [
    ('Ethics statement', r'ethic(s|al)\s+(approval|statement|considerations?|committee|review)|institutional\s+review\s+board|'
                         r'\birb\b|informed\s+consent|declaration\s+of\s+helsinki|animal\s+care\s+and\s+use'),
    ('Funding statement', r'\bfunding\b|financial\s+support|supported\s+by|grant\s+(number|no\.?)|'
                          r'received\s+no\s+(specific\s+)?(funding|grant)'),
    ('Competing interests', r'conflicts?\s+of\s+interests?|competing\s+interests?|declaration\s+of\s+interests?|'
                            r'no\s+conflicts?|disclosure\s+statement'),
    ('Data availability', r'data\s+availability|availability\s+of\s+data|data\s+(are|is)\s+available|data\s+sharing|'
                          r'code\s+availability|available\s+(up)?on\s+(reasonable\s+)?request|osf\.io|zenodo|github\.com'),
    ('Author contributions', r'authors?[\'’]?\s+contributions?|contributions?\s+of\s+authors|credit\s+author(ship)?\s+statement'),
    ('Acknowledgements', r'acknowledge?ments?'),
]
CLAIM_WORDS = (r'\b(significant(ly)?|outperform(s|ed)?|superior|state[- ]of[- ]the[- ]art|novel|for\s+the\s+first\s+time|'
               r'the\s+first\s+(to|study|work)|demonstrat(e|es|ed)|prov(e|es|ed|en)|establish(es|ed)?|confirm(s|ed)?|'
               r'show(s|ed)?\s+that|reveal(s|ed)?|improv(e|es|ed|ement)|reduc(e|es|ed|tion)|increas(e|es|ed)|'
               r'decreas(e|es|ed)|caus(e|es|ed)|lead(s)?\s+to|led\s+to|robust|consistently|substantial(ly)?|'
               r'effective(ly)?|best|optimal|always|never|all|none)\b')
COMMON_CAPS = set('''A I AM PM USA UK EU UN OK ID TV PC II III IV VI VII VIII IX XI XII AND OR NOT THE OF IN ON TO FOR BY
    ANOVA DNA RNA PDF URL DOI ISBN ISSN HTML HTTP HTTPS CI SD SE SEM IQR OR HR RR MD PHD MSC BSC USD EUR GBP COVID AIDS HIV
    IEEE ACM APA MLA NA NS VS ET AL FIG TABLE'''.split())


# ------------------------------------------------------------------ reading

class Paragraph:
    def __init__(self, text, heading=False):
        self.text, self.heading = text, heading


def read_docx(path):
    with zipfile.ZipFile(path) as archive:
        root = ElementTree.fromstring(archive.read('word/document.xml'))
    out = []
    for p in root.iter(W + 'p'):
        parts = []
        for node in p.iter():
            if node.tag == W + 't' and node.text:
                parts.append(node.text)
            elif node.tag in (W + 'tab',):
                parts.append('\t')
            elif node.tag in (W + 'br', W + 'cr'):
                parts.append(' ')
        text = ''.join(parts).strip()
        if not text:
            continue
        style = p.find(f'{W}pPr/{W}pStyle')
        name = (style.get(W + 'val') or '') if style is not None else ''
        out.append(Paragraph(text, bool(re.match(r'(?i)heading|title|berschrift|titre', name))))
    return out


def read_text(path):
    with open(path, encoding='utf-8-sig', errors='replace') as handle:
        raw = handle.read()
    out = []
    for block in re.split(r'\n\s*\n', raw):
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines:
            continue
        if len(lines) > 1 and all(len(l) < 60 for l in lines[:1]) and re.match(r'^#{1,6}\s', lines[0]):
            out.append(Paragraph(lines[0].lstrip('# ').strip(), True))
            lines = lines[1:]
        if len(lines) == 1 and re.match(r'^#{1,6}\s', lines[0]):
            out.append(Paragraph(lines[0].lstrip('# ').strip(), True))
            continue
        if lines:
            out.append(Paragraph(' '.join(lines)))
    return out


def looks_like_heading(text):
    if len(text) > 90 or len(text.split()) > 12 or text.endswith(('.', ',', ';', ':')) and not re.match(r'^\d', text):
        return False
    bare = re.sub(r'^\s*(\d+(\.\d+)*\.?|[IVX]+\.)\s+', '', text).strip().rstrip(':').lower()
    return any(re.fullmatch(pattern, bare) for _, pattern in SECTIONS) or \
        any(re.fullmatch(pattern, bare) for _, pattern in DECLARATIONS) or \
        bool(re.fullmatch(r'keywords?|related\s+work|literature\s+review|limitations|appendix.*|supplementary.*|'
                          r'abbreviations|theoretical\s+framework|study\s+design|participants|procedure|measures|'
                          r'statistical\s+analysis|data\s+analysis', bare))


def canonical(heading):
    bare = re.sub(r'^\s*(\d+(\.\d+)*\.?|[IVX]+\.)\s+', '', heading).strip().rstrip(':').lower()
    for name, pattern in SECTIONS:
        if re.fullmatch(pattern, bare):
            return name
    return None


class Document:
    def __init__(self, paragraphs):
        self.sections = []          # (heading, canonical name or None, [paragraph text])
        current = ('(before the first heading)', None, [])
        for p in paragraphs:
            inline = re.match(r'^(abstract|summary|keywords?)\s*[:.\-]\s+(.{40,})$', p.text, re.I)
            if inline and not p.heading:
                self.sections.append(current)
                current = (inline.group(1).title(), canonical(inline.group(1)), [inline.group(2)])
                continue
            if p.heading or looks_like_heading(p.text):
                self.sections.append(current)
                current = (p.text, canonical(p.text), [])
            else:
                current[2].append(p.text)
        self.sections.append(current)
        self.sections = [s for s in self.sections if s[2] or s[1]]

    def named(self, name):
        return [s for s in self.sections if s[1] == name]

    def text_of(self, name):
        return '\n'.join('\n'.join(s[2]) for s in self.named(name))

    def body_sections(self):
        return [s for s in self.sections if s[1] not in ('Abstract', 'References')]

    def body_text(self):
        return '\n'.join('\n'.join(s[2]) for s in self.body_sections())

    def reference_entries(self):
        return [p for s in self.named('References') for p in s[2]]

    def full_text(self):
        return '\n'.join(s[0] + '\n' + '\n'.join(s[2]) for s in self.sections)


def sentences(text):
    protected = re.sub(r'\b(e\.g|i\.e|et al|vs|Fig|Figs|Eq|Eqs|No|Dr|Prof|cf|approx|resp|ca)\.', r'\1<DOT>', text)
    protected = re.sub(r'(\d)\.(\d)', r'\1<DOT>\2', protected)
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z("\[])', protected)
    return [p.replace('<DOT>', '.').strip() for p in parts if p.strip()]


def words(text):
    return re.findall(r"[^\W\d_][\w'’\-]*", text)


def quote(text, limit=160):
    text = re.sub(r'\s+', ' ', text).strip()
    return text if len(text) <= limit else text[:limit - 3].rstrip() + '...'


# ------------------------------------------------------------------ checks

def check_sections(doc):
    found = [s[1] for s in doc.sections if s[1]]
    lines, findings = [], 0
    for name, _ in SECTIONS:
        present = name in found
        if name == 'Conclusion' and not present and 'Discussion' in found:
            lines.append(f'- {name}: no separate heading (acceptable where the journal folds it into the Discussion)')
            continue
        lines.append(f'- {name}: {"found" if present else "NOT FOUND as a heading"}')
        findings += 0 if present else 1
    order = [n for n in found if n in ('Introduction', 'Methods', 'Results', 'Discussion')]
    expected = [n for n in ('Introduction', 'Methods', 'Results', 'Discussion') if n in order]
    dedup = [n for i, n in enumerate(order) if n not in order[:i]]
    if dedup != expected:
        lines.append(f'- Order of main sections is {" > ".join(dedup)}. Some journals place Methods last; check the '
                     "journal's instructions.")
    full = doc.full_text()
    lines.append('')
    lines.append('Declarations (searched anywhere in the text):')
    for name, pattern in DECLARATIONS:
        match = re.search(pattern, full, re.I)
        if match:
            start = max(0, match.start() - 40)
            lines.append(f'- {name}: found ("...{quote(full[start:match.end() + 60], 110)}")')
        else:
            lines.append(f'- {name}: NOT FOUND')
            findings += 1
    return lines, findings


NUMERIC_CITE = re.compile(r'\[(\d{1,3}(?:\s*[-–,;]\s*\d{1,3})*)\]')
AUTHOR = r"[^\W\d_][\w'’\-]+(?:\s+(?:de|van|von|der|den|la|le|di|da|del|al|bin|ibn)\s+[^\W\d_][\w'’\-]+)?"
PAREN_CITE = re.compile(r'\(([^()]*?(?:1[6-9]|20)\d\d[a-z]?[^()]*?)\)')
NARRATIVE_CITE = re.compile(rf'({AUTHOR})(?:\s+(?:and|&)\s+{AUTHOR}|\s+et\s+al\.?,?)?\s*\(((?:1[6-9]|20)\d\d[a-z]?)')
INNER_CITE = re.compile(rf'({AUTHOR})(?:\s*,?\s*(?:and|&)\s+{AUTHOR}|\s+et\s+al\.?|(?:,\s*{AUTHOR})+(?:,?\s*(?:and|&)\s+{AUTHOR})?)?'
                        r',?\s+((?:(?:1[6-9]|20)\d\d[a-z]?(?:,\s*)?)+)')


def expand(numbers):
    out = set()
    for part in re.split(r'[,;]', numbers):
        part = part.strip()
        span = re.match(r'^(\d+)\s*[-–]\s*(\d+)$', part)
        if span and int(span.group(1)) <= int(span.group(2)) <= int(span.group(1)) + 60:
            out.update(range(int(span.group(1)), int(span.group(2)) + 1))
        elif part.isdigit():
            out.add(int(part))
    return out


def fold(text):
    import unicodedata
    text = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in text if not unicodedata.combining(c)).lower()


def check_citations(doc):
    entries = doc.reference_entries()
    body = doc.text_of('Abstract') + '\n' + doc.body_text()
    lines = []
    if not entries:
        return ['- No reference list was found under a References heading, so citations could not be checked.'], 1
    numeric = set()
    for match in NUMERIC_CITE.finditer(body):
        numeric |= expand(match.group(1))
    author_year = {}
    for match in PAREN_CITE.finditer(body):
        for inner in INNER_CITE.finditer(match.group(1)):
            for year in re.findall(r'(?:1[6-9]|20)\d\d[a-z]?', inner.group(2)):
                author_year.setdefault((fold(inner.group(1)), year), quote(match.group(0), 80))
    for match in NARRATIVE_CITE.finditer(body):
        if fold(match.group(1)) not in ('figure', 'table', 'in', 'since', 'during', 'by', 'from', 'until', 'after', 'before'):
            author_year.setdefault((fold(match.group(1)), match.group(2)), quote(match.group(0) + ')', 80))
    findings = 0
    if len(numeric) >= max(3, len(author_year)):
        numbered = {}
        for i, entry in enumerate(entries, 1):
            lead = re.match(r'^\s*\[?(\d{1,3})[\].)]?\s', entry)
            numbered[int(lead.group(1)) if lead else i] = entry
        lines.append(f'Style detected: numbered citations. {len(numbered)} references, {len(numeric)} distinct numbers cited.')
        missing = sorted(n for n in numeric if n not in numbered)
        unused = sorted(n for n in numbered if n not in numeric)
        if missing:
            lines.append(f'- Cited in the text but not in the reference list: {", ".join(f"[{n}]" for n in missing)}')
        for n in unused:
            lines.append(f'- Never cited in the text: [{n}] {quote(numbered[n], 110)}')
        findings = len(missing) + len(unused)
    else:
        lines.append(f'Style detected: author-year citations. {len(entries)} references, {len(author_year)} distinct '
                     'author-year pairs cited.')
        folded = [fold(e) for e in entries]
        used = set()
        for (author, year), where in sorted(author_year.items()):
            hits = [i for i, e in enumerate(folded)
                    if re.search(r'(?<![a-z])' + re.escape(author) + r'(?![a-z])', e[:200]) and year[:4] in e]
            if hits:
                used.update(hits)
            else:
                lines.append(f'- Cited but not found in the reference list: {where}')
                findings += 1
        for i, entry in enumerate(entries):
            if i not in used:
                lines.append(f'- Never cited in the text (or cited in a form this tool could not read): {quote(entry, 110)}')
                findings += 1
    if not findings:
        lines.append('- Every citation matched a reference, and every reference was cited.')
    lines.append('')
    lines.append('This compares the text with the list. It does not check that a reference exists or is correct; '
                 'the Reference Check tool does that.')
    return lines, findings


P_PART = r'p\s*([<>=≤≥])\s*(0?\.\d+|1(?:\.0+)?)'
SEP = r'\s*[,;]?\s*(?:two-tailed|one-tailed|2-tailed|1-tailed)?\s*[,;]?\s*'
STAT_PATTERNS = [
    ('t', re.compile(r'\bt\s*\(\s*(\d+(?:\.\d+)?)\s*\)\s*=\s*(-?\s*\d+(?:\.\d+)?)' + SEP + P_PART, re.I)),
    ('F', re.compile(r'\bF\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)\s*=\s*(\d+(?:\.\d+)?)' + SEP + P_PART)),
    ('chi2', re.compile(r'(?:χ\s*2|χ²|chi-?\s?squared?|X2|Χ2|Χ²)\s*\(\s*(\d+)\s*(?:,\s*N\s*=\s*\d+\s*)?\)\s*=\s*(\d+(?:\.\d+)?)'
                        + SEP + P_PART, re.I)),
    ('r', re.compile(r'\br\s*\(\s*(\d+)\s*\)\s*=\s*(-?\s*0?\.\d+)' + SEP + P_PART)),
    ('z', re.compile(r'\b[zZ]\s*=\s*(-?\s*\d+(?:\.\d+)?)' + SEP + P_PART)),
]


def decimals(text):
    return len(text.split('.')[1]) if '.' in text else 0


def p_range(kind, groups):
    """Lowest and highest two-sided p consistent with the rounded statistic as printed."""
    def bounds(text):
        value = abs(float(text.replace(' ', '')))
        half = 0.5 * 10 ** -decimals(text)
        return max(0.0, value - half), value + half
    if kind == 't':
        lo, hi = bounds(groups[1])
        return sd.t_p_two_sided(hi, float(groups[0])), sd.t_p_two_sided(lo, float(groups[0]))
    if kind == 'F':
        lo, hi = bounds(groups[2])
        return sd.f_p(hi, float(groups[0]), float(groups[1])), sd.f_p(lo, float(groups[0]), float(groups[1]))
    if kind == 'chi2':
        lo, hi = bounds(groups[1])
        return sd.chi2_p(hi, int(groups[0])), sd.chi2_p(lo, int(groups[0]))
    if kind == 'r':
        lo, hi = bounds(groups[1])
        n = int(groups[0]) + 2
        return sd.r_p_two_sided(min(hi, 0.999999), n), sd.r_p_two_sided(lo, n)
    lo, hi = bounds(groups[0])
    return sd.z_p_two_sided(hi), sd.z_p_two_sided(lo)


def check_statistics(doc):
    text = doc.text_of('Abstract') + '\n' + doc.body_text()
    lines, findings, seen = [], 0, 0
    for kind, pattern in STAT_PATTERNS:
        for match in pattern.finditer(text):
            groups = match.groups()
            relation, reported_text = groups[-2], groups[-1]
            reported = float(reported_text)
            try:
                low, high = p_range(kind, groups[:-2])
            except (ValueError, ZeroDivisionError, OverflowError):
                continue
            if math.isnan(low) or math.isnan(high):
                continue
            seen += 1
            half = 0.5 * 10 ** -decimals(reported_text)
            if relation == '=':
                consistent = low - half <= reported <= high + half
                one_tailed = low / 2 - half <= reported <= high / 2 + half
            elif relation in '<≤':
                consistent = low < reported or (relation == '≤' and low <= reported + half)
                one_tailed = low / 2 < reported
            else:
                consistent = high > reported
                one_tailed = False
            if consistent:
                continue
            findings += 1
            mid = (low + high) / 2
            if high < 0.001:
                recomputed = 'p < .001'
            elif f'{low:.3f}' == f'{high:.3f}':
                recomputed = f'p = {low:.3f}'.replace('0.', '.')
            else:
                recomputed = f'p between {low:.3f} and {high:.3f}'.replace('0.', '.')
            flips = (reported < 0.05 or relation in '<≤' and reported <= 0.05) != (mid < 0.05) if relation != '>' else mid < 0.05
            lines.append(f'- "{quote(match.group(0), 90)}"')
            lines.append(f'  Recomputed from the statistic and degrees of freedom as printed: {recomputed} (two-sided).'
                         + (' The difference changes which side of .05 the result falls on.' if flips else '')
                         + (' The reported value would be consistent with a one-sided test; if that is what was '
                            'done, say so in the text.' if one_tailed else ''))
    if not seen:
        lines.append('- No statistics in a form this tool reads were found. It reads results written like '
                     't(28) = 2.20, p = .036; F(2, 57) = 4.10, p = .022; chi-square(1) = 3.84, p = .050; '
                     'r(48) = .31, p = .028; z = 1.96, p = .050.')
    elif not findings:
        lines.append(f'- {seen} reported results were recomputed; every p value is consistent with its statistic.')
    else:
        lines.insert(0, f'{seen} reported results were recomputed; {findings} did not match.')
    lines.append('')
    lines.append('Possible innocent causes: a typing slip in the statistic, the degrees of freedom, or p; a one-sided '
                 'test; a correction (such as Bonferroni or Greenhouse-Geisser) applied to p but not described next to '
                 'the result. Check each against your analysis output.')
    return lines, findings


NUMBER = re.compile(r'(?<![\w.])(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s?(%|percent)?')


def check_abstract_numbers(doc):
    abstract, body = doc.text_of('Abstract'), doc.body_text()
    if not abstract:
        return ['- No abstract was found, so this check was skipped.'], 0
    if not body.strip():
        return ['- No body text was found, so this check was skipped.'], 0
    squeezed = re.sub(r'[\s,]', '', body)
    lines, findings, done = [], 0, set()
    for match in NUMBER.finditer(abstract):
        raw, percent = match.group(1), match.group(2)
        plain = raw.replace(',', '')
        if plain in done:
            continue
        done.add(plain)
        if not percent and '.' not in plain and (int(plain) <= 12 or 1600 <= int(plain) <= 2100 and len(plain) == 4):
            continue
        variants = {plain, plain.lstrip('0') if plain.startswith('0.') else plain}
        if plain.startswith('.'):
            variants.add('0' + plain)
        if not any(re.search(r'(?<![\d.])' + re.escape(v) + r'(?!\d)', squeezed) for v in variants):
            start = max(0, match.start() - 60)
            lines.append(f'- {raw}{"%" if percent else ""} appears in the abstract but not in the body: '
                         f'"...{quote(abstract[start:match.end() + 40], 110)}"')
            findings += 1
    if not findings:
        lines.append('- Every number in the abstract also appears in the body.')
    lines.append('')
    lines.append('Small whole numbers and years are ignored. A number may be legitimately absent if the body gives '
                 'it to a different precision or only in a table that was not readable as text.')
    return lines, findings


def check_floats(doc):
    text = doc.full_text()
    lines, findings = [], 0
    for kind, pattern in (('Figure', r'Fig(?:ure|\.)?s?'), ('Table', r'Tables?')):
        captions = {int(n) for n in re.findall(rf'(?m)^\s*(?:{pattern})\s+(\d+)\s*[.:|\-–]', text)}
        mentions = []
        for match in re.finditer(rf'\b{pattern}\s+(\d+)(?:\s*(?:[-–]|and|&|,)\s*(\d+))?', text):
            line_start = text.rfind('\n', 0, match.start()) + 1
            if text[line_start:match.start()].strip() == '' and re.match(r'\s*[.:|\-–]', text[match.end():match.end() + 3]):
                continue
            mentions.append(int(match.group(1)))
            if match.group(2):
                mentions.append(int(match.group(2)))
        cited = set(mentions)
        for n in sorted(cited - captions):
            lines.append(f'- {kind} {n} is mentioned in the text, but no caption beginning "{kind} {n}." was found.')
            findings += 1
        for n in sorted(captions - cited):
            lines.append(f'- {kind} {n} has a caption but is never mentioned in the text.')
            findings += 1
        first = [n for i, n in enumerate(mentions) if n not in mentions[:i]]
        if first != sorted(first):
            lines.append(f'- {kind}s are first mentioned in the order {", ".join(map(str, first))}; most journals want '
                         'them numbered in order of first mention.')
            findings += 1
    if not findings:
        lines.append('- Every figure and table mentioned has a caption, and every caption is mentioned.')
    lines.append('')
    lines.append('Captions are recognised only when a paragraph begins "Figure 1." or "Table 1." (or with a colon). '
                 'Captions inside images or text boxes cannot be read.')
    return lines, findings


def check_abbreviations(doc):
    text = doc.text_of('Abstract') + '\n' + doc.body_text()
    lines, findings = [], 0
    defined = set(re.findall(r'\(([A-Z][A-Za-z0-9\-]{1,7})s?\)', text))
    defined |= set(re.findall(r'\b([A-Z][A-Z0-9\-]{1,7})s?\s*\((?:[a-z][\w\-]*\s+){1,7}[\w\-]+\)', text))
    counts = {}
    for match in re.finditer(r'\b[A-Z][A-Z0-9]{1,6}s?\b', text):
        token = match.group(0).rstrip('s') if match.group(0)[-1] == 's' and match.group(0)[:-1].isupper() else match.group(0)
        if token in COMMON_CAPS or token.isdigit() or re.fullmatch(r'[IVXLC]+', token):
            continue
        counts.setdefault(token, [0, match.start()])
        counts[token][0] += 1
    for token, (count, position) in sorted(counts.items(), key=lambda kv: kv[1][1]):
        if token in defined or count < 2:
            continue
        start = max(0, position - 50)
        lines.append(f'- {token} is used {count} times and no definition in the form "full term ({token})" was found. '
                     f'First use: "...{quote(text[start:position + 50], 100)}"')
        findings += 1
    if not findings:
        lines.append('- Every abbreviation used more than once has a definition in the form "full term (ABBR)".')
    lines.append('')
    lines.append('Names of instruments, genes, datasets, and organisations often need no definition; ignore those.')
    return lines, findings


def check_length(doc):
    lines, findings = [], 0
    abstract = doc.text_of('Abstract')
    body_words = len(words(doc.body_text()))
    lines.append(f'- Abstract: {len(words(abstract))} words. Body, excluding abstract and references: {body_words} words. '
                 f'References: {len(doc.reference_entries())} entries.')
    for heading, name, paragraphs in doc.body_sections():
        for paragraph in paragraphs:
            count = len(words(paragraph))
            if count > 250:
                lines.append(f'- Paragraph of {count} words in "{heading}": "{quote(paragraph, 90)}"')
                findings += 1
            for sentence in sentences(paragraph):
                if len(words(sentence)) > 50:
                    lines.append(f'- Sentence of {len(words(sentence))} words in "{heading}": "{quote(sentence, 90)}"')
                    findings += 1
    if not findings:
        lines.append('- No paragraph is longer than 250 words and no sentence longer than 50.')
    lines.append('')
    lines.append('Long is not wrong. These are places where a reader is most likely to lose the thread.')
    return lines, findings


def reverse_outline(doc):
    lines = ['Read down this list. Each line is the first sentence of one paragraph. If the list does not tell the '
             'story of the section, or two lines make the same point, or a line does not say what its paragraph is '
             'about, that paragraph is where to revise. One-sentence paragraphs are marked.', '']
    for heading, name, paragraphs in doc.body_sections():
        if not paragraphs:
            continue
        rows = []
        for i, paragraph in enumerate(paragraphs, 1):
            parts = sentences(paragraph)
            if not parts or len(words(paragraph)) < 8 or re.match(r'^\s*(Fig(ure|\.)?|Table)\s+\d+\s*[.:]', paragraph):
                continue
            mark = ' (one-sentence paragraph)' if len(parts) == 1 and len(words(paragraph)) < 60 else ''
            rows.append(f'{i}. {quote(parts[0], 200)}{mark}')
        if rows:
            lines += [f'**{heading}**', ''] + rows + ['']
    return lines, 0


def claims(doc):
    lines = ['Each sentence below, from the abstract and introduction, contains a word that usually signals a claim. '
             'For each one, find the result, table, or figure in your paper that supports it and write it in the '
             'margin. If you cannot, add the evidence or soften the sentence. The tool does not judge these; it only '
             'lists them.', '']
    count = 0
    for name in ('Abstract', 'Introduction'):
        for sentence in sentences(doc.text_of(name).replace('\n', ' ')):
            hits = sorted({m.group(0).lower() for m in re.finditer(CLAIM_WORDS, sentence, re.I)})
            strong = [h for h in hits if h not in ('all', 'none', 'best')]
            if not strong:
                continue
            if re.search(r'\[\d|\((?:[^()]*?)(?:1[6-9]|20)\d\d', sentence) and name == 'Introduction':
                continue        # a cited statement about earlier work, not a claim about this paper
            count += 1
            lines.append(f'{count}. [{name}] "{quote(sentence, 260)}"')
            lines.append(f'   Signal words: {", ".join(strong)}. Supported by: ______')
    if not count:
        lines.append('No sentences with claim words were found in the abstract or introduction.')
    return lines, 0


CHECKS = [
    ('1. Sections and declarations', check_sections),
    ('2. Citations and reference list', check_citations),
    ('3. Reported statistics', check_statistics),
    ('4. Numbers in the abstract', check_abstract_numbers),
    ('5. Figures and tables', check_floats),
    ('6. Abbreviations', check_abbreviations),
    ('7. Length', check_length),
    ('8. Reverse outline', reverse_outline),
    ('9. Claims to check against your results', claims),
]


def cell(title, findings):
    if findings is None:
        return 'full edition only'
    return 'worksheet' if title[0] in '89' else findings


def build_report(doc, source):
    parts, summary = [], []
    left_out = []
    for title, function in CHECKS:
        if EDITION == 'free' and title[0] not in FREE_CHECKS:
            left_out.append(title)
            summary.append((title, None))
            continue
        lines, findings = function(doc)
        parts += [f'## {title}', ''] + lines + ['']
        summary.append((title, findings))
    if left_out:
        parts += ['## Not run in the free edition', '',
                  'These checks are in the full edition and were not run on this file: '
                  + '; '.join(t.split('. ', 1)[1].lower() for t in left_out) + '.', '']
    head = ['# Manuscript check', '', f'File: {source}  ', f'Date: {datetime.date.today().isoformat()}  ',
            f'Tool: manuscript_check.py {VERSION} ({EDITION} edition)', '',
            '**Read this first.** This report was produced by software applying fixed rules. It is not peer review '
            'and not a judgement of the science. It checks only what is listed below, some findings will be false '
            'alarms, and an empty section does not mean that part of the paper is sound. Nothing in your file was changed.',
            '', '## Summary', '', '| Check | Items to look at |', '| --- | ---: |']
    head += [f'| {title} | {cell(title, findings)} |' for title, findings in summary]
    head += ['', '**Not checked:** whether the methods are appropriate, whether the conclusions follow from the '
             'results, originality or overlap with other work, whether references exist or are accurate, language '
             'quality, journal formatting rules, reporting-guideline items (use the checklists in this kit), images, '
             'equations, and anything in tables or figures that is not plain text.', '']
    return '\n'.join(head + parts), summary


def main(argv=None):
    parser = argparse.ArgumentParser(description='Mechanical pre-submission checks on a research manuscript.')
    parser.add_argument('file', help='a .docx, .txt, or .md manuscript')
    parser.add_argument('--out', help='where to write the report (default: <file>-check.md)')
    parser.add_argument('--version', action='version', version=f'manuscript_check.py {VERSION} ({EDITION} edition)')
    args = parser.parse_args(argv)
    try:
        if args.file.lower().endswith('.docx'):
            paragraphs = read_docx(args.file)
        elif args.file.lower().endswith(('.doc', '.pdf', '.odt', '.rtf', '.tex')):
            print('This tool reads .docx, .txt, and .md files. Save the manuscript as .docx (Word: File > Save As) '
                  'and run it again.', file=sys.stderr)
            return 2
        else:
            paragraphs = read_text(args.file)
    except (OSError, zipfile.BadZipFile, KeyError, ElementTree.ParseError) as error:
        print(f'Cannot read the file: {error}', file=sys.stderr)
        return 2
    if not paragraphs:
        print('The file contains no text.', file=sys.stderr)
        return 2
    report, summary = build_report(Document(paragraphs), args.file)
    out = args.out or re.sub(r'\.[^.]+$', '', args.file) + '-check.md'
    with open(out, 'w', encoding='utf-8') as handle:
        handle.write(report)
    for title, findings in summary:
        print(f'  {title:<44}{cell(title, findings):>18}')
    print(f'\nSaved {out}')
    print('This is not peer review. Some findings will be false alarms; check each one.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
