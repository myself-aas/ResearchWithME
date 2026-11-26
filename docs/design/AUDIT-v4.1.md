# Reme v4.1 — design-system audit and integrated upgrades

**Audit date:** 2026-11-26
**Status:** substantial incremental integration; **not full v4.1 compliance**.
**Authority:** [supplied v4.1 brief](reme-v4.1-source.md), [DESIGN.md](../../DESIGN.md), and repository governance. The older [v4 report](MIGRATION.md) is a historical baseline.

## Executive finding

The prior system was a landing-page-first v4 adaptation: nine frozen modules, eight primitive declarations, base-pair contrast checks, three-file source lint, and a deterministic retrieval assistant with legacy utility classes. It did not meet the new full-site, localization, security, model-delivery, or GenUI requirements.

The integration closes the manifest/catalog/interaction-state gaps and migrates the assistant surface without replacing the site's publishing architecture, inventing translations, or claiming a model exists. The strict 50KB initial-JS budget still fails. A boundary-only lint pass is **not** a full-site pass.

## Changes integrated

| Area | Before | Now |
| --- | --- | --- |
| Manifest | v4.0, nine modules | v4.1, ten deeply frozen modules including `genui.manifest.ts` |
| Primitive inventory | Eight declarations | Thirteen declarations; new field/range/live/callout/status/table wrappers and generated native-dialog styles |
| Color | Old success green; opacity-disabled controls | Supplied `#15541B` success green; explicit disabled text and mark tokens; no opacity-disabled behavior on migrated controls |
| Interaction states | No derived-state solver | Encoded-sRGB hover/active/selected values generated and checked; 180 contrast measurements across light/dark/more modes |
| Active border | Supplied strong border insufficient on active surface | Ink border on active secondary controls, with corresponding UI contrast check; thresholds unchanged |
| Type | Heading validator allowed up to 75ch | 20–40ch heading band; author-approved exact 24/32/34ch caps retained; reading measures remain 45–75ch |
| Layout | Landing slots only; hard-coded centered exceptions | Added archive/article/lab/workspace/search/topics/datasets/about/thanks/not-found/footer contracts; validated placement/caps, generated CSS and fixtures |
| Scientific glyphs | Missing explicit `≤ ≥ ≈ ≠ °` requirements | Roman fonts rebuilt from upstream originals; Inter covers all required scientific/UI symbols; Newsreader falls back to Inter where needed |
| GenUI | Registry-driven legacy figure tools only | Separate strict nine-widget research catalog, actual upstream spec renderer, bounded whole-tree validation, fixtures and tests |
| Assistant | Deprecated `Content`/`.If`; arbitrary utilities; spinner; optional-cloud copy | `Parts`/`AuiIf`, token classes, calm live text, cumulative throttled quotation output and a validated source-match summary |
| Privacy | Public cloud-sync environment switch and disclosures | Switch removed; thread remains memory-only; assistant/privacy/governance copy aligned; no cloud/model fallback |
| Model UX | No capability probe | Explicit-click support probe, clearly unavailable model control and Search fallback; zero weight downloads |
| Source boundary | Three files | Ten migrated files; separate **whole-tree failing inventory** added |
| Audit tooling | Separate checks | `npm run audit:all` builds/tests/serves its own production instance, runs browser/payload/full-tree checks, preserves logs, returns nonzero on noncompliance |

### Nine-widget security boundary

`lib/assistant/genui-schema.ts` rejects unknown components, extra props, raw HTML/style/event payloads, invalid child relationships, cycles, oversized/deep trees, malformed tables, invalid percentages and unsafe URLs. Only internal paths and HTTPS DOI URLs are accepted. Text is escaped, not interpreted. All validation completes **before** upstream rendering. No default vocabulary, iframe/HTML widget, or unbounded `render_spec` action is registered.

The catalog provides stack, split, metric card, metric table, benchmark chart, citation card, status notice, audit checklist and explicit empty state. Status labels/icons come from the host catalog, not arbitrary model-authored labels. Charts use numeric SVG attributes rather than inline style widths, retain visible data tables, preserve SD zero and enforce 0–100 percentage scales. Copy failure has a live, actionable fallback.

