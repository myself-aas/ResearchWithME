#!/usr/bin/env python3
"""Check a reference list against open scholarly indexes.

Part of the ResearchWithMe Reference Check. Standard library only: nothing to
install beyond Python 3.8 or later. It needs an internet connection, because it
looks each reference up in Crossref (https://www.crossref.org) and OpenAlex
(https://openalex.org), both of which are free and open.

    python reference_check.py references.bib --email you@university.edu
    python reference_check.py references.ris --email you@university.edu
    python reference_check.py references.txt --email you@university.edu --out my-report

A .txt file holds one reference per line (or references separated by blank
lines). The email address is sent to the indexes so they can contact you if the
script misbehaves; both ask for it and give identified users a steadier service.
It is not sent anywhere else.

What the results mean:

  verified                  found, and title, first author and year agree
  verified with differences found, but a field in your entry differs from the index
  retracted                 found, and an index marks the work as retracted
  not found                 not in the indexes searched. THIS DOES NOT MEAN THE
                            REFERENCE IS WRONG OR INVENTED. Books, chapters,
                            theses, reports, preprints, and much work not in
                            English are often missing from these indexes.
                            Check those by hand.
  lookup failed             the index did not answer; run the script again
  could not parse           the entry had no usable title or DOI

The script never changes your file and never suggests references to add. It
does not check whether a cited work supports the sentence that cites it.
"""

import argparse
import csv
import datetime
import difflib
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

VERSION = '1.0.0'
EDITION = 'full'          # the build sets 'free' in the free edition
FREE_LIMIT = 60           # references checked per run in the free edition
CROSSREF = 'https://api.crossref.org/works'
OPENALEX = 'https://api.openalex.org/works'
DOI_RE = re.compile(r'10\.\d{4,9}/[^\s"<>{}]+', re.I)
YEAR_RE = re.compile(r'(?<!\d)(1[6-9]\d\d|20\d\d)(?!\d)')
TITLE_MATCH = 0.90      # share of the indexed title that must appear in the entry
TITLE_NEAR = 0.75       # below this, a search hit is treated as a different work


# ------------------------------------------------------------------ parsing

def clean_tex(text):
    text = re.sub(r'\\[a-zA-Z]+\s*', '', text)
    text = re.sub(r"\\[`'^\"~=.]", '', text)
    return re.sub(r'\s+', ' ', text.replace('{', '').replace('}', '').replace('~', ' ')).strip()


def parse_bibtex(text):
    entries = []
    for match in re.finditer(r'@(\w+)\s*\{\s*([^,\s]+)\s*,', text):
        kind, key = match.group(1).lower(), match.group(2)
        if kind in ('comment', 'string', 'preamble'):
            continue
        depth, i = 1, match.end()
        while i < len(text) and depth:
            depth += {'{': 1, '}': -1}.get(text[i], 0)
            i += 1
        body = text[match.end():i - 1]
        fields = {}
        for field in re.finditer(r'(\w+)\s*=\s*', body):
            j = field.end()
            if j >= len(body):
                continue
            if body[j] == '{':
                d, k = 1, j + 1
                while k < len(body) and d:
                    d += {'{': 1, '}': -1}.get(body[k], 0)
                    k += 1
                value = body[j + 1:k - 1]
            elif body[j] == '"':
                k = body.find('"', j + 1)
                value = body[j + 1:k if k != -1 else len(body)]
            else:
                value = re.match(r'[^,\n]*', body[j:]).group(0)
            fields.setdefault(field.group(1).lower(), clean_tex(value))
        authors = [a.strip() for a in re.split(r'\s+and\s+', fields.get('author', '')) if a.strip()]
        first = ''
        if authors:
            first = authors[0].split(',')[0].strip() if ',' in authors[0] else authors[0].split()[-1]
        entries.append({'label': key, 'raw': fields.get('title', key), 'title': fields.get('title', ''),
                        'first_author': first, 'year': (YEAR_RE.search(fields.get('year', fields.get('date', ''))) or [''])[0],
                        'container': fields.get('journal', fields.get('booktitle', '')),
                        'doi': normalise_doi(fields.get('doi', '') or fields.get('url', ''))})
    return entries


