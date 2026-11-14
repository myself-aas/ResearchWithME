#!/usr/bin/env python3
"""Build the product downloads from products/src into products/downloads.

    pip install reportlab python-docx openpyxl
    python products/build.py

Each product becomes one zip file. Guides are written in Markdown under src/ and rendered to PDF here;
Word templates and spreadsheets are generated here so that their content is reviewable as code.
The build is repeatable: file dates inside the zips are fixed.
"""
import os
import re
import shutil
import sys
import zipfile
from xml.sax.saxutils import escape

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
OUT = os.path.join(HERE, 'downloads')
STAGE = os.path.join(HERE, '.stage')
VERSION = '1.0.0'
INK = colors.HexColor('#1a1a1a')
MUTED = colors.HexColor('#555555')
RULE = colors.HexColor('#999999')

LICENSE = """ResearchWithMe product licence
Version 1.0

Copyright (c) 2026 Ashif Ahmed Shuvo, ResearchWithMe. All rights reserved.

This licence covers the files in this download ("the files").

You may
  - use the files for your own research, study, and professional work, on any number of your own devices;
  - change the files for your own use;
  - use what you make with them (tables, reports, manuscripts, letters, records) for any purpose, without
    credit and without restriction. What you make is yours.

You may not
  - share, publish, resell, or sublicense the files, changed or unchanged;
  - remove this notice from copies you keep.

One purchase covers one person. A research group or department needs one purchase per person who uses the files.

No warranty. The files are provided as they are. They are aids to your own checking and do not replace it.
You remain responsible for the accuracy of everything you submit or publish. To the extent the law allows,
the author is not liable for loss arising from use of the files.

Third-party services. Some tools contact public scholarly indexes (Crossref, OpenAlex) at your request.
Those services are run by others, under their own terms, and may change or become unavailable.
"""

# ---------------------------------------------------------------- Markdown to PDF

STYLES = {
    'h1': ParagraphStyle('h1', fontName='Times-Bold', fontSize=22, leading=26, textColor=INK, spaceAfter=4),
    'lede': ParagraphStyle('lede', fontName='Times-Italic', fontSize=12.5, leading=17, textColor=MUTED, spaceAfter=2),
    'h2': ParagraphStyle('h2', fontName='Times-Bold', fontSize=15, leading=19, textColor=INK, spaceBefore=14, spaceAfter=5,
                         keepWithNext=True),
    'h3': ParagraphStyle('h3', fontName='Times-Bold', fontSize=12, leading=15, textColor=INK, spaceBefore=9, spaceAfter=3,
                         keepWithNext=True),
    'p': ParagraphStyle('p', fontName='Times-Roman', fontSize=11, leading=15.5, textColor=INK, spaceAfter=7),
    'li': ParagraphStyle('li', fontName='Times-Roman', fontSize=11, leading=15, textColor=INK, leftIndent=16,
                         bulletIndent=2, spaceAfter=3.5),
    'cell': ParagraphStyle('cell', fontName='Times-Roman', fontSize=9.5, leading=12.5, textColor=INK),
    'head': ParagraphStyle('head', fontName='Times-Bold', fontSize=9.5, leading=12.5, textColor=INK),
    'code': ParagraphStyle('code', fontName='Courier', fontSize=8.6, leading=11.5, textColor=INK, leftIndent=8,
                           spaceBefore=2, spaceAfter=8, backColor=colors.HexColor('#f2f2f0'), borderPadding=5),
}


def inline(text):
    text = escape(text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'`(.+?)`', r'<font face="Courier" size="9.5">\1</font>', text)
    return text


