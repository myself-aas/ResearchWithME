# SourceCard · ClaimCard · TrustAssessmentSummary — contracts (reme v3.1 §23, §27.3–27.4)

Status: **beta** (stage 3). Implementations: `components/scholarly/{SourceCard,ClaimCard,TrustAssessmentSummary}.tsx`; logic: `lib/scholarly/{source-card,claim-card,trust}.ts`; schemas: `lib/schemas/scholarly.ts`.

## TrustAssessmentSummary (§23)
- Five independent dimensions: review, replication, certainty, consensus, source integrity. **Never one aggregate score.**
- `not-assessed` / `not-reviewed` / `unknown` render muted + italic with an sr-only "no negative finding" note — semantically distinct from negative results (`failed-to-replicate`, `contested`, `retracted`, …) which use the destructive token.
- Every assessment requires a documented `method`, `assessedBy`, `assessedAt` (validator-enforced) — "verified" is never unexplained.
- Compact line format: `Peer reviewed · Replication not assessed · Moderate certainty · Mixed consensus · Source active`.

## SourceCard (§27.3)
- Shows source type, title, contributors (with ORCID), identifier (DOI preferred), version, language, access state, integrity state, published date; original/translated/transliterated titles labeled distinctly; expandable `<details>` for checksum/locator.
- Notice precedence: retracted > corrected/investigation > embargoed > restricted > ready. Restricted/embargoed without `read:source` hides the metadata body (aria-label still names the source).
- States: loading (Skeleton) · ready · restricted · embargoed · corrected · retracted · error.

## ClaimCard (§27.4)
- Shows claim type, lifecycle, version, evidence/contradiction **counts** (never a score), compact trust line, unresolved integrity impacts (publication blocked until resolved), responsible reviewer.
- Actions are capability-checked against server-issued `PermissionDecision[]`: `inspect:claim`, `support:claim`, `contradict:claim`, `review:request`, `versions:compare`, `cite:claim`.

## Tests
`lib/__tests__/scholarly-cards.test.ts` — 15 tests covering dimension independence, not-assessed polarity, §23 compact format, method requirement, source state precedence, DOI preference, restricted hiding, capability gating, counts, integrity blocking.
