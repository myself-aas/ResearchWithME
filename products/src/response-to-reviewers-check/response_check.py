#!/usr/bin/env python3
"""Check that a response letter answers every reviewer comment.

Part of the ResearchWithMe Response-to-Reviewers Check. Standard library only:
nothing to install beyond Python 3.8 or later. It runs on your own computer;
the reviews and your letter are not uploaded anywhere.

Step 1, before you write: turn the reviews into a numbered list and an empty
letter with every comment quoted and a blank under each.

    python response_check.py split reviews.txt

Step 2, before you send: check the letter you wrote against the reviews.

    python response_check.py check reviews.txt response.docx

Files may be .docx, .txt, or .md.

The check works by finding each reviewer comment quoted in your letter, which is
how response letters are normally written, and reading what you wrote beneath
it. For each comment it reports one of:

  answered            the comment is quoted and a response follows it
  no response text    the comment is quoted but little or nothing follows it
  not found           the comment's wording does not appear in the letter

and it flags responses that do not say where the manuscript changed (a page,
line, section, table, or figure) and do not say that nothing was changed.

It never writes, completes, or rewords a response, and it has no opinion on
whether you or the reviewer is right. It cannot tell whether a response is a
good answer; only whether one is there.
"""

import argparse
import csv
import datetime
import difflib
import re
import sys
import unicodedata
import zipfile
from xml.etree import ElementTree

VERSION = '1.0.0'
EDITION = 'full'          # the build sets 'free' in the free edition
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

REVIEWER = re.compile(r'^\W*((?:reviewer|referee|reader)\s*(?:#|no\.?|number)?\s*[:\-]?\s*([0-9]+|[A-D]|one|two|three|four)\b'
                      r'|(?:associate\s+|handling\s+|academic\s+|guest\s+|section\s+)?editor(?:[\'’]s|-in-chief)?\b'
                      r'|editorial\s+office|meta-?review(?:er)?)(.*)$', re.I)
ITEM = re.compile(r'^\s*(?:(?:comment|point|query|issue|remark|q|c)\s*#?\s*)?[\(\[]?(\d{1,2}(?:\.\d{1,2})?|[a-h])[\)\].:]\s+(?=\S)',
                  re.I)
SECTION_LABEL = re.compile(r'^\W*(major|minor|specific|general|additional|other|detailed|summary|overview|recommendation)'
                           r'[\w\s/]{0,40}[:.]?\W*$', re.I)
LOCATION = re.compile(r'\b(pages?|pp?\.|lines?|ll?\.|sections?|sec\.|paragraphs?|para\.|tables?|figures?|figs?\.|'
                      r'appendix|supplementary|supplement|footnote|abstract|introduction|methods?|results|discussion|'
                      r'conclusions?|references?|title|caption|equation|eq\.)\s*(?:\d|[A-Z]\b|\(|section|,|\.|and\b|of\b|we\b)?',
                      re.I)
STRICT_LOCATION = re.compile(r'\b(pages?|pp?\.|lines?|ll?\.|sections?|sec\.|paragraphs?|para\.|tables?|figures?|figs?\.|'
                             r'appendix|footnote|equation|eq\.)\s*#?\s*([0-9]+|[A-Z]\b|[ivx]+\b)', re.I)
NO_CHANGE = re.compile(r'\b(no\s+changes?|not\s+(been\s+)?(changed|revised|modified|altered)|have\s+not\s+(made|changed|added)|'
                       r'did\s+not\s+(make|change|add)|respectfully\s+(disagree|decline|maintain)|we\s+disagree|'
                       r'left\s+(it\s+)?unchanged|retain(ed)?\s+the\s+original|prefer\s+to\s+keep|beyond\s+the\s+scope|'
                       r'thank(s)?\s+(you|the\s+reviewer)[^.]{0,80}(kind|positive|encouraging|generous)|'
                       r'no\s+(revision|action)\s+(is\s+|was\s+)?(needed|required|necessary))', re.I)