The existing figure registry is intentionally preserved; its author-approval and figure-constitution requirements are unchanged. Its legacy utility/styles are **not** certified as migrated by the new catalog.

### Compatibility and attachment corrections

- Next 15 / React 19 / App Router remain in place, as requested. Existing OpenNext/Cloudflare deployment integration is preserved; nothing was deployed.
- Tailwind **4** and Zod **4** remain installed. The actual `@assistant-ui/generative-ui@0.0.13` peer dependency requires Zod 4, contrary to the attachment's stack table.
- Added `@assistant-ui/next@0.0.26`, `@assistant-ui/generative-ui@0.0.13`, and `generative-frame@0.0.12`. Lockfile records actual resolution. `withAui` is configured backendless with narrow generative-module globs.
- The installed `toSpecCatalog(library)` returns **`{ catalog, components }`**, not a catalog object alone. The integration passes those real values to `SpecRenderer`.
- Installed `createSpecToolkit` requires **`(catalog, { components, ... })`**. The attachment's one-argument example is not executable as written. An unrestricted toolkit or fake inference/tool loop has **not** been added just to resemble that example. The shipped adapter emits a strict, host-validated tool UI instead.
- The example local-worker adapter can wait indefinitely on cancellation/error and replaces prior tool-call parts. It was not copied as a pretend runtime. Real engine/worker/cancellation/shard/cache integration remains unimplemented until an actual model is selected and supplied.
- A generated hash for one boot script would not secure Next's other inline flight/JSON-LD scripts. The legacy inline-script/style exceptions are **not** relabeled strict CSP. COOP/COEP/CORP isolation headers are now enforced and the production assistant browser test confirms `crossOriginIsolated === true`. A compatible nonce/static-hash strategy and legacy inline-style migration are still required.
- `content-visibility` remains off: no intrinsic-height or fallback font-metric measurements were fabricated.

## Validation evidence

- **Quality:** ESLint, TypeScript and **259 tests / 19 files** pass, including 17 GenUI/invariant tests, five model-delivery tests, four security-header tests and four server-lifecycle tests.
- **Production:** `npm run verify` passes build and existing crawlability/content/SEO/feed/site-budget checks. Those older budgets are **not** substituted for the stricter v4.1 limits.
- **Browser:** **10/10 tests** pass against a fresh standalone production server. Coverage includes the original landing reflow/geometry/no-JS suite, nine widgets at **288 / 358 / 720px** in both themes, catalog axe A/AA, a bounded status-stream CLS fixture, and an actual local assistant query with no outbound traffic/cookies/model downloads.
- **Determinism:** **14 outputs** match two independent renders and fresh temporary files byte-for-byte.
- **Contrast:** **180 measurements** pass declared thresholds. Base text ≥7:1, UI ≥3:1, explicit disabled text ≥4.5:1. Migrated secondary active borders were corrected rather than lowering their threshold. This is not a live-DOM contrast certification of legacy routes.
- **Fonts:** **58,972 / 80,000 bytes** combined roman fonts (Newsreader 34,116; Inter 24,856); required Latin/UI/scientific glyph checks pass. Bangla system-font/device coverage remains unverified. Original Google Fonts source/license provenance remains in the historical migration report and existing font licenses.
- **Artwork:** illustrative fallback AVIF **29,304 bytes**, WebP **20,086 bytes**; each below 100KB.
- **Initial modern JS:** **140,165 / 50,000 gzip bytes — FAIL**. Method: unique modern script files declared in built landing HTML, independently gzipped; not a Lighthouse timing claim.
- **Legacy lab JS:** approximately **20KB page-specific** in site verification, exceeding the requested **15KB** lazy-lab cap. No threshold was relaxed.
- **Full-tree token inventory:** **92 files scanned; 869 findings in 53 files — FAIL**. This AST inventory includes raw utility values outside the ten-file migrated boundary; it is not a count of 869 distinct visual bugs. Legacy route/chrome/figure migration remains substantial work.
- `npm install` reports **16 existing audit findings** (8 moderate, 6 high, 2 critical). No unrelated forced dependency upgrade was performed.

