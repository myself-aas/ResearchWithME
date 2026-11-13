# reme editorial workflow (human-in-the-loop)

1. Intake: identify the question, audience, reviewed artifact and available primary sources; load `.agents/skills/reme-editorial/SKILL.md` and `docs/ResearchWithMe_Template.md`.
2. Research: inspect original paper/repository/dataset and its version; build a claim-to-source ledger. If evidence cannot be obtained, stop at an outline and list gaps.
3. Draft: write Markdown to a local `docs/articles/<slug>.md` draft or prepare a CMS draft for an authorized editor. No publication or metadata invention.
4. Mechanical check: `npm run reme:check -- --file docs/articles/<slug>.md`. This is fast and offline; it does not resolve citations.
5. Editorial gate: a human checks CITABLE, author consent, URLs, privacy, rights and conflicts. Revise and repeat as needed.
6. Publishing: an authorized editor explicitly approves and publishes using the studio. Never make this an automated hook. Verify actual HTML, published Markdown, sitemap, and canonical URL after deployment; note what cannot be checked.

A hook runs step 4 on changed drafts at agent stop; CI runs the same check. Neither approves publication nor contacts external services. For repo changes run `npm run lint`, `npm run typecheck`, `npm run test` and the applicable builds; source-only checks do not replace production verification.