def parse_ris(text):
    entries, current = [], None
    for line in text.splitlines():
        match = re.match(r'^([A-Z][A-Z0-9])\s{2}-\s?(.*)$', line.strip('\ufeff'))
        if not match:
            continue
        tag, value = match.group(1), match.group(2).strip()
        if tag == 'TY':
            current = {'authors': []}
        elif current is None:
            continue
        elif tag == 'ER':
            authors = current['authors']
            entries.append({'label': f'entry {len(entries) + 1}', 'raw': current.get('title', ''),
                            'title': current.get('title', ''),
                            'first_author': authors[0].split(',')[0].strip() if authors else '',
                            'year': (YEAR_RE.search(current.get('year', '')) or [''])[0],
                            'container': current.get('container', ''), 'doi': normalise_doi(current.get('doi', ''))})
            current = None
        elif tag in ('AU', 'A1'):
            current['authors'].append(value)
        elif tag in ('TI', 'T1'):
            current.setdefault('title', value)
        elif tag in ('PY', 'Y1', 'DA'):
            current.setdefault('year', value)
        elif tag in ('JO', 'JF', 'T2', 'BT'):
            current.setdefault('container', value)
        elif tag == 'DO':
            current.setdefault('doi', value)
    return entries


def parse_plain(text):
    blocks = [b.strip() for b in re.split(r'\n\s*\n', text) if b.strip()]
    if len(blocks) <= 1:
        blocks = [line.strip() for line in text.splitlines() if line.strip()]
    else:
        blocks = [re.sub(r'\s*\n\s*', ' ', b) for b in blocks]
    entries = []
    for i, block in enumerate(blocks, 1):
        body = re.sub(r'^\s*(\[\d+\]|\d+[.)])\s*', '', block)
        years = YEAR_RE.findall(DOI_RE.sub('', body))
        first = re.match(r"\s*([^\W\d_][\w'’\-]+(?:\s+[^\W\d_][\w'’\-]+)?)\s*,", body)
        entries.append({'label': f'reference {i}', 'raw': body, 'title': '',
                        'first_author': first.group(1) if first else '', 'year': years[0] if years else '',
                        'container': '', 'doi': normalise_doi(body)})
    return entries


def normalise_doi(text):
    match = DOI_RE.search(text or '')
    return match.group(0).rstrip('.,;)').lower() if match else ''


def parse_file(path):
    with open(path, encoding='utf-8-sig', errors='replace') as handle:
        text = handle.read()
    lower = path.lower()
    if lower.endswith('.bib') or re.search(r'^\s*@\w+\s*\{', text, re.M):
        return parse_bibtex(text)
    if lower.endswith('.ris') or re.search(r'^TY\s{2}-', text, re.M):
        return parse_ris(text)
    return parse_plain(text)


# ------------------------------------------------------------------ matching

def norm(text):
    text = unicodedata.normalize('NFKD', text or '')
    text = ''.join(c for c in text if not unicodedata.combining(c)).lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]+', ' ', text)).strip()


def coverage(indexed_title, entry_text):
    """Share of the indexed title found, in order, inside the entry text."""
    a, b = norm(indexed_title), norm(entry_text)
    if not a or not b:
        return 0.0
    blocks = difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks()
    return sum(block.size for block in blocks if block.size >= 3) / len(a)


def title_score(entry, record):
    if entry['title']:
        return difflib.SequenceMatcher(None, norm(entry['title']), norm(record['title']), autojunk=False).ratio()
    return coverage(record['title'], entry['raw'])


def compare(entry, record):
    """Fields of the entry that disagree with the indexed record."""
    diffs = []
    score = title_score(entry, record)
    if score < TITLE_MATCH:
        diffs.append(('title', entry['title'] or '(see entry)', record['title']))
    if entry['year'] and record['year'] and abs(int(entry['year']) - int(record['year'])) > 1:
        diffs.append(('year', entry['year'], record['year']))
    elif entry['year'] and record['year'] and entry['year'] != record['year']:
        diffs.append(('year (off by one; often online-first versus print)', entry['year'], record['year']))
    family = norm(record['first_author'])
    if family:
        if entry['first_author']:
            ok = family in norm(entry['first_author']) or norm(entry['first_author']) in family
        else:
            ok = family in norm(entry['raw'])
        if not ok:
            diffs.append(('first author', entry['first_author'] or '(see entry)', record['first_author']))
    if entry['container'] and record['container']:
        if difflib.SequenceMatcher(None, norm(entry['container']), norm(record['container'])).ratio() < 0.6 \
                and norm(entry['container']) not in norm(record['container']):
            diffs.append(('journal or book (may be an abbreviation)', entry['container'], record['container']))
    if entry['doi'] and record['doi'] and entry['doi'] != record['doi']:
        diffs.append(('DOI', entry['doi'], record['doi']))
    return diffs


