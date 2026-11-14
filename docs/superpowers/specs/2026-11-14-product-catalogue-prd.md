# PRD: The ResearchWithMe product catalogue — three live products and eleven planned ones

| | |
| --- | --- |
| Status | Draft for owner review. Not yet published to an issue tracker (see Further Notes §1). |
| Date | 2026-11-14 |
| Inputs | The live billing integration and its operator notes; the product marketing context; the financial integration blueprint; "Missing Products and Services Inventory" (owner, 2026-11-14). |
| Method | Synthesis only, no interview. Every assumption made in place of an answer is marked **[Assumption]** and collected in Further Notes §3. |
| Blocking finding | Four planned offerings, and one that is already live, are in categories Lemon Squeezy's published policy prohibits. See Implementation Decisions §2 before anything else. |

---

## Problem Statement

### From the buyer's side

A researcher, graduate student, or engineer who trusts the archive and wants more than reading has only three things to buy, and each one stops at the payment.

- **The Teardown System ($19)** is delivered, but the buyer cannot see what it is before paying: no format, length, contents list, or sample.
- **Research Co-Pilot ($9 / month)** takes the money and then waits for the editor to "set up access by email". Nothing the member can use is switched on by the payment. No usage allowance is granted, and the page cannot say what a member receives or how often.
- **Manuscript Editing (from $150)** has no intake. After paying, the author does not know where to send the manuscript, what scope is covered, or when it comes back. Nothing on the account page shows that an edit is in progress.

Across all three there is no confirmation email from the site, no stated refund window, and no visible way to manage a subscription other than a link in a third-party receipt.

Beyond those three, the buyer has needs the site does not serve at all:

