# NATS Server review: retention and delivery controls

**By Ashif Ahmed Shuvo** · Repository review · Source inspection: 20 November 2026

**Category:** GitHub Repo Teardowns · **Format:** Repo Teardown · **Publication type:** review · **Status:** local unpublished draft

> Summary: NATS Server repository review of JetStream retention, acknowledgments and resource controls, separating source mechanisms from delivery guarantees.

### Key findings
- JetStream configuration separates server resource budgets from individual stream policies.
- Stream retention, storage and replica settings are explicit adoption decisions.
- Consumer acknowledgments do not by themselves establish exactly-once external side effects.

## Review question and scope

Which JetStream controls shape retention and delivery, and what must applications still guarantee? This review is for backend engineers designing message-driven services. It examines [nats-io/nats-server](https://github.com/nats-io/nats-server) at commit `a0385c9af342ffae6df28999b77a85de5423d3d6`, a pinned **default-branch source snapshot, not a release tag**. Findings apply to that snapshot rather than every packaged or hosted edition.

## Bottom line: explicit controls beat a vague reliability label

NATS Server is worth evaluating when an application needs messaging across services or devices. The README’s simplicity and performance language is positioning, not a finding from this review. This teardown focuses narrowly on JetStream configuration: the resource, stream and consumer controls visible in source. It is not a complete review of Core NATS delivery semantics or of the replication protocol. [1](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/README.md#L5-L76)

The important architectural observation is separation. Server-level JetStream settings, per-stream retention settings and consumer delivery settings are different objects in the implementation. A successful evaluation needs to decide all three rather than treating “enable persistence” as the complete design. [2](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/server/jetstream.go#L38-L77) [3](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/server/stream.go#L50-L878) [4](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/server/consumer.go#L89-L363)

## Resource limits and durability are distinct choices

`JetStreamConfig` exposes `MaxMemory`, `MaxStore`, `StoreDir`, `SyncInterval` and `SyncAlways`. The comments describe background disk synchronization and a setting for flushing after every write. Account limits separately include stream, consumer and pending-ack budgets. These fields show that resource allocation and write synchronization are configurable concerns; they do not prove a particular failure-recovery guarantee. [2](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/server/jetstream.go#L38-L77)

`StreamConfig` adds retention policy, maximum messages, bytes and age, discard policy, storage type, replica count and duplicate window. The inspected add-stream path rejects a replica count above one in its single-server mode condition. That is a concrete reason not to confuse a configuration request with an available clustered deployment. [3](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/server/stream.go#L50-L878)

My recommendation is to write down retention intent first: is the stream a replayable history, a bounded buffer, or input to a work-processing application? Only then should a team choose policies and budgets. This is a design exercise, not a claim that any particular configuration has been tested here.

## Consumer policy is part of application design

The consumer structure exposes `DeliverPolicy`, `AckPolicy`, `AckWait`, `MaxDeliver`, `BackOff`, `MaxAckPending` and filters. It distinguishes pull request controls from push delivery fields. The acknowledgment constants include `AckExplicit`, whose comment requires an acknowledgment or negative acknowledgment for every message. These are substantive mechanisms, not proof that every client uses them correctly. [4](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/server/consumer.go#L89-L363)

Consider the application boundary: a worker may perform a business operation and then lose its connection before confirming progress. A broker acknowledgment is not a transaction covering an unrelated payment API or database. That is why my acceptance plan includes idempotency keys, a durable record of handled operations and deliberate redelivery tests. This reasoning does not deny broker-level delivery features; it limits what can be concluded about external effects from the inspected fields alone. [4](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/server/consumer.go#L89-L363)

| Layer | Source-visible controls | Evaluation question |
| --- | --- | --- |
| Server/account | Memory, disk and resource budgets | What happens when the budget is reached? |
| Stream | Retention, discard, replicas, storage | Which history must survive and where? |
| Consumer | Ack timing, retries, pending work | How does a slow or failing worker recover? |
| Application | Not established by these structures | Can repeating a business operation cause harm? |

## Adoption boundary

The repository uses Apache License 2.0 terms. That identifies the root source terms, not the terms of every client, hosted offering, or deployment integration. [5](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/LICENSE#L1-L9)

I would shortlist NATS Server where the team can make message lifecycle choices explicit and test them. I would reject any architecture proposal whose only recovery argument is that a messaging product promises reliability. This source snapshot demonstrates configurable controls, not a measured throughput, recovery-time, ordering or end-to-end exactly-once result.

<!-- review-source-map:start -->
## Source map: where to inspect next

The inventory separates direct server Go files, direct server test files and nested Go packages. The test-file count is a navigation aid, not coverage: it does not establish which failure scenarios run in CI or how many assertions they contain.

```chart
type: bar
layout: vertical
title: NATS Server — selected source-file map
caption: Static file counts in selected roots at commit a0385c9af342. Includes matching tests and generated files; not performance, coverage or a whole-repository breakdown.
x: Selected root
y: Files
y-scale: linear
series: Matching files
notes: Counts start at zero. No smoothing or animation. File counts are not benchmarks, test coverage, integrations, product quality or a whole-repository share.
Server code: 69
Server tests: 75
Subpackages: 60
```

**Counting method and text equivalent.** Each value counts tracked Git blob paths under the exact root below, filtered by its include/exclude expression. Matching tests, declarations and generated files remain included unless explicitly excluded. No file contents were executed or benchmarked; submodules are not expanded. This is a deliberately selected reading map, not a complete repository breakdown.

| Selected root | Matching files | Include / exclude expression |
| --- | ---: | --- |
| `server` | 69 | `^server/[^/]+\.go$` / exclude `_test\.go$` |
| `server` | 75 | `^server/[^/]+_test\.go$` / no additional exclusion |
| `server` | 60 | `^server/[^/]+/.*\.go$` / no additional exclusion |

**Provenance:** commit `a0385c9af342ffae6df28999b77a85de5423d3d6`; [Git tree 1](https://api.github.com/repos/nats-io/nats-server/git/trees/a0385c9af342ffae6df28999b77a85de5423d3d6?recursive=1). Every counted path, blob identifier and selector is retained in the review's `chart-inventory.json` and can be recounted offline. Only complete tree responses are used for these chart groups.

**Decision checkpoint.** Before adopting a delivery policy, identify the matching server implementation and a relevant failure test, then design an application-level duplicate-effect test of your own.
<!-- review-source-map:end -->

## What can a reader inspect or reproduce?

This is static source inspection, not a benchmark, production deployment, certification, or penetration test. No upstream package was installed, no upstream tests or security probes were run, and no runtime measurements were collected. Repository documentation reports intended behavior; code passages establish only the inspected mechanism. Adoption recommendations throughout are reviewer analysis, not measured outcomes.

For a next-stage evaluation:

1. Test the selected stream retention/discard policy under disk and message-budget pressure in an isolated cluster.
2. Interrupt a worker before and after its business write and acknowledgment; verify redelivery and application idempotency.
3. Measure recovery, slow-consumer behavior and resource usage with the intended clients and deployment topology.

Use the pinned references to repeat the source inspection. The [inspection record](/evidence/nats-server-repo-teardown/inspection-record.json) preserves source identifiers and a claim ledger; it is bundled locally and must be deployed and checked before publication. Human source review and final article approval remain pending. Attribution follows the requested byline; no new affiliation, credential, funding, or conflict-of-interest assertion is made.

Explore the [Repo Teardown collection](/category/github-repo-teardowns) or [Ashif Ahmed Shuvo’s author profile](/author/ashif-ahmed-shuvo). These internal routes are publication handoffs, not a claim that this draft is live.

## References

1. [1](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/README.md#L5-L76) — nats-io/nats-server, `README.md`, commit `a0385c9af342`; locators: L5–L12, L73–L76. Retrieved 20 November 2026.
2. [2](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/server/jetstream.go#L38-L77) — nats-io/nats-server, `server/jetstream.go`, commit `a0385c9af342`; locators: L38–L55, L68–L77. Retrieved 20 November 2026.
3. [3](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/server/stream.go#L50-L878) — nats-io/nats-server, `server/stream.go`, commit `a0385c9af342`; locators: L50–L71, L875–L878. Retrieved 20 November 2026.
4. [4](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/server/consumer.go#L89-L363) — nats-io/nats-server, `server/consumer.go`, commit `a0385c9af342`; locators: L89–L123, L350–L363. Retrieved 20 November 2026.
5. [5](https://github.com/nats-io/nats-server/blob/a0385c9af342ffae6df28999b77a85de5423d3d6/LICENSE#L1-L9) — nats-io/nats-server, `LICENSE`, commit `a0385c9af342`; locators: L1–L9. Retrieved 20 November 2026.