# ------------------------------------------------------------------ indexes

class LookupFailed(Exception):
    pass


class Client:
    def __init__(self, email, pause=0.15, opener=None):
        self.email, self.pause = email, pause
        self.opener = opener or urllib.request.urlopen
        self.cache = {}

    def get(self, url):
        if url in self.cache:
            return self.cache[url]
        request = urllib.request.Request(url, headers={
            'User-Agent': f'ResearchWithMe-ReferenceCheck/{VERSION} (mailto:{self.email})', 'Accept': 'application/json'})
        for attempt in range(3):
            try:
                time.sleep(self.pause)
                with self.opener(request, timeout=30) as response:
                    data = json.loads(response.read().decode('utf-8'))
                self.cache[url] = data
                return data
            except urllib.error.HTTPError as error:
                if error.code == 404:
                    self.cache[url] = None
                    return None
                if error.code in (429, 500, 502, 503, 504) and attempt < 2:
                    time.sleep(2 * (attempt + 1))
                    continue
                raise LookupFailed(f'HTTP {error.code}')
            except (urllib.error.URLError, TimeoutError, ValueError, OSError) as error:
                if attempt < 2:
                    time.sleep(2 * (attempt + 1))
                    continue
                raise LookupFailed(str(error))
        raise LookupFailed('no answer')


def crossref_record(item):
    authors = item.get('author') or item.get('editor') or []
    first = authors[0] if authors else {}
    year = ''
    for key in ('issued', 'published-print', 'published-online', 'published'):
        parts = (item.get(key) or {}).get('date-parts') or [[None]]
        if parts and parts[0] and parts[0][0]:
            year = str(parts[0][0])
            break
    updates = [u.get('type', '') for u in item.get('updated-by') or []]
    return {'source': 'Crossref', 'title': ' '.join((item.get('title') or [''])[:1]),
            'first_author': first.get('family') or first.get('name') or '', 'year': year,
            'container': ' '.join((item.get('container-title') or [''])[:1]), 'doi': (item.get('DOI') or '').lower(),
            'retracted': any('retract' in u.lower() for u in updates) or
            norm(' '.join(item.get('title') or [''])).startswith('retracted')}


def openalex_record(item):
    authorships = item.get('authorships') or []
    name = ((authorships[0].get('author') or {}).get('display_name') or '') if authorships else ''
    source = ((item.get('primary_location') or {}).get('source') or {}).get('display_name') or ''
    return {'source': 'OpenAlex', 'title': item.get('title') or item.get('display_name') or '',
            'first_author': name.split()[-1] if name else '', 'year': str(item.get('publication_year') or ''),
            'container': source, 'doi': normalise_doi(item.get('doi') or ''), 'retracted': bool(item.get('is_retracted'))}


def lookup(entry, client):
    """Return (record, how) or (None, reason). Raises LookupFailed."""
    mail = urllib.parse.quote(client.email)
    if entry['doi']:
        data = client.get(f'{CROSSREF}/{urllib.parse.quote(entry["doi"], safe="/")}?mailto={mail}')
        if data and data.get('message'):
            return crossref_record(data['message']), 'by DOI'
        data = client.get(f'{OPENALEX}/https://doi.org/{urllib.parse.quote(entry["doi"], safe="/")}?mailto={mail}')
        if data and data.get('id'):
            return openalex_record(data), 'by DOI'
    query = entry['title'] or entry['raw']
    if len(norm(query)) < 12:
        return None, 'unparseable'
    best = None
    data = client.get(f'{CROSSREF}?query.bibliographic={urllib.parse.quote(query[:400])}&rows=5&mailto={mail}')
    for item in ((data or {}).get('message') or {}).get('items') or []:
        record = crossref_record(item)
        score = title_score(entry, record)
        if best is None or score > best[0]:
            best = (score, record)
    if best is None or best[0] < TITLE_MATCH:
        search = entry['title'] or re.sub(r'\s+', ' ', DOI_RE.sub('', entry['raw']))[:300]
        data = client.get(f'{OPENALEX}?search={urllib.parse.quote(search)}&per-page=5&mailto={mail}')
        for item in (data or {}).get('results') or []:
            record = openalex_record(item)
            score = title_score(entry, record)
            if best is None or score > best[0]:
                best = (score, record)
    if best and best[0] >= TITLE_NEAR:
        return best[1], 'by title search'
    return None, 'no match'


