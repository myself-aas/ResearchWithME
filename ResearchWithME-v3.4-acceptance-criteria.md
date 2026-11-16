# ResearchWithME v3.4 Acceptance Criteria

## A. Schema and migration

- [ ] Prisma `format`, `validate`, and `generate` pass in CI using the repository-approved Prisma version.
- [ ] Schema contains no `ResearchNote`, generic `Follow`, or canonical `KnowledgeRelationship` model.
- [ ] All 83 models and 87 enums have no undefined types or duplicate names.
- [ ] Every relation has an intentional `onDelete` policy.
- [ ] SQL dry-run succeeds on a production-sized masked clone.
- [ ] No migration statement exceeds the approved lock budget of 5 seconds.
- [ ] All `NOT VALID` foreign keys validate after backfill.
- [ ] Every backfill is idempotent and resumable.
- [ ] Row counts and checksums match the approved mapping.
- [ ] Every non-migrated legacy relationship has a documented quarantine reason.

## B. Canonical object behavior

- [ ] Claims link to evidence through explicit SUPPORTS, CONTRADICTS, or QUALIFIES rows.
- [ ] Contributions link to evidence and claims without owning/deleting canonical objects.
- [ ] ResearchNote migration preserves content, author, workspace, project, timestamps, visibility, and version history.
- [ ] ToolRepository is global and deduplicated; workspace access is represented by WorkspaceTool.
- [ ] Software Source records represent citable releases/snapshots and link through ToolSourceLink.
- [ ] Discussion is visibly and semantically separate from formal Review.
- [ ] Topic assignments and follows use FK-backed tables.
- [ ] GraphNode/GraphEdge can be dropped and rebuilt from canonical tables.

## C. API and authorization

- [ ] All new routes have Zod/OpenAPI contracts and integration tests.
- [ ] Every resource operation authorizes workspace membership and classification server-side.
- [ ] Retryable writes require idempotency keys and return the stored result for duplicate requests.
- [ ] 409 conflicts preserve both client and server versions.
- [ ] Anonymous reviewer identity is absent from URLs, logs, analytics, notifications, and non-authorized responses.
- [ ] Rate limits exist for discussion, follows, search alerts, imports, and graph queries.

## D. Product and responsive UX

- [ ] Goals, discussions, topics, saved searches, citation collections, and graph beta have loading, empty, stale, offline, permission, and error states.
- [ ] Phone, tablet, desktop, and wide layouts pass at 320, 360, 390, 412, 480, 768, 1024, 1280, 1440, and 1920 CSS px.
- [ ] Discussion and goal flows work fully with keyboard, TalkBack, and VoiceOver.
- [ ] Mobile sheets trap and restore focus and do not rely on swipe.
- [ ] Graph has an equivalent accessible list/table.
- [ ] Bangla, mixed-script, pseudo-localized, and RTL fixtures pass.

## E. Integrity and AI governance

- [ ] Retraction/correction propagation updates affected graph projections within five minutes.
- [ ] Evidence always resolves to SourceVersion plus structured locator.
- [ ] AI-suggested relationships remain PROPOSED until accepted by an authorized user/workflow.
- [ ] AI provenance records provider, model, transform, sources, validation, and human review.
- [ ] Publication blockers reject unsupported citations, quotation mismatches, unresolved integrity impacts, and prohibited external processing.

## F. Performance and reliability

- [ ] Dashboard first actionable module is available within 1.5 seconds for a typical authenticated session.
- [ ] Autosave API p95 is ≤400ms under expected load.
- [ ] Dashboard API p95 is ≤500ms excluding cold start.
- [ ] Lexical search p95 is ≤700ms.
- [ ] Normalized relation queries regress less than 15% from approved baseline.
- [ ] Graph projection lag is ≤15 minutes and integrity-critical propagation ≤5 minutes.
- [ ] Backup RPO is ≤15 minutes and RTO ≤4 hours.
- [ ] Point-in-time restore and rollback rehearsal succeed.

## G. Cutover and contract

- [ ] Dual writes show zero unexplained mismatch for seven consecutive days.
- [ ] Legacy read fallback is zero for 14 consecutive days.
- [ ] No severity-1 or severity-2 migration defect remains open.
- [ ] Contract migration receives written sign-off from Database, Product, Security, Accessibility, and Research Integrity owners.
- [ ] Release evidence is archived with checksums and build identifiers.

## Final acceptance

v3.4 is accepted only when every mandatory criterion above is evidenced. A passing schema validator alone is insufficient; migration parity, authorization, accessible UX, integrity propagation, performance, and rollback must all pass.
