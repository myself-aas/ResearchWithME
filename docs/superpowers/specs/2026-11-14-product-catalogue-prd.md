# PRD: The ResearchWithMe product catalogue, as seven digital downloads

| | |
| --- | --- |
| Status | Draft for owner review. Not published to an issue tracker. |
| Date | 2026-11-14 (seventh pass; replaces every earlier pass of this file) |
| Inputs | Lemon Squeezy's prohibited-products page, read in full on 2026-11-14 (https://docs.lemonsqueezy.com/help/getting-started/prohibited-products); the billing code and `docs/billing.md`; the owner's decisions of 2026-11-14; the download files in `products/`. |
| Method | Synthesis, no interview. Anything decided in place of an answer is marked **[Assumption]** and listed in section 9.2. |
| What changed in this pass | The whole catalogue was rebuilt around the payment provider's policy. Every product is now a file the buyer downloads once and keeps. The hosted, pay-per-report tools of earlier passes are gone, and with them the upload pipeline, job queue, file storage, and credit ledger. The download files for all seven products now exist. Two products changed shape and name to fit (section 4). |

Earlier passes are in the Git history of this file. Products removed in those passes stay removed (section 8).

---

## 1. Problem

### The buyer

A researcher who trusts the archive can be shown one product, The Teardown System, and cannot yet buy it: the store has no products (owner, 2026-11-14). Until this pass the product's files did not exist either.

The same reader has chores around a manuscript that are mechanical, repeated for every paper, and worth a few dollars to shorten: producing statistical tables, getting a file into submission format, choosing a journal, checking that references are real and correctly cited, checking the manuscript for slips before submitting, and making sure a response letter answers every reviewer comment.

### The owner

- Revenue is zero and is capped at one product.
- The payment provider sells digital goods only. It prohibits "Services of any kind", and may review or suspend a store without notice. Five planned offerings were removed for that reason in earlier passes.
- The earlier plan met the policy by building hosted tools charged per report. That needed file uploads, storage, background jobs, a credit ledger, and a privacy regime for unpublished manuscripts: months of work for one person, on a platform (`wrangler.jsonc`) that today has key-value storage and nothing else.
- A hosted tool that takes a customer's manuscript and returns a report for a fee is software, but it is the kind of product most easily mistaken for a service or an "essay mill" by a reviewer who sees only the product page.

## 2. What the policy says, and what follows from it

The page gives examples of what may be sold: "Software & SaaS", eBooks, PDFs, design assets, photos, audio, video. It then lists what may not. The clauses that bear on this catalogue, each with the rule this plan derives from it:

| Clause (quoted) | Rule for this catalogue |
| --- | --- |
| "Services of any kind" | Nothing is sold that a person performs. No editing, review, consulting, custom work, or paid support. The product is the file. Bug fixes and corrected files are free and are not a service tier. |
| "Donations or charity giving where no product exists or where the price is greater than the product value" | Every product delivers files at the moment of purchase. No membership, no "support us", no pay-what-you-want. Product copy sells what the buyer receives. |
| "Products or content for which you do not hold a proper license or intellectual property rights" | Every file is the owner's own work (section 5.1). Third-party checklists, style manuals, journal lists, and proprietary metrics are linked to or named, never reproduced. |
| Private-label and resale-rights products | The licence in every download forbids resale and redistribution. Nothing is bought in to resell. |
| "Homework/Essay mills" (the page does not define the term) | No product writes, rewrites, completes, paraphrases, or generates text. The tools check, count, compute, and lay out what the buyer wrote. No product is marketed to help with coursework. |
| Marketplaces; job boards; "Advertising in newsletters" | None exist in the plan. The weekly digest stays free and carries no paid placement. |
| Anything restricted by Stripe | Stripe's restricted-businesses list was not read for this pass (section 9.3). |
| If unsure, contact support "with a description or example of the content before you start selling" | Done for the two products where a reader of the policy could reasonably hesitate (P15, P18); see below. |

### The decision that follows: downloads only

