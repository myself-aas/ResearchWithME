# Workers build diagnosis and v4.1 delivery checks

## Build failure: confirmed from the supplied log

The author supplied the private error for Cloudflare build
`8ee90c03-182c-4b19-b66f-e9da86334049` (commit `b500978`):

```text
prebuild → design:check → design:verify
Error: I14: stale generated file src/generated/fixtures/contrast.json; run npm run design:gen
```

Dependencies installed; the failure was the repository's generated-artifact
guard, not a demonstrated Cloudflare platform failure. Previously GitHub check
`140141432874` exposed only a dashboard link, so the cause was unconfirmed.
The supplied log supersedes that limitation for this build.

Regeneration on Node 22 produced no change. Running the same verifier on Node
24 reproduced **the exact stale contrast fixture error**. Comparing fresh
outputs showed V8 fractional-exponentiation differences in the final binary
floating-point digits, e.g. `15.704613707397463` versus `15.704613707397465`.
This explains why Node 22 CI passed while another runtime could fail the
byte-for-byte check; merely recommitting Node 22 output would not fix it.
The original dashboard Node version was not supplied, so Node 24 is a local
reproduction, not an assertion about that build's environment.

The contrast fixture now serializes ratios at **10 decimal places** and has
been regenerated. Raw contrast calculations and threshold validation remain
unrounded and unchanged. `renderDesign` still validates before rendering;
byte-for-byte verification still rejects stale artifacts. A regression test
also proves a near-threshold raw failure cannot be rounded into a pass.
CI verifies the same committed outputs on **Node 20, 22 and 24**, without
regenerating files there. All three versions pass locally.

The supplied dashboard deploy command is `npx wrangler preview`, not a
production deploy. That did not cause the reported prebuild error, and is
external dashboard configuration, not a repository script. Review it before
expecting production publication; this fix does not silently deploy or change
account settings. The reported 16 npm vulnerabilities (including 2 critical)
also did not cause this failure; no forced dependency upgrades are included.
Remote success must still be confirmed by the next external check.

## Previously validated Worker build/runtime evidence

Locally, the following were reproduced with the pinned dependencies:

- `npm run build:worker`: OpenNext builds successfully.
- `WORKERS_CI=1 npm run build`: the dashboard-style wrapper path also succeeds.
- Wrangler `deploy --dry-run`: bundles without uploading or authenticating.
- Updated artifact: **2,417,260 bytes** summed independent module gzip;
  Wrangler's own estimate is **2,362.89 KiB gzip**. Both are below the
  configured **3 MiB** Worker limit. No static asset exceeds 25 MiB.
- The bundle starts in workerd; the complete browser suite is executable there.

These observations were collected on Node 22 before the cross-version
contrast reproduction above. They demonstrate successful local packaging and
runtime behavior, not universal runtime determinism or a remote deployment.

## Confirmed runtime defect and fix

Cold workerd originally returned `{"version":1,"count":0,"docs":[]}` from
`/search-index.json`. The assistant browser test failed because no Prithvi
passages could be retrieved. The content loader constructed paths from
`process.cwd()` and scanned the repository filesystem at request time. Workers
do not expose the build machine's repository through that filesystem.
This also affects dynamic search, even if prerendered pages are cached.

The fix separates authoring/build-time filesystem loading into
`lib/content/load.ts`. Production queries consume a validated, draft-free,
typed `lib/content/snapshot.generated.ts` bundled with the server. Authoring
and loader tests retain their existing filesystem semantics. The snapshot is
reproducible, committed, and byte-verified before builds and in CI. Missing or
malformed source content is not hidden by silently treating stale data as fresh.

```bash
# After publishing or editing a post:
npm run content:gen
npm run content:verify
```

Regression tests simulate the missing filesystem. The cold Worker smoke test
checks actual source passages, document count and dynamic search results—not
just HTTP 200—and then runs all ten browser checks in workerd. Before the fix,
the Worker browser suite was 9/10; after the fix it is **10/10**.

## Reproduce without deploying

```bash
npm ci
npm run quality
WORKERS_CI=1 WRANGLER_SEND_METRICS=false npm run build
npm run check:worker
npm run test:worker
```

`check:worker` executes Wrangler's local dry run and checks packaged module
sizes including WASM/binary modules. `test:worker` owns a local server on
port 3102 and shuts it down on completion/error. It does not warm a remote
cache, modify bindings, upload a version, or deploy. Browser installation is
required. GitHub Actions now runs this target separately from the standalone
Node target and retains failure evidence as artifacts.

## Dashboard configuration to inspect when the private log is available

Use the repository's pinned npm lockfile and Node 22. The project root is the
repository root. Build with `npm run build:worker` or the supported
`WORKERS_CI=1 npm run build` wrapper. Both must produce `.open-next/worker.js`
and `.open-next/assets`.

For a real release, the OpenNext adapter's deploy/upload flow populates the
configured KV cache before calling Wrangler. A bare `wrangler versions upload`
is not equivalent to `opennextjs-cloudflare upload`; do not bypass adapter
cache population just to make an upload step green. Inspect the dashboard's
configured build/deploy/non-production commands rather than assuming they
match package.json. Do not run a production deploy as a diagnostic.

Check the private log's first failure and verify:

1. npm install, Node version and canonical-origin guard;
2. generated snapshot/design files and actual build entry point;
3. account/Worker name, KV/cache permissions and service bindings;
4. cache population versus version-upload/preview command compatibility;
5. actual uploaded gzip size and plan limit.

Never share or commit API tokens. A redacted log is sufficient for diagnosis.
Do not label the remote failure fixed until its new external check succeeds.

## Font-budget correction discovered during runtime testing

Workers browser traffic also loaded the legacy 146,872-byte Newsreader italic
face. The old roman-only font measurement did not account for this download.
All three served faces are now manifest-owned and included in the **same
80,000-byte budget**. The italic is subset to its editorial 400 weight and the
required Latin range, using FontTools 4.69.1; italic emphasis remains available.
Only the two roman faces are preloaded; italic loads on demand.

- Newsreader roman: 34,116 bytes
- Inter roman: 24,856 bytes
- Newsreader italic: 20,744 bytes
- **All font faces: 79,716 / 80,000 bytes**

The previous font file was preserved as the rebuild source outside Git; the
existing license remains unchanged. The existing builder/checker validates
all installed faces and required UI/scientific glyph fallbacks. A unit test
requires every served WOFF2 file to be represented in the manifest, preventing
another hidden-font budget escape. CI runs the glyph check with pinned
FontTools. Bengali system-font certification remains manual/unmeasured.

The initial-JS, full-site token, strict-CSP, locale, real-model, dispatch and
manual gates remain open in `AUDIT-v4.1.md`. Worker correctness and an honest
font budget are progress toward v4.1, not a waiver of those requirements.
