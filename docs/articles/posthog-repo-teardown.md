# PostHog review: self-hosting and license boundaries

**By Ashif Ahmed Shuvo** · Repository review · Source inspection: 20 November 2026

**Category:** GitHub Repo Teardowns · **Format:** Repo Teardown · **Publication type:** review · **Status:** local unpublished draft

> Summary: PostHog repository review of product architecture, hobby self-hosting and mixed licensing, with deployment and privacy questions left explicit.

### Key findings
- The pinned README distinguishes Cloud from unsupported hobby self-hosting.
- The hobby configuration names multiple stateful dependencies, not one standalone analytics process.
- MIT Expat root terms explicitly exclude the enterprise directory.

## Review question and scope

Does repository access make self-hosting equivalent to the supported hosted product? This review is for product engineering teams evaluating analytics ownership and operating responsibility. It examines [PostHog/posthog](https://github.com/PostHog/posthog) at commit `4e10f441e36bc017f350bb7cb41a009089df0df6`, a pinned **default-branch source snapshot, not a release tag**. Findings apply to that snapshot rather than every packaged or hosted edition.

## Bottom line: source visibility is not operational parity

PostHog’s repository is useful for understanding an integrated product platform, but it should not be read as a promise that every hosted capability is equally supported in a self-hosted deployment. The README lists product analytics, replay, flags and experiments; it separately recommends Cloud and labels self-hosting an advanced hobby deployment. The deployment distinction matters more to procurement than the length of the feature list. [1](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/README.md#L25-L166)

The pinned README gives approximate hobby sizing guidance and explicitly disclaims customer support and guarantees for open-source deployments. Those are upstream statements, not measurements from this review. I would not convert its event-volume guidance into a hard technical ceiling or a capacity result: workload shape, enabled features and operating conditions were not tested. [1](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/README.md#L25-L166)

## A product platform, not a single dashboard process

The monorepo layout describes legacy Django code, product-specific backend/frontend slices, shared packages and independent services. Its product model typically combines Django and React, with product-owned models, logic, APIs and UI. It documents import boundaries, but this review did not verify that every module enforces them. [2](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/docs/internal/monorepo-layout.md#L5-L71)

That structure suggests a useful evaluation strategy: choose a product path and trace it, rather than assuming all capabilities have the same storage, query and deployment needs. A product analytics trial does not validate replay retention or a separate flag-serving workload. This is reviewer analysis of the documented architecture, not a measured account of internal service behavior.

The hobby Compose file is explicitly labeled hobby-only. It names a PostgreSQL service, Redis, Valkey and ClickHouse, with ClickHouse depending on Kafka and ZooKeeper. Several definitions extend a base Compose file; the inspected overlay alone is not a complete resolved production topology. It nevertheless establishes that “self-host the analytics app” carries more stateful dependency responsibility than one process and one volume. [3](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/docker-compose.hobby.yml#L1-L90)

## License scope needs a separate review

The root license grants MIT Expat terms outside stated exceptions, explicitly assigning `ee/` to its own license and retaining third-party terms. The enterprise license separately conditions production use on the relevant agreement and valid enterprise licensing. Calling the entire checkout simply “MIT” would erase that boundary. [4](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/LICENSE#L1-L25) [5](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/ee/LICENSE#L1-L24)

The architecture document also says enterprise features are being migrated to other directories. That does not allow this review to infer licensing from a folder name alone or decide the terms of all migrated code. For a serious reuse or redistribution plan, inspect actual file notices and the applicable agreement. No legal conclusion or complete entitlement map is offered here. [2](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/docs/internal/monorepo-layout.md#L5-L71) [4](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/LICENSE#L1-L25) [5](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/ee/LICENSE#L1-L24)

| Decision | Evidence at this pin | Required follow-up |
| --- | --- | --- |
| Hosted versus self-hosted | README recommends Cloud; hobby has no support guarantee | Obtain the support and deployment commitments you need |
| Operating burden | Hobby overlay names multiple data services | Resolve the full stack and practice restore |
| Reuse rights | MIT Expat with explicit enterprise exception | Inspect the exact code and terms being used |
| Privacy suitability | Product includes event collection and replay | Validate actual capture, retention and access settings |

## Who should evaluate it?

I would shortlist PostHog for teams that value integrated product instrumentation and are willing to make deployment, data governance and edition choices explicit. A hobby installation can be an evaluation route, not evidence of a supported production operating model. Replay and event collection also demand a privacy review; this inspection does not establish consent handling, masking completeness, regional data residency or regulatory compliance. [1](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/README.md#L25-L166)

The tree response for this repository was truncated. The cited files were fetched directly at the pin, so their observations remain inspectable, but this teardown makes no exhaustive coverage claim. In particular, it cannot certify that every advertised product is present, production-ready, freely licensed or enabled in a hobby deployment.

<!-- review-source-map:start -->
## Source map: where to inspect next

These four roots were retrieved as complete subtrees directly at the pinned commit, avoiding the truncated whole-repository response. They are deliberately a partial map of legacy API/models, a replay backend root and a feature-flag product root—not an edition or product-completeness inventory.

```chart
type: bar
layout: vertical
title: PostHog — selected source-file map
caption: Static file counts in selected roots at commit 4e10f441e36b. Includes matching tests and generated files; not performance, coverage or a whole-repository breakdown.
x: Selected root
y: Files
y-scale: linear
series: Matching files
notes: Counts start at zero. No smoothing or animation. File counts are not benchmarks, test coverage, integrations, product quality or a whole-repository share.
Legacy API: 397
Legacy models: 428
Replay backend: 84
Flags product: 326
```

**Counting method and text equivalent.** Each value counts tracked Git blob paths under the exact root below, filtered by its include/exclude expression. Matching tests, declarations and generated files remain included unless explicitly excluded. No file contents were executed or benchmarked; submodules are not expanded. This is a deliberately selected reading map, not a complete repository breakdown.

| Selected root | Matching files | Include / exclude expression |
| --- | ---: | --- |
| `posthog/api` | 397 | `\.(py\|ts\|tsx)$` / no additional exclusion |
| `posthog/models` | 428 | `\.(py\|ts\|tsx)$` / no additional exclusion |
| `posthog/session_recordings` | 84 | `\.(py\|ts\|tsx)$` / no additional exclusion |
| `products/feature_flags` | 326 | `\.(py\|ts\|tsx)$` / no additional exclusion |

**Provenance:** commit `4e10f441e36bc017f350bb7cb41a009089df0df6`; [Git tree 1](https://api.github.com/repos/PostHog/posthog/git/trees/d6c6d94ef95e13ab429e34898c6f8b9f3f2def63?recursive=1), [Git tree 2](https://api.github.com/repos/PostHog/posthog/git/trees/83ad656a219a2cc3d201bea6a44d9973139bb51b?recursive=1), [Git tree 3](https://api.github.com/repos/PostHog/posthog/git/trees/b5ebf3d478ff12edac1f90c6225d0b2fb5473d52?recursive=1), [Git tree 4](https://api.github.com/repos/PostHog/posthog/git/trees/3fa1bcff926021e68813ad0d456f1bc4a4c65a53?recursive=1). Every counted path, blob identifier and selector is retained in the review's `chart-inventory.json` and can be recounted offline. Only complete tree responses are used for these chart groups.

**Decision checkpoint.** For self-hosting, trace one required product through its model, request and worker paths, then verify that the intended deployment and license actually support it. Directory size establishes none of those entitlements.
<!-- review-source-map:end -->

## What can a reader inspect or reproduce?

This is static source inspection, not a benchmark, production deployment, certification, or penetration test. No upstream package was installed, no upstream tests or security probes were run, and no runtime measurements were collected. Repository documentation reports intended behavior; code passages establish only the inspected mechanism. Adoption recommendations throughout are reviewer analysis, not measured outcomes.

For a next-stage evaluation:

1. Resolve the complete hobby stack and inventory database, event, replay and object-storage state before a restore drill.
2. Check the intended product and edition against actual file notices, license terms and support commitments.
3. Use synthetic events and replay data to verify masking, access, deletion and retention before collecting real user data.

Use the pinned references to repeat the source inspection. The [inspection record](/evidence/posthog-repo-teardown/inspection-record.json) preserves source identifiers and a claim ledger; it is bundled locally and must be deployed and checked before publication. PostHog’s recursive tree response was truncated; selected paths were retrieved directly at this commit. This review makes no exhaustive repository or missing-file claim. Human source review and final article approval remain pending. Attribution follows the requested byline; no new affiliation, credential, funding, or conflict-of-interest assertion is made.

Explore the [Repo Teardown collection](/category/github-repo-teardowns) or [Ashif Ahmed Shuvo’s author profile](/author/ashif-ahmed-shuvo). These internal routes are publication handoffs, not a claim that this draft is live.

## References

1. [1](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/README.md#L25-L166) — PostHog/posthog, `README.md`, commit `4e10f441e36b`; locators: L25–L50, L103–L119, L158–L166. Retrieved 20 November 2026.
2. [2](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/docs/internal/monorepo-layout.md#L5-L71) — PostHog/posthog, `docs/internal/monorepo-layout.md`, commit `4e10f441e36b`; locators: L5–L35, L63–L71. Retrieved 20 November 2026.
3. [3](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/docker-compose.hobby.yml#L1-L90) — PostHog/posthog, `docker-compose.hobby.yml`, commit `4e10f441e36b`; locators: L1–L13, L51–L90. Retrieved 20 November 2026.
4. [4](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/LICENSE#L1-L25) — PostHog/posthog, `LICENSE`, commit `4e10f441e36b`; locators: L1–L25. Retrieved 20 November 2026.
5. [5](https://github.com/PostHog/posthog/blob/4e10f441e36bc017f350bb7cb41a009089df0df6/ee/LICENSE#L1-L24) — PostHog/posthog, `ee/LICENSE`, commit `4e10f441e36b`; locators: L1–L24. Retrieved 20 November 2026.