## All 23 quality gates

“Partial” means there is useful evidence, **not** that the specification gate passes. “Unmeasured” means no compliant measurement was performed.

| # | Gate | Status | Evidence / remaining requirement |
| ---: | --- | --- | --- |
| 1 | Payload | **Fail** | Initial JS 140,165 >50,000; legacy lab ≈20KB >15KB. Roman fonts and fallback artwork pass their limits. |
| 2 | Lighthouse | **Unmeasured** | No median-of-five throttled mobile Lighthouse run; do not infer scores from unit/build/axe passes. |
| 3 | CLS | **Partial** | Bounded GenUI status fixture <0.05 in production browser test. Font swap, all templates and arbitrary large streamed trees are not certified. |
| 4 | Grid geometry | **Partial** | Landing geometry across seven widths, including generated 720px caps, ±0.5px. Declared subpage contracts are not all rendered/measured. |
| 5 | Overflow | **Partial** | Landing 320–1536 and catalog containers pass. All ten templates, 1920px and true 400% zoom unmeasured. |
| 6 | Contrast | **Partial** | 180 generated base/derived checks pass; landing/catalog axe passes. Full live-DOM light/dark/more audit pending. |
| 7 | Privacy & CSP | **Fail** | Landing/assistant test: no outbound requests or cookies. COOP/COEP/CORP are enforced and `crossOriginIsolated` is browser-verified. Strict CSP/nonces and zero legacy inline styles remain unimplemented. |
| 8 | Visual regression | **Unmeasured** | No approved 7-width × theme × locale screenshot baseline comparison. |
| 9 | Empty states | **Partial** | Catalog/landing empty states tested, no skeletons on migrated surfaces. Every data-empty route not yet covered. |
| 10 | Determinism | **Pass** | 14 generated outputs verified byte-for-byte. |
| 11 | Token escape | **Fail** | Strict ten-file boundary passes; whole-tree inventory fails (869 findings / 53 files). |
| 12 | Manifest coverage | **Partial** | Landing slot coverage passes. Subpage declarations do not imply DOM implementation or coverage. |
| 13 | Heading wrap | **Partial** | Landing English wraps/type geometry pass at seven widths. All subpages and Bengali unmeasured. |
| 14 | Primitive conformance | **Partial** | Thirteen declarations, new wrappers, catalog axe and interactive-target checks. All instances, dialog focus behavior and legacy interactions not certified. |
| 15 | Glyph coverage | **Partial** | Roman scientific/UI glyph checks pass; Bengali Unicode/device rendering and full UI-catalog coverage still pending. |
| 16 | Motion containment | **Partial** | Generated motion AST containment passes; legacy stylesheet/figures and all forced-color/device checks remain. |
| 17 | Real devices (manual) | **Unmeasured** | No iOS/Android/Firefox/Safari/classic-scrollbar/foldable/Bengali device matrix certification. Generated landscape rules are not device evidence. |
| 18 | Assistive technology (manual) | **Unmeasured** | No claim of iOS/Android/VoiceOver/TalkBack, 200% text or complete keyboard flow certification. |
| 19 | No-JS fallback | **Partial** | Landing nav/native FAQ/figure text/link survive disabled JS. No dispatch POST or all-route no-JS certification. |
| 20 | GenUI allowlist safety | **Pass (adapter equivalent)** | Typed rejection + escaped text + fail-closed whole-tree rendering tested on the actual tool-UI path. Uses a host-validated tool UI, not the attachment's literal `GenerativeUIMessagePart` API shape. |
| 21 | GenUI container reflow | **Pass** | All nine widgets at 288/358/720px in light/dark: no surface/page overflow; table content scrolls within its region; no inline styles; container split verified. |
| 22 | GenUI streaming CLS | **Partial** | Bounded chunk-arrival/status fixture <0.05 and calm live output. Real model stream / large dynamic tree CLS unimplemented and unmeasured. |
| 23 | Local model isolation | **Not implemented** | Device probe and honest unavailable/Search fallback only. No engine, licensed weights or inference. Bounded SHA-256 verified shard/cache infrastructure has five unit tests, but no real model-delivery test; zero requests is not a passing model-delivery test. |