def markdown_to_pdf(source, target, title):
    with open(source, encoding='utf-8') as handle:
        lines = handle.read().splitlines()
    bad = sorted({c for line in lines for c in line if ord(c) > 255})
    if bad:
        raise ValueError(f'{source}: characters the built-in PDF fonts cannot draw: {bad}')
    flow, i, after_title = [], 0, False
    width = A4[0] - 44 * mm
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
        elif line.startswith('```'):
            block = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                block.append(lines[i])
                i += 1
            i += 1
            flow.append(Preformatted('\n'.join(block), STYLES['code']))
        elif line.startswith('# '):
            flow.append(Paragraph(inline(line[2:]), STYLES['h1']))
            after_title = True
            i += 1
            continue
        elif line.startswith('## '):
            flow.append(Paragraph(inline(line[3:]), STYLES['h2']))
            i += 1
        elif line.startswith('### '):
            flow.append(Paragraph(inline(line[4:]), STYLES['h3']))
            i += 1
        elif line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', c) for c in cells):
                    rows.append(cells)
                i += 1
            n = len(rows[0])
            longest = [max(len(r[c]) for r in rows) for c in range(n)]
            weights = [min(max(x, 7), 46) for x in longest]
            widths = [width * w / sum(weights) for w in weights]
            data = [[Paragraph(inline(c), STYLES['head' if r == 0 else 'cell']) for c in row] for r, row in enumerate(rows)]
            table = Table(data, colWidths=widths, repeatRows=1)
            table.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 0.9, INK), ('LINEBELOW', (0, 0), (-1, 0), 0.5, INK),
                ('LINEBELOW', (0, -1), (-1, -1), 0.9, INK), ('LINEBELOW', (0, 1), (-1, -2), 0.25, colors.HexColor('#cccccc')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6), ('TOPPADDING', (0, 0), (-1, -1), 3.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
            flow += [Spacer(1, 2), table, Spacer(1, 10)]
        elif re.match(r'^\s*(- \[ \] |- |\d+\. )', line):
            match = re.match(r'^(\s*)(- \[ \] |- |\d+\. )(.*)$', line)
            body = match.group(3)
            i += 1
            while i < len(lines) and lines[i].startswith('  ') and not re.match(r'^\s*(- |\d+\. )', lines[i]):
                body += ' ' + lines[i].strip()
                i += 1
            marker = match.group(2)
            if marker == '- [ ] ':
                bullet = '<font face="Courier" size="10">[&nbsp;]</font>'
            elif marker == '- ':
                bullet = '&bull;'
            else:
                bullet = marker.strip()
            flow.append(Paragraph(inline(body), STYLES['li'], bulletText=None if marker == '- [ ] ' else
                                  (bullet if marker != '- ' else '\u2022')) if marker != '- [ ] ' else
                        Paragraph(f'{bullet}&nbsp;&nbsp;{inline(body)}', ParagraphStyle('box', parent=STYLES['li'], leftIndent=4)))
        else:
            block = [line.strip()]
            i += 1
            while i < len(lines) and lines[i].strip() and not re.match(r'^(#|\||```|\s*- |\s*\d+\. )', lines[i]):
                block.append(lines[i].strip())
                i += 1
            style = STYLES['lede'] if after_title else STYLES['p']
            flow.append(Paragraph(inline(' '.join(block)), style))
            if after_title:
                flow.append(Spacer(1, 6))
        after_title = False

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Times-Roman', 8.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(22 * mm, 12 * mm, f'{title}  |  ResearchWithMe  |  version {VERSION}')
        canvas.drawRightString(A4[0] - 22 * mm, 12 * mm, str(doc.page))
        canvas.restoreState()

    doc = SimpleDocTemplate(target, pagesize=A4, leftMargin=22 * mm, rightMargin=22 * mm, topMargin=20 * mm,
                            bottomMargin=20 * mm, title=title, author='ResearchWithMe', invariant=1)
    doc.build(flow, onFirstPage=footer, onLaterPages=footer)

# ---------------------------------------------------------------- Word templates


def field(run, code):
    for kind, text in (('begin', None), (None, code), ('end', None)):
        if kind:
            el = OxmlElement('w:fldChar')
            el.set(qn('w:fldCharType'), kind)
        else:
            el = OxmlElement('w:instrText')
            el.set(qn('xml:space'), 'preserve')
            el.text = text
        run._r.append(el)


def base_document(double=True, indent=True):
    doc = Document()
    for section in doc.sections:
        section.page_width, section.page_height = Inches(8.5), Inches(11)
        section.left_margin = section.right_margin = section.top_margin = section.bottom_margin = Inches(1)
    normal = doc.styles['Normal']
    normal.font.name = 'Times New Roman'
    normal.font.size = Pt(12)
    normal.element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
    fmt = normal.paragraph_format
    fmt.line_spacing = 2 if double else 1.15
    fmt.space_before = Pt(0)
    fmt.space_after = Pt(0) if double else Pt(8)
    fmt.first_line_indent = Inches(0.5) if indent else None
    for name, align, bold, italic in (('Heading 1', WD_ALIGN_PARAGRAPH.CENTER, True, False),
                                      ('Heading 2', WD_ALIGN_PARAGRAPH.LEFT, True, False),
                                      ('Heading 3', WD_ALIGN_PARAGRAPH.LEFT, True, True)):
        style = doc.styles[name]
        style.font.name = 'Times New Roman'
        style.element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
        style.element.rPr.rFonts.set(qn('w:asciiTheme'), '')
        for attr in ('w:asciiTheme', 'w:hAnsiTheme', 'w:eastAsiaTheme', 'w:cstheme'):
            if style.element.rPr.rFonts.get(qn(attr)) is not None:
                del style.element.rPr.rFonts.attrib[qn(attr)]
        style.font.size = Pt(12)
        style.font.bold, style.font.italic = bold, italic
        style.font.color.rgb = RGBColor(0, 0, 0)
        pf = style.paragraph_format
        pf.alignment, pf.line_spacing = align, 2 if double else 1.15
        pf.space_before = Pt(0) if double else Pt(12)
        pf.space_after = Pt(0) if double else Pt(6)
        pf.first_line_indent = Inches(0)
        pf.keep_with_next = True
    return doc


def para(doc, text='', align=None, indent=None, bold=False, italic=False, style=None, hanging=False):
    p = doc.add_paragraph(style=style)
    if text:
        run = p.add_run(text)
        run.bold, run.italic = bold or None, italic or None
    if align is not None:
        p.alignment = align
    if indent is not None:
        p.paragraph_format.first_line_indent = Inches(indent)
    if hanging:
        p.paragraph_format.left_indent = Inches(0.5)
        p.paragraph_format.first_line_indent = Inches(-0.5)
    return p


def page_break(doc):
    doc.paragraphs[-1].add_run().add_break(WD_BREAK.PAGE)


def apa_template(path):
    doc = base_document()
    header = doc.sections[0].header.paragraphs[0]
    header.paragraph_format.first_line_indent = Inches(0)
    header.paragraph_format.line_spacing = 1
    header.paragraph_format.tab_stops.add_tab_stop(Inches(6.5), alignment=2)
    header.add_run('SHORT TITLE IN CAPITALS, 50 CHARACTERS AT MOST\t')
    field(header.add_run(), 'PAGE')
    C = WD_ALIGN_PARAGRAPH.CENTER
    for _ in range(3):
        para(doc, indent=0)
    para(doc, 'Title of the Paper in Title Case, Bold, Centred', C, 0, bold=True)
    para(doc, indent=0)
    para(doc, 'First A. Author1 and Second B. Author2', C, 0)
    para(doc, '1 Department, University', C, 0)
    para(doc, '2 Department, University', C, 0)
    para(doc, indent=0)
    para(doc, 'Author Note', C, 0, bold=True)
    para(doc, 'First A. Author, ORCID identifier. Second B. Author, ORCID identifier.')
    para(doc, '[Changes of affiliation, if any. Disclosures: study registration, data sharing, funding, conflicts of interest.]')
    para(doc, 'Correspondence concerning this article should be addressed to [name, postal address, email].')
    page_break(doc)
    para(doc, 'Abstract', C, 0, bold=True)
    para(doc, '[One paragraph, not indented, usually no more than 250 words. State the problem, the participants or '
              'materials, the method, the main findings, and the conclusions. Check the journal\'s limit.]', indent=0)
    p = para(doc)
    p.add_run('Keywords: ').italic = True
    p.add_run('first keyword, second keyword, third keyword')
    page_break(doc)
    para(doc, 'Title of the Paper in Title Case, Bold, Centred', C, 0, bold=True)
    para(doc, '[The introduction begins here, under the title repeated, with no "Introduction" heading. Body text uses the '
              'Normal style: double-spaced, first line indented half an inch, left-aligned.]')
    doc.add_heading('Method', 1)
    doc.add_heading('Participants', 2)
    para(doc, '[Text.]')
    doc.add_heading('Materials', 2)
    doc.add_heading('A Level 3 Heading, Bold Italic', 3)
    para(doc, '[Text.]')
    doc.add_heading('Procedure', 2)
    para(doc, '[Text.]')
    doc.add_heading('Results', 1)
    para(doc, '[Text. Refer to every table and figure by number, for example: see Table 1.]')
    doc.add_heading('Discussion', 1)
    para(doc, '[Text.]')
    page_break(doc)
    para(doc, 'References', C, 0, bold=True)
    para(doc, '[Author, A. A., & Author, B. B. (Year). Title of the article in sentence case. Title of the Journal in '
              'Title Case, volume(issue), first page-last page. https://doi.org/xxxxx]', hanging=True)
    para(doc, '[Each entry is double-spaced with a hanging indent of half an inch. List entries alphabetically by the '
              'first author\'s surname. Delete these two placeholder entries.]', hanging=True)
    page_break(doc)
    para(doc, 'Table 1', indent=0, bold=True)
    para(doc, 'Title of the Table in Title Case, Italic', indent=0, italic=True)
    table = doc.add_table(rows=3, cols=4)
    for c, text in enumerate(('Variable', 'n', 'M', 'SD')):
        table.cell(0, c).text = text
    for r in (1, 2):
        table.cell(r, 0).text = f'[Row {r}]'
    for r, row in enumerate(table.rows):
        for cell in row.cells:
            for p in cell.paragraphs:
                p.paragraph_format.first_line_indent = Inches(0)
                p.paragraph_format.line_spacing = 1.5
            borders = OxmlElement('w:tcBorders')
            edges = {0: ('top', 'bottom'), 2: ('bottom',)}.get(r, ())
            for edge in edges:
                el = OxmlElement(f'w:{edge}')
                el.set(qn('w:val'), 'single'); el.set(qn('w:sz'), '6'); el.set(qn('w:color'), '000000')
                borders.append(el)
            cell._tc.get_or_add_tcPr().append(borders)
    p = para(doc, indent=0)
    p.add_run('Note. ').italic = True
    p.add_run('[Explain abbreviations and symbols here. APA tables have horizontal rules only.]')
    doc.save(path)


def journal_template(path):
    doc = base_document()
    section = doc.sections[0]
    ln = OxmlElement('w:lnNumType')
    ln.set(qn('w:countBy'), '1'); ln.set(qn('w:restart'), 'continuous')
    section._sectPr.append(ln)
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.paragraph_format.first_line_indent = Inches(0)
    field(footer.add_run(), 'PAGE')
    L = WD_ALIGN_PARAGRAPH.LEFT
    para(doc, '[Article type, for example: Original Research Article]', L, 0)
    para(doc, 'Title of the Manuscript', L, 0, bold=True)
    para(doc, 'First A. Author1*, Second B. Author2', L, 0)
    para(doc, '1 Department, Institution, City, Country', L, 0)
    para(doc, '2 Department, Institution, City, Country', L, 0)
    para(doc, '* Corresponding author: [email address]', L, 0)
    para(doc, 'Short title: [if the journal asks for one]', L, 0)
    para(doc, 'Word count: [main text] words; [n] tables; [n] figures', L, 0)
    page_break(doc)
    doc.add_heading('Abstract', 1).alignment = L
    para(doc, '[Check whether the journal wants a structured abstract (Background, Methods, Results, Conclusions) and its '
              'word limit.]', indent=0)
    p = para(doc, indent=0)
    p.add_run('Keywords: ').bold = True
    p.add_run('[three to six, as the journal specifies]')
    page_break(doc)
    for heading in ('Introduction', 'Methods', 'Results', 'Discussion', 'Conclusions'):
        doc.add_heading(heading, 1).alignment = L
        para(doc, '[Text.]')
    doc.add_heading('Declarations', 1).alignment = L
    for label in ('Ethics approval and consent', 'Funding', 'Competing interests', 'Data and code availability',
                  'Author contributions', 'Acknowledgements', 'Use of AI tools'):
        p = para(doc, indent=0)
        p.add_run(label + '. ').bold = True
        p.add_run('[Statement, or delete this line if the journal does not ask for it.]')
    page_break(doc)
    doc.add_heading('References', 1).alignment = L
    para(doc, '[Insert the reference list with your reference manager, in the style the journal names.]', indent=0)
    page_break(doc)
    doc.add_heading('Tables', 1).alignment = L
    para(doc, 'Table 1. [Title.]', indent=0)
    page_break(doc)
    doc.add_heading('Figure legends', 1).alignment = L
    para(doc, 'Figure 1. [Legend. Upload the figure itself as the journal instructs.]', indent=0)
    doc.save(path)


def title_page_template(path):
    doc = base_document()
    L = WD_ALIGN_PARAGRAPH.LEFT
    para(doc, 'Title page', L, 0, bold=True)
    para(doc, '[Upload this as a separate file when the journal uses anonymised review. Nothing on this page should '
              'appear in the main manuscript file.]', L, 0, italic=True)
    for label in ('Title', 'Short title', 'Article type', 'Authors, in order, with affiliations',
                  'ORCID identifiers', 'Corresponding author: name, postal address, email',
                  'Word count, number of tables, number of figures', 'Funding', 'Competing interests',
                  'Author contributions', 'Acknowledgements', 'Data and code availability',
                  'Ethics approval: committee and reference number'):
        p = para(doc, indent=0)
        p.add_run(label + ': ').bold = True
        p.add_run('[ ]')
    doc.save(path)


def cover_letter_template(path):
    doc = base_document(double=False, indent=False)
    for line in ('[Your name]', '[Department, institution]', '[Address]', '[Email]', '', '[Date]', '',
                 '[Editor\'s name and title, taken from the journal\'s site today]', '[Journal name]', '',
                 'Dear [Dr / Professor Surname],', ''):
        para(doc, line).paragraph_format.space_after = Pt(0)
    parts = [
        ('Paragraph 1: what you are submitting.', 'Give the title, the article type, and the journal. One or two sentences.'),
        ('Paragraph 2: what the paper reports.', 'State the question, what you did, and the main finding, in plain terms '
         'and without overstating. Three or four sentences. Do not paste the abstract.'),
        ('Paragraph 3: why this journal.', 'Say why the work suits this journal\'s readers, with reference to its scope. '
         'Two or three sentences.'),
        ('Paragraph 4: required statements.', 'Include those the journal asks for. Common ones: the work is original, is '
         'not under consideration elsewhere, and all authors have approved the submission; any related manuscripts or '
         'preprints; competing interests; ethics approval; data availability.'),
        ('Optional.', 'Suggested or opposed reviewers with reasons, if the journal invites them. Anything the editor '
         'needs to know, such as an earlier submission to this journal.'),
    ]
    for label, guidance in parts:
        p = para(doc)
        run = p.add_run(f'[{label} ')
        run.bold = True
        p.add_run(guidance + ']')
    para(doc, 'Yours sincerely,')
    para(doc, '[Name, on behalf of all authors]')
    note = para(doc, 'Keep the letter to one page. Delete every bracketed instruction before sending. The words are yours '
                     'to write; this template supplies only the parts and their order.')
    note.runs[0].italic = True
    doc.save(path)


def response_letter_template(path):
    doc = base_document(double=False, indent=False)
    para(doc, 'Response to reviewers').runs[0].bold = True
    for line in ('Manuscript title: [title]', 'Manuscript number: [number]', 'Journal: [journal]', 'Date: [date]'):
        para(doc, line).paragraph_format.space_after = Pt(0)
    para(doc, '')
    para(doc, 'Dear [Editor\'s name],')
    para(doc, '[Covering paragraph, yours to write: thank the editor and reviewers, and summarise the main changes in '
              'two or three sentences. Say whether page and line numbers refer to the clean or the tracked version.]')
    for reviewer in ('Reviewer 1', 'Reviewer 2'):
        doc.add_heading(reviewer, 2)
        for n in (1, 2):
            p = para(doc)
            p.paragraph_format.left_indent = Inches(0.3)
            run = p.add_run(f'Comment {reviewer[-1]}.{n}: ')
            run.bold = True
            p.add_run('[Paste the reviewer\'s comment here in full, unchanged.]').italic = True
            p = para(doc)
            p.add_run('Response: ').bold = True
            p.add_run('[Yours to write. Say what you did first, then why.]')
            p = para(doc)
            p.add_run('Change in the manuscript: ').bold = True
            p.add_run('[Page and line numbers, and the new text quoted if it is short. If you made no change, say so '
                      'and give the reason.]')
    para(doc, '[Closing sentence, yours to write.]')
    para(doc, '[Name, on behalf of all authors]')
    note = para(doc, 'Copy the comment block for each further comment, or paste in the skeleton produced by '
                     '"python response_check.py split". Delete every bracketed instruction before sending.')
    note.runs[0].italic = True
    doc.save(path)

# ---------------------------------------------------------------- Spreadsheets

HEAD_FILL = PatternFill('solid', fgColor='E8E6E1')
THIN = Side(style='thin', color='BBBBBB')


def sheet_header(ws, headers, widths):
    ws.append(headers)
    for i, (cell, width) in enumerate(zip(ws[1], widths)):
        cell.font = Font(bold=True)
        cell.fill = HEAD_FILL
        cell.alignment = Alignment(wrap_text=True, vertical='top')
        cell.border = Border(bottom=THIN)
        ws.column_dimensions[cell.column_letter].width = width
    ws.freeze_panes = 'A2'


def wrap(ws, max_row):
    for row in ws.iter_rows(min_row=2, max_row=max_row):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical='top')


