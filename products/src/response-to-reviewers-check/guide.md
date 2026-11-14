# Response-to-Reviewers Check

Make sure your response letter answers every comment, on your own computer.

ResearchWithMe, version 1.0

## What you get

| File | Use |
| --- | --- |
| response_check.py | The program |
| response-letter-template.docx | A response letter laid out the way editors expect, with nothing written for you |
| comment-tracker.xlsx | A spreadsheet for tracking each comment through the revision |
| sample-reviews.txt, sample-response.txt | Made-up reviews and a letter with planted problems, for a first run |
| Response-to-Reviewers-Check.pdf | This guide |
| LICENSE.txt | What you may do with these files |

The program needs Python 3.8 or later and nothing else. The reviews and your letter are not uploaded anywhere, which matters because reviewer reports are confidential.

**The program never writes, completes, or rewords a response.** It tells you whether a response is present for each comment. It cannot tell whether the response is a good one, and it has no opinion on whether you or the reviewer is right.

## Editions

| | Free edition | Full edition |
| --- | --- | --- |
| Step 1: number the comments, build the tracker and the empty letter | Yes | Yes |
| Step 2: check the written letter against the reviews | No | Yes |
| Letter template and tracking spreadsheet | Yes | Yes |

Type `python response_check.py --version` to see which edition you have.

## Step 1. Before you write: split the reviews

Paste the decision letter and reviews into a text file, or save them as .docx. Then:

```
python response_check.py split reviews.txt
```

This writes two files.

- `response-tracker.csv`: every comment on its own row with an identifier (R1.1, R1.2, R2.1, ...). Open it in a spreadsheet, or copy the rows into `comment-tracker.xlsx`, and use it to assign and track the work.
- `response-letter-skeleton.txt`: a letter with every comment quoted in full and an empty "Response:" under each. Paste it into the Word template and write your responses.

Check the split by eye. The program follows the reviewers' own numbering; a single numbered comment that contains three separate requests is still one row. Split those yourself, because unanswered sub-points are the most common omission.

## Step 2. Before you send: check the letter

```
python response_check.py check reviews.txt response.docx
```

This writes `response-check.md`. For each comment it reports one of three results.

| Result | Meaning |
| --- | --- |
| answered | The comment is quoted in your letter and a response follows it |
| no response text | The comment is quoted but little or nothing follows it |
| not found | The comment's wording does not appear in the letter |

Answered comments are then flagged if the response:

- says neither where the manuscript changed (a page, line, section, table, or figure with a number) nor that nothing was changed;
- describes a change in the future tense ("we will add"), when the revised manuscript should already contain it;
- contains a placeholder such as TODO, TBD, or ???.

Try it first on the samples:

```
python response_check.py check sample-reviews.txt sample-response.txt
```

## How it works, and its limit

The check relies on the normal convention that each reviewer comment is quoted in the letter, followed by the response. It finds each comment's wording in the letter and reads what comes between it and the next quoted comment.

If you answer a comment without quoting it, or paraphrase it heavily, it will be reported as "not found" although you answered it. Quote comments in full; editors and reviewers prefer it anyway.

It does not open your revised manuscript, so it cannot confirm that a change you describe was actually made. Before sending, open the manuscript at every page and line you cite and look.

## What editors and reviewers look for in a response letter

These are conventions of the genre, not text to copy.

1. **Every comment answered, in order, none merged away.** Number them as the reviewer did.
2. **The comment quoted in full**, visually distinct from your response.
3. **A direct answer first.** What you did, in one sentence, before any explanation.
4. **The exact location of every change**: page and line in the revised manuscript, and state whether you mean the clean or the tracked version.
5. **The changed text quoted** for short changes, so the reviewer need not hunt for it.
6. **Disagreement stated plainly and with evidence.** You may decline a request. Say that you have not made the change, and give the reason and any supporting data or citation.
7. **No change described that was not made.**
8. **A courteous, even tone throughout**, including toward comments you think are mistaken.
9. **A short covering note to the editor** summarising the main changes.

## The tracker spreadsheet

`comment-tracker.xlsx` has one row per comment: identifier, reviewer, the comment, the decision (change made, partly, declined, clarification only), what was done, where, who is responsible, and whether the response is written. A summary sheet counts what is open. Use it when several authors share the revision.
