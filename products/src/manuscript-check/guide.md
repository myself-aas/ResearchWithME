# Manuscript Check

Mechanical pre-submission checks on a research manuscript, run on your own computer.

ResearchWithMe, version 1.0

## What you get

A small command-line program, `manuscript_check.py`, that reads a manuscript and writes a report of the things a careful reader checks by hand before submitting. It needs Python 3.8 or later and nothing else. The manuscript is not uploaded anywhere.

| File | Use |
| --- | --- |
| manuscript_check.py | The program |
| statdist.py | Probability functions the program uses; keep it in the same folder |
| sample-manuscript.md | A made-up manuscript with planted mistakes, for a first run |
| reporting-guidelines.pdf | Where to find the official reporting checklist for your study design |
| Manuscript-Check.pdf | This guide |
| LICENSE.txt | What you may do with these files |

**This is software applying fixed rules. It is not peer review.** It does not judge your science, it does not predict what a journal will decide, and a short report does not mean the paper is sound. It rewrites nothing and suggests no wording.

## First run

```
python manuscript_check.py sample-manuscript.md
python manuscript_check.py your-paper.docx
```

The report is saved beside the manuscript as `your-paper-check.md`. It is plain text with simple formatting; open it in any editor.

The program reads .docx, .txt, and .md files. For a PDF or LaTeX manuscript, export or paste the text into a .txt file with a blank line between paragraphs and each heading on its own line.

## The nine checks

| Check | What it reports |
| --- | --- |
| 1. Sections and declarations | Which of Abstract, Introduction, Methods, Results, Discussion, Conclusion, and References have a heading; whether an ethics statement, funding statement, competing-interests statement, data availability statement, author contributions, and acknowledgements can be found |
| 2. Citations and reference list | Citations with no matching reference, and references that are never cited; works with numbered and author-year styles |
| 3. Reported statistics | Recomputes p from each t, F, chi-square, r, and z result as printed, and lists those where the reported p does not match |
| 4. Numbers in the abstract | Numbers in the abstract that do not appear anywhere in the body |
| 5. Figures and tables | Figures and tables cited without a caption, captioned but never cited, or first cited out of order |
| 6. Abbreviations | Abbreviations used more than once with no definition in the form "full term (ABBR)" |
| 7. Length | Word counts, paragraphs over 250 words, sentences over 50 words |
| 8. Reverse outline | The first sentence of every paragraph, section by section |
| 9. Claims to check | Sentences in the abstract and introduction that contain a word signalling a claim |

Checks 1 to 7 produce findings. Checks 8 and 9 are worksheets: they lay your own text out so that you can judge it.

## Using the reverse outline

Read the list for each section from top to bottom without looking at the paper. Ask three questions.

1. Do these first sentences, read in order, tell the story of the section?
2. Does each one say what its paragraph is about? If a first sentence is a detail or a transition, the paragraph has no stated point.
3. Do two of them say the same thing? Those paragraphs may belong together.

Paragraphs that fail are where to revise. The program marks nothing as wrong here, because only you know what each paragraph is meant to do.

## Using the claims list

For each listed sentence, write beside it the result, table, or figure in your paper that supports it. A claim you cannot point to evidence for is the first thing a reviewer will question. Either add the evidence or weaken the sentence: "improves" to "improved in this sample", "the first" to "to our knowledge, the first".

The list is produced by matching words such as "significantly", "demonstrate", "novel", and "robust". It will include sentences that are fine and miss claims phrased in other ways.

## About the statistics check

The program reads results written in the usual way, for example `t(28) = 2.20, p = .036` or `F(2, 57) = 4.10, p = .022`, recomputes the two-sided p value from the statistic and degrees of freedom, and allows for rounding of the printed statistic. A mismatch is most often a typing slip. It can also be a one-sided test or a correction applied to p (Bonferroni, Greenhouse-Geisser) that is described elsewhere in the paper; the report says when a one-sided test would explain the difference. Check each one against your analysis output.

It cannot read statistics inside tables or images, or results written in other forms.

## False alarms

Expect some. Typical ones:

- A declaration is reported as not found because it is on the journal's submission form, not in the manuscript.
- A reference is reported as never cited because the citation uses a form the program does not read, such as a footnote.
- An abbreviation is flagged that every reader in your field knows.
- A number in the abstract is rounded differently in the body.

Every finding quotes the text it came from so that you can decide in a few seconds.

## What it does not check

Whether the methods are appropriate; whether the conclusions follow from the results; originality or text overlap; whether references exist or are correct (the Reference Check does that); language quality; a journal's formatting rules; reporting-guideline items; images and equations; anything in a table or figure that is not plain text.
