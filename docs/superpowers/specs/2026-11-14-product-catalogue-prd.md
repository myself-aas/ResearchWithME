# PRD: The ResearchWithMe product catalogue — one live product and six planned tools

| | |
| --- | --- |
| Status | Draft for owner review. Not yet published to an issue tracker (see Further Notes §1). |
| Date | 2026-11-14 |
| Inputs | The live billing integration and its operator notes; the product marketing context; the financial integration blueprint; "Missing Products and Services Inventory" (owner, 2026-11-14). |
| Method | Synthesis only, no interview. Every assumption made in place of an answer is marked **[Assumption]** and collected in Further Notes §3. |
| Revision | 2026-11-14, second pass. Five offerings were removed because Lemon Squeezy's published policy prohibits them: Manuscript Editing (withdrawn from the live site the same day), The Soundboard, The Architecture Audit, Statistical Audit, and Digest Sponsorship. Every remaining product was checked against that policy; the result is Implementation Decisions §2. Third pass, same day: an automated Manuscript Check (P15) was added at the owner's request as the policy-compliant form of a "review" product; it is not on the live site. A Language Polish tool (P16) was added and then removed by the owner the same day. Fourth pass, same day: the owner removed the three products that needed the provider's confirmation, Pre-Submission Screening (P9), Paper Club (P11), and the Grant and Fellowship Database (P12). Every product left is one the published policy allows. Fifth pass, same day: after a look at two public skill repositories for ideas, the owner added Reference Check (P17) and Response-to-Reviewers Check (P18), and two checks (claim–evidence and paragraph flow) were folded into Manuscript Check. Nothing was copied from either repository (§2, decision on third-party material). Sixth pass, same day: the owner withdrew the Research Co-Pilot (P2) from sale, on the site and in this plan, because its payment delivered nothing; and a message asking the provider to confirm Manuscript Check and Response-to-Reviewers Check was drafted for the owner to send (`docs/lemon-squeezy-support-message.md`). |

---

## Problem Statement

### From the buyer's side

A researcher, graduate student, or engineer who trusts the archive and wants more than reading has, since 2026-11-14, one thing to buy, and it stops at the payment.

- **The Teardown System ($19)** is delivered, but the buyer cannot see what it is before paying: no format, length, contents list, or sample.
- **Research Co-Pilot ($9 / month)** was on sale until 2026-11-14. It took the payment and then waited for the editor to "set up access by email"; nothing was switched on. It has been withdrawn.
There is no confirmation email from the site and no stated refund window.

Beyond those two, the buyer has needs the site does not serve at all:

