# Manuscript Check

Three programs that check a manuscript, its references, and your response to reviewers, on your own computer.

ResearchWithMe, version 1.0, full edition

## What is in this download

| Folder | Program | What it does | Guide |
| --- | --- | --- | --- |
| manuscript | manuscript_check.py | Nine mechanical checks on the manuscript before you submit | Manuscript-Check.pdf |
| references | reference_check.py | Looks up every reference in Crossref and OpenAlex | Reference-Check.pdf |
| reviewer-response | response_check.py | Makes sure your response letter answers every reviewer comment | Response-to-Reviewers-Check.pdf |

The reviewer-response folder also holds a Word letter template and a tracking spreadsheet. The manuscript folder holds a one-page finder for the official reporting checklists.

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
python response_check.py check sample-reviews.txt sample-response.txt
```

Each sample has planted mistakes, so each report has something in it. In the reference sample, the two real papers should come back as verified; if they do not, the indexes may have changed, so write to us through the contact page at researchwith.me.

## When to use which

| Stage | Use |
| --- | --- |
| The draft is complete | manuscript_check.py, then fix what it finds |
| The reference list is final | reference_check.py |
| Reviews have arrived | response_check.py split, to number the comments and build the letter |
| The response letter is written | response_check.py check |

## What these programs are

They are software applying fixed rules. They are not peer review, they use no language model, and they never write, rewrite, or suggest wording. Every finding quotes the text it came from so that you can judge it. Some findings will be false alarms.