def read(path):
    """Return the file as a list of paragraphs."""
    if path.lower().endswith('.docx'):
        with zipfile.ZipFile(path) as archive:
            root = ElementTree.fromstring(archive.read('word/document.xml'))
        out = []
        for p in root.iter(W + 'p'):
            text = ''.join((n.text or '') if n.tag == W + 't' else ' ' if n.tag in (W + 'tab', W + 'br') else ''
                           for n in p.iter()).strip()
            if text:
                out.append(text)
        return out
    if path.lower().endswith(('.doc', '.pdf', '.odt', '.rtf')):
        raise ValueError('This tool reads .docx, .txt, and .md files. Save the file as .docx or paste it into a .txt file.')
    with open(path, encoding='utf-8-sig', errors='replace') as handle:
        raw = handle.read()
    out = []
    for block in re.split(r'\n\s*\n', raw):
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines:
            continue
        if sum(1 for l in lines if ITEM.match(l) or REVIEWER.match(l)) >= 1 and len(lines) > 1:
            current = []
            for line in lines:
                if (ITEM.match(line) or REVIEWER.match(line)) and current:
                    out.append(' '.join(current))
                    current = []
                current.append(line)
            out.append(' '.join(current))
        else:
            out.append(' '.join(lines))
    return out


def norm(text):
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c)).lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]+', ' ', text)).strip()


def count_words(text):
    return len(re.findall(r"[^\W_][\w'’\-]*", text))


def split_comments(paragraphs):
    """Reviewer comments as a list of dicts: id, reviewer, text."""
    comments, reviewer, counter, numbered_mode = [], 'Reviewer', 0, False
    reviewers_seen = 0
    has_heads = any(REVIEWER.match(p) and count_words(p) <= 12 for p in paragraphs)
    for paragraph in paragraphs:
        head = REVIEWER.match(paragraph)
        if head and count_words(paragraph) <= 12:
            reviewers_seen += 1
            reviewer = re.sub(r'\s+', ' ', head.group(1)).strip().title().replace('#', '').replace('  ', ' ')
            counter, numbered_mode = 0, False
            continue
        if has_heads and not reviewers_seen:
            continue                                  # covering text before the first reviewer heading
        if SECTION_LABEL.match(paragraph) and count_words(paragraph) <= 8:
            continue
        item = ITEM.match(paragraph)
        text = paragraph[item.end():].strip() if item else paragraph.strip()
        if item:
            numbered_mode = True
        elif numbered_mode and comments and comments[-1]['reviewer'] == reviewer:
            comments[-1]['text'] += ' ' + text        # continuation of a numbered comment
            continue
        if count_words(text) < 2:
            continue
        own = item.group(1) if item and re.fullmatch(r'\d{1,2}', item.group(1)) else None
        counter = int(own) if own and int(own) > counter else counter + 1
        comments.append({'reviewer': reviewer, 'n': counter, 'text': text})
    multi = len({c['reviewer'] for c in comments}) > 1
    for c in comments:
        short = re.sub(r'(?i)reviewer|referee|reader', 'R', c['reviewer'])
        short = re.sub(r'(?i).*editor.*|.*editorial.*|.*meta.*', 'E', short)
        short = re.sub(r'[^A-Za-z0-9]', '', short) or 'R'
        c['id'] = f'{short}.{c["n"]}' if multi or short != 'R' else f'C{c["n"]}'
    return comments


def locate(comments, letter_paragraphs):
    """For each comment, the index of the letter paragraph that quotes it, or None."""
    normalised = [norm(p) for p in letter_paragraphs]
    positions = []
    for comment in comments:
        target = norm(comment['text'])
        probe = target[:120]
        best, best_score = None, 0.0
        for i, paragraph in enumerate(normalised):
            if not paragraph:
                continue
            if probe[:60] and probe[:60] in paragraph:
                score = 1.0
            else:
                window = paragraph[:max(len(probe) * 2, 200)]
                blocks = difflib.SequenceMatcher(None, probe, window, autojunk=False).get_matching_blocks()
                score = sum(b.size for b in blocks if b.size >= 8) / max(len(probe), 1)
            if score > best_score:
                best, best_score = i, score
        positions.append(best if best_score >= 0.7 else None)
    return positions