## Remaining implementation work, in priority order

1. **Budget and legacy migration:** profile framework/chrome cost, lazy-load lab figures, migrate legacy routes/chrome/figure styles, replace remaining inline styles and token escapes. Keep the original thresholds.
2. **Strict CSP:** choose a deployment-compatible nonce or complete static-hash strategy for Next hydration/JSON-LD and externalize legacy styles. COOP+COEP+CORP are now enforced, resource origins are first-party-only, and the production assistant test verifies browser isolation; broader device/hosting compatibility still requires validation.
3. **Localized site templates:** implement real `/en/` and `/bn/` routing/catalog UI, preserve existing canonical/feed behavior deliberately, migrate archive/article/topic/lab/dataset/search/about/utility layouts and no-JS flows. Do not label English articles Bengali or publish fabricated translations/hreflang.
4. **Model delivery:** select licensed ≤150MB weights and a real engine; wire the tested same-origin asset downloader into explicit model consent and add cancel-safe inference-worker streaming and validated tool output. The downloader already enforces ≤20MiB per shard, ≤150MB total, manifest paths/size/hash, credential omission, redirect rejection, bounded reads and versioned Cache Storage; it is not yet connected to a model engine. No weights were supplied in this request; generated placeholder binaries are not a solution.
5. **Dispatch:** requires a real first-party handler, delivery integration and Cloudflare rate-limit configuration. Preserve the working contact link until that exists; do not ship a form that falsely reports delivery.
6. **Certification:** complete the remaining Lighthouse, locales, visual baselines, full-stream CLS, device/AT/zoom/landscape, fallback-font metric and no-JS checks.

## Reproduce

```bash
npm ci
npm run audit:all
# Expected nonzero until the failing/unimplemented requirements are resolved.
# Machine report and per-command logs: artifacts/design-audit/ (gitignored).

# Individual commands:
npm run quality
npm run verify
HOSTNAME=0.0.0.0 PORT=3000 npm run serve
npm run design:browser
npm run design:payload     # currently exits 1
npm run design:lint:all    # currently exits 1
```

The combined runner starts its own fresh production server on port 3101 after verification, so it does not accidentally certify a stale preview. Chromium must be installed (`npx playwright install chromium` in a normal environment); this sandbox uses its provisioned Chromium executable and library path. Builds, audit logs, browser traces and model weights are not committed artifacts. The user has now authorized commit/push on the existing working branch and correction of PR #46. No merge or manual deployment is performed; connected build automation may run after a push.


## CI and clean-code follow-up

The requested `npx skills use "https://github.com/sickn33/agentic-awesome-skills" --skill "clean-code"` command was run and its complete output read. It supplied no supporting-files directory. Its naming, single-responsibility and explicit-error/lifecycle guidance was applied to the production server helper, smoke runner, security policy and model asset delivery functions.

Actions inspection found PR #46's title check rejected its missing Conventional Commit prefix. The title was corrected and the check now passes. The old Quality run failed in its tests step; full log download is blocked by this sandbox's outbound-host restrictions, so its exact prior test assertion is not claimed known. The complete current test suite and a clean `npm ci` now pass locally.

Quality now uses SHA-pinned Node-24-compatible checkout/setup/upload actions, explicit read-only permissions, cancellation of superseded runs, a job timeout, and retained browser failure traces. The old `next start` smoke flow is replaced with the real standalone server, which copies static/public assets and is started, deadline-checked and shut down by a tested shared helper. `npm run test:production` verifies routes, cache/security/crawl headers, compressed search payload and the browser suite. The obsolete ESLint ignore file was migrated to flat configuration. These changes do not waive the failing v4.1 payload/full-tree gates.
