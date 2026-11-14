# Product marketing context

Read this before changing any surface that sells. It records who buys, what is
true about each product, and which persuasion choices were made on purpose.

## What is sold

Source of truth: `lib/billing/catalogue.ts` (copy) and `docs/billing.md` (delivery).

| Product | Price | Job the buyer hires it for | Delivery |
| --- | --- | --- | --- |
| The Teardown System | $19, one payment | Judge a repository they did not write, using the method the reviews use | Lemon Squeezy download |
| Research Co-Pilot | $9 / month | Follow the reasoning behind reviews as it is written; fund the open archive | Editor sets up access by email |
| Manuscript Editing | from $150, pay what you want above it | Submit a manuscript whose prose and methods have been read | Arranged with the editor by email |

Free and never gated: every article, the research assistant, the citation
builder, the reading list.

## Audience and what they already believe

Researchers, graduate students, and engineers who read technical reviews. They
distrust publisher paywalls and marketing language, check claims, and will leave
at the first exaggeration. The persuasive asset here is credibility, so every
tactic below is one that spends none of it.

## Principles applied, and where

| Principle | How it is used | Where |
| --- | --- | --- |
| Jobs to be done | Each product leads with the outcome, not the artefact | Catalogue `outcome`, pricing cards, home band |
| Reciprocity, zero-price effect | What is free is stated before what is sold, with links | Pricing strip, home band, About |
| Paradox of choice, Hick's law | Three products, one action each, a "who it is for" line to rule options out | Pricing cards |
| Pratfall effect | Each product states its real limit up front ("Worth knowing first") | Catalogue `caveat` |
| Regret aversion | Merchant of record, refunds, stopping a membership, and accounts answered before the button | Pricing questions |
| Mental accounting | $9 a month restated as about 30 cents a day (arithmetic, not a discount) | Catalogue `priceNote` |
| Commitment and consistency | Read a free teardown or try the free assistant first | Pricing, under the cards |
| Activation energy | Signed-out button says why an account is needed and that it is free | Pricing cards |
| Goal gradient | Buying shown as three numbered steps | Pricing |
| Mere exposure | Services appear in the header, hero, home band, About, Contact, assistant, article foot | Site-wide |
| Timeliness (EAST) | Article-foot note matches the format just read: teardown → method, otherwise → editing | `ArticleServiceNote` |
| Authority | The archive itself is the proof of the method and of the editor's standard | Links to published work |

## Deliberately not used

- Scarcity or urgency: there is no real limit or deadline.
- Social proof numbers, testimonials, logos: none exist yet.
- Anchoring with a struck-through price, decoy tier, or "most popular" badge:
  the three products are not tiers of one thing.
- Loss framing about the archive: nothing is taken away from non-buyers.
- "Free trial" and "cancel anytime": the tests in
  `lib/__tests__/pricing-page.test.tsx` forbid promises the implementation
  does not keep.

## Open gaps the owner can close (each would strengthen the page honestly)

1. A stated refund window. Today the page only says who processes refunds.
2. Editing turnaround and a word-count scope.
3. What the Teardown System physically is: format, length, a sample page.
4. What co-pilot members receive and how often; no usage allowance is granted yet.
5. Real buyer quotes, once there are buyers.