def listing(ws, formula, cells):
    dv = DataValidation(type='list', formula1=formula, allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(cells)


def notes_sheet(wb, title, lines):
    ws = wb.create_sheet(title)
    ws.column_dimensions['A'].width = 110
    for i, line in enumerate(lines, 1):
        ws.cell(row=i, column=1, value=line).alignment = Alignment(wrap_text=True, vertical='top')
    ws['A1'].font = Font(bold=True, size=13)
    return ws


def stamp(wb):
    import datetime
    wb.properties.creator = 'ResearchWithMe'
    wb.properties.created = wb.properties.modified = datetime.datetime(2026, 11, 14)


LEDGER_HEAD = ['ID', 'Claim (quoted)', 'Source (section, table, figure, or README line)', 'Kind', 'What would test it',
               'Attempted?', 'Outcome', 'Observed result', 'Reported result', 'Evidence (log file, or file and line)', 'Notes']
OUTCOMES = 'Reproduced,Partly reproduced,Not reproduced,Could not run,Not attempted'


def claim_ledger(xlsx, csv_path):
    wb = Workbook()
    ws = wb.active
    ws.title = 'Ledger'
    sheet_header(ws, LEDGER_HEAD, [6, 44, 26, 12, 34, 12, 18, 16, 16, 34, 30])
    for n in range(1, 21):
        ws.cell(row=n + 1, column=1, value=f'C{n}')
    wrap(ws, 21)
    listing(ws, '"Result,Capability,Property"', 'D2:D21')
    listing(ws, '"Yes,Partly,No"', 'F2:F21')
    listing(ws, f'"{OUTCOMES}"', 'G2:G21')
    head = wb.create_sheet('Examined', 0)
    head.column_dimensions['A'].width = 30
    head.column_dimensions['B'].width = 70
    for label in ('Question (one sentence)', 'Repository URL', 'Commit hash (full)', 'Commit date', 'Date cloned',
                  'Why this commit', 'Paper or documentation, with version', 'Time budget (hours)', 'Out of scope',
                  'Tolerance, stated before running', 'Your connections to the authors or to competing work'):
        head.append([label, ''])
    for cell in head['A']:
        cell.font = Font(bold=True)
    tally = wb.create_sheet('Tally')
    tally.column_dimensions['A'].width = 22
    tally.append(['Outcome', 'Claims'])
    for outcome in OUTCOMES.split(','):
        tally.append([outcome, f'=COUNTIF(Ledger!G2:G21,"{outcome}")'])
    tally.append(['No outcome yet', '=COUNTA(Ledger!B2:B21)-SUM(B2:B6)'])
    for cell in tally[1]:
        cell.font = Font(bold=True)
    notes_sheet(wb, 'How to use', [
        'Claim ledger: The Teardown System, Stage 3',
        'Fill in the Examined sheet first, then the ledger, before you run anything.',
        'One row per claim. Quote the authors; do not paraphrase. Rank the rows: the claim the conclusion depends on goes first.',
        'Kind: Result (a number), Capability (it can do X), Property (it is deterministic, it scales).',
        'Outcome: use only the five words in the list. Reproduced = you ran it and got the reported result within your stated tolerance. '
        'Partly reproduced = direction or rough size, not the number. Not reproduced = ran as documented, materially different result. '
        'Could not run = failed before producing a result. Not attempted = you did not try; give the reason in Notes.',
        'Keep rows marked "Not attempted". They tell the reader what your teardown does not cover.'])
    stamp(wb)
    wb.save(xlsx)
    with open(csv_path, 'w', encoding='utf-8', newline='') as handle:
        handle.write(','.join(f'"{h}"' for h in LEDGER_HEAD) + '\r\n')
        for n in range(1, 13):
            handle.write(f'C{n}' + ',' * (len(LEDGER_HEAD) - 1) + '\r\n')


def comment_tracker(path):
    wb = Workbook()
    ws = wb.active
    ws.title = 'Comments'
    sheet_header(ws, ['ID', 'Reviewer', 'Comment (quoted in full)', 'Decision', 'What we did',
                      'Where (page / lines / section)', 'Owner', 'Response written?', 'Checked in manuscript?', 'Notes'],
                 [8, 14, 60, 20, 40, 24, 14, 12, 12, 30])
    wrap(ws, 101)
    listing(ws, '"Change made,Partly,Declined,Clarification only,Undecided"', 'D2:D101')
    listing(ws, '"Yes,No"', 'H2:I101')
    summary = wb.create_sheet('Summary')
    summary.column_dimensions['A'].width = 44
    rows = [('Comments in total', '=COUNTA(Comments!C2:C101)'),
            ('Decision still to make', '=COUNTA(Comments!C2:C101)-COUNTA(Comments!D2:D101)+COUNTIF(Comments!D2:D101,"Undecided")'),
            ('Change made', '=COUNTIF(Comments!D2:D101,"Change made")'),
            ('Partly', '=COUNTIF(Comments!D2:D101,"Partly")'),
            ('Declined', '=COUNTIF(Comments!D2:D101,"Declined")'),
            ('Clarification only', '=COUNTIF(Comments!D2:D101,"Clarification only")'),
            ('Response not yet written', '=COUNTA(Comments!C2:C101)-COUNTIF(Comments!H2:H101,"Yes")'),
            ('Change not yet checked in the manuscript', '=COUNTA(Comments!C2:C101)-COUNTIF(Comments!I2:I101,"Yes")'),
            ('Change made or partly, but no location given',
             '=COUNTIFS(Comments!D2:D101,"Change made",Comments!F2:F101,"")+COUNTIFS(Comments!D2:D101,"Partly",Comments!F2:F101,"")')]
    for label, formula in rows:
        summary.append([label, formula])
    notes_sheet(wb, 'How to use', [
        'Comment tracker: Response-to-Reviewers Check',
        'One row per comment. Run "python response_check.py split reviews.txt" and paste the rows from response-tracker.csv here, '
        'or type them in.',
        'Split any comment that contains more than one request into separate rows (R1.3a, R1.3b).',
        'Decision: Change made / Partly / Declined / Clarification only. "Declined" is a legitimate decision; record the reason in "What we did".',
        '"Checked in manuscript?" means someone opened the revised manuscript at the cited location and confirmed the change is there.',
        'The Summary sheet counts what is still open.'])
    stamp(wb)
    wb.save(path)


CRITERIA = [('Scope fit', 'Does this journal publish work like yours, for the audience you want?'),
            ('Recent similar articles', 'Has it published closely related work in the last three years?'),
            ('Reach', 'Is it read and cited in your field? Compare within one field, using one open measure.'),
            ('Access and cost', 'Can your readers read it, and can you afford it?'),
            ('Speed', 'Are its own stated times compatible with your deadline?'),
            ('Policies', 'Do its rules on preprints, data, and self-archiving suit you?'),
            ('Standing with your community', 'Would the people whose opinion matters to you respect a paper there?')]
CHECKS = ['Title, ISSN, and website are genuine', 'Indexed where it says it is', 'Publisher and board identifiable',
          'Fees stated before submission', 'Peer-review process described', 'Recent articles of acceptable standard',
          'Meets funder / institution access rules']
JOURNALS = 12


def journal_shortlist(path):
    wb = Workbook()
    ws = wb.active
    ws.title = 'Your paper'
    ws.column_dimensions['A'].width = 46
    ws.column_dimensions['B'].width = 70
    for label in ('Working title', 'Article type', 'Length (words), tables, figures', 'Audience you most want to reach',
                  'Publication charge you can pay (amount, and who pays)', 'Open-access requirement (funder / institution)',
                  'Deadline that makes speed matter', 'Preprint posted or planned?', 'Data or code to be shared?',
                  'Journals already tried for this paper'):
        ws.append([label, ''])
    for cell in ws['A']:
        cell.font = Font(bold=True)

    cr = wb.create_sheet('Criteria')
    sheet_header(cr, ['Criterion', 'Weight (0 to 5)', 'The question it asks'], [32, 16, 80])
    for name, question in CRITERIA:
        cr.append([name, 3, question])
    whole = DataValidation(type='whole', operator='between', formula1='0', formula2='5', allow_blank=True,
                           showErrorMessage=True, error='Enter a whole number from 0 to 5.')
    cr.add_data_validation(whole)
    whole.add('B2:B8')
    cr['A10'] = '0 = does not matter to you; 5 = decisive. The weights need not add up to anything.'

    ch = wb.create_sheet('Checks')
    sheet_header(ch, ['Journal'] + CHECKS + ['Date looked', 'Notes and sources'], [32] + [18] * 7 + [14, 40])
    listing(ch, '"Pass,Fail,Unsure"', f'B2:H{JOURNALS + 1}')

    sc = wb.create_sheet('Scoring')
    sheet_header(sc, ['Journal'] + [c[0] for c in CRITERIA] + ['Evidence and sources for the scores', 'Date looked'],
                 [32] + [15] * 7 + [50, 14])
    sc.append(['Weight (from the Criteria sheet)'] + [f'=Criteria!B{r}' for r in range(2, 9)])
    for cell in sc[2]:
        cell.font = Font(italic=True)
    score = DataValidation(type='whole', operator='between', formula1='0', formula2='5', allow_blank=True,
                           showErrorMessage=True, error='Enter a whole number from 0 to 5.')
    sc.add_data_validation(score)
    score.add(f'B3:H{JOURNALS + 2}')
    sc.freeze_panes = 'B3'

    rs = wb.create_sheet('Result')
    sheet_header(rs, ['Journal', 'Weighted score (0 to 100)', 'Rank', 'Checks', 'Criteria scored'], [36, 18, 8, 22, 16])
    for i in range(JOURNALS):
        r, s, c = i + 2, i + 3, i + 2
        rs.append([
            f'=IF(Scoring!A{s}="","",Scoring!A{s})',
            f'=IF(OR(Scoring!A{s}="",SUM(Scoring!$B$2:$H$2)=0),"",ROUND(100*SUMPRODUCT(Scoring!$B$2:$H$2,Scoring!B{s}:H{s})/(5*SUM(Scoring!$B$2:$H$2)),1))',
            f'=IF(B{r}="","",RANK(B{r},$B$2:$B${JOURNALS + 1}))',
            f'=IF(Scoring!A{s}="","",IF(COUNTIF(Checks!B{c}:H{c},"Fail")>0,"Failed a check",IF(COUNTIF(Checks!B{c}:H{c},"Pass")=7,"All passed","Incomplete")))',
            f'=IF(Scoring!A{s}="","",COUNT(Scoring!B{s}:H{s})&" of 7")'])
    rs[f'A{JOURNALS + 4}'] = ('The score is the weighted sum of your scores, as a share of the maximum. A blank score counts as 0. '
                              'Enter journals in the same row on the Checks and Scoring sheets.')
    rs[f'A{JOURNALS + 5}'] = 'A close ranking cannot separate two journals. Use it to start the discussion with your co-authors.'

    notes_sheet(wb, 'How to use', [
        'Journal shortlist workbook',
        '1. Fill in "Your paper", then set the weights on "Criteria", before you look at any journal.',
        '2. List eight to twelve candidates on "Checks" and "Scoring", the same journal in the same row on both. '
        'On Checks, journals start in row 2; on Scoring, in row 3.',
        '3. Complete "Checks" first. A journal that fails a check should leave the list unless you can explain the failure.',
        '4. Score the rest from 0 to 5 on each criterion and write the evidence beside the score. The guide gives anchors for 0, 3, and 5.',
        '5. Read "Result". Choose a first choice and two fallbacks.',
        'Open sources: OpenAlex (openalex.org), DOAJ (doaj.org), the ISSN Portal (portal.issn.org), Sherpa (sherpa.ac.uk), '
        'Think. Check. Submit. (thinkchecksubmit.org).',
        'This workbook contains no journal data and recommends no journal. It does not use the Journal Impact Factor.'])
    stamp(wb)
    wb.save(path)

# ---------------------------------------------------------------- Packaging

PRODUCTS = {
    'teardown-system': {
        'title': 'The Teardown System', 'pdf': 'The-Teardown-System.pdf',
        'copy': ['teardown-record-template.md', 'run-log-template.md'],
        'extra_pdfs': [('reading-checklist.md', 'reading-checklist.pdf', 'Reading checklist')],
        'make': [('claim-ledger.xlsx', lambda p: claim_ledger(p, os.path.join(os.path.dirname(p), 'claim-ledger.csv')))],
    },
    'manuscript-formatter': {
        'title': 'Manuscript Formatting Kit', 'pdf': 'Manuscript-Formatting-Kit.pdf', 'copy': [],
        'extra_pdfs': [('formatting-checklist.md', 'formatting-checklist.pdf', 'Formatting checklist')],
        'make': [('apa7-manuscript-template.docx', apa_template), ('journal-submission-template.docx', journal_template),
                 ('title-page-template.docx', title_page_template), ('cover-letter-template.docx', cover_letter_template)],
    },
    'journal-matchmaker': {
        'title': 'Journal Shortlist Workbook', 'pdf': 'Journal-Shortlist-Workbook.pdf', 'copy': [], 'extra_pdfs': [],
        'make': [('journal-shortlist.xlsx', journal_shortlist)],
    },
    'statistical-table-generator': {
        'title': 'Statistical Table Generator', 'pdf': 'Statistical-Table-Generator.pdf',
        'copy': ['apa_tables.py', 'statdist.py', 'sample-data.csv'], 'extra_pdfs': [], 'make': [],
    },
    'manuscript-check': {
        'title': 'Manuscript Check', 'pdf': 'Manuscript-Check.pdf',
        'copy': ['manuscript_check.py', 'statdist.py', 'sample-manuscript.md'],
        'extra_pdfs': [('reporting-guidelines.md', 'reporting-guidelines.pdf', 'Reporting guidelines')], 'make': [],
    },
    'reference-check': {
        'title': 'Reference Check', 'pdf': 'Reference-Check.pdf',
        'copy': ['reference_check.py', 'sample-references.bib'], 'extra_pdfs': [], 'make': [],
    },
    'response-to-reviewers-check': {
        'title': 'Response-to-Reviewers Check', 'pdf': 'Response-to-Reviewers-Check.pdf',
        'copy': ['response_check.py', 'sample-reviews.txt', 'sample-response.txt'], 'extra_pdfs': [],
        'make': [('response-letter-template.docx', response_letter_template), ('comment-tracker.xlsx', comment_tracker)],
    },
}


def normalise_office_file(path):
    """Rewrite a .docx/.xlsx with fixed timestamps so that rebuilding gives the same bytes."""
    with zipfile.ZipFile(path) as source:
        items = [(info.filename, source.read(info.filename)) for info in source.infolist()]
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as target:
        for name, data in items:
            if name == 'docProps/core.xml':
                data = re.sub(rb'(<dcterms:(created|modified)[^>]*>)[^<]*', rb'\g<1>2026-11-14T00:00:00Z', data)
            target.writestr(zipfile.ZipInfo(name, (2026, 11, 14, 0, 0, 0)), data, zipfile.ZIP_DEFLATED)


def build(slug):
    spec = PRODUCTS[slug]
    source, stage = os.path.join(SRC, slug), os.path.join(STAGE, slug)
    os.makedirs(stage)
    if slug in ('statistical-table-generator', 'manuscript-check'):
        with open(os.path.join(SRC, 'shared', 'statdist.py'), 'rb') as a, open(os.path.join(source, 'statdist.py'), 'rb') as b:
            if a.read() != b.read():
                raise ValueError(f'{slug}/statdist.py differs from shared/statdist.py; copy the shared file over it')
    markdown_to_pdf(os.path.join(source, 'guide.md'), os.path.join(stage, spec['pdf']), spec['title'])
    for md, pdf, title in spec['extra_pdfs']:
        markdown_to_pdf(os.path.join(source, md), os.path.join(stage, pdf), title)
    for name in spec['copy']:
        shutil.copy(os.path.join(source, name), os.path.join(stage, name))
    for name, maker in spec['make']:
        maker(os.path.join(stage, name))
    for name in os.listdir(stage):
        if name.endswith(('.docx', '.xlsx')):
            normalise_office_file(os.path.join(stage, name))
    with open(os.path.join(stage, 'LICENSE.txt'), 'w', encoding='utf-8') as handle:
        handle.write(LICENSE)
    target = os.path.join(OUT, f'{slug}-{VERSION}.zip')
    names = sorted(os.listdir(stage))
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in names:
            info = zipfile.ZipInfo(f'{slug}/{name}', (2026, 11, 14, 0, 0, 0))
            info.external_attr = 0o644 << 16
            with open(os.path.join(stage, name), 'rb') as handle:
                archive.writestr(info, handle.read(), zipfile.ZIP_DEFLATED)
    return target, names


def main():
    shutil.rmtree(STAGE, ignore_errors=True)
    os.makedirs(OUT, exist_ok=True)
    for slug in PRODUCTS:
        target, names = build(slug)
        print(f'{os.path.relpath(target, HERE)}  ({os.path.getsize(target) / 1024:.0f} kB)')
        for name in names:
            print(f'    {name}')
    if '--keep' not in sys.argv:
        shutil.rmtree(STAGE, ignore_errors=True)


if __name__ == '__main__':
    main()