def retraction_flag(record, client):
    """Ask OpenAlex as a second opinion on retraction when Crossref gave the record."""
    if record['retracted'] or record['source'] != 'Crossref' or not record['doi']:
        return record['retracted']
    try:
        data = client.get(f'{OPENALEX}/https://doi.org/{urllib.parse.quote(record["doi"], safe="/")}'
                          f'?mailto={urllib.parse.quote(client.email)}')
    except LookupFailed:
        return False
    return bool(data and data.get('is_retracted'))


def check(entries, client, progress=None):
    results, seen = [], {}
    for i, entry in enumerate(entries, 1):
        if progress:
            progress(i, len(entries))
        result = {'entry': entry, 'status': '', 'record': None, 'diffs': [], 'notes': []}
        try:
            record, how = lookup(entry, client)
            if record is None:
                result['status'] = 'could not parse' if how == 'unparseable' else 'not found'
            else:
                result['record'] = record
                result['diffs'] = compare(entry, record)
                if retraction_flag(record, client):
                    result['status'] = 'retracted'
                elif [d for d in result['diffs'] if not d[0].startswith('year (off')]:
                    result['status'] = 'verified with differences'
                else:
                    result['status'] = 'verified'
                if how == 'by DOI' and any(d[0] == 'title' for d in result['diffs']):
                    result['notes'].append('The DOI in your entry resolves to a work with a different title. '
                                           'The DOI may belong to another reference.')
                if not entry['doi'] and record['doi']:
                    result['notes'].append(f'DOI available: {record["doi"]}')
                key = record['doi'] or norm(record['title'])
                if key in seen:
                    result['notes'].append(f'Possible duplicate of {seen[key]}.')
                else:
                    seen[key] = entry['label']
        except LookupFailed as error:
            result['status'] = 'lookup failed'
            result['notes'].append(f'The index did not answer ({error}). Run the check again.')
        results.append(result)
    return results


# ------------------------------------------------------------------ report

ORDER = ['retracted', 'verified with differences', 'not found', 'lookup failed', 'could not parse', 'verified']
NOT_FOUND_NOTE = ('"Not found" means only that Crossref and OpenAlex returned no close match. It does not mean a '
                  'reference is wrong or invented. Books, chapters, theses, reports, preprints, and much work not '
                  'published in English are often absent from these indexes. Check each one by hand.')


