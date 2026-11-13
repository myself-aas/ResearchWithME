# ReviewThread · IntegrityNotice · AIProvenanceDisclosure · ProvenanceGraph — contracts (reme v3.1 §7, §25, §26, §27.5)

Status: **beta** (stage 3/4 boundary). Implementations: `components/scholarly/{ReviewThread,IntegrityNotice,AIProvenanceDisclosure}.tsx`, `components/graph/ProvenanceGraph.tsx`; logic: `lib/scholarly/{dialogue,ai-provenance,graph}.ts`; schemas: `lib/schemas/scholarly.ts`.

## ReviewThread (§7 Scholarly Dialogue)
Comment / Suggestion / Review / Rebuttal / Decision, chronologically sorted. Rebuttals MUST link review items; decisions MUST record rationale (validator-enforced). Reviewer anonymity respected (`anonymous` → "Anonymous reviewer", authorId never exposed). Suggestion accept/reject and replies are capability-checked (`suggestion:accept`, `suggestion:reject`, `thread:reply`).

## IntegrityNotice (§25)
Retraction/correction/EoC/investigation banner rendered BEFORE ordinary metadata; `role="alert"` for retraction. States that the original version is preserved, how many dependents are marked for review, and whether publication is blocked. Workflow stays idempotent (propagation steps recorded as `IntegrityEvent`s).

## AIProvenanceDisclosure (§26)
Shows provider/model, operation, transformation type, source-set size, tool-call count, generation time, citation validation, quotation match, human-review state — never hidden chain-of-thought. `publicationBlockers()` enforces all §26 blockers (unresolved sources, quotation mismatch, unsupported citation, unresolved retraction impact, missing human approval, classification-violating external processing, undisclosed synthetic material). Actions capability-checked: `ai:inspect/edit/regenerate/reject/history`.

## ProvenanceGraph (§27.5)
Every edge labeled (`cites`/`supports`/`contradicts`/`derives from`/`relates to`); direct = solid, inferred = dashed **plus** a text explanation. The structured list + relationship table is the canonical equivalent and the default below 768px. Keyboard: roving tabindex, arrow keys move node-by-node, Enter inspects. No color-only meaning anywhere.

## Tests
`lib/__tests__/dialogue.test.ts` — 10+ tests: dialogue validation (rebuttal links, decision rationale), anonymity, capability gating, integrity block wording, all §26 blockers, disclosure rendering, edge labeling/inferred style, list-equivalence, default list mode with keyboard nav.