- They have a finished manuscript and face mechanical chores (formatting to a journal's rules, choosing a journal, checking the manuscript is complete, producing statistical tables) that they would pay a few dollars to offload.
- They have a CSV and need APA-style tables.
- They want company and structure: reading papers with others, working alongside others.
- They need funding and cannot find deadlines and criteria in one place.

### From the owner's side

- Revenue is capped by one product.
- The catalogue is a fixed list of keys. Adding a product means editing types, environment handling, the pricing page, the account page, and tests in step.
- There is no way to sell usage (one scan, one report), only ownership.
- The payment provider permits digital goods only. Services, newsletter advertising, donations, and job boards are prohibited, which removed five items from the original plan and constrains how three of the remaining ones may be built and described.
- A membership that delivers nothing is, under that policy, a donation. The Co-Pilot was in that position and was withdrawn; existing subscriptions have to be cancelled by the owner.

---

## Solution

One catalogue of digital goods, three ways to deliver, and a record of every delivery.

**For the buyer**

1. **A catalogue organised by what they are trying to do**:
   - *Learn the method* — The Teardown System.
   - *Tools for your manuscript* — Manuscript Formatter, Journal Matchmaker, Statistical Table Generator, Manuscript Check, Reference Check, Response-to-Reviewers Check.
2. **Every purchase turns into something usable within a minute**: a download, or a tool credit ready to spend.
3. **An "Orders" area in the account** showing each tool run and its result, each download, and credit balances.
4. **Transactional email** for every state change that matters: purchased, run finished, run failed and credit returned.
5. **Plain terms before the button**: what is included, what the buyer must supply, the refund rule, and what the product will not do.
6. **The archive, the assistant, the citation builder, and the reading list stay free and ungated.** Nothing in this PRD changes that.

**For the owner**

1. **A data-driven catalogue**: adding a product is one catalogue entry plus its payment configuration.
2. **Two fulfilment types** that every product maps onto:

   | Type | What a purchase creates | Products |
   | --- | --- | --- |
   | Download | A file, delivered by the payment provider | Teardown System |
   | Metered tool | Credits, each spent on one automated run | Formatter, Matchmaker, Table Generator, Manuscript Check, Reference Check, Response-to-Reviewers Check |

3. **One payment rail**, the existing one, selling only what its policy allows.
4. **A compliance gate**: no product is enabled until it has a recorded policy check.

### The catalogue

P1 is live. The rest are from the owner's inventory. Prices are the owner's; where the inventory gives a range or none, the working figure is an assumption. Numbering keeps the original IDs so earlier references still resolve; the gaps are the removed products.

| ID | Product | Price | Fulfilment | Policy check (§2) | Status |
| --- | --- | --- | --- | --- | --- |
| P1 | The Teardown System | $19 once | Download | Allowed | Live; needs a preview and contents list |
| P7 | Manuscript Formatter | $15 per document | Metered tool | Allowed | Planned |
| P8 | Journal Matchmaker | $10 per report | Metered tool | Allowed, open data only | Planned |
| P10 | Statistical Table Generator | $12 per dataset **[Assumption: no price given]** | Metered tool | Allowed | Planned |
| P15 | Manuscript Check | $8 per report **[Assumption: no price given]** | Metered tool | Fits the policy; **owner to confirm with the provider before building** | Planned |
| P17 | Reference Check | $6 per reference list **[Assumption: no price given]** | Metered tool | Allowed, open indexes only | Planned |
| P18 | Response-to-Reviewers Check | $8 per report **[Assumption: no price given]** | Metered tool | Fits the policy; **owner to confirm with the provider before building** | Planned |
| P14 | Weekly Research Digest | Free | Not sold | Not applicable | Not built: no email is sent today |

**Removed on 2026-11-14: prohibited by the payment provider, or withdrawn by the owner as too close to its rules**

| ID | Product | Prohibited category |
| --- | --- | --- |
| P3 | Manuscript Editing (was live; withdrawn from the site) | "Services of any kind" |
| P4 | The Soundboard | "Services of any kind … consulting" |
| P5 | The Architecture Audit | "Services of any kind … consulting" |
| P6 | Statistical Audit / Data Review | "Services of any kind … consulting" |
| P13 | Digest Sponsorship | "Advertising in newsletters" |
| P16 | Language Polish (planned only) | Removed by the owner; nearest of all to "Homework/Essay mills" |
| P9 | Pre-Submission Screening (planned only) | Removed by the owner; needed the provider's confirmation (licence and essay-mill clauses) |
| P11 | Paper Club and Co-Working (planned only) | Removed by the owner; live sessions are arguably a service |
| P2 | Research Co-Pilot (was live; withdrawn from the site) | Removed by the owner; the payment delivered nothing, which is close to "Donations … where no product exists" |
| P12 | Grant and Fellowship Database (planned only) | Removed by the owner; close to "Job boards" |

---

## User Stories

### A. Discovering and choosing

1. As a reader, I want the products page grouped by what I am trying to do, so that I am not comparing nine unrelated items.
2. As a reader, I want the tools group split by stage (before submission, after reviews), so that I can decide without scanning a long list.
3. As a reader, I want each product to state its outcome, price, what is included, who it is for, how it is delivered, and its honest limit, so that I can rule it in or out quickly.
4. As a reader, I want to see what is free before I see any price, so that I know nothing I already use is being taken away.
5. As a reader, I want a dedicated page per product with the full scope and terms, so that I can link a colleague or a supervisor to exactly one thing.
6. As a reader on a phone, I want the catalogue and every checkout to work at 320 px, so that I can buy between other things.
7. As a reader using a screen reader, I want every product to be a labelled region with its own heading, so that I can navigate by landmark.
8. As a reader who just finished an article, I want the one relevant offer named at the foot of it, so that the suggestion matches what I read.
9. As a reader, I want prices shown in US dollars with the tax treatment stated, so that I am not surprised at checkout.
10. As a reader, I want a refund rule stated per product type before I pay, so that I know what happens if it goes wrong.
11. As a reader, I want a sample of anything I would be buying blind (a page of the Teardown System, an example Matchmaker report, an example formatted document), so that I can judge the standard.
12. As a search engine or an agent, I want structured offer data for each product, so that prices are represented accurately elsewhere.

### B. Buying and paying

13. As a signed-out reader, I want to be told why an account is needed and that it is free, so that signing in does not feel like a barrier.
14. As a signed-in reader, I want checkout to open over the page I am on, so that I do not lose my place.
15. As a buyer, I want the price to be decided by the server, so that nobody can tamper with what I am charged.
16. As a buyer, I want a confirmation on screen and by email within a minute, so that I know the payment registered.
17. As a buyer, I want the confirmation to tell me the single next thing to do, so that I am never left waiting on an unstated step.
18. As a buyer whose webhook was delayed, I want the account page to say "confirming your payment" and update on its own, so that I do not pay twice.
19. As a buyer, I want every order listed in my account with date, amount, and status, so that I have a record.
20. As a buyer, I want to request a refund from the order itself, so that I do not have to hunt for an address.

### C. P1 — The Teardown System

21. As a prospective buyer, I want to see the table of contents, format, and page count, so that I know what $19 buys.
22. As a prospective buyer, I want to read one full section free, so that I can judge the writing.
23. As a buyer, I want to download my copy again later from my account, so that losing the receipt email does not cost me the product.
24. As a buyer, I want to be told when the system is revised and to get the new version, so that I am not left with a stale method.
25. As a buyer, I want the download to say plainly that it is a method and not software, so that I am not expecting a tool.

### D. P7 — Manuscript Formatter

26. As an author, I want to upload a Word document and choose a target style, so that the document is reformatted without my doing it by hand.
27. As an author, I want to see the list of supported styles before I pay, so that I do not buy a run for a journal that is not covered.
28. As an author, I want headings, margins, line spacing, font, numbering, and reference-list style changed, so that the mechanical rules are met.
29. As an author, I want a report of what was changed and what could not be changed, so that I know what still needs my attention.
30. As an author, I want my wording left exactly as it was, so that the tool formats and never rewrites.
31. As an author, I want a preview of the first page before I spend a credit, so that I can see the tool understood my document. **[Assumption]**
32. As an author, I want my credit returned automatically if the run fails, so that I do not pay for an error.
33. As an author, I want the uploaded and produced files deleted after seven days, so that my manuscript is not retained.
34. As an author, I want to rerun the same document against a second style at a reduced price, so that a rejection and resubmission is cheap. **[Assumption]**

### E. P8 — Journal Matchmaker

35. As an author, I want to paste an abstract and receive the five best-matched journals, so that I have a shortlist.
36. As an author, I want each match explained by recent, similar articles in that journal, so that the recommendation is checkable.
37. As an author, I want open-access status and article charges shown with their source and date, so that I can budget.
38. As an author, I want a citation metric that is openly licensed and named for what it is, so that I am not shown a number the site has no right to publish.
39. As an author, I want journals with integrity warnings excluded or flagged, so that I am not steered to a predatory venue.
40. As an author, I want to filter by open access only, maximum charge, or field, so that the shortlist fits my constraints.
41. As an author, I want every figure to come from a data source and never from the language model, so that nothing is invented.
42. As an author, I want my abstract not retained and not used for training, so that unpublished work stays mine.
43. As an author, I want the report as a page in my account and a PDF, so that I can share it with co-authors.

### F. P10 — Statistical Table Generator

44. As an analyst, I want to upload a CSV and choose variables and an analysis, so that I get tables without writing code.
45. As an analyst, I want descriptives, correlations, t-tests, one-way ANOVA, chi-square, and linear regression in the first release, so that the common cases are covered.
46. As an analyst, I want APA 7 formatted tables in Word and as copyable text, so that they drop into a manuscript.
47. As an analyst, I want a plain-language baseline interpretation of each table, so that I have a starting sentence.
48. As an analyst, I want every number computed deterministically and the interpretation generated only from those numbers, so that the prose cannot contradict the table.
49. As an analyst, I want assumption checks shown with the result, so that I know when a test was inappropriate.
50. As an analyst, I want the exact method and library version recorded on the output, so that I can report it.
51. As an analyst, I want a warning before uploading if my file appears to contain names or email addresses, so that I do not upload identifiable data by mistake.
52. As an analyst, I want my dataset processed and deleted, with only the output kept, so that data is not retained.

### G. P14 — Weekly Research Digest (free)

53. As a reader, I want to subscribe with my email and confirm it, so that I receive the digest.
54. As a subscriber, I want one email on Tuesdays listing the week's reviews, so that I keep up without visiting.
55. As a subscriber, I want one-click unsubscribe in every issue, so that leaving is trivial.
56. As a subscriber, I want no tracking pixel and no per-person click tracking, so that the digest keeps the site's privacy stance.
57. As a subscriber, I want the digest to carry no advertising, so that it stays what I signed up for.
58. As a reader who subscribed on the old browser-only form, I want to be asked once to confirm an address, so that my earlier intent is honoured without my being enrolled silently.

### H. The account

59. As a customer, I want one "Orders" view of everything I have bought, so that nothing is scattered.
60. As a customer, I want my tool credits by tool with a history of how each was spent, so that I can account for them.
61. As a customer, I want past tool results kept for a stated time and downloadable, so that I can come back to them.
62. As a customer, I want to delete an uploaded file or a result myself, so that I control my data.
63. As a customer, I want to export my purchase history, so that I can claim expenses.
64. As a customer, I want email preferences split into receipts (always), tool results, and announcements, so that I can silence marketing without missing a result.

### I. The editor (operator)

65. As the editor, I want to return a credit or request a refund with a reason, so that corrections are auditable.
66. As the editor, I want to see failed tool runs with their error and input size, so that I can fix causes.
67. As the editor, I want third-party cost per run recorded beside the price, so that I can see margin per tool.
68. As the editor, I want to compose the weekly digest from that week's published reviews and send a test to myself, so that sending is safe.
69. As the editor, I want a per-product on/off switch, so that I can pause a product without a deploy.
70. As the editor, I want a product to be impossible to enable until its policy check is recorded, so that nothing prohibited goes on sale by accident.
71. As the editor, I want every privileged action logged with who and when, so that there is an audit trail.

### J. Trust, privacy, and compliance

72. As a customer, I want uploads encrypted at rest and readable only by me, so that unpublished work is protected.
73. As a customer, I want a stated retention period per file type and automatic deletion, so that I do not have to remember to clean up.
74. As a customer, I want to know which third parties process my text and for what, so that I can make an informed choice.
75. As a customer, I want my content never used to train a model, so that my ideas are not leaked.
76. As a customer, I want terms of service and a refund policy I can read before buying, so that the rules are known.
77. As a customer, I want tools described as aids and not guarantees of acceptance, so that I am not misled.
78. As a reader, I want the privacy policy updated to describe accounts, uploads, email, and processors, so that it matches what the site does.
79. As the owner, I want every product reviewed against the payment provider's rules before launch, so that the store is not suspended.
80. As the owner, I want integrity language on every manuscript tool (formatting, checking), so that none can be mistaken for a writing-for-hire service.
81. As the owner, I want no service, sponsorship, or donation offered through the store, so that the store is never put at risk.

---

### K. P15 — Manuscript Check

82. As an author, I want to upload my manuscript and get an automated report within minutes, so that I can fix problems before I submit.
83. As an author, I want the report to say which sections are missing or out of order for my article type, so that the structure is complete.
84. As an author, I want my manuscript checked against the reporting guideline for my study design (CONSORT, PRISMA, STROBE, and similar), so that I see which items I have not reported.
85. As an author, I want in-text citations and the reference list cross-checked, so that nothing is cited but unlisted or listed but uncited.
86. As an author, I want statistical reporting checked for completeness and internal consistency, so that a reported p-value agrees with its test statistic.
87. As an author, I want the abstract compared with the body, so that numbers and claims in the abstract match the paper.
88. As an author, I want every finding to point to the place in my text and state the rule it comes from, so that I can verify it myself.
89. As an author, I want the report to state plainly that software produced it and that it is not peer review, so that I am not misled about what I bought.
90. As an author, I want the tool to say what it did not check, so that I do not assume a clean report means a sound paper.
91. As an author, I want my manuscript deleted after the run, so that unpublished work is not retained.
92. As the owner, I want no person involved in producing any report, so that the product stays software and never becomes a service.
93. As an author, I want claims in my abstract and introduction that the results do not support listed, so that I can add evidence or soften the claim.
94. As an author, I want paragraphs with no clear point, or more than one, flagged in a reverse outline of each section, so that I can fix the flow myself.

### L. P17 — Reference Check

95. As an author, I want every entry in my reference list looked up in open scholarly indexes, so that I know each one exists.
96. As an author, I want mismatches in title, authors, year, journal, volume, pages, or DOI shown side by side with the indexed record, so that I can correct them.
97. As an author, I want retracted and withdrawn works flagged, so that I do not cite them unknowingly.
98. As an author, I want a reference that cannot be found described as "not found in the indexes searched" and never as fake, so that books, theses, and reports are not wrongly accused.
99. As an author, I want duplicates and missing DOIs listed, so that the list is clean.
100. As an author, I want to paste a list or upload a manuscript or a reference-manager export, so that I can use whatever I have.
101. As an author, I want a corrected export I can import into my reference manager, with every correction mine to accept, so that fixing is quick.
102. As an author, I want the indexes searched and the date of the search printed on the report, so that I can say how the list was checked.

### M. P18 — Response-to-Reviewers Check

103. As an author revising a paper, I want to upload the reviewers' comments and my response letter, so that I can check the letter before I send it.
104. As an author, I want every reviewer comment split out and numbered, so that I can see the full list of what was asked.
105. As an author, I want each comment marked answered, partly answered, or not answered, with the passage of my letter it was matched to, so that I can verify the match.
106. As an author, I want responses that promise a change checked against my revised manuscript when I upload it, so that I do not claim an edit I did not make.
107. As an author, I want responses with no stated location (page, section, or line) flagged, so that the editor can find each change.
108. As an author, I want the tool never to write or reword my response, so that the letter stays mine.
109. As an author, I want the reviews and my letter deleted after the run, so that confidential review material is not retained.

## Implementation Decisions

### 1. Principles that constrain every decision

1. **The archive is never gated.** Articles, the assistant, the citation builder, and the reading list remain free and account-less.
2. **The server is the only party that knows a price or a variant.** The browser names a product key and nothing else. This is already true and stays true for every new product.
3. **No claim the system cannot keep.** Coverage and accuracy statements come from data the system holds, not from static copy.
4. **Language models never produce numbers.** In P8 and P10 every figure is computed or retrieved; a model may only phrase what it is given.
5. **No behavioural tracking.** This holds for the digest too: no open or click tracking.
6. **Digital goods only.** Nothing that is a service, an advertisement, a donation, or a job listing is sold. A product is described by what the buyer receives, never as support for the site.

### 2. Payment-provider policy — the gate on every product

**The rule.** Lemon Squeezy allows "digital goods that can be fulfilled through Lemon Squeezy's website" (software and SaaS, eBooks, PDFs, audio, video) and may place a store in review or suspend it without notice for selling anything on its prohibited list. The page ends by telling sellers who are unsure to contact support with a description before selling. Source: https://docs.lemonsqueezy.com/help/getting-started/prohibited-products (read in full 2026-11-14).

**Clauses that touch this catalogue**

| Clause, as published | What it rules out here |
| --- | --- |
| "Services of any kind (including marketing, design, web development, consulting or other related services)" | Manuscript Editing, The Soundboard, The Architecture Audit, Statistical Audit — **removed** |
| "Advertising in newsletters, on websites, or in social media posts" | Digest Sponsorship — **removed** |
| "Donations or charity giving where no product exists or where the price is greater than the product value" | Any membership that delivers nothing; any "support the archive" framing; pay-what-you-want pricing |
| "Products or content for which you do not hold a proper license or intellectual property rights" | Showing a proprietary journal metric |
| "Private Label Rights … any product which you've obtained a license to sell but do not hold the original IP rights" and "Marketplaces" | Passing a third party's report through unchanged as the product |
| "Homework/Essay mills" | Any tool that writes, rewrites, paraphrases, or "humanises" a manuscript |

**Check of every remaining product**

| ID | Product | Verdict | Why, and the condition it carries |
| --- | --- | --- | --- |
| P1 | Teardown System | **Allowed** | A PDF or eBook the owner wrote. Condition: the owner holds the rights to everything in it. |
| P7 | Manuscript Formatter | **Allowed** | Software. Condition: it changes formatting only and provably leaves the text unchanged. |
| P8 | Journal Matchmaker | **Allowed** | Software. Condition: built only on openly licensed data; no proprietary impact metric. |
| P10 | Statistical Table Generator | **Allowed** | Software computing on the buyer's own data. |
| P15 | Manuscript Check | **Fits the policy; confirm first** | Software that returns a report on the buyer's own file. Two conditions. It is fulfilled entirely automatically: if a person reads or annotates any manuscript, it becomes the service that removed Manuscript Editing. It is never called "peer review", "expert review", or "reviewed by", which would be both untrue and a breach of the site's own copy rules. Reporting-guideline checklists are used under their open licences with attribution. Because it reads and comments on a manuscript, a reviewer could mistake it for a service; the owner asks the provider before it is built. |
| P17 | Reference Check | **Allowed** | Software that reports on the buyer's own reference list. Conditions: only openly licensed indexes are queried (the licence clause); the report is the site's own and not a third party's result passed through; it verifies references and never generates or suggests new ones. |
| P18 | Response-to-Reviewers Check | **Fits the policy; confirm first** | Software that audits a document the buyer wrote. Conditions: it never drafts, completes, or rewords the response (the essay-mill clause); fully automated; never described as review of the paper. Same exposure as Manuscript Check; the owner asks the provider before it is built. |
| P14 | Weekly Research Digest | **Not applicable** | Free; nothing is sold. It must carry no paid placement. |

**Decisions**

1. There is one payment rail. No second processor or invoice route is introduced to sell what the first prohibits; those products are out of this catalogue.
2. Every catalogue entry carries a policy-check record: verdict, date, the clause considered, and, where the provider was asked, a reference to its written reply. A product without a passing record cannot be enabled. Every product in this catalogue is one the published policy allows; a product that would need the provider's confirmation is not added without a new decision by the owner.
3. Pay-what-you-want pricing is not used anywhere.
4. The existing truthful-copy scan gains the words that would describe a prohibited product on a sales surface: consulting, audit-for-hire, sponsor, donate, support us, humanise, undetectable.

**Owner actions outside the code.** Archive the Manuscript Editing product in the Lemon Squeezy dashboard and delete its variant variable from the deployment. Anyone who has already paid for an edit should be served or refunded; the removal stops new sales only.

**Additional risk to record.** Third-party reporting in 2026 states that Stripe, which owns Lemon Squeezy, is steering merchant-of-record sellers toward a successor product. The data-driven catalogue is the seam if the provider changes. This PRD does not plan that migration.
5. No third-party prompts, scripts, templates, or text go into a paid product unless their licence permits commercial use and the grant clearly covers the material. Two repositories were read for ideas on 2026-11-14: `Imbad0202/academic-research-skills` is CC BY-NC 4.0 and its positioning file prohibits commercial hosted services and resale; `Master-cai/Research-Paper-Writing-Skills` is MIT but is built on notes whose original repository carries no licence. Neither is used. P17, P18, and the added Manuscript Check rules are specified and built independently.
6. P15 and P18 are not built until the provider's written reply is on file. The message is drafted in `docs/lemon-squeezy-support-message.md`; only the store owner can send it. If either is refused, it is cut.
7. No membership or subscription is sold. The Research Co-Pilot was withdrawn on 2026-11-14. A membership may be proposed again only as a new decision, and only if it delivers a defined product automatically at the moment of payment. Code that handles existing subscriptions (webhook events, status rules, the account page) stays until the last one has ended.

### 3. Catalogue model

The catalogue becomes data-driven. Each entry carries:

- Identity: key, name, family (learn / tools), sort order.
- Offer copy: outcome, summary, inclusions, who it is for, delivery, honest limit, action label. (These fields exist today for P1.)
- Commercial terms: price label; every product is charged once.
- Fulfilment: one of download or metered tool; plus fulfilment parameters (credits granted per purchase and for which tool).
- Operations: enabled flag, retention days for uploads.
- Compliance: the policy-check record (§2), refund rule key, required disclaimers.

Decisions:

- The closed union of product keys is replaced by a registry lookup. A key not in the registry cannot be checked out (the existing behaviour, generalised).
- Variant identifiers remain in the environment and are resolved server-side. The registry maps a key to an environment variable name by convention, so adding a product does not require a code change to the resolver.
- A reverse lookup (provider variant identifier → product key) is added. Today an order records the provider's variant and product name only; fulfilment needs the internal key.
- The enabled flag lives in the database so the editor can pause a product without a deploy; enabling requires a passing policy check.

### 4. Data model changes

All changes are additive, idempotent SQL migrations with row-level security on by default, in the existing style. No table is writable directly by a signed-in user; writes go through server routes or narrowly scoped security-definer functions.

| New table | Purpose | Key columns | Who reads |
| --- | --- | --- | --- |
| Product settings | Editor-controlled switches and the policy record | product key, enabled, policy verdict, policy checked-at, policy reference | Everyone (public read of enabled only) |
| Order items | The internal meaning of a paid order | order reference, product key, amount, currency, state | Owner of the order; editor |
| Credit ledger | Append-only credits and debits | user, tool key, delta, reason (purchase / run / refund / adjustment), reference, expires-at | Owner; editor |
| Tool runs | One automated job | user, tool key, state, input reference, output reference, parameters, provider cost, error code, timestamps | Owner; editor |
| Tool files | Uploads and outputs | run, role (input / output), storage path, size, checksum, delete-after | Owner |
| Newsletter subscribers | Digest list | email (unique, lower-cased), state (pending / confirmed / unsubscribed / bounced), confirm token hash, timestamps | Editor only |
| Newsletter issues | Sent digests | send date, subject, content snapshot, counts | Editor; public archive of sent issues |
| Audit log | Privileged actions | actor, action, subject, before/after summary, timestamp | Editor |

Changes to existing tables:

- Orders gain a nullable product key, written by the webhook path through the reverse lookup. Historical rows are back-filled by matching stored variant identifiers; past Manuscript Editing orders keep their stored product name and remain visible to their buyers.
- The existing per-order credit column is retained for compatibility and no longer read; the ledger becomes the single source of balances. The account page's credit counter reads the ledger.

Tool run states:

```
queued → running → succeeded
                 → failed (credit returned automatically)
queued → cancelled (credit returned)
```

A run debits one credit when queued, inside the same transaction that creates the run. A failed or cancelled run writes a compensating ledger row with the run as its reference; the pair is unique per run so a retry cannot refund twice.

### 5. Fulfilment pipeline

One function receives "order paid" from the webhook path and dispatches on the product's fulfilment type:

- **Download** — nothing further; the provider delivers the file. The account page links to the provider's order page for re-download.
- **Metered tool** — write a ledger credit for the tool.

Every fulfilment is automatic and happens through software. That is a product requirement and also what the provider's rule ("fulfilled through" the platform) expects; no purchase may depend on a person doing work for the buyer.

The dispatcher is idempotent on the payment event identifier, extending the existing idempotency of the billing event store. No new subscription is created, but lifecycle events for subscriptions that already exist (renewed, payment failed, cancelled, expired) are still recorded using the access rules the system already encodes: access continues through *past due*, *paused*, and *cancelled* until the period ends, and stops at *unpaid* and *expired*.

### 6. Files and privacy

- A new private storage bucket, separate from the public image bucket. Paths are namespaced by user; policies allow the owner to read and to write within size and type limits, and nobody to list across users. The editor has no standing access to customer files.
- Uploads go directly from the browser to storage through short-lived signed upload URLs issued by a server route that checks entitlement first. The application server never proxies file bytes.
- Accepted types and ceilings **[Assumption]**: Word documents up to 20 MB (P7), CSV up to 10 MB or 200,000 rows (P10), Word or PDF up to 20 MB and 15,000 words (P15), a reference list of up to 150 entries as pasted text, a manuscript, or a BibTeX or RIS export (P17), up to three Word or PDF files of 20 MB each (P18). Type is verified by content signature, not by extension.
- Retention **[Assumption]**: tool inputs 7 days, tool outputs 30 days. A scheduled job deletes expired objects and nulls their paths; deletion is logged.
- Third-party processors are named on the product page and in the privacy policy, per tool.
- No customer content is sent to any provider that trains on API inputs. This is a contractual check performed during vendor selection, recorded per vendor.

### 7. Background jobs

The application runs on an edge worker runtime with strict CPU and duration limits. Tool runs cannot execute inside a request.

- **Decision:** the tool-runs table is the source of truth; a message queue provided by the hosting platform dispatches run identifiers to a consumer worker; the consumer loads the run, performs the work, writes the result, and updates the state. The queue is an at-least-once transport, so the consumer is idempotent on run identifier and state.
- A scheduled trigger sweeps runs stuck in `running` beyond a timeout to `failed` and returns the credit.
- Workloads that cannot run in the edge runtime (heavy document manipulation, if the pure-JavaScript approach proves insufficient) go to a single small container service behind the same queue contract. This is a fallback, decided per tool after a prototype, not a default.
- The same scheduled trigger runs retention deletion and the weekly digest send.

### 8. Email

A scenario library and templates exist but no route sends mail. This PRD wires it.

- Transactional mail is sent from server code on state transitions only, through the existing provider adapter.
- Scenarios to add: order confirmed; tool run finished; tool run failed and credit returned; newsletter confirm.
- Each scenario has a stable key, a subject, a plain-text alternative, and is idempotent on (scenario, subject entity, transition).
- Preferences: receipts and tool results cannot be disabled; announcements can.

### 9. Per-product decisions

**P1 — The Teardown System.** Add to the product page a contents list, format, page count, and one free section, all supplied by the owner. Add a re-download link in the account. Version the file; when a new version is uploaded to the provider, notify existing buyers. No licence keys.

**P7 — Manuscript Formatter.**
- Scope of the first release is a fixed set of **style profiles**, not "any journal": APA 7, IEEE, Vancouver, Chicago author-date, and the generic profiles of the largest publishers **[Assumption]**. The supported list is shown before purchase. Unsupported journals are a request form, not a failed purchase.
- A style profile is declarative data: page geometry, fonts, heading hierarchy, numbering, caption rules, abstract limits, reference-list style by Citation Style Language identifier.
- Processing manipulates the document's underlying markup directly. Text content is never altered; a post-run check compares the extracted text before and after and fails the run on any difference outside whitespace and reference-list formatting.
- Reference reformatting applies only where references can be parsed with confidence; otherwise they are left untouched and listed in the report.
- Output: the reformatted document and a compliance report (applied, could not apply and why, needs a human decision).
- A free first-page preview is produced before a credit is spent **[Assumption]**.

**P8 — Journal Matchmaker.**
- Data: an open bibliographic index released under a public-domain dedication for journals, recent articles, topics, and an open two-year mean citedness figure; the open-access journal directory for access status and article charges. Sources and retrieval dates are displayed with every figure.
- **The Journal Impact Factor is not shown.** It is a proprietary, licensed metric; the inventory's "impact factors" is fulfilled with the open citedness metric, named for what it is, unless the owner obtains a licence.
- Method: embed the abstract; retrieve candidate journals by similarity to recent articles; filter by the author's constraints; rerank; a language model writes the rationale from retrieved facts only, with the supporting articles cited.
- Guardrails: journals absent from recognised indexes or present on integrity watchlists are excluded or flagged; a journal is never recommended without at least three supporting recent articles.
- A weekly job refreshes the journal table; the report records the snapshot date.
- Abstracts are processed and discarded; only the report is stored.

**P10 — Statistical Table Generator.**
- First release: descriptives, Pearson and Spearman correlations, independent and paired t-tests, one-way ANOVA with post-hoc tests, chi-square, simple and multiple linear regression.
- All computation is deterministic, performed by a vetted statistics library whose name and version are printed on the output. Results are validated against reference outputs from R.
- Assumption checks accompany each test and can downgrade the interpretation.
- The interpretation paragraph is generated from the computed result object only; a validator rejects any generated number not present in that object.
- Output: APA 7 tables as a Word document and as copyable text, plus the method statement.
- Column-name and value heuristics warn about identifiable data before upload completes. Datasets are deleted after the run.

**P15 — Manuscript Check.**
- Price $8 per report **[Assumption]**. One run, one report, no human step anywhere in the pipeline.
- Checks in the first release, each a named rule with an identifier: section presence and order by article type; reporting-guideline items for the declared study design (CONSORT, PRISMA, STROBE; more added as fixtures exist); citation and reference-list cross-check; statistical reporting completeness and recomputed consistency of test statistic, degrees of freedom, and p-value; abstract-to-body agreement of numbers; claim–evidence alignment (each claim in the abstract and introduction is matched to the result that supports it, or listed as unsupported); paragraph flow (a reverse outline of each section, flagging paragraphs with no identifiable point or more than one); figure and table call-outs; declarations present (ethics, funding, conflicts, data availability).
- Deterministic rules do the work wherever they can (references, statistics recomputation, call-outs). A language model is used only to locate things in the text (where a guideline item is reported, which result supports a claim, what a paragraph's point is), and every such finding must quote the passage it relies on; a finding without a verifiable quotation is dropped, not shown.
- Each finding carries a rule identifier, severity, the location in the text, and the source of the rule. Findings are "reported", "not found", or "could not check"; the tool never scores the paper and never predicts acceptance. Claim–evidence and flow findings are worded as questions for the author ("no supporting result was found for this claim") and carry no suggested rewrite.
- The report opens with a fixed statement: produced by software, not peer review, not a judgement of scientific merit, followed by a list of what was not checked.
- Output: an on-screen report and a PDF. The manuscript is deleted after the run; the report follows the standard retention period.
- Copy rule: "peer review", "reviewer", "expert", and "reviewed by" are banned from this product's page, emails, and metadata, with one exception: the fixed disclaimer that the report is not peer review. Enforced by the truthful-copy test.

**P17 — Reference Check.**
- Price $6 per reference list **[Assumption]**, up to 150 entries.
- Input: pasted references, a manuscript (the reference section is extracted), or a BibTeX or RIS export.
- Each entry is parsed into fields and looked up by DOI where present, otherwise by title and first author, in open indexes: Crossref and OpenAlex in the first release. Matching is deterministic (normalised title similarity plus author and year agreement) with fixed thresholds; no language model decides whether a work exists.
- Per-entry result, one of: verified; verified with differences (each differing field shown beside the indexed value); retracted or withdrawn (from the indexes' retraction data); not found in the indexes searched; could not parse.
- "Not found" is never worded as fabricated or fake. The report says which indexes were searched and that books, theses, reports, and works in some languages are often absent from them.
- Also reported: duplicates, missing DOIs that the index can supply, and inconsistent journal-name forms.
- Output: on-screen report, PDF, and a corrected BibTeX and RIS export in which every correction is listed and nothing is changed without appearing in the list. Indexes searched and the search date are printed on the report.
- The tool never proposes additional references and never checks whether a cited work supports the sentence citing it; that is stated on the page.
- Index rate limits are respected through a polite, identified client with caching; lookups run in the tool-run queue.
- Division of labour: Manuscript Check tests whether citations and the list agree with each other; Reference Check tests whether the list agrees with the world. Each page links to the other.

**P18 — Response-to-Reviewers Check.**
- Price $8 per report **[Assumption]**.
- Input: the decision letter or reviewer comments, the author's response letter, and optionally the revised manuscript.
- The comments are segmented into numbered, atomic requests per reviewer. Each is matched to the passage of the response that addresses it. A language model does the segmentation and matching; every match must quote both passages, and a match whose quotations cannot be found in the documents is dropped.
- Per-comment status: answered; partly answered (the unaddressed part is quoted); not answered. Flags: no location given for a change; a change promised but not found at the stated place in the revised manuscript (only when it was uploaded); a single response covering several distinct requests.
- It audits only. It has no mode that drafts, completes, rewords, or suggests a response, and it gives no opinion on whether the reviewer or the author is right.
- Output: a coverage table on screen and as a PDF.
- Reviewer reports are confidential. Inputs are deleted when the run ends, not at the standard retention period; the model provider must contractually not train on or retain inputs (§6); the page says plainly that the buyer is responsible for the journal's confidentiality terms and names the processor.
- Copy rule: never described as peer review or as review of the paper; "write", "draft", and "generate" are banned from this product's page in relation to the response.

**P14 — Weekly Research Digest.**
- Free, and carries no advertising or paid placement of any kind.
- Server-side list with double opt-in; confirmation tokens are stored hashed and expire.
- One issue each Tuesday, assembled from reviews published since the last issue; the editor reviews and sends, or schedules.
- One-click unsubscribe by header and link; bounces and complaints from the provider's webhook update subscriber state.
- No open tracking and no click tracking.
- Existing browser-only subscriptions cannot be migrated because no address was ever collected; the old control is replaced by the real form.
- The privacy policy is rewritten in the same release.
- It is no longer a prerequisite for anything sold. It is kept because the site already advertises a weekly digest that it does not send, and it is the lowest priority in the plan.

### 10. Information architecture and page changes

- The single pricing page becomes an index of two families: learn and tools. Each family section shows its products as the existing card pattern.
- Each product gets its own page carrying full contents, terms, sample, questions, and the action.
- New signed-in areas: orders; a tool workspace per tool (upload, options, run, result).
- New editor areas: tool runs; product settings and policy records; digest; audit log.
- Every new route gets a surface brief, in line with the repository's rule.
- The second deployment target, which today has no pricing route although its footer links to one, either gains these routes or is formally retired; this must be decided before Phase 1 ends.
- Navigation: "Services" in the header is renamed "Products", since no service is sold. Tools are reachable from the article page for manuscript-adjacent formats only.

### 11. API contracts (shapes, not paths)

- **Create checkout** — input: product key. Output: checkout URL. Rejects unknown keys, disabled products, and products without a passing policy record.
- **Issue upload URL** — input: purpose, file name, size, type. Output: short-lived signed URL and storage reference. Checks ownership and limits.
- **Start tool run** — input: tool key, input reference, parameters. Effect: debit and enqueue atomically. Output: run reference. Rejects when balance is zero.
- **Get tool run** — output: state, result reference or error, timestamps. Owner only.
- **Entitlement** — extended to return credit balances per tool.
- **Subscribe to digest / confirm / unsubscribe** — unauthenticated, rate-limited, token-based.
- **Mail-provider webhook** — verified by signature over the raw body before parsing, following the existing payment webhook.

All state-changing routes keep the existing same-origin check and rate limiting; all are no-store.

### 12. Security

- Signature verification before parsing on every inbound webhook; constant-time comparison.
- No service-role credential in the application. New privileged writes use narrowly scoped security-definer functions guarded the same way as the existing billing bridge.
- Row-level security on every new table; tests assert that one user cannot read another's runs, files, or ledger.
- Uploaded files are never served from the public origin and never rendered inline; downloads use short-lived signed URLs with a download disposition.
- Upload validation by content signature; documents are parsed in an isolated worker with size and time limits; archive-bomb checks on compressed formats.
- Prompt-injection posture for tools using a language model: user content is data, never instructions; outputs are validated against retrieved or computed facts; no tool-calling on user content.
- Secrets for every new vendor live in the platform's secret store and are listed in the production environment check.
- The content security policy is extended only for the specific origins each integration needs.
- The audit log is append-only.

### 13. Delivery plan

Each phase ends with something shippable. Later phases do not start until the exit criteria of the earlier ones hold.

**Phase 0 — Decisions and compliance (no code).**
1. Cancel and, where fair, refund every active Co-Pilot subscription; archive the product in the provider's dashboard; remove its variant variable.
2. Send the drafted message about P15 and P18 to the provider's support and file the reply.
3. Archive Manuscript Editing in the provider's dashboard; remove its variant variable; serve or refund any open order.
4. Owner confirms or corrects every **[Assumption]** in Further Notes §3.
5. Owner supplies P1 contents, sample section, and page count.
6. Draft terms of service, refund policy, and the privacy policy changes.
*Exit:* a signed-off catalogue table with final prices, a policy verdict for every product, and refund rules.

**Phase 1 — Catalogue and order foundation.**
1. Data-driven catalogue registry and variant resolver; reverse lookup.
2. Product settings with the policy record, order items, credit ledger, audit log.
3. Fulfilment dispatcher wired to the existing webhook path.
4. Transactional email wired for order confirmed.
5. Pricing index restructured into families; product page for P1.
6. Account: orders view.
*Exit:* the live product behaves exactly as before from the buyer's side, every order has an internal product key, and a product without a policy record cannot be enabled.

**Phase 2 — Fix the live product.**
1. P1: preview, contents, re-download, versioning.
*Exit:* a buyer can see what the product is before paying and has it within one minute of paying.

**Phase 3 — Tool platform, then tools in order of risk.**
1. Private bucket, signed uploads, retention job.
2. Tool-run state machine, queue, consumer, sweeper, automatic credit return.
3. P8 Journal Matchmaker (no file handling; lowest risk; validates the platform).
4. P10 Statistical Table Generator (deterministic; validates file handling).
5. P7 Manuscript Formatter (hardest; ships with a deliberately short style list).
6. P17 Reference Check (deterministic lookups; no model; cheap to run).
7. P15 Manuscript Check (reuses the Formatter's document parsing; deterministic rules first, guideline location second).
8. P18 Response-to-Reviewers Check (reuses Manuscript Check's quote-verification step).
*Exit per tool:* accuracy bar met on its fixture set (Testing Decisions §4), cost per run recorded, failure returns the credit.

**Phase 4 — Digest (P14).**
Subscribers, double opt-in, composer, send, unsubscribe, bounce handling, privacy policy update.
*Exit:* four consecutive issues sent.

### 14. Metrics

The site uses no behavioural analytics, so every metric below is derived from records the system already has to keep.

- Per product: orders, revenue, refund rate.
- Tools: runs, success rate, median duration, credits returned, provider cost per run, margin per run.
- Digest: confirmed subscribers, unsubscribe rate, delivery rate.
- North Star **[Assumption]**: successful tool runs per month, counted only when the result was actually delivered.

---

## Testing Decisions

### 1. What a good test is here

- It exercises behaviour through a public seam — a route's request and response, a rendered page's HTML, a database function's result — and never asserts on internal helpers or call order.
- It states a promise the product makes ("a failed run returns the credit", "one user cannot read another's file") and would fail if that promise broke.
- It uses the real SQL for anything that depends on row-level security or a state machine, not a JavaScript imitation of it.
- It needs no network. Every third party is behind an adapter with a recorded-response fake.

### 2. Seams

Existing seams are preferred, and the plan adds only one new one.

| Seam | Existing? | What is tested through it |
| --- | --- | --- |
| HTTP route handlers called with a constructed request | Existing (checkout, webhook, entitlement, applications, auth callback) | Every new route: authorisation, validation, state changes, error mapping |
| Server-rendered page HTML with dependencies mocked | Existing (pricing, account, about) | Catalogue families, product pages, account views, editor queue, honest-copy rules |
| Injectable store / fetch / environment | Existing (billing store, checkout fetch, rate-limit store) | Dispatcher idempotency, vendor adapters, configuration errors |
| Migrations applied to an embedded database behind a small auth shim | Existing (billing bridge check, application identity check) | Row-level security, state-machine functions, ledger invariants |
| Database unit tests under the local database stack | Existing (billing, applications, profile images) | Privileges, policies, constraints |
| Webhook fixtures | Existing (payment provider) | Mail-provider webhook added to the same fixture pattern |
| **Tool processor: input reference and parameters in, result object out** | **New** | Each tool's logic, independent of queue and HTTP |
| End-to-end browser tests | Existing project, lightly used | One purchase-to-delivery path per fulfilment type |

**The one new seam** is the tool processor boundary. It is placed as high as possible — a whole tool behind one function — so that the queue consumer, the route, and the processor can each be tested without the others, and so a tool can move from the edge runtime to a container without its tests changing.

*The skill this document follows asks that seams be confirmed with the owner before the spec is written. That confirmation has not happened; this table is the proposal to confirm.*

### 3. Modules to be tested

- Catalogue registry and resolver: unknown keys rejected, prototype-chain names rejected, disabled products and products without a passing policy record refuse checkout, variant resolution, reverse lookup.
- Fulfilment dispatcher: each fulfilment type; replay of the same event is a no-op; events for subscriptions that predate the withdrawal still follow the existing access table.
- Catalogue copy: no entry describes a service, a sponsorship, or a donation; no product can be bought at a price the buyer chooses.
- Credit ledger: balance equals the sum; a run with zero balance is refused; concurrent starts cannot overdraw; a failed run is compensated once.
- Tool-run lifecycle: queued → running → terminal; stuck runs swept; duplicate queue delivery is harmless.
- File access: cross-user reads refused at the policy level; signed URLs expire; retention deletes.
- Email: one message per transition; idempotent on replay; receipts ignore the marketing preference.
- Newsletter: double opt-in required before any send; unsubscribe is immediate; a bounced address is never mailed again; no per-person click data is stored.
- Each page: required facts present, banned phrases absent, one main landmark, one top-level heading.

### 4. Tool accuracy fixtures

Automated tools are tested against fixed fixture sets with explicit pass bars, stored with the repository.

- **Formatter** — a corpus of documents per style profile. Bars: extracted body text identical before and after (hard failure otherwise); every profile rule either applied or reported; no silent partial result.
- **Matchmaker** — abstracts of published articles with the publishing journal known. Bars: the true journal or a same-field journal appears in the five for an agreed proportion of cases **[Assumption: 70%]**; every displayed figure matches the snapshot; no journal on the exclusion list is ever returned.
- **Table Generator** — public datasets with reference results from R. Bars: statistics agree to the reported precision; the interpretation contains no number absent from the result object.
- **Manuscript Check** — manuscripts with known, seeded defects (a missing section, an uncited reference, an inconsistent p-value, an unreported guideline item) and clean controls. Bars: every seeded deterministic defect found; no finding shown without a quotation that exists in the text; false findings on the clean controls under an agreed rate **[Assumption: 5% of findings]**; the not-peer-review statement present on every report. Claim–evidence and flow: seeded unsupported claims and seeded pointless paragraphs are found at an agreed rate **[Assumption: 80%]**, and no such finding contains a suggested rewrite.
- **Reference Check** — reference lists with seeded defects (an invented entry, a wrong year, a wrong DOI, a retracted article, a duplicate) and genuine entries including books and non-English works, run against recorded index responses. Bars: every seeded defect classified correctly; no genuine indexed entry reported as not found; no report contains "fake" or "fabricated"; the corrected export differs from the input only by listed corrections.
- **Response-to-Reviewers Check** — review and response pairs with seeded omissions, partial answers, and a promised change absent from the manuscript. Bars: every seeded omission found; every match quotes text present in both documents; answered comments wrongly marked not answered under an agreed rate **[Assumption: 5%]**; the output contains no drafted response text.

### 5. Prior art in this codebase

- The pricing page test that pins prices, forbids promises the implementation does not keep, and counts actions per state.
- The catalogue test that pins prices and rejects inherited object property names as product keys.
- The checkout tests with an injected fetch and environment.
- The webhook fixtures and the billing bridge check that applies the real migration to an embedded database.
- The application-identity check added on 2026-11-14, which uses the same embedded-database approach for a security rule.
- The truthful-copy scan that fails the build on banned claims.
- The surface-brief test that requires a brief for every route.
- The design-token test that rejects raw palette classes.

### 6. Quality gate

Every phase passes the existing gate (tokens, lint, typecheck, unit tests, protocol tests, design scan). The truthful-copy scan gains entries for claims this PRD forbids: guaranteed acceptance, the proprietary impact metric, "undetectable", and any accuracy percentage for AI detection.

---

## Out of Scope

- Migrating away from the current automated payment provider. The data-driven catalogue makes it possible; planning it is separate.
- **Every service and every advertising product**: manuscript editing, calls, repository or statistical audits, consulting of any kind, and digest sponsorship. They are prohibited by the payment provider and were removed from this catalogue on 2026-11-14.
- A second payment route (invoices, another processor) to sell what the provider prohibits. If the owner later wants to offer services, that is a separate business decision with its own spec, kept entirely apart from this store.
- A "humanizer": any tool that rewrites or polishes manuscript text, including one that makes it read as human-written or lowers an AI-detection score. Language Polish (P16) was removed on 2026-11-14.
- Similarity or AI-detection scanning, a paid community or live sessions, and a grant, fellowship, or funding database. All three were removed on 2026-11-14.
- Suggesting or generating references, and judging whether a cited work supports the claim citing it.
- Drafting or rewording a response to reviewers.
- Using code, prompts, or text from the two repositories named in Implementation Decisions §2.
- Human review of manuscripts under any name. Manuscript Check (P15) is software only.
- Memberships and subscriptions of any kind, including the Research Co-Pilot, withdrawn on 2026-11-14.
- Donations, tips, "support us" tiers, and pay-what-you-want pricing.
- Job or vacancy listings.
- Tax computation, VAT numbers, or invoice rendering by this system. The provider handles tax as merchant of record.
- Licence keys or activation for the Teardown System.
- Team or institutional accounts, seats, and site licences.
- Native mobile applications.
- Any gating of articles, the assistant, the citation builder, or the reading list.
- Marketplace features: other people selling services or products through the site.
- Formatting for arbitrary journals beyond the published style list; LaTeX input for the Formatter.
- Rewriting, paraphrasing, or "humanising" text in any tool.
- Displaying the proprietary Journal Impact Factor without a licence.
- Advanced statistics in the Table Generator: mixed models, structural equation models, Bayesian methods, survival analysis.
- Per-person analytics of any kind.
- Affiliate or referral programmes.
- Currencies other than US dollars.
- Languages other than English.

---

## Further Notes

### 1. Where this document lives, and what was not done

- The requested skill, `to-prd`, does not exist in the named repository. Its current equivalent there is `to-spec`, which uses the same template; this document follows that.
- That skill's last step is to publish the spec to the project's issue tracker with a `ready-for-agent` label. This was **not** done: the repository has no issue-tracker configuration for these skills and no such label, which the skill treats as "run the setup skill first". Publishing would also put pricing and commercial plans on a public tracker, which should be the owner's call.
- No code was written for this PRD.

### 2. Risks, in order of severity

1. **The published list is not the whole rule.** It also defers to the provider's payment partners' restrictions and to the provider's own judgement in review. "Allowed" in §2 means "fits the published examples", not a guarantee.
2. **Manuscript Check false confidence.** A clean report may be read as approval. The fixed opening statement and the "not checked" list are the mitigation.
3. **Reference Check false alarms.** Open indexes miss books, theses, and much non-English work; "not found" must never read as an accusation. The fixed wording and the genuine-entry fixtures are the mitigation.
4. **Confidential review material.** Reviewer reports uploaded to the Response-to-Reviewers Check are confidential under most journals' terms. Immediate deletion, a no-retention processor, and plain notice to the buyer are the mitigation; without a processor that meets the bar the product does not ship.
5. **Formatter difficulty.** "Any journal" is not achievable in a first release. A short, honest style list is the mitigation.
6. **Data licensing.** The proprietary impact metric cannot be shown. Open-access directory terms should be read before caching its data at scale.
7. **Platform limits.** Document processing may not fit the edge runtime; the container fallback is the mitigation and a prototype decides.
8. **Revenue concentration.** The catalogue is now one live product and six low-priced tools, with no recurring revenue. The catalogue now depends on volume, which the tools must earn.
9. **Second deployment target drift.** It already lacks the pricing route. Decide its future in Phase 1.

### 3. Assumptions made in place of answers

Each is a default chosen so the document is complete. Any of them can change without altering the architecture.

| # | Assumption | Why this default |
| --- | --- | --- |
| A1 | Table Generator is $12 per dataset | No price was given; sits between the Matchmaker and the Formatter |
| A2 | Upload ceilings and retention periods as in §6 | Conservative defaults; shorter is safer |
| A3 | Formatter offers a free first-page preview and a discounted rerun | Lowers the risk of a wasted purchase |
| A4 | Matchmaker pass bar of 70% | A starting bar to be set from the first fixture run |
| A5 | North Star is successful tool runs per month | Counts only what was delivered |
| A6 | Refund rules: downloads within 14 days if not downloaded; tools refunded automatically on failure | Nothing is stated today; each rule is one the system can enforce |
| A7 | Manuscript Check is $8 per report, limited to 15,000 words | No price was given; priced below the Matchmaker because it uses little model time |
| A8 | Manuscript Check's first guidelines are CONSORT, PRISMA, and STROBE | The most widely required; all openly licensed |
| A9 | Reference Check is $6 per list, up to 150 entries | No price was given; the cheapest tool because it costs almost nothing to run |
| A10 | Response-to-Reviewers Check is $8 per report | No price was given; matched to Manuscript Check |
| A11 | Reference Check's first indexes are Crossref and OpenAlex | Open, large, and both carry retraction data |

### 4. Questions only the owner can answer

1. Has anyone already paid for Manuscript Editing whose edit is not yet delivered? They need serving or refunding.
2. What is the Teardown System physically: format, length, sections?
3. Is the second deployment target still in use?
4. How many Co-Pilot subscriptions are active today, and will they be refunded for the current period or left to run out?
5. What does Lemon Squeezy's support say about Manuscript Check and Response-to-Reviewers Check?

### 5. Suggested split into tickets

One ticket per numbered step in the delivery plan (§13), each carrying the user-story numbers it satisfies and the exit criterion of its phase. Phase 0 is a single checklist ticket owned by the owner, and nothing in Phase 3 should be started until it closes.