def markdown_report(results, source, today, skipped=0):
    counts = {status: sum(1 for r in results if r['status'] == status) for status in ORDER}
    out = ['# Reference check', '', f'File: {source}  ', f'Checked: {today}  ',
           'Indexes searched: Crossref, OpenAlex  ', f'Tool: reference_check.py {VERSION} ({EDITION} edition)', '', '## Summary', '',
           '| Result | Entries |', '| --- | ---: |']
    out += [f'| {status} | {counts[status]} |' for status in ORDER]
    out += [f'| **Total** | **{len(results)}** |', '', NOT_FOUND_NOTE, '']
    if skipped:
        out += [f'**{skipped} further references in the file were not checked.** The free edition checks the first '
                f'{FREE_LIMIT} in a run. Split the file and run each part, or use the full edition.', '']
    for status in ORDER:
        group = [r for r in results if r['status'] == status]
        if not group or status == 'verified':
            continue
        out += [f'## {status.capitalize()} ({len(group)})', '']
        for r in group:
            e, rec = r['entry'], r['record']
            out.append(f'### {e["label"]}')
            out.append('')
            out.append(f'Your entry: {e["raw"][:300]}')
            if rec:
                out.append('')
                out.append(f'Indexed record ({rec["source"]}): {rec["first_author"]} ({rec["year"]}). {rec["title"]}. '
                           f'{rec["container"]}. {"https://doi.org/" + rec["doi"] if rec["doi"] else ""}'.strip())
            if status == 'retracted':
                out += ['', 'An index marks this work as retracted. Read the retraction notice before citing it.']
            if r['diffs']:
                out += ['', '| Field | Your entry | Index |', '| --- | --- | --- |']
                out += [f'| {f} | {a} | {b} |' for f, a, b in r['diffs']]
            out += [''] + [f'- {note}' for note in r['notes']] + ['']
    verified = [r for r in results if r['status'] == 'verified']
    if verified:
        out += [f'## Verified ({len(verified)})', '']
        for r in verified:
            extra = '; '.join([f'{f}: yours {a}, index {b}' for f, a, b in r['diffs']] + r['notes'])
            out.append(f'- {r["entry"]["label"]}: {r["record"]["title"][:120]}' + (f' ({extra})' if extra else ''))
        out.append('')
    out += ['## What this check does not do', '',
            '- It does not confirm that a cited work says what your text claims it says.',
            '- It does not judge the quality of a source or of the journal that published it.',
            '- It matches on title, first author, year, and DOI. Volume, issue, and page numbers are not compared.',
            '- Retraction data comes from the indexes and can lag behind publishers. For a work you rely on, check '
            'the publisher page.', '- It never edits your file. Every correction is yours to make.', '']
    return '\n'.join(out)


def write_csv(path, results):
    with open(path, 'w', newline='', encoding='utf-8') as handle:
        writer = csv.writer(handle)
        writer.writerow(['entry', 'status', 'your_text', 'indexed_title', 'indexed_first_author', 'indexed_year',
                         'indexed_container', 'indexed_doi', 'index', 'differences', 'notes'])
        for r in results:
            rec = r['record'] or {}
            writer.writerow([r['entry']['label'], r['status'], r['entry']['raw'], rec.get('title', ''),
                             rec.get('first_author', ''), rec.get('year', ''), rec.get('container', ''),
                             rec.get('doi', ''), rec.get('source', ''),
                             '; '.join(f'{f}: {a} -> {b}' for f, a, b in r['diffs']), ' '.join(r['notes'])])


def main(argv=None):
    parser = argparse.ArgumentParser(description='Check a reference list against Crossref and OpenAlex.')
    parser.add_argument('file', help='a .bib, .ris, or .txt reference list')
    parser.add_argument('--email', required=True, help='your email address, sent to the indexes as a contact')
    parser.add_argument('--out', default='reference-check', help='base name for the report files')
    parser.add_argument('--limit', type=int, default=500, help='stop after this many entries (default 500)')
    parser.add_argument('--version', action='version', version=f'reference_check.py {VERSION} ({EDITION} edition)')
    args = parser.parse_args(argv)
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', args.email):
        print('Give a real email address with --email; the indexes ask for one.', file=sys.stderr)
        return 2
    try:
        entries = parse_file(args.file)
    except OSError as error:
        print(f'Cannot read the file: {error}', file=sys.stderr)
        return 2
    if not entries:
        print('No references were found in the file.', file=sys.stderr)
        return 2
    total = len(entries)
    entries = entries[:min(args.limit, FREE_LIMIT) if EDITION == 'free' else args.limit]
    skipped = total - len(entries) if EDITION == 'free' else 0
    print(f'Checking {len(entries)} references against Crossref and OpenAlex...')
    results = check(entries, Client(args.email),
                    progress=lambda i, n: print(f'  {i}/{n}', end='\r', flush=True))
    today = datetime.date.today().isoformat()
    with open(args.out + '.md', 'w', encoding='utf-8') as handle:
        handle.write(markdown_report(results, args.file, today, skipped))
    if EDITION == 'full':
        write_csv(args.out + '.csv', results)
    print(' ' * 20)
    for status in ORDER:
        print(f'  {status:<28}{sum(1 for r in results if r["status"] == status):>4}')
    print(f'\nSaved {args.out}.md' + (f' and {args.out}.csv' if EDITION == 'full' else ''))
    if skipped:
        print(f'{skipped} further references were not checked: the free edition checks {FREE_LIMIT} in a run.')
    print('Reminder: "not found" does not mean a reference is wrong. Check those by hand.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
