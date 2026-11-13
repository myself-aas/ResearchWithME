---
name: reme-editorial
description: Draft and review source-grounded ResearchWithMe research articles with reme. Use for article outlines, paper or repository teardowns, citation checks, corrections and prepublication review; never invent sources, credentials, metadata fields or automated publication gates.
---

# Editorial workflow

1. Read `references/evidence-checklist.md` relative to this skill's supporting-files directory. When working in the ResearchWithMe repository, read `docs/ResearchWithMe_Template.md` from the **repository root** (not relative to the installed skill); for proposed CMS writes also read `lib/cms/types.ts` and `docs/supabase-cms.md`. If the repository is unavailable, request the current template rather than inventing its fields.
2. Define the article's question, audience, reviewed artifact and source version. If no primary material is available, write an outline with explicit source gaps, not a finished factual review.
3. Maintain a claim ledger while drafting: claim → primary URL/identifier → locator → direct observation or source report → confidence/limitation. Never invent a DOI, author credential, measurement, date or citation.
4. Draft in Markdown with descriptive headings, an honest summary, methods/results/limitations and references. Add tables, diagrams or Q&A only if helpful and supported. Do not embed fictitious JSON-LD or pretend the proposed fields in the prior template are in the CMS.
5. For repo drafts under `docs/articles/`, run `npm run reme:check -- --file <path>`; this checks a few mechanical rules only. Ask a human editor to review evidence and approve before publication. Do not run CMS writes, IndexNow, DNS changes or arXiv submissions as part of this skill.

Return the draft or review with a claim ledger and a short list of unresolved verification questions. Label every unverified assertion and describe what would verify it.