**Every product is a digital download: a zip of PDFs, templates, spreadsheets, or a small program that runs on the buyer's own computer.**

The policy does allow hosted software, so this is a choice, not a requirement. The reasons:

1. A file download is the plainest case of what the provider exists to sell. There is nothing for a store reviewer to interpret.
2. No one's manuscript, data, or reviewer reports ever reach the site. The privacy problem is removed, not managed.
3. The provider delivers the file. The site needs no upload handling, storage, queue, or ledger.
4. The buyer keeps the product and can use it for every paper, which is a better offer than paying per run.

The cost is real: a buyer must have Python installed to use the four programs, and must be willing to use a terminal. Section 9.1 lists this first among the risks.

### Verdict by product

| ID | Product | Verdict | Why |
| --- | --- | --- | --- |
| P1 | The Teardown System | Allowed | A PDF guide with templates and a spreadsheet. |
| P10 | Statistical Table Generator | Allowed | Software that computes on the buyer's own data file. |
| P7 | Manuscript Formatting Kit | Allowed | Document templates and a checklist. |
| P8 | Journal Shortlist Workbook | Allowed | A spreadsheet and a guide. Contains no third-party data. |
| P17 | Reference Check | Allowed | Software that looks up the buyer's references in open indexes. It generates nothing. |
| P15 | Manuscript Check | Fits the published text. **Hold for written confirmation.** | It checks a document the buyer wrote. The undefined "essay mill" clause and the word "manuscript" are the only reasons to ask first. |
| P18 | Response-to-Reviewers Check | Fits the published text. **Hold for written confirmation.** | Same reasoning. It never drafts a response. |

"Allowed" is this document's reading of a published page. Only the provider can confirm a product, and it has confirmed none. The owner asked on 2026-11-14 that P15 and P18 be described to the provider's support before they go further; the message is drafted in `docs/lemon-squeezy-support-message.md` and has not been sent. Their files were built in this pass because the owner asked for the downloads of each product, but **neither may be given a store product or shown on the site until the reply is filed in that document.**

## 3. Solution

One store, one payment provider, seven one-time purchases. Each purchase delivers one zip file through the provider's own file delivery. Nothing recurs. Reading, the citation builder, the assistant, and bookmarks stay free and need no purchase.

| ID | Product | Price | What the buyer downloads | State on 2026-11-14 |
| --- | --- | --- | --- | --- |
| P1 | The Teardown System | $19 | Guide (PDF, 5 pages), teardown record template, run-log template, claim ledger (spreadsheet and CSV), reading checklist | Files built. Shown on the site. No store product, so it cannot be bought. |
| P10 | Statistical Table Generator | $12 **[Assumption]** | Program, user guide, sample data | Files built and tested. Not listed. |
| P7 | Manuscript Formatting Kit | $9 **[Assumption]** | Four Word templates, formatting checklist, guide | Files built. Not opened in Word yet. Not listed. |
| P8 | Journal Shortlist Workbook | $7 **[Assumption]** | Scoring workbook, guide | Files built. Not opened in Excel yet. Not listed. |
| P17 | Reference Check | $9 **[Assumption]** | Program, user guide, sample reference file | Files built. Never run against the live indexes. Not listed. |
| P15 | Manuscript Check | $12 **[Assumption]** | Program, user guide, reporting-guideline finder, sample manuscript | Files built and tested. Held for the provider's reply. |
| P18 | Response-to-Reviewers Check | $9 **[Assumption]** | Program, letter template, tracking spreadsheet, user guide, samples | Files built and tested. Held for the provider's reply. |

P14, the weekly research digest, remains free and is not a product.

Only the $19 price is the owner's. The others are placeholders to be replaced before anything is listed.

## 4. The products

Each entry states what the product is, what it deliberately is not, and what it was verified to do. Full contents are in `products/src/<folder>/`; the built zips are in `products/downloads/`.

### P1. The Teardown System (`teardown-system`)

