# Manuscript Check, free edition

Three programs that check a manuscript, its references, and the reviews you have to answer, on your own computer.

ResearchWithMe, version 1.0, free edition

## What the free edition does

| Folder | Program | In the free edition | Added in the full edition |
| --- | --- | --- | --- |
| manuscript | manuscript_check.py | Four checks on a manuscript of any length: sections and declarations, citations against the reference list, figures and tables, abbreviations | Statistics recomputed, numbers in the abstract, length, reverse outline, claims worksheet |
| references | reference_check.py | The first 60 references in a run looked up in Crossref and OpenAlex, with retraction flags | No limit on references; results as a spreadsheet |
| reviewer-response | response_check.py | Numbers every reviewer comment and builds a tracker and an empty letter | Checks your written letter against the reviews |

There is no limit on how many times you run any of them, and no account or sign-up. The Word letter template, the tracking spreadsheet, and the reporting-checklist finder are included in full.

You may share this download, unchanged, with anyone.

## What you need

Python 3.8 or later, and a terminal. Nothing else is installed. Check with `python --version` (on some systems the command is `python3`). If it is missing, install it from python.org.

Only the reference program uses the internet, and it sends only the text of your references and your email address to the two indexes. Your manuscript and your reviewers' reports stay on your computer.

## Try each one first

```
cd manuscript
python manuscript_check.py sample-manuscript.md

cd ../references
python reference_check.py sample-references.bib --email you@university.edu

cd ../reviewer-response
python response_check.py split sample-reviews.txt
```

In the reference sample, the two real papers should come back as verified; if they do not, the indexes may have changed, so write to us through the contact page at researchwith.me.

## What these programs are

They are software applying fixed rules. They are not peer review, they use no language model, and they never write, rewrite, or suggest wording. Every finding quotes the text it came from so that you can judge it. Some findings will be false alarms.

The guides in each folder describe both editions and say which features belong to which.