- They want a second opinion **before** writing code or collecting data, and there is nothing to book.
- They have a repository or a set of statistical outputs and want them checked, and there is nothing to commission.
- They have a finished manuscript and face mechanical chores (formatting to a journal's rules, choosing a journal, pre-screening for similarity) that they would pay a few dollars to offload.
- They have a CSV and need APA-style tables.
- They want company and structure: reading papers with others, working alongside others.
- They need funding and cannot find deadlines and criteria in one place.

### From the owner's side

- Revenue is capped by three products, one of which depends entirely on one person's hours.
- There is no record of fulfilment. A paid edit that was never delivered looks identical, in the database, to one that was.
- The catalogue is a fixed list of three keys. Adding a product means editing types, environment handling, the pricing page, the account page, and tests in step.
- There is no way to sell usage (one scan, one report), only ownership and subscription.
- The weekly digest that sponsors would pay for does not exist as a sent email: subscriptions are stored in the reader's browser and no mail leaves the system.
- The payment provider's rules exclude services and newsletter advertising, which is half of the planned catalogue and one live product.

---

## Solution

One catalogue, four ways to deliver, and a record of every delivery.

**For the buyer**

1. **A catalogue organised by what they are trying to do**, not by our internal product list:
   - *Learn the method* — The Teardown System.
   - *Work with the editor* — The Soundboard, The Architecture Audit, Statistical Audit, Manuscript Editing.
   - *Tools for your manuscript* — Manuscript Formatter, Journal Matchmaker, Pre-Submission Screening, Statistical Table Generator.
   - *Membership* — Research Co-Pilot, Paper Club, Grant and Fellowship Database.
   - *Sponsor the digest* — for companies, on its own page.
2. **Every purchase turns into something visible within a minute**: a download, an active membership with what it unlocks listed, a tool credit ready to spend, or an engagement with a next step ("Send your manuscript", "Pick a time").
3. **An "Orders and work" area in the account** showing each engagement's stage, each tool run and its result, each membership and how to manage it, and credit balances.
4. **Transactional email** for every state change that matters: purchased, intake needed, scheduled, delivered, run finished, run failed and credit returned, payment failed, membership ending.
5. **Plain terms before the button**: scope, turnaround, what the buyer must supply, the refund rule, and what the product will not do.
6. **The archive, the assistant, the citation builder, and the reading list stay free and ungated.** Nothing in this PRD changes that.

**For the owner**

1. **A data-driven catalogue**: adding a product is one catalogue entry plus its payment configuration.
2. **Four fulfilment types** that every product maps onto:

   | Type | What a purchase creates | Products |
   | --- | --- | --- |
   | Download | A file, delivered by the payment provider | Teardown System |
   | Membership | A time-bounded entitlement | Co-Pilot, Paper Club, Grant Database |
   | Engagement | A tracked piece of human work with stages | Soundboard, Architecture Audit, Statistical Audit, Manuscript Editing |
   | Metered tool | Credits, each spent on one automated run | Formatter, Matchmaker, Pre-Screening, Table Generator |

   Sponsorship is a fifth, business-to-business flow handled by invoice.
3. **An editor work queue**: every paid engagement, its stage, its due date, its files, and the capacity left this week.
4. **Two payment rails**: the existing automated one for digital goods and memberships, and an invoice rail for anything the first is not permitted to sell.
5. **A real newsletter**: server-side subscribers with double opt-in, a sent weekly digest, and aggregate-only reporting, as the foundation sponsorship needs.

### The catalogue

P1–P3 are live. P4–P14 are from the inventory. Prices are the owner's; where the inventory gives a range or none, the working figure is an assumption.

| ID | Product | Price | Fulfilment | Payment rail | Status |
| --- | --- | --- | --- | --- | --- |
| P1 | The Teardown System | $19 once | Download | Automated | Live; needs a preview and contents list |
| P2 | Research Co-Pilot | $9 / month | Membership | Automated | Live; needs a defined entitlement |
| P3 | Manuscript Editing | from $150, pay what you want above it | Engagement | **At risk on the automated rail** | Live; needs intake and tracking |
| P4 | The Soundboard | $75, 45-minute call | Engagement (scheduled) | Invoice rail | Planned |
| P5 | The Architecture Audit | $150, asynchronous | Engagement | Invoice rail | Planned |
| P6 | Statistical Audit | $150 standard, $300 extended **[Assumption]** | Engagement | Invoice rail | Planned |
| P7 | Manuscript Formatter | $15 per document | Metered tool | Automated | Planned |
| P8 | Journal Matchmaker | $10 per report | Metered tool | Automated | Planned |
| P9 | Pre-Submission Screening | $5 per scan | Metered tool | Automated | Planned |
| P10 | Statistical Table Generator | $12 per dataset **[Assumption: no price given]** | Metered tool | Automated | Planned |
| P11 | Paper Club and Co-Working | $15 / month **[Assumption: range was $10–$20]** | Membership | Automated | Planned |
| P12 | Grant and Fellowship Database | $12 / month, included in Paper Club **[Assumption: no price given]** | Membership | Automated | Planned |
| P13 | Digest Sponsorship | $200–$800 per issue | Sponsorship | Invoice rail | Planned; blocked on the newsletter |
| P14 | Weekly Research Digest | Free | Prerequisite for P13 | — | Not built: no email is sent today |

---

## User Stories

### A. Discovering and choosing

1. As a reader, I want the services page grouped by what I am trying to do, so that I am not comparing thirteen unrelated items.
2. As a reader, I want each group to show at most four products, so that I can decide without scrolling a long list.
3. As a reader, I want each product to state its outcome, price, what is included, who it is for, how it is delivered, and its honest limit, so that I can rule it in or out quickly.
4. As a reader, I want to see what is free before I see any price, so that I know nothing I already use is being taken away.
5. As a reader, I want a dedicated page per product with the full scope and terms, so that I can link a colleague or a supervisor to exactly one thing.
6. As a reader, I want to see current availability for human services ("next opening: the week of …"), so that I do not pay for work that cannot start for a month.
7. As a reader, I want to join a waitlist when a service is full, so that I am told when a slot opens.
8. As a reader on a phone, I want the catalogue and every checkout to work at 320 px, so that I can buy between other things.
9. As a reader using a screen reader, I want every product to be a labelled region with its own heading, so that I can navigate by landmark.
10. As a reader who just finished an article, I want the one relevant offer named at the foot of it, so that the suggestion matches what I read.
11. As a reader, I want prices shown in US dollars with the tax treatment stated, so that I am not surprised at checkout.
12. As a reader, I want a refund rule stated per product type before I pay, so that I know what happens if it goes wrong.
13. As a reader, I want a sample of anything I would be buying blind (a page of the Teardown System, an example Matchmaker report, an example audit hit-list), so that I can judge the standard.
14. As a search engine or an agent, I want structured offer data for each product, so that prices are represented accurately elsewhere.

### B. Buying and paying

15. As a signed-out reader, I want to be told why an account is needed and that it is free, so that signing in does not feel like a barrier.
16. As a signed-in reader, I want checkout to open over the page I am on, so that I do not lose my place.
17. As a buyer, I want the price to be decided by the server, so that nobody can tamper with what I am charged.
18. As a buyer, I want a confirmation on screen and by email within a minute, so that I know the payment registered.
19. As a buyer, I want the confirmation to tell me the single next thing to do, so that I am never left waiting on an unstated step.
20. As a buyer whose webhook was delayed, I want the account page to say "confirming your payment" and update on its own, so that I do not pay twice.
21. As a buyer of a service that is invoiced, I want one invoice link with the amount, scope, and due date, so that I can pay or forward it to my institution.
22. As a buyer paying through my institution, I want to add a purchase-order reference and billing name, so that I can be reimbursed.
23. As a buyer, I want every order listed in my account with date, amount, and status, so that I have a record.
24. As a buyer, I want to request a refund from the order itself, so that I do not have to hunt for an address.
25. As a buyer of pay-what-you-want editing, I want the floor and the reason for it stated, so that I know the minimum is not negotiable.

### C. P1 — The Teardown System

26. As a prospective buyer, I want to see the table of contents, format, and page count, so that I know what $19 buys.
27. As a prospective buyer, I want to read one full section free, so that I can judge the writing.
28. As a buyer, I want to download my copy again later from my account, so that losing the receipt email does not cost me the product.
29. As a buyer, I want to be told when the system is revised and to get the new version, so that I am not left with a stale method.
30. As a buyer, I want the download to say plainly that it is a method and not software, so that I am not expecting a tool.

### D. P2 — Research Co-Pilot

31. As a member, I want my membership to switch on automatically when payment clears, so that I do not wait for an email.
32. As a member, I want a members' page listing the working notes released so far, so that there is something to read on day one.
33. As a member, I want a monthly allowance of tool credits included, so that the membership has a concrete, countable benefit. **[Assumption]**
34. As a member, I want to see my allowance, what I have used, and when it resets, so that I can plan.
35. As a member, I want to be told when a new working note is published, so that I do not have to check.
36. As a member whose card failed, I want to keep access while the provider retries and to be told how to fix it, so that an expired card does not cost me my notes.
37. As a member, I want a "Manage subscription" link in my account, so that I can update a card or stop without finding an old email.
38. As a member who stops, I want access to the end of the period I paid for, so that I get what I bought.
39. As a non-member, I want the assistant to keep working exactly as before, so that the membership never becomes a toll on something that was free.

### E. P3 — Manuscript Editing

40. As an author, I want an intake form straight after payment asking for the manuscript, target journal, field, word count, and deadline, so that the editor has what is needed.
41. As an author, I want to upload the manuscript privately, so that only the editor and I can open it.
42. As an author, I want the word-count scope and what happens above it stated before I pay, so that the price is not a surprise. **[Assumption: up to 8,000 words at the floor]**
43. As an author, I want a stated turnaround and a due date on my order, so that I can plan my submission.
44. As an author, I want to see the stage of the edit (received, in progress, delivered), so that I do not need to email for status.
45. As an author, I want the edited file and the methods notes delivered to my account and by email, so that I have them in one place.
46. As an author, I want one round of follow-up questions included and its window stated, so that I can resolve anything unclear.
47. As an author, I want my manuscript deleted after a stated period, so that unpublished work does not sit on a server.
48. As an author, I want a written statement that the editor edits and does not write, so that the service is compatible with my institution's integrity rules.

### F. P4 — The Soundboard

49. As a researcher at the idea stage, I want to book a 45-minute call, so that I can pressure-test a question before committing months to it.
50. As a booker, I want to pick a time in my own time zone from real availability, so that there is no email back-and-forth.
51. As a booker, I want a short pre-call form (research question, dataset, baseline, the decision I am stuck on), so that the call starts in the middle and not at the beginning.
52. As a booker, I want a calendar invitation with the meeting link, so that it lands in my calendar.
53. As a booker, I want to reschedule once up to 24 hours ahead, so that a conflict does not cost me the fee.
54. As a booker, I want a written summary within two working days, so that I have the conclusions without having taken notes.
55. As a booker, I want to know whether the call is recorded and to choose, so that I can speak freely about unpublished work.
56. As a booker who missed the call, I want the no-show rule stated in advance, so that the outcome is not a dispute.

### G. P5 — The Architecture Audit

57. As a maintainer, I want to submit a repository URL, the commit to review, and the paper or methodology it implements, so that the audit targets the right thing.
58. As a maintainer of a private repository, I want to grant read access by adding a collaborator, so that I never hand over a token.
59. As a maintainer, I want the scope stated (repository size, languages covered, what is not reviewed), so that I know whether mine qualifies.
60. As a maintainer, I want a recorded walkthrough video, so that I can watch the reasoning and not only read conclusions.
61. As a maintainer, I want a prioritised list of findings with severity, location, and a suggested fix, so that I can turn it into issues.
62. As a maintainer, I want reproducibility flags listed separately (unpinned dependencies, missing seeds, undocumented data), so that I can address them before submission.
63. As a maintainer, I want the findings as Markdown I can paste into my tracker, so that I do not retype them.
64. As a maintainer, I want my code access revoked and confirmed after delivery, so that access does not linger.
65. As a maintainer, I want to choose whether the audit may later become a published teardown, with no as the default, so that paying for a private review never publishes my work.

### H. P6 — Statistical Audit

66. As an analyst, I want to upload outputs from SPSS, R, or Python with the claims I am making, so that the review checks claims against evidence.
67. As an analyst, I want to choose standard or extended by the number of models, so that the price matches the work.
68. As an analyst, I want each claim marked supported, partly supported, or not supported with the reason, so that I know what to rewrite.
69. As an analyst, I want assumption checks, multiple-comparison issues, and effect-size reporting flagged, so that a reviewer does not find them first.
70. As an analyst, I want to know that I should send outputs and not raw participant data, so that I do not breach my ethics approval.
71. As an analyst, I want a clear statement that this is a review and not a re-analysis, so that I know what I am not getting.

### I. P7 — Manuscript Formatter

72. As an author, I want to upload a Word document and choose a target style, so that the document is reformatted without my doing it by hand.
73. As an author, I want to see the list of supported styles before I pay, so that I do not buy a run for a journal that is not covered.
74. As an author, I want headings, margins, line spacing, font, numbering, and reference-list style changed, so that the mechanical rules are met.
75. As an author, I want a report of what was changed and what could not be changed, so that I know what still needs my attention.
76. As an author, I want my wording left exactly as it was, so that the tool formats and never rewrites.
77. As an author, I want a preview of the first page before I spend a credit, so that I can see the tool understood my document. **[Assumption]**
78. As an author, I want my credit returned automatically if the run fails, so that I do not pay for an error.
79. As an author, I want the uploaded and produced files deleted after seven days, so that my manuscript is not retained.
80. As an author, I want to rerun the same document against a second style at a reduced price, so that a rejection and resubmission is cheap. **[Assumption]**

### J. P8 — Journal Matchmaker

81. As an author, I want to paste an abstract and receive the five best-matched journals, so that I have a shortlist.
82. As an author, I want each match explained by recent, similar articles in that journal, so that the recommendation is checkable.
83. As an author, I want open-access status and article charges shown with their source and date, so that I can budget.
84. As an author, I want a citation metric that is openly licensed and named for what it is, so that I am not shown a number the site has no right to publish.
85. As an author, I want journals with integrity warnings excluded or flagged, so that I am not steered to a predatory venue.
86. As an author, I want to filter by open access only, maximum charge, or field, so that the shortlist fits my constraints.
87. As an author, I want every figure to come from a data source and never from the language model, so that nothing is invented.
88. As an author, I want my abstract not retained and not used for training, so that unpublished work stays mine.
89. As an author, I want the report as a page in my account and a PDF, so that I can share it with co-authors.

### K. P9 — Pre-Submission Screening

90. As an author, I want a similarity scan before I submit, so that I find overlap before an editor does.
91. As an author, I want an AI-writing indicator reported separately, so that the two results are not confused.
92. As an author, I want the AI indicator described as a fallible estimate with its known false-positive problem, so that I do not treat it as proof.
93. As an author, I want a written guarantee that my text is not added to any comparison database, so that the scan cannot cause a later match against my own manuscript.
94. As an author, I want matched passages listed with their sources, so that I can cite or rewrite.
95. As an author, I want the word limit per scan stated, so that I know whether one scan covers my paper.
96. As an author, I want the result stored only in my account and deletable by me, so that it stays private.
97. As an author, I want my credit returned if the provider is unavailable, so that an outage is not my cost.

### L. P10 — Statistical Table Generator

98. As an analyst, I want to upload a CSV and choose variables and an analysis, so that I get tables without writing code.
99. As an analyst, I want descriptives, correlations, t-tests, one-way ANOVA, chi-square, and linear regression in the first release, so that the common cases are covered.
100. As an analyst, I want APA 7 formatted tables in Word and as copyable text, so that they drop into a manuscript.
101. As an analyst, I want a plain-language baseline interpretation of each table, so that I have a starting sentence.
102. As an analyst, I want every number computed deterministically and the interpretation generated only from those numbers, so that the prose cannot contradict the table.
103. As an analyst, I want assumption checks shown with the result, so that I know when a test was inappropriate.
104. As an analyst, I want the exact method and library version recorded on the output, so that I can report it.
105. As an analyst, I want a warning before uploading if my file appears to contain names or email addresses, so that I do not upload identifiable data by mistake.
106. As an analyst, I want my dataset processed and deleted, with only the output kept, so that data is not retained.

### M. P11 — Paper Club and Co-Working

107. As a member, I want a schedule of weekly sessions in my time zone, so that I can attend.
108. As a member, I want my community role granted automatically when I subscribe, so that I am not waiting for a moderator.
109. As a member, I want to connect my community account once from my site account, so that the two are linked.
110. As a member, I want the paper and any code for each session posted in advance, so that I can prepare.
111. As a member, I want recordings or notes of past reading sessions, so that a missed week is not lost.
112. As a member, I want silent co-working sprints listed separately from discussion sessions, so that I can choose the kind of session I need.
113. As a lapsed member, I want my role removed at the end of the paid period and not before, so that I get what I paid for.
114. As a member, I want a code of conduct and a way to report a problem, so that the space stays usable.

### N. P12 — Grant and Fellowship Database

115. As a researcher, I want to filter funding by field, career stage, eligible country, amount, and deadline, so that I see only what I can apply for.
116. As a researcher, I want each record to show when it was last verified and against which source, so that I trust the deadline.
117. As a researcher, I want to save opportunities and be reminded before deadlines, so that I do not miss them.
118. As a researcher, I want application templates and criteria summaries attached where they exist, so that I start from more than a blank page.
119. As a non-member, I want to see a limited preview (record titles and funders, with detail hidden), so that I can judge coverage before subscribing. **[Assumption]**
120. As a researcher, I want to report a wrong or expired record, so that the database improves.
121. As a researcher in the Global South, I want eligibility by country treated as a first-class filter, so that I am not reading calls I cannot enter.

### O. P14 — Weekly Research Digest (prerequisite)

122. As a reader, I want to subscribe with my email and confirm it, so that I receive the digest.
123. As a subscriber, I want one email on Tuesdays listing the week's reviews, so that I keep up without visiting.
124. As a subscriber, I want one-click unsubscribe in every issue, so that leaving is trivial.
125. As a subscriber, I want no tracking pixel and no per-person click tracking, so that the digest keeps the site's privacy stance.
126. As a subscriber, I want sponsored content labelled as such and visually separate, so that I can tell editorial from paid.
127. As a reader who subscribed on the old browser-only form, I want to be asked once to confirm an address, so that my earlier intent is honoured without my being enrolled silently.

### P. P13 — Digest Sponsorship

128. As a sponsor, I want a public page with audience size, fields, format, price, and policy, so that I can decide without a call.
129. As a sponsor, I want audience figures that are current and dated, so that I am not buying on an old number.
130. As a sponsor, I want to see open dates and request one, so that booking is direct.
131. As a sponsor, I want an invoice in my company's name with payment terms, so that my finance team can pay it.
132. As a sponsor, I want to submit copy, a link, and a logo by a stated deadline, so that the issue is not delayed.
133. As a sponsor, I want a post-issue report with sends, delivery, and aggregate link clicks, so that I can assess it.
134. As a sponsor, I want the exclusion policy published, so that I know in advance whether my product qualifies.
135. As a reader, I want to know that a sponsor cannot buy a review or influence one, so that the archive's independence holds.

### Q. The account

136. As a customer, I want one "Orders and work" view of everything I have bought, so that nothing is scattered.
137. As a customer, I want each engagement to show its stage, next action, and due date, so that I know whose move it is.
138. As a customer, I want my tool credits by tool with a history of how each was spent, so that I can account for them.
139. As a customer, I want past tool results kept for a stated time and downloadable, so that I can come back to them.
140. As a customer, I want to delete an uploaded file or a result myself, so that I control my data.
141. As a customer, I want to export my purchase history, so that I can claim expenses.
142. As a customer, I want email preferences split into receipts (always), work updates, and announcements, so that I can silence marketing without missing a delivery.

### R. The editor (operator)

143. As the editor, I want a queue of open engagements sorted by due date, so that I know what to do next.
144. As the editor, I want to move an engagement between stages with one action that also notifies the customer, so that status and email never disagree.
145. As the editor, I want to attach deliverables (file, video link, findings) to an engagement, so that delivery is recorded.
146. As the editor, I want a weekly capacity per service that closes checkout when reached, so that I cannot be oversold.
147. As the editor, I want to mark an invoiced order as paid, so that the engagement starts.
148. As the editor, I want to issue a refund or return a credit with a reason, so that corrections are auditable.
149. As the editor, I want to see failed tool runs with their error and input size, so that I can fix causes.
150. As the editor, I want third-party cost per run recorded beside the price, so that I can see margin per tool.
151. As the editor, I want to publish a working note to members and have them notified, so that the Co-Pilot has a release mechanism.
152. As the editor, I want to add, verify, and expire grant records, with records unverified for 60 days flagged, so that the database does not rot.
153. As the editor, I want to compose the weekly digest from that week's published reviews and send a test to myself, so that sending is safe.
154. As the editor, I want to book a sponsor into an issue and see the calendar, so that slots are not double-sold.
155. As the editor, I want a per-product on/off switch, so that I can pause a product without a deploy.
156. As the editor, I want every privileged action logged with who and when, so that there is an audit trail.

### S. Trust, privacy, and compliance

157. As a customer, I want uploads encrypted at rest and readable only by me and the editor, so that unpublished work is protected.
158. As a customer, I want a stated retention period per file type and automatic deletion, so that I do not have to remember to clean up.
159. As a customer, I want to know which third parties process my text and for what, so that I can make an informed choice.
160. As a customer, I want my content never used to train a model, so that my ideas are not leaked.
161. As a customer, I want terms of service and a refund policy I can read before buying, so that the rules are known.
162. As a customer, I want tools described as aids and not guarantees of acceptance, so that I am not misled.
163. As a reader, I want the privacy policy updated to describe accounts, uploads, email, and processors, so that it matches what the site does.
164. As the owner, I want every product reviewed against the payment provider's rules before launch, so that the store is not suspended.
165. As the owner, I want integrity language on every manuscript product (editing, formatting, screening), so that none can be mistaken for a writing-for-hire service.

---

## Implementation Decisions

### 1. Principles that constrain every decision

1. **The archive is never gated.** Articles, the assistant, the citation builder, and the reading list remain free and account-less. The Grant Database (P12) is a separate product, not part of the archive; the product charter's "reading is not gated" decision must be amended to say so explicitly before P12 ships.
2. **The server is the only party that knows a price or a variant.** The browser names a product key and nothing else. This is already true and stays true for every new product.
3. **No claim the system cannot keep.** Turnaround, capacity, coverage, and accuracy statements come from configuration the editor controls, not from static copy.
4. **Language models never produce numbers.** In P8 and P10 every figure is computed or retrieved; a model may only phrase what it is given.
5. **No behavioural tracking.** This holds for the digest and for sponsorship reporting: aggregate counts only.
6. **One editor.** Human services are capacity-limited by design, and the product must say so.

### 2. Payment rails — the blocking decision

**Finding.** Lemon Squeezy's published prohibited-products list includes "Services of any kind (including marketing, design, web development, consulting or other related services)", "Advertising in newsletters, on websites, or in social media posts", and "Homework/Essay mills". The same page warns that selling prohibited products risks the store being placed in review or suspended without notice. Source: https://docs.lemonsqueezy.com/help/getting-started/prohibited-products (retrieved 2026-11-14).

**Consequences.**

| Product | Category under that policy | Decision |
| --- | --- | --- |
| P1 Teardown System | Digital download | Stays on the automated rail |
| P2, P11, P12 memberships | Subscription / membership | Stay on the automated rail |
| P7–P10 tools | Software | Stay on the automated rail |
| P3 Manuscript Editing (**live today**) | Service | Move to the invoice rail, or obtain written approval from the provider. Until one of those happens the live product is a store-suspension risk. |
| P4, P5, P6 | Consulting services | Invoice rail from day one |
| P13 Sponsorship | Newsletter advertising | Invoice rail from day one |

**Decision.** Introduce a payment-rail attribute on every catalogue entry with two values:

- **Automated** — the existing server-created checkout and signed webhook. No change in mechanism.
- **Invoice** — the customer submits a request; the system creates an order in an *awaiting payment* state; the editor sends an invoice from an external invoicing tool and marks the order paid; that transition starts fulfilment exactly as a webhook would. The owner already has a Payoneer account; whether its payment-request feature suits individual buyers is for the owner to confirm. **[Assumption]**

Both rails converge on the same internal event ("order paid for product X by user Y"), so everything after payment is rail-agnostic.

**Additional risk to record.** Third-party reporting in 2026 states that Stripe, which owns Lemon Squeezy, is steering merchant-of-record sellers toward a successor product. The rail abstraction above is also the migration seam if the automated provider changes. This PRD does not plan that migration.

**Integrity positioning.** P3, P7, and P9 must never be describable as writing on a student's behalf. Copy, terms, and the product itself enforce this: the editor edits and comments, the formatter changes formatting only, the screening reports and does not rewrite.

### 3. Catalogue model

The catalogue becomes data-driven. Each entry carries:

- Identity: key, name, family (learn / work-with-editor / tools / membership / sponsor), sort order.
- Offer copy: outcome, summary, inclusions, who it is for, delivery, honest limit, action label. (These fields exist today for P1–P3.)
- Commercial terms: price label, charge mode (once, subscription, pay-what-you-want with a floor, quoted), payment rail, and for tiered products a list of variants each with its own label and price.
- Fulfilment: one of download, membership, engagement, metered tool, sponsorship; plus fulfilment parameters (credits granted per purchase and for which tool; engagement template; membership entitlements).
- Operations: enabled flag, capacity per week (engagements), turnaround in working days, retention days for uploads.
- Compliance: refund rule key, required disclaimers.

Decisions:

- The closed union of three product keys is replaced by a registry lookup. A key not in the registry cannot be checked out (the existing behaviour, generalised).
- Variant identifiers remain in the environment and are resolved server-side. The registry maps key and variant label to an environment variable name by convention, so adding a product does not require a code change to the resolver.
- A reverse lookup (provider variant identifier → product key and variant label) is added. Today an order records the provider's variant and product name only; fulfilment needs the internal key.
- Operational fields the editor changes often (enabled, capacity, next availability) live in the database, not in code, and override the registry defaults.

### 4. Data model changes

All changes are additive, idempotent SQL migrations with row-level security on by default, in the existing style. No table is writable directly by a signed-in user; writes go through server routes or narrowly scoped security-definer functions.

| New table | Purpose | Key columns | Who reads |
| --- | --- | --- | --- |
| Product settings | Editor-controlled overrides | product key, enabled, weekly capacity, turnaround days, next-availability note | Everyone (public read) |
| Order items | The internal meaning of a paid order | order reference, product key, variant label, rail, amount, currency, state | Owner of the order; editor |
| Invoice orders | Orders on the invoice rail | user, product key, requested scope, quoted amount, state, external invoice reference, paid-at, marked-paid-by | Owner; editor |
| Engagements | One piece of human work | user, product key, order reference, stage, due date, intake payload, scheduled-at, delivered-at | Owner; editor |
| Engagement events | Append-only history of an engagement | engagement, from-stage, to-stage, actor, note, timestamp | Owner; editor |
| Engagement files | Uploads and deliverables | engagement, role (intake / deliverable), storage path, size, checksum, delete-after | Owner; editor |
| Credit ledger | Append-only credits and debits | user, tool key, delta, reason (purchase / allowance / run / refund / adjustment), reference, expires-at | Owner; editor |
| Tool runs | One automated job | user, tool key, state, input reference, output reference, parameters, provider cost, error code, timestamps | Owner; editor |
| Membership entitlements | What a subscription unlocks | subscription reference, entitlement key, period end | Owner; editor |
| Member notes | Co-Pilot working notes | title, body, related article, published-at | Members with the entitlement; editor |
| Community links | Linked community account | user, provider, external id, role-granted-at | Owner; editor |
| Grant records | Funding opportunities | funder, title, fields, career stages, eligible countries, amount range, deadline, source URL, last-verified-at, status | Members (full); public (preview columns) |
| Saved grants | Per-user saves and reminders | user, grant, remind-at | Owner |
| Newsletter subscribers | Digest list | email (unique, lower-cased), state (pending / confirmed / unsubscribed / bounced), confirm token hash, timestamps | Editor only |
| Newsletter issues | Sent digests | send date, subject, content snapshot, sponsor slot, counts | Editor; public archive of sent issues |
| Link counts | Aggregate clicks | issue, link key, count | Editor |
| Sponsor bookings | Sponsorship calendar | company, contact, issue date, price, state, creative, invoice reference | Editor |
| Waitlist | Capacity overflow | user or email, product key, created-at | Editor |
| Audit log | Privileged actions | actor, action, subject, before/after summary, timestamp | Editor |

Changes to existing tables:

- Orders gain a nullable product key and variant label, written by the webhook path through the reverse lookup. Historical rows are back-filled by matching stored variant identifiers.
- The existing per-order credit column is retained for compatibility and no longer read; the ledger becomes the single source of balances. The account page's credit counter reads the ledger.

Engagement stages (one state machine, per-product subsets):

```
awaiting_payment → paid → intake_pending → intake_received
  → scheduled (Soundboard only) → in_progress → delivered → closed
Side exits from any pre-delivered stage: cancelled, refunded
```

Rules: only the editor moves an engagement forward from `intake_received`; the customer's own actions cause `intake_pending → intake_received` and scheduling; every transition writes an event row and may send one email; `delivered → closed` happens automatically after the follow-up window.

Tool run states:

```
queued → running → succeeded
                 → failed (credit returned automatically)
queued → cancelled (credit returned)
```

A run debits one credit when queued, inside the same transaction that creates the run. A failed or cancelled run writes a compensating ledger row with the run as its reference; the pair is unique per run so a retry cannot refund twice.

### 5. Fulfilment pipeline

One function receives "order paid" (from the webhook path or from the editor marking an invoice paid) and dispatches on the product's fulfilment type:

- **Download** — nothing further; the provider delivers the file. The account page links to the provider's order page for re-download.
- **Membership** — write entitlement rows for the subscription period; grant the monthly allowance to the ledger with an expiry at period end; enqueue a community role grant if the product includes one.
- **Engagement** — create the engagement at `intake_pending` with a due date computed from turnaround once intake arrives; send the "what to do next" email.
- **Metered tool** — write a ledger credit for the tool.

The dispatcher is idempotent on the payment event identifier, extending the existing idempotency of the billing event store. Subscription lifecycle events (renewed, payment failed, cancelled, expired) update entitlements using the access rules the system already encodes: access continues through *past due*, *paused*, and *cancelled* until the period ends, and stops at *unpaid* and *expired*.

### 6. Files and privacy

- A new private storage bucket, separate from the public image bucket. Paths are namespaced by user; policies allow the owner and the editor to read, the owner to write within size and type limits, and nobody to list across users.
- Uploads go directly from the browser to storage through short-lived signed upload URLs issued by a server route that checks entitlement first. The application server never proxies file bytes.
- Accepted types and ceilings **[Assumption]**: Word documents up to 20 MB (P3, P7), CSV up to 10 MB or 200,000 rows (P10), PDF and plain-text outputs up to 20 MB (P6). Type is verified by content signature, not by extension.
- Retention **[Assumption]**: tool inputs 7 days, tool outputs 30 days, engagement files 90 days after `closed`. A scheduled job deletes expired objects and nulls their paths; deletion is logged.
- Third-party processors are named on the product page and in the privacy policy, per tool.
- No customer content is sent to any provider that trains on API inputs. This is a contractual check performed during vendor selection, recorded per vendor.

### 7. Background jobs

The application runs on an edge worker runtime with strict CPU and duration limits. Tool runs cannot execute inside a request.

- **Decision:** the tool-runs table is the source of truth; a message queue provided by the hosting platform dispatches run identifiers to a consumer worker; the consumer loads the run, performs the work, writes the result, and updates the state. The queue is an at-least-once transport, so the consumer is idempotent on run identifier and state.
- A scheduled trigger sweeps runs stuck in `running` beyond a timeout to `failed` and returns the credit.
- Workloads that cannot run in the edge runtime (heavy document manipulation, if the pure-JavaScript approach proves insufficient) go to a single small container service behind the same queue contract. This is a fallback, decided per tool after a prototype, not a default.
- The same scheduled trigger runs retention deletion, deadline reminders, the weekly digest send, and community role reconciliation.

### 8. Email

A scenario library and templates exist but no route sends mail. This PRD wires it.

- Transactional mail is sent from server code on state transitions only, through the existing provider adapter.
- Scenarios to add: order confirmed; invoice issued; payment received; intake needed; intake received with due date; call scheduled, rescheduled, reminder; delivered; follow-up window closing; tool run finished; tool run failed and credit returned; membership started; payment failed; membership ending; working note published; grant deadline reminder; waitlist slot open; newsletter confirm; sponsor booking confirmed; sponsor creative due; sponsor report.
- Each scenario has a stable key, a subject, a plain-text alternative, and is idempotent on (scenario, subject entity, transition).
- Preferences: receipts and work updates cannot be disabled; announcements can.

### 9. Per-product decisions

**P1 — The Teardown System.** Add to the product page a contents list, format, page count, and one free section, all supplied by the owner. Add a re-download link in the account. Version the file; when a new version is uploaded to the provider, notify existing buyers. No licence keys.

**P2 — Research Co-Pilot.** Define the entitlement concretely as three things **[Assumption]**: (a) access to member working notes, (b) a monthly allowance of three tool credits usable on any tool, expiring at period end, (c) member pricing on engagements where the owner chooses to offer it. Access switches on from the subscription event; the "editor sets up access by email" step is removed. The research assistant remains free for everyone and the membership is never described as unlocking it. A "Manage subscription" link uses the provider's customer-portal URL carried on the subscription record.

**P3 — Manuscript Editing.** Becomes an engagement with intake (manuscript upload, target journal, field, word count, deadline, anything to focus on). Scope at the floor is up to 8,000 words, with a quoted price above that **[Assumption]**. Turnaround is configurable, default seven working days from intake **[Assumption]**. Deliverables: tracked-changes document and a methods-read memo. One follow-up round within 14 days. Moves to the invoice rail unless the provider approves it in writing (§2).

**P4 — The Soundboard.** Engagement with a scheduling stage. A third-party scheduling tool provides availability and calendar invitations; a single-use booking link is issued after payment; the scheduler's webhook, verified by signature, records the time. Pre-call form is required before the booking link is shown. One reschedule up to 24 hours ahead. Recording is off by default and opt-in per call. Deliverable: a written summary within two working days. No-show: the fee is forfeited after one missed, un-rescheduled call; this is stated on the page.

**P5 — The Architecture Audit.** Engagement, asynchronous. Intake: repository URL, commit, linked paper or methodology, the two or three things the maintainer is worried about. Scope ceiling **[Assumption]**: one repository, up to roughly 15,000 lines of first-party code, Python/R/Julia/TypeScript. Private repositories are accessed by collaborator invitation to a dedicated account; tokens are never requested or stored. Deliverables: a recorded walkthrough hosted by a third-party video tool with an unlisted link, a findings list stored as structured rows (severity, location, description, suggested fix, reproducibility flag) and exportable as Markdown. Turnaround default five working days. Publication as a teardown requires separate, explicit opt-in.

**P6 — Statistical Audit.** Engagement with two variants: standard ($150, up to three models or one results section) and extended ($300, up to eight models) **[Assumption]**. Intake: outputs, the claims as written, the design in two sentences, software and version. Deliverable: a claim-by-claim table (supported / partly / not supported, reason, what to change) plus general flags. Raw participant-level data is refused at intake by instruction and by a warning on identifiable-looking columns. It is a review, not a re-analysis, and the page says so.

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

**P9 — Pre-Submission Screening.**
- Two independent results from third-party providers: similarity and AI-writing likelihood.
- Vendor selection criteria, all mandatory: no retention or indexing of submitted text; no training on inputs; an API usable by a business of this size; per-scan cost that leaves margin at $5.
- Unit economics are checked before launch: cap of 8,000 words per scan **[Assumption]**; if vendor cost per scan exceeds roughly $2.50 the price or cap changes before launch, not after.
- The AI indicator is presented as an estimate with documented false positives, never as a verdict, and never alone on a page without that statement.
- Results are private to the account and deletable.
- Provider outage returns the credit automatically.

**P10 — Statistical Table Generator.**
- First release: descriptives, Pearson and Spearman correlations, independent and paired t-tests, one-way ANOVA with post-hoc tests, chi-square, simple and multiple linear regression.
- All computation is deterministic, performed by a vetted statistics library whose name and version are printed on the output. Results are validated against reference outputs from R.
- Assumption checks accompany each test and can downgrade the interpretation.
- The interpretation paragraph is generated from the computed result object only; a validator rejects any generated number not present in that object.
- Output: APA 7 tables as a Word document and as copyable text, plus the method statement.
- Column-name and value heuristics warn about identifiable data before upload completes. Datasets are deleted after the run.

**P11 — Paper Club and Co-Working.**
- Single tier at $15 a month **[Assumption]**, hosted on a community chat platform. A second membership platform is rejected because it would introduce a second payment processor and a second customer record.
- A bot holding only role-management permission grants a role on subscription start and removes it at entitlement end. A scheduled reconciliation compares entitlements to roles daily and corrects drift.
- Linking the community account uses that platform's sign-in as an identity link on the existing account, the same pattern as the scholarly identity links.
- The schedule is content the editor manages; sessions are listed on a members' page with time-zone conversion.
- Bundling: Paper Club includes Grant Database access **[Assumption]**. Co-Pilot stays separate.

**P12 — Grant and Fellowship Database.**
- Curated by the editor from public funder pages; records link to the source; funder text is summarised, not copied.
- Every record shows last-verified date; records unverified for 60 days are flagged in the editor's queue and marked "not recently verified" to members.
- Public preview shows funder, title, field, and whether the deadline is within 30 days; amount, eligibility, criteria, templates, and saving require the entitlement.
- Reminders at 30, 14, and 3 days before a saved deadline.
- Launch requires a minimum of 150 verified records **[Assumption]**; selling an empty database is not an option.

**P14 — Weekly Research Digest.**
- Server-side list with double opt-in; confirmation tokens are stored hashed and expire.
- One issue each Tuesday, assembled from reviews published since the last issue; the editor reviews and sends, or schedules.
- One-click unsubscribe by header and link; bounces and complaints from the provider's webhook update subscriber state.
- No open tracking. Link clicks pass through a first-party redirect that increments an aggregate counter and stores nothing about the person.
- Existing browser-only subscriptions cannot be migrated because no address was ever collected; the old control is replaced by the real form.
- The privacy policy is rewritten in the same release.

**P13 — Digest Sponsorship.**
- Not sold until the digest has sent at least eight consecutive issues and has a dated, real subscriber count **[Assumption]**. Until then the page reads "opening soon" with an interest form.
- A public sponsor page states audience, format (one labelled slot per issue), price by placement, dates available, and policy.
- Policy: clearly labelled; one sponsor per issue; excluded categories listed; a sponsor's product may not be the subject of a review in the same issue; sponsorship buys no editorial consideration.
- Booking is request → editor accepts → invoice → paid → creative due five days before send → post-issue report.
- Reporting contains sends, delivery rate, and aggregate clicks only.

### 10. Information architecture and page changes

- The single pricing page becomes an index of four families plus a link for sponsors. Each family section shows its products as the existing card pattern.
- Each product gets its own page carrying full scope, terms, sample, questions, and the action.
- New signed-in areas: orders and work; an engagement detail page (intake, files, timeline, deliverables); a tool workspace per tool (upload, options, run, result); members' notes; grant database; community link.
- New editor areas: work queue; engagement detail with stage controls; invoices; tool runs; product settings and capacity; member notes; grants; digest; sponsors; audit log.
- Every new route gets a surface brief, in line with the repository's rule.
- The second deployment target, which today has no pricing route although its footer links to one, either gains these routes or is formally retired; this must be decided before Phase 1 ends.
- Navigation: "Services" remains one header entry. Tools are reachable from the article page for manuscript-adjacent formats only.

### 11. API contracts (shapes, not paths)

- **Create checkout** — input: product key, optional variant label. Output: checkout URL. Rejects unknown keys, disabled products, products at capacity (returns the waitlist option), and invoice-rail products (returns the request flow).
- **Request invoice order** — input: product key, variant, scope fields. Output: order reference in `awaiting_payment`.
- **Mark order paid** (editor) — input: order reference, external invoice reference. Effect: runs the fulfilment dispatcher.
- **Submit intake** — input: engagement reference, intake fields, uploaded file references. Effect: `intake_pending → intake_received`, due date set.
- **Transition engagement** (editor) — input: engagement reference, target stage, note, deliverables. Rejects illegal transitions.
- **Issue upload URL** — input: purpose, file name, size, type. Output: short-lived signed URL and storage reference. Checks ownership and limits.
- **Start tool run** — input: tool key, input reference, parameters. Effect: debit and enqueue atomically. Output: run reference. Rejects when balance is zero.
- **Get tool run** — output: state, result reference or error, timestamps. Owner or editor only.
- **Entitlement** — extended to return memberships, credit balances per tool, and open engagements.
- **Subscribe to digest / confirm / unsubscribe** — unauthenticated, rate-limited, token-based.
- **Scheduler webhook, mail-provider webhook, community webhook** — each verified by signature over the raw body before parsing, following the existing payment webhook.

All state-changing routes keep the existing same-origin check and rate limiting; all are no-store.

### 12. Security

- Signature verification before parsing on every inbound webhook; constant-time comparison.
- No service-role credential in the application. New privileged writes use narrowly scoped security-definer functions guarded the same way as the existing billing bridge.
- Row-level security on every new table; tests assert that one user cannot read another's engagements, runs, files, or ledger.
- Uploaded files are never served from the public origin and never rendered inline; downloads use short-lived signed URLs with a download disposition.
- Upload validation by content signature; documents are parsed in an isolated worker with size and time limits; archive-bomb checks on compressed formats.
- Prompt-injection posture for tools using a language model: user content is data, never instructions; outputs are validated against retrieved or computed facts; no tool-calling on user content.
- Secrets for every new vendor live in the platform's secret store and are listed in the production environment check.
- The content security policy is extended only for the specific origins each integration needs.
- The audit log is append-only.

### 13. Delivery plan

Each phase ends with something shippable. Later phases do not start until the exit criteria of the earlier ones hold.

**Phase 0 — Decisions and compliance (no code).**
1. Confirm with the payment provider, in writing, the status of P3, P4, P5, P6, P13; choose the invoice tool.
2. Owner confirms or corrects every **[Assumption]** in Further Notes §3.
3. Owner supplies P1 contents, sample section, and page count.
4. Draft terms of service, refund policy, and the privacy policy changes.
5. Select vendors for scheduling, video, similarity, AI detection, community.
*Exit:* a signed-off catalogue table with final prices, rails, scope, turnaround, and refund rules.

**Phase 1 — Catalogue and order foundation.**
1. Data-driven catalogue registry and variant resolver; reverse lookup.
2. Product settings, order items, credit ledger, membership entitlements, audit log.
3. Fulfilment dispatcher wired to the existing webhook path.
4. Invoice rail: request, awaiting payment, mark paid.
5. Transactional email wired for order confirmed and payment received.
6. Pricing index restructured into families; product pages for P1–P3.
7. Account: orders and work view.
*Exit:* the three live products behave exactly as before from the buyer's side, every order has an internal product key, and a test purchase on each rail reaches the dispatcher.

**Phase 2 — Fix the three live products.**
1. P1: preview, contents, re-download, versioning.
2. P2: automatic entitlement, member notes, monthly allowance, manage-subscription link.
3. P3: engagement, intake, private uploads, stages, delivery, retention.
4. Editor work queue and capacity controls.
*Exit:* a buyer of any live product has a visible next step within one minute of paying and never needs to email to learn status.

**Phase 3 — Human services (P4, P5, P6).**
1. Scheduling integration and the scheduled stage (P4).
2. Structured findings and video deliverable (P5).
3. Variants and claim-table deliverable (P6).
4. Waitlist.
*Exit:* each service completed end to end once with a real or friendly customer.

**Phase 4 — Tool platform, then tools in order of risk.**
1. Private bucket, signed uploads, retention job.
2. Tool-run state machine, queue, consumer, sweeper, automatic credit return.
3. P8 Journal Matchmaker (no file handling; lowest risk; validates the platform).
4. P10 Statistical Table Generator (deterministic; validates file handling).
5. P9 Pre-Submission Screening (vendor dependency).
6. P7 Manuscript Formatter (hardest; ships with a deliberately short style list).
*Exit per tool:* accuracy bar met on its fixture set (Testing Decisions §4), cost per run recorded, failure returns the credit.

**Phase 5 — Digest (P14).**
Subscribers, double opt-in, composer, send, unsubscribe, bounce handling, aggregate link counts, privacy policy update.
*Exit:* eight consecutive issues sent.

**Phase 6 — Memberships (P11, P12).**
Community link and role sync; session schedule; grant records, verification queue, preview, saves, reminders.
*Exit:* 150 verified grant records; role reconciliation shows zero drift for seven days.

**Phase 7 — Sponsorship (P13).**
Sponsor page, calendar, booking, invoice, creative intake, report.
*Exit:* one sponsored issue delivered with its report.

### 14. Metrics

The site uses no behavioural analytics, so every metric below is derived from records the system already has to keep.

- Per product: orders, revenue, refund rate.
- Engagements: time from payment to intake, intake to delivery, on-time rate against the stated turnaround, open count against capacity.
- Tools: runs, success rate, median duration, credits returned, provider cost per run, margin per run.
- Memberships: active, new, ended, involuntary churn (payment failure) versus voluntary.
- Digest: confirmed subscribers, unsubscribe rate, delivery rate, aggregate clicks per issue.
- North Star **[Assumption]**: purchases fulfilled on time per month — it counts revenue only when the promise was kept.

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
| Webhook fixtures | Existing (payment provider) | Scheduler, mail-provider, and community webhooks added to the same fixture pattern |
| **Tool processor: input reference and parameters in, result object out** | **New** | Each tool's logic, independent of queue and HTTP |
| End-to-end browser tests | Existing project, lightly used | One purchase-to-delivery path per fulfilment type |

**The one new seam** is the tool processor boundary. It is placed as high as possible — a whole tool behind one function — so that the queue consumer, the route, and the processor can each be tested without the others, and so a tool can move from the edge runtime to a container without its tests changing.

*The skill this document follows asks that seams be confirmed with the owner before the spec is written. That confirmation has not happened; this table is the proposal to confirm.*

### 3. Modules to be tested

- Catalogue registry and resolver: unknown keys rejected, prototype-chain names rejected, disabled and at-capacity products refuse checkout, variant resolution, reverse lookup.
- Fulfilment dispatcher: each fulfilment type; replay of the same event is a no-op; subscription lifecycle follows the existing access table.
- Invoice rail: only the editor can mark paid; marking paid twice fulfils once.
- Engagement state machine: every legal transition, every illegal one refused, each transition writes exactly one event.
- Credit ledger: balance equals the sum; a run with zero balance is refused; concurrent starts cannot overdraw; a failed run is compensated once.
- Tool-run lifecycle: queued → running → terminal; stuck runs swept; duplicate queue delivery is harmless.
- File access: cross-user reads refused at the policy level; signed URLs expire; retention deletes.
- Email: one message per transition; idempotent on replay; receipts ignore the marketing preference.
- Newsletter: double opt-in required before any send; unsubscribe is immediate; a bounced address is never mailed again; no per-person click data is stored.
- Community sync: grant on start, revoke at entitlement end, reconciliation corrects drift.
- Each page: required facts present, banned phrases absent, one main landmark, one top-level heading.

### 4. Tool accuracy fixtures

Automated tools are tested against fixed fixture sets with explicit pass bars, stored with the repository.

- **Formatter** — a corpus of documents per style profile. Bars: extracted body text identical before and after (hard failure otherwise); every profile rule either applied or reported; no silent partial result.
- **Matchmaker** — abstracts of published articles with the publishing journal known. Bars: the true journal or a same-field journal appears in the five for an agreed proportion of cases **[Assumption: 70%]**; every displayed figure matches the snapshot; no journal on the exclusion list is ever returned.
- **Table Generator** — public datasets with reference results from R. Bars: statistics agree to the reported precision; the interpretation contains no number absent from the result object.
- **Pre-Screening** — adapter contract tests against recorded responses; behaviour on vendor timeout, error, and partial result.

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

- Migrating away from the current automated payment provider. The rail abstraction makes it possible; planning it is separate.
- A second merchant of record for services. The invoice rail is deliberately manual.
- Tax computation, VAT numbers, or invoice rendering by this system. The automated rail's provider handles tax; invoice-rail invoices are produced by the external invoicing tool.
- Licence keys or activation for the Teardown System.
- Team or institutional accounts, seats, and site licences.
- Native mobile applications.
- Any gating of articles, the assistant, the citation builder, or the reading list.
- Marketplace features: other people selling services or products through the site.
- Formatting for arbitrary journals beyond the published style list; LaTeX input for the Formatter.
- Rewriting, paraphrasing, or "humanising" text in any tool.
- Displaying the proprietary Journal Impact Factor without a licence.
- Advanced statistics in the Table Generator: mixed models, structural equation models, Bayesian methods, survival analysis.
- Hosting video; recordings live with a third-party tool.
- Building a chat or community platform; Paper Club uses an existing one.
- Scraping funder websites automatically; grant records are curated by hand in the first release.
- Per-person analytics of any kind, including for sponsors.
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

1. **Payment-provider policy (§2).** Applies to a live product today. Resolve in Phase 0.
2. **Owner capacity.** Four human services on one person. Without capacity limits the first good month produces late deliveries and refunds. Capacity control is in Phase 2 for this reason, before any new service launches.
3. **Pre-Screening economics and accuracy.** Vendor cost may not fit $5; AI detectors produce false positives, and a false accusation is a real harm to a customer. The product ships only with the honest framing and the no-retention guarantee, or not at all.
4. **Formatter difficulty.** "Any journal" is not achievable in a first release. A short, honest style list is the mitigation.
5. **Data licensing.** The proprietary impact metric cannot be shown. Open-access directory terms should be read before caching its data at scale.
6. **Sponsorship without an audience.** The digest does not send email today. Selling slots before there are real numbers would be selling on a figure that does not exist.
7. **Grant database freshness.** A wrong deadline is worse than no record. The verification date and the 60-day flag are the mitigation; the minimum record count gates launch.
8. **Platform limits.** Document processing may not fit the edge runtime; the container fallback is the mitigation and a prototype decides.
9. **Too many products for one page.** Thirteen offers invite paralysis. Families of at most four, and one product page each, are the mitigation.
10. **Second deployment target drift.** It already lacks the pricing route. Decide its future in Phase 1.

### 3. Assumptions made in place of answers

Each is a default chosen so the document is complete. Any of them can change without altering the architecture.

| # | Assumption | Why this default |
| --- | --- | --- |
| A1 | Statistical Audit is two variants, $150 and $300 | The inventory gave a range; two fixed prices are easier to buy than a quote |
| A2 | Table Generator is $12 per dataset | No price was given; sits between the Matchmaker and the Formatter |
| A3 | Paper Club is one tier at $15 a month | Midpoint of the $10–$20 range; one tier avoids a choice |
| A4 | Grant Database is $12 a month alone and included in Paper Club | No price was given; bundling gives the higher tier a concrete benefit |
| A5 | Co-Pilot includes three tool credits a month | The membership needs one countable benefit; none is granted today |
| A6 | Editing floor covers up to 8,000 words, seven working days | A typical article length; a turnaround must be stated to be kept |
| A7 | Architecture Audit covers one repository up to about 15,000 lines, five working days | Bounds the work at $150 |
| A8 | Soundboard allows one reschedule up to 24 hours ahead; summary in two working days | Common practice; protects the slot |
| A9 | Upload ceilings and retention periods as in §6 | Conservative defaults; shorter is safer |
| A10 | Pre-Screening cap of 8,000 words per scan | Keeps vendor cost predictable |
| A11 | Formatter offers a free first-page preview and a discounted rerun | Lowers the risk of a wasted purchase |
| A12 | Grant Database shows a limited public preview and launches at 150 records | A gated product should still be judgeable before purchase |
| A13 | Sponsorship opens after eight consecutive issues | Enough history for an honest audience figure |
| A14 | Invoice rail uses the owner's existing Payoneer account | It already exists in the payout chain; suitability for individual buyers is unconfirmed |
| A15 | Matchmaker pass bar of 70% | A starting bar to be set from the first fixture run |
| A16 | North Star is purchases fulfilled on time per month | Ties revenue to the promise being kept |
| A17 | Refund rules: downloads within 14 days if not downloaded; tools refunded automatically on failure; engagements refundable in full before work starts; memberships stop at period end | Nothing is stated today; each rule is one the system can enforce |

### 4. Questions only the owner can answer

1. Will Lemon Squeezy approve manuscript editing in writing, or does it move to invoice now?
2. Is Payoneer the invoice tool, and can individual researchers pay it easily?
3. What is the Teardown System physically: format, length, sections?
4. What will Co-Pilot members actually receive, and how often can working notes realistically be published?
5. How many hours a week are available for human services? This sets every capacity number.
6. Should Paper Club be on a community chat platform, as assumed, given the inventory also mentioned a membership platform?
7. Is the Grant Database acceptable as a gated product under the brand's open-access commitment, or should it be free with paid alerts and templates?
8. Which similarity and AI-detection vendors are acceptable, given the no-retention requirement?
9. Is the second deployment target still in use?

### 5. Suggested split into tickets

One ticket per numbered step in the delivery plan (§13), each carrying the user-story numbers it satisfies and the exit criterion of its phase. Phase 0 is a single checklist ticket owned by the owner, and nothing in Phases 3, 5, 6, or 7 should be started until it closes.