A written method in six stages for examining a research repository: scope, read before running, build a claim ledger, reproduce, read the code against the claims, write the record. It carries the three rules the archive's own editorial workflow uses: pin the commit, keep what was observed apart from what was reported, record failures and what was not tried.

- Contents: the guide; a record template with the eight sections of a published teardown; a run log; a claim ledger with the five outcome words as a fixed list and a tally sheet; a one-page checklist for the two reading stages.
- It is not software and does not run a teardown.
- It matches what `/pricing` already says about the product. No site copy needs to change.

### P10. Statistical Table Generator (`statistical-table-generator`)

A command-line program. Given a CSV file it produces APA-style tables as text and, on request, as an HTML file that opens in Word as real tables.

- Analyses: descriptive statistics; Pearson or Spearman correlation matrix; Welch's and paired t tests with Cohen's d; one-way ANOVA with eta squared, Levene's test, and Bonferroni-adjusted comparisons; chi-square with Cramer's V; linear regression with standardised coefficients, confidence intervals, and a collinearity warning.
- Under each table: a note, a draft sentence filled from the numbers by a fixed template, cautions where the program can see a reason for one, and a method line.
- Verified: every statistic on the sample data matched SciPy and NumPy; the distribution functions agreed with SciPy to eleven significant figures over 16,000 random inputs. Reference values are fixed in `products/tests/test_statdist.py`.
- It does not choose an analysis, test assumptions beyond those named, or interpret results. The guide lists the analyses it does not offer.

### P7. Manuscript Formatting Kit (`manuscript-formatter`)

*Earlier passes called this "Manuscript Formatter" and described an automated tool that would convert an uploaded file to a journal's format. That is not what was built.* Reliable automatic conversion of arbitrary Word files could not be made trustworthy as a download in this pass, and a tool that mangles a manuscript the night before a deadline is worse than no tool. What exists is a kit.

- Contents: an APA 7 professional-paper template; a general submission template with continuous line numbers; a separate title page for anonymised review; a cover-letter layout that names each part and writes none of it; a pre-upload checklist; a guide on moving text into a template without carrying old formatting along.
- It formats nothing by itself, does not format references, and covers no individual journal's house style. The guide says a journal's own template always wins.
- It carries a notice that it is independent of the American Psychological Association.

### P8. Journal Shortlist Workbook (`journal-matchmaker`)

*Earlier passes called this "Journal Matchmaker" and described a report generated from open data.* A matching engine needs a live index and a hosted service, which the downloads-only decision rules out. What exists is a decision workbook.

- Contents: a workbook in which the buyer sets weights for seven criteria, runs seven pass-or-fail checks on each candidate journal, scores the survivors, and reads a ranked result; a guide to building the long list from OpenAlex, DOAJ, and the buyer's own reference list.
- It contains no journal data and recommends no journal. It does not use the Journal Impact Factor, which is proprietary.
- Verified: the ranking formulas were evaluated with test scores and gave the expected totals, ranks, and check status.

### P17. Reference Check (`reference-check`)

A command-line program. It reads a reference list (BibTeX, RIS, or pasted text), looks each entry up by DOI or title in Crossref and then OpenAlex, and writes a report and a spreadsheet.

- Results per entry: verified; verified with differences (shown side by side); retracted; not found; lookup failed; could not parse. It offers missing DOIs and flags likely duplicates.
- The report and the guide both state that "not found" does not mean wrong, and name the kinds of source the indexes often lack.
- It never edits the buyer's file, never suggests references, and does not judge whether a source supports a claim.
- **Not verified against the live services.** The build environment could not reach either index. The parsing, matching, and reporting were tested with recorded answers in the indexes' published formats (`products/tests/test_reference_check.py`). The guide tells the buyer this. A live run on the sample file is a release condition (section 6).

### P15. Manuscript Check (`manuscript-check`) — held

A command-line program. It reads a manuscript (.docx, .txt, .md) on the buyer's computer and writes a report.