def strip_quote(paragraph, comment_text):
    """What is left of a letter paragraph after the quoted comment is removed (same-paragraph responses)."""
    marker = re.search(r'(?i)\b(response|reply|answer|author[s\'’ ]*(response|reply)|our\s+response)\s*[:\-]', paragraph)
    return paragraph[marker.end():].strip() if marker else ''


def assess(comments, letter_paragraphs):
    positions = locate(comments, letter_paragraphs)
    quoted_at = sorted(p for p in positions if p is not None)
    results = []
    for comment, position in zip(comments, positions):
        if position is None:
            results.append({**comment, 'status': 'not found', 'response': '', 'flags': []})
            continue
        later = [p for p in quoted_at if p > position]
        end = later[0] if later else len(letter_paragraphs)
        chunk = [strip_quote(letter_paragraphs[position], comment['text'])] + letter_paragraphs[position + 1:end]
        chunk = [c for c in chunk if c and not (REVIEWER.match(c) and count_words(c) <= 12)]
        response = re.sub(r'(?i)^\s*(response|reply|answer|author[s\'’ ]*(response|reply)|our\s+response)\s*[:\-]\s*', '',
                          ' '.join(chunk)).strip()
        flags = []
        if count_words(response) < 8 or re.fullmatch(r'[\s_.\[\]…-]*|(?i:\[?\s*(your\s+)?response\s*(here)?\s*\]?)', response):
            status = 'no response text'
        else:
            status = 'answered'
            if not STRICT_LOCATION.search(response) and not NO_CHANGE.search(response):
                flags.append('says neither where the manuscript changed (page, line, section, table, or figure with a '
                             'number) nor that nothing was changed')
            if re.search(r'(?i)\b(will|shall|plan\s+to|intend\s+to|going\s+to)\s+(add|revise|include|address|clarify|'
                         r'correct|update|expand|provide|do)\b', response):
                flags.append('speaks of a change in the future tense ("we will..."); the revision should already contain it')
            if re.search(r'(?i)\b(todo|tbd|xxx|\?\?\?|to\s+be\s+(added|completed|confirmed)|fill\s+in|placeholder)\b', response):
                flags.append('contains a placeholder (TODO, TBD, XXX, ???)')
        results.append({**comment, 'status': status, 'response': response, 'flags': flags})
    return results


def quote(text, limit=220):
    text = re.sub(r'\s+', ' ', text).strip()
    return text if len(text) <= limit else text[:limit - 3].rstrip() + '...'


def report(results, reviews_path, letter_path):
    order = ['not found', 'no response text', 'answered']
    counts = {s: sum(1 for r in results if r['status'] == s) for s in order}
    flagged = [r for r in results if r['flags']]
    out = ['# Response-to-reviewers check', '', f'Reviews: {reviews_path}  ', f'Letter: {letter_path}  ',
           f'Date: {datetime.date.today().isoformat()}  ', f'Tool: response_check.py {VERSION}', '',
           '**Read this first.** This report was produced by software. It finds each reviewer comment quoted in your '
           'letter and reads what follows it. It can tell whether a response is present; it cannot tell whether the '
           'response is a good one, and it has no view on who is right. If you answered a comment without quoting it, '
           'it will be listed as "not found" even though you answered it. Nothing in your files was changed.', '',
           '## Summary', '', '| Result | Comments |', '| --- | ---: |',
           f'| Not found in the letter | {counts["not found"]} |',
           f'| Quoted, but no response text | {counts["no response text"]} |',
           f'| Answered | {counts["answered"]} |', f'| of which flagged | {len(flagged)} |',
           f'| **Total comments** | **{len(results)}** |', '']
    for status, title in (('not found', 'Not found in the letter'), ('no response text', 'Quoted, but no response text')):
        group = [r for r in results if r['status'] == status]
        if group:
            out += [f'## {title} ({len(group)})', '']
            out += [f'- **{r["id"]}** ({r["reviewer"]}): "{quote(r["text"])}"' for r in group]
            out.append('')
    if flagged:
        out += [f'## Answered, with something to look at ({len(flagged)})', '']
        for r in flagged:
            out += [f'- **{r["id"]}** ({r["reviewer"]}): "{quote(r["text"], 140)}"', f'  Your response begins: "{quote(r["response"], 140)}"']
            out += [f'  - The response {flag}.' for flag in r['flags']]
        out.append('')
    out += ['## Every comment', '', '| ID | Reviewer | Result | Words in response | Flags |', '| --- | --- | --- | ---: | ---: |']
    out += [f'| {r["id"]} | {r["reviewer"]} | {r["status"]} | {count_words(r["response"])} | {len(r["flags"])} |' for r in results]
    out += ['', '## What this check does not do', '',
            '- It does not judge whether a response is adequate, polite, or correct.',
            '- It does not compare your letter with the revised manuscript, so it cannot confirm that a change you '
            'describe was made. Open the manuscript at each page and line you cite and look.',
            '- It splits the reviews by their numbering. A numbered comment that contains several separate requests is '
            'still one comment here; read long comments for requests you may have passed over.', '']
    return '\n'.join(out)


