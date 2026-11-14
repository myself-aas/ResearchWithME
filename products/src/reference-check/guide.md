# Reference Check

Look up every entry in your reference list in open scholarly indexes, from your own computer.

ResearchWithMe, version 1.0

## What you get

A small command-line program, `reference_check.py`, that reads a reference list, looks each entry up in Crossref and OpenAlex, and writes a report of what it found. It needs Python 3.8 or later, an internet connection, and nothing else.

| File | Use |
| --- | --- |
| reference_check.py | The program |
| sample-references.bib | Three entries for a first run: two real papers and one placeholder that will not be found |
| Reference-Check.pdf | This guide |
| LICENSE.txt | What you may do with these files |

## First run

From the folder that holds these files:

```
python reference_check.py sample-references.bib --email you@university.edu
```

Use your own email address. Crossref and OpenAlex both ask programs to identify themselves with a contact address, and give identified users a steadier service. The address is sent to those two indexes and nowhere else.

The program writes two files: `reference-check.md`, a report to read, and `reference-check.csv`, the same results as a spreadsheet. Use `--out name` to choose a different file name.

## Input formats

| Format | How to get it |
| --- | --- |
| .bib (BibTeX) | Exported by Zotero, Mendeley, JabRef, EndNote, and most reference managers |
| .ris | Exported by the same tools and by most publisher sites |
| .txt | Paste your reference list into a text file, one reference per line or with a blank line between references |

BibTeX and RIS give the best results, because the title, author, and year are already separated. With a pasted list the program has to find them in running text.

## What the results mean

| Result | Meaning | What to do |
| --- | --- | --- |
| verified | Found; title, first author, and year agree | Nothing |
| verified with differences | Found, but a field in your entry differs from the index | Compare the two side by side in the report and correct your entry if the index is right |
| retracted | Found, and an index marks the work as retracted | Read the retraction notice and decide whether the citation should stay |
| not found | No close match in either index | Check by hand: see the next section |
| lookup failed | The index did not answer | Run the program again later |
| could not parse | The entry had no usable title or DOI | Check the entry in your file |

A year that is off by one is listed but does not count as a difference, because online-first and print dates often differ by a year.

## "Not found" does not mean wrong

This matters enough to say twice. The two indexes are large but they are not complete. Books and book chapters, theses, technical reports, standards, legal sources, preprints on some servers, conference papers from some venues, and a great deal of work not published in English are often missing. A reference in one of those categories will frequently be reported as not found although it is perfectly real.

Treat "not found" as "not yet checked". For each one, look it up in a library catalogue, the publisher's site, or the place you originally read it.

The reverse also holds. "Verified" means a work with that title, author, and year exists. It does not mean the work says what your sentence claims it says.

## How matching works

1. If your entry has a DOI, the program asks Crossref for that DOI, then OpenAlex.
2. Otherwise it searches Crossref by the entry's text and, if nothing matches closely, OpenAlex.
3. A candidate counts as the same work when at least 90% of the indexed title is found in your entry, after removing case, punctuation, and accents. Between 75% and 90% it is reported as found with a title difference; below 75% it is treated as a different work.
4. First author and year are then compared, and the journal name where your entry gives one.

The thresholds are fixed; no language model decides whether a work exists.

## What it does not do

- It never edits your file. Corrections are listed for you to make.
- It never suggests references to add.
- It does not compare volume, issue, or page numbers.
- It does not check whether in-text citations match the list; the Manuscript Check does that.
- It does not judge the quality of a source or a journal.
- Retraction data comes from the indexes and can lag behind publishers.

## Limits you should know about

- The program was tested against recorded answers in the format the two indexes publish. It was not possible to test it against the live services when this version was built, so the first thing to do is run it on the sample file and confirm that the two real papers come back as verified. If they do not, the services may have changed; write to us at the address on your receipt.
- It pauses briefly between requests to be polite to the indexes. A list of 100 references takes a few minutes.
- It checks at most 500 entries per run unless you raise the limit with `--limit`.

## Privacy

The text of each reference and your email address are sent to api.crossref.org and api.openalex.org. Nothing is sent to ResearchWithMe. Your manuscript is not read.