- Seven checks with findings: sections and declarations present; citations against the reference list; p values recomputed from the printed test statistic; abstract numbers missing from the body; figures and tables cited against captions; undefined abbreviations; very long paragraphs and sentences.
- Two worksheets: the first sentence of every paragraph, and the claim-signalling sentences of the abstract and introduction with a blank for the supporting evidence.
- The report opens by saying it is software applying fixed rules and is not peer review, and lists what was not checked.
- It rewrites nothing and suggests no wording. It uses no language model.
- Narrower than earlier passes described: it does not test a manuscript against reporting-guideline items. Those checklists belong to the groups that publish them, so the download carries a one-page finder that links to the official sources.
- Verified: on a sample manuscript with planted mistakes it found each one and did not flag the four correct statistics (`products/tests/test_manuscript_check.py`).

### P18. Response-to-Reviewers Check (`response-to-reviewers-check`) — held

A command-line program with two steps. Before writing, it splits the reviews into numbered comments and produces a tracker and an empty letter with each comment quoted. Before sending, it checks the written letter: each comment is answered, quoted with no response under it, or not found.

- Flags on answered comments: no location of the change and no statement that nothing changed; a change promised in the future tense; a leftover placeholder.
- Also in the download: a Word letter template and a tracking spreadsheet with a summary of open items.
- It never drafts, completes, or rewords a response. It reports whether a response is present, and says in the report that it cannot tell whether the response is good.
- Simpler than earlier passes described: it has no "partly answered" verdict, because deciding that needs a judgement of meaning the program cannot make honestly.
- Verified on sample reviews and a letter with planted problems (`products/tests/test_response_check.py`).

## 5. Implementation decisions

### 5.1 Ownership of content

1. Every file in `products/` was written for this catalogue in this repository. Nothing was taken from the two public skill repositories examined on 2026-11-14 or from any other third party.
2. The files were drafted with an AI coding agent working from the owner's editorial material. **The owner must read every guide and template before selling it** and change anything that is not how he would say it or does not match his practice. The policy asks the seller to hold the rights to what is sold; the owner should be able to stand behind each file as his own.
3. Third-party names (APA, CONSORT, PRISMA, OpenAlex, DOAJ, Crossref) are used to refer to those things only. Their checklists, manuals, and data are not reproduced.
4. Each zip carries the same licence: one person, any number of that person's devices, own use, no redistribution or resale, no warranty. What the buyer makes with a product is the buyer's. The wording is in `products/build.py` and has not been reviewed by a lawyer.

### 5.2 Fulfilment

1. The provider delivers the file. The owner uploads each zip to its store product; the buyer gets the download from the provider's receipt and order page. The site stores and serves no product file.
2. The site's part is unchanged in kind: show the product, start a checkout for a signed-in reader, record the order when the webhook arrives.
3. There is no upload, storage, job queue, usage ledger, or credit balance. Earlier passes specified all five; they are withdrawn.
4. Updates: a corrected zip replaces the file on the store product. The version number is in the file name, in every PDF footer, and in each program's `--version`.

### 5.3 Catalogue model

1. `lib/billing/catalogue.ts` holds one entry per product that is on sale. A product is added there only when its release checklist (section 6) is complete. Planned products do not appear in the code or on the site.
2. Each entry has a key, the copy fields that exist today, and an environment variable naming its store variant. The checkout route already answers 503 when a variant is not set.
3. Every entry has mode `payment`. The subscription handling left in the webhook, `lib/billing/status.ts`, and the account page is unused; removing it is a separate cleanup and is not required by this plan.
4. With more than one product, `/pricing` becomes a list. Its tests, which today assert a single product and a single button, change with it.

### 5.4 Product page rules

Every product on the site states, before the buy button:

1. What is in the download, file by file.
2. What the buyer needs to use it: Word or Excel for the kits; Python 3.8 or later and a terminal for the programs. For the programs this is said in the first lines, not in a footnote.
3. What it does not do, taken from the guide.
4. That it is one payment, delivered as a download by the provider.
5. For Reference Check: that it needs an internet connection and sends reference text and the buyer's email address to two public indexes.