def write_tracker(path, rows):
    with open(path, 'w', newline='', encoding='utf-8') as handle:
        writer = csv.writer(handle)
        writer.writerow(['id', 'reviewer', 'comment', 'status', 'what we did', 'where (page / line / section)', 'owner', 'done'])
        for r in rows:
            writer.writerow([r['id'], r['reviewer'], r['text'], r.get('status', ''), '', '', '', ''])


def skeleton(comments):
    out = ['Response to reviewers', '', 'Manuscript: [title]', 'Manuscript number: [number]', '',
           'Dear [Editor name],', '', '[Opening paragraph: yours to write.]', '']
    reviewer = None
    for c in comments:
        if c['reviewer'] != reviewer:
            reviewer = c['reviewer']
            out += [reviewer, '']
        out += [f'Comment {c["id"]}: {c["text"]}', '', 'Response: ', '', 'Change in the manuscript: page __, lines __', '']
    out += ['[Closing paragraph: yours to write.]', '']
    return '\n'.join(out)


def main(argv=None):
    parser = argparse.ArgumentParser(description='Check that a response letter answers every reviewer comment.')
    parser.add_argument('--version', action='version', version=f'response_check.py {VERSION} ({EDITION} edition)')
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('split', help='number the reviewer comments; write a tracker and an empty letter')
    p.add_argument('reviews')
    p.add_argument('--out', default='response', help='base name for the output files')
    p = sub.add_parser('check', help='check a written letter against the reviews')
    p.add_argument('reviews')
    p.add_argument('letter')
    p.add_argument('--out', default='response-check', help='base name for the output files')
    args = parser.parse_args(argv)
    try:
        comments = split_comments(read(args.reviews))
        if not comments:
            print('No reviewer comments were found in the reviews file.', file=sys.stderr)
            return 2
        if args.command == 'split':
            write_tracker(args.out + '-tracker.csv', comments)
            with open(args.out + '-letter-skeleton.txt', 'w', encoding='utf-8') as handle:
                handle.write(skeleton(comments))
            print(f'{len(comments)} comments from {len({c["reviewer"] for c in comments})} reviewer(s).')
            print(f'Saved {args.out}-tracker.csv and {args.out}-letter-skeleton.txt')
            print('Check the split by eye: a long comment may hold several requests.')
            return 0
        if EDITION == 'free':
            print('The free edition numbers the comments and builds the tracker and empty letter (the split '
                  'command). Checking a written letter is in the full edition.', file=sys.stderr)
            return 2
        results = assess(comments, read(args.letter))
    except (OSError, ValueError, zipfile.BadZipFile, KeyError, ElementTree.ParseError) as error:
        print(f'Cannot read the file: {error}', file=sys.stderr)
        return 2
    with open(args.out + '.md', 'w', encoding='utf-8') as handle:
        handle.write(report(results, args.reviews, args.letter))
    write_tracker(args.out + '-tracker.csv', results)
    for status in ('not found', 'no response text', 'answered'):
        print(f'  {status:<20}{sum(1 for r in results if r["status"] == status):>4}')
    print(f'  {"flagged":<20}{sum(1 for r in results if r["flags"]):>4}')
    print(f'\nSaved {args.out}.md and {args.out}-tracker.csv')
    print('This shows whether a response is present, not whether it is a good one.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
