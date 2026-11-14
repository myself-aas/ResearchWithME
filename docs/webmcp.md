# WebMCP

`researchwith.me` registers three read-only tools with the browser's agent runtime, so an agent running **in the reader's tab** can query the archive instead of scraping the page or guessing at selectors.

WebMCP is a W3C Web Machine Learning Community Group draft. It is the in-page counterpart to the remote MCP server documented in [`mcp.md`](./mcp.md): the MCP server is a network service, WebMCP tools are functions that run in the page the reader is already looking at, with the reader present.

## What ships

| File | Role |
| --- | --- |
| `public/webmcp.js` | The entire registration. A classic script, no dependencies, ~10 KB. |
| `cloudflare-pages/src/document.tsx` | Emits `<script src="/webmcp.js" defer>` in `<head>`. |
| `app/layout.tsx` | Same tag, so the Next.js build behaves identically. |
| `public/_routes.json` | Excludes `/webmcp.js` from the Worker, so Pages serves it as a static asset. |
| `test/webmcp.test.mjs` | Runs the shipped file in a sandbox against fake hosts. |

## The tools

All three are `readOnlyHint: true`. They read the public archive through `/api/articles`; none writes, submits, spends, or navigates on the reader's behalf. A readiness scanner loads the home page on every scan — if registration had a side effect, every scan would cause it.

| Tool | Input | Returns |
| --- | --- | --- |
| `search_articles` | `query` (required), `category` | Up to 10 results, each with a canonical `/post/<slug>` URL |
| `list_categories` | — | Categories and formats with counts, so the agent never guesses a category value |
| `get_article` | `slug` (required) | One article with summary, takeaways and body text |

Slugs are **matched against the catalogue**, never interpolated into a request path, so a crafted slug cannot redirect the fetch. `get_article` fails with a message pointing at `search_articles` rather than a raw 404.

## Three decisions worth knowing

**A static script, not a React effect.** Cloudflare's agent-readiness scanner loads the page in a headless browser and samples it a few seconds after navigation. A tool registered from a hydration effect exists only after the bundle has parsed, executed and committed — and not at all if hydration fails or is slow. Worse, production is the `cloudflare-pages` SSR build, whose document template does not mount `app/layout.tsx` at all; an effect added there would never run in production. A `defer` script in `<head>` registers in both builds, before anything can fail.

**Register into `document` *and* `navigator`.** The specification puts the registry on `document.modelContext`; earlier preview builds used `navigator.modelContext`. A scanner in a stock browser has neither, so it installs its own `navigator.modelContext` shim and records what the page registers there. Registering into only the spec's host reports zero tools to that scanner; registering into only the old host breaks in Chrome's origin trial. Both hosts get every tool, and a failure in one never stops the other.

**Absent API is not an error.** Nearly every browser lacks this API. Outside a preview build the script does nothing: no throw, no warning, no network. Logging an error for the 99% in order to serve a scanner would be a bad trade. The only failure it reports is a host that *is* present and refuses a specific tool — and it then carries on registering the rest.

## Registration contract

```js
const controller = new AbortController();
document.modelContext.registerTool(
  { name, description, inputSchema, annotations, execute },
  { signal: controller.signal },
);
// later
controller.abort(); // unregisters every tool registered under the signal
```

The signal is how unregistration works: there is no `unregisterTool`. Registration returns a promise in the current draft, so a rejection is caught per tool rather than rejecting the rest.

## Verify

```sh
npm run webmcp:test
```

Runs the shipped `public/webmcp.js` in a `node:vm` sandbox with fake `document`/`navigator`/`fetch` — the same bytes the browser executes, not a TypeScript twin that can drift. 15 assertions cover the contract, the dual host, the empty-API no-op, partial failure, and each tool's request and error behaviour.

To check a deployed page, load it in a browser with WebMCP enabled and run:

```js
await document.modelContext.getTools();
```

The [Model Context Tool Inspector](https://github.com/beaufortfrancois/model-context-tool-inspector) extension shows the same list with schemas.

## Readiness check

`checks.discovery.webMcp.status` on [isitagentready.com](https://isitagentready.com) passes when the scanner's headless browser sees at least one tool registered on page load. It reads the home page only, so registering on a deeper route would not count — which is why the script is in the root document template.

Note that `Permissions-Policy: tools=()` disables WebMCP for a site. This site sends `camera=(), microphone=(), geolocation=()` and does **not** disable `tools`.