No product page may use the words review, reviewer (of the product), edit, proofread, rewrite, polish, humanize, or guarantee; promise acceptance or a faster decision; give a count of customers, a turnaround time, or a discount; or address coursework, essays, or assignments.

A free sample is offered for each product from files that already exist: the sample report each program produces from its bundled sample, and the first page of each guide. **[Assumption]**

### 5.5 Build

`python products/build.py` renders each `guide.md` to PDF, generates the Word templates and spreadsheets from code, checks that the two shipped copies of the probability module match the shared one, and writes the zips with fixed dates. The build needs three Python libraries; the products need none. `products/README.md` has the commands.

## 6. Delivery plan

### Release checklist, per product

A product goes on sale only when all of these are true.

1. The owner has read the guide and every template and edited them into his own words.
2. The owner has opened every Word and Excel file in the real application, and run every program on its sample on his own machine.
3. The product's tests pass.
4. A price is set by the owner.
5. The store product exists with the zip attached, and its variant variable is set in the deployment.
6. The catalogue entry and page copy follow section 5.4, and the site's quality gate passes.
7. Product-specific conditions: Reference Check has been run against the live indexes and the two real sample papers came back verified; Manuscript Check and Response-to-Reviewers Check have the provider's written reply on file, and any wording it asked for is applied.

### Order

| Phase | What | Blocked by |
| --- | --- | --- |
| 0 | Sell The Teardown System: checklist items 1, 2, and 5 for P1. A test-mode purchase end to end. | Owner's review; store setup |
| 1 | Send the support message for P15 and P18. | Nothing; do it during phase 0, since the reply takes time |
| 2 | Catalogue and `/pricing` support several products. Add P10, then P7 and P8, then P17, each when its checklist is done. | Phase 0 |
| 3 | Add P15 and P18. | The provider's reply |

No dates are given. One person does this work beside the archive itself.

### Measures

- Orders per product per month, and refunds per product with the reason given.
- Messages from buyers who could not run a program. This is the test of the download decision; if it is common, section 9.1 applies.
- No target figures are set, because there is no baseline: nothing has been sold.

## 7. User stories

### Choosing

1. As a reader, I want to see exactly which files I will get, so that I know what I am paying for.
2. As a reader, I want to be told before I pay that a product needs Python and a terminal, so that I do not buy something I cannot use.
3. As a reader, I want to see a sample of the output, so that I can judge whether it is useful to me.
4. As a reader, I want each product to say what it does not do, so that I do not expect a review or an edit.
5. As a reader, I want the free parts of the site listed beside the products, so that I know reading costs nothing.

### Buying

6. As a buyer, I want to pay once and download immediately, so that I can use the product the same day.
7. As a buyer, I want the download available again from my receipt, so that a lost file is not a lost purchase.
8. As a buyer, I want to know who processes refunds and how to ask, so that I am not left guessing.
9. As a buyer, I want corrected versions without paying again, so that a fixed fault reaches me.

### Using

10. As an engineer, I want a method for examining a repository that tells me what to record at each stage, so that someone else can check my conclusions.
11. As an engineer, I want a ledger with a fixed vocabulary of outcomes, so that my results read the same way every time.
12. As a researcher with a data file, I want correctly laid out tables with the statistics computed for me, so that I stop formatting them by hand.
13. As a researcher, I want a warning when an analysis's conditions look doubtful, so that I check before I report.
14. As a researcher, I want my data to stay on my computer, so that I keep my obligations to participants.
15. As an author, I want a template that already has the right margins, spacing, headings, and line numbers, so that I only supply the text.
16. As an author, I want a checklist to run before I upload, so that I am not desk-rejected for a formatting slip.
17. As an author, I want a structured way to compare journals on what matters to me, so that I can explain the choice to co-authors.
18. As an author, I want to rule out a doubtful journal before I score it, so that a high score cannot hide a failed check.
19. As an author, I want every reference looked up in an open index, so that a wrong or retracted reference is caught before a reviewer finds it.
20. As an author, I want to be told that "not found" is not proof of an error, so that I do not delete a sound reference.
21. As an author, I want mechanical slips in my manuscript listed with the passage quoted, so that I can fix them in minutes.
22. As an author, I want a reported p value that does not match its statistic pointed out, so that I correct it before submission.
23. As an author, I want my manuscript and my reviewers' confidential reports never to leave my computer.
24. As an author revising a paper, I want every reviewer comment numbered and laid out with a blank beneath it, so that none is missed.
25. As an author revising a paper, I want to know which comments my letter does not answer, before the editor tells me.
26. As an author, I want tools that never write for me, so that the paper and the letter remain my own work.

### The owner

27. As the owner, I want every product to be a file the provider delivers, so that I run no fulfilment system.
28. As the owner, I want each product checked against the provider's policy before it is listed, so that the store is not suspended.
29. As the owner, I want a written reply from the provider on file for the two products where the policy is unclear, so that the decision is the provider's and not my guess.
30. As the owner, I want the downloads built from source by one command, so that a correction is quick and the files are reviewable.
31. As the owner, I want planned products kept off the site until they can be bought, so that the site never promises what it cannot deliver.

## 8. Out of scope

Removed in earlier passes and not to return without a new decision by the owner: the Research Co-Pilot and any membership or subscription; Manuscript Editing; The Soundboard; The Architecture Audit; Statistical Audit; digest sponsorship; Language Polish; Pre-Submission Screening; Paper Club; the Grant and Fellowship Database.

Also out:

- Hosted tools, uploads of buyers' documents, per-run or per-report charges, credits.
- Any product that writes, rewrites, paraphrases, or generates text, references, or reviewer responses; any tool to disguise machine-written text.
- Human review, feedback, or support sold for money.
- A second payment provider or invoicing route.
- Licence keys, team licences, bundles, discounts, and affiliate schemes. **[Assumption]** They can be considered once there are sales.
- Graphical versions of the programs.
- Any change to what is free.

## 9. Further notes

### 9.1 Risks, most serious first

1. **Buyers who cannot run a Python program.** Four of seven products need a terminal. Some of the audience will not have used one. The product pages must say so before purchase, the guides give the exact commands, and refunds for this reason should be given without argument. If it proves common, the remedy is a packaged or browser-based version that still runs on the buyer's machine, not a hosted service.
2. **The provider reads P15 or P18 differently.** Mitigated by asking first and by holding both.
3. **Reference Check fails against the live indexes,** or the indexes change. It has never been run against them. A live run is a release condition.
4. **A program gives a wrong result.** The statistics are tested against reference values. The other checks are rule-based and will produce false alarms; each guide says so and each finding quotes its source so the buyer can judge.
5. **The Word and Excel files were never opened in Word or Excel.** They were generated and inspected by program only.
6. **Copying.** The programs ship as source. The licence forbids redistribution, and nothing else prevents it. At these prices this is accepted.

### 9.2 Assumptions made in place of answers

- All prices except $19.
- That the store product type offers file delivery with repeat downloads from the receipt, as `docs/billing.md` already assumes for P1.
- That free samples are wanted on product pages.
- That the owner wants the folder names `manuscript-formatter` and `journal-matchmaker` kept although the products were renamed.
- Order of release in section 6.

### 9.3 Not done

- Stripe's restricted-businesses list, which the provider's policy incorporates, was not read.
- The provider's documentation on file delivery, size limits, and licence keys was not read for this pass.
- No product has been confirmed by the provider. The support message is unsent.
- The site code was not changed to list any new product.

### 9.4 Questions only the owner can answer

1. The prices.
2. Whether the Teardown System guide describes the method as he practises it.
3. Whether the two renamed products (the Formatting Kit and the Shortlist Workbook) are worth selling in this form, or should be dropped.
4. Whether to hide the Teardown System's buy button until the store product exists.
