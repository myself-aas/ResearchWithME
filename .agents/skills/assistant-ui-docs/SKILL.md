---
name: assistant-ui-docs
description: How to build or change the ResearchWithMe archive assistant correctly with assistant-ui. Use when a change touches components/assistant/, lib/assistant/, app/assistant, the figure library, or any @assistant-ui/react usage; covers the runtime pattern, primitive inventory, the 0.15.x migration (MessagePrimitive.Parts / AuiIf / GenerativeUI), the generative-UI allowlist, streaming rules, and the budget constraints that bound the integration.
---

# assistant-ui on ResearchWithMe

The site's chat surface (`/assistant`) and its in-thread interactive figures
(`components/assistant/`, `components/library/`) are built on
`@assistant-ui/react` and `@assistant-ui/react-markdown`. This skill keeps those
changes consistent with what the library actually does and what this site can
afford. It is the repo-adapted translation layer for the **vendored** assistant-ui
skills (`generative-ui`, `primitives`, `runtime`, `tools`, `elements`) at the
commit pinned in `skills-lock.json`.

## Read this first

- **Architecture bridge:** [`references/reme-generative-architecture.md`](references/reme-generative-architecture.md)
  maps the assistant-ui generative-UI model onto this site's `reme v3.2` tokens,
  the `FIGURE_CONSTITUTION.md` library, and the two spec shapes that do **not**
  interchange (`present` flat `_type` vs `MessagePrimitive.GenerativeUI`
  `{ root: { component, props } }`).
- **Upstream skills win on API mechanics:** when they and this file disagree on a
  primitive's props, the installed `@assistant-ui/react@0.15.38` is the authority
  (see below), the upstream skill is next, and `AGENTS.md` §18 wins on product
  rules (no model service, no new origins, JS quarantined to the route).
- **Always consult [`https://www.assistant-ui.com/llms.txt`](https://www.assistant-ui.com/llms.txt)**
  for the latest API before adding anything new, and use the `assistant-ui` MCP
  server or the `shadcn` MCP server (read-only) for `r.assistant-ui.com` registry
  lookups (see `.agents/mcp/README.md`).

## Non-negotiable constraints first

- The assistant is **retrieval, not a model**. `lib/assistant/retrieval.ts` is
  pure and deterministic: same index + query in, same answer out. Do not add a
  fetch to a model service, an API key, a cloud LLM provider, or a "just ask
  the LLM" fallback — answers must stay checkable quotes (`AGENTS.md` §18).
- **Two origins, no more.** `/search-index.json` (fetched once, cached) and,
  when `NEXT_PUBLIC_ASSISTANT_BASE_URL` is set, the author's Assistant Cloud
  project for anonymous thread sync (persistence, titles, run reports —
  `AGENTS.md` §15.8, §18.6). Anything else needs a contract change first.
- **JS is quarantined to the route.** Every assistant-ui import lives in
  `components/assistant/AssistantThread.tsx` (client) or is a type import.
  Importing runtime code from a component used on an article page is a budget
  violation (`AGENTS.md` §9) — `check:site` measures the article path.
- **CSS is global and token-bound.** Tailwind utilities in client components land
  in the site-wide stylesheet; keep the class set lean and prefer existing
  semantic tokens (`bg-surface`, `text-ink`, `border-line`, `bg-brand`) over raw
  palette values. Never blue; resolve data colours through `lib/figures/tones.ts`.
- **Author approval for visuals.** A new archetype or a changed visual design of
  a shipped figure is a `FIGURE_CONSTITUTION.md` Article 12 PR. `DESIGN.md`
  (`reme v3.2`) is the design authority; the upstream catalog is a *reference*,
  never a source of hex values or blue palettes.

## The runtime pattern

`AssistantThread.tsx` uses the `LocalRuntime` (`useLocalRuntime`) with a single
`ChatModelAdapter`, whose `run` is an async generator that yields cumulative
content. The runtime owns messages, branching, editing, regeneration, and
cancellation. Two rules the adapter must keep (see `runtime` skill
`references/local-runtime.md`):

1. **`run` yields cumulative content.** Every yield replaces the previous
   content — yield the full text so far, never deltas:
   ```ts
   async *run({ messages, abortSignal }) {
     let streamed = '';
     for (const token of tokens) {
       streamed += token;
       yield { content: [{ type: 'text', text: streamed }] };
       if (abortSignal.aborted) return;
     }
   }
   ```
2. **Honour `abortSignal` at every await**, including the index fetch and each
   stream step. A cancelled run must not keep working in the background.

## Primitive inventory — what exists, what we use (0.15.x)

`@assistant-ui/react@0.15.38` has **deprecated** the older `MessagePrimitive.Content`
alias and every primitive's `.If`. They still work, but new code uses the
replacements below (`primitives` skill). The current thread uses `Content` with
`components={{ Text, tools: { by_name } }}`; the migration to `.Parts` is a
planned, like-for-like step in `references/reme-generative-architecture.md` and
must keep `generativeTools.by_name` rendering intact.

| Primitive | Used for |
| --- | --- |
| `ThreadPrimitive.Root / Viewport / Messages / Suggestion` | The thread shell, auto-scroll, message list, empty-state prompt chips |
| `ThreadPrimitive.Empty` → `AuiIf condition={(s) => s.thread.isEmpty}` | Empty state (deprecated `.Empty`/`.If` → `AuiIf`) |
| `MessagePrimitive.Root / Parts` (`.Content` is the deprecated alias) | Bubbles; `components={{ Text }}` picks the text renderer; `generativeUI` slot renders the figure spec |
| `MessagePrimitive.GenerativeUI` | Renders a `{ type: 'generative-ui', spec }` part against a `GenerativeUIComponentRegistry` allowlist + `Fallback` |
| `ComposerPrimitive.Root / Input / Send / Cancel` | The input row; Send auto-disables while running, Cancel shows via `AuiIf condition={(s) => s.thread.isRunning}` |
| `MarkdownTextPrimitive` (from `@assistant-ui/react-markdown`) | Assistant markdown; wrap it in a zero-prop component before passing it as `Text` |
| `ActionBarPrimitive.{Copy,Reload,Edit,ExportMarkdown}` | Per-message actions (the `ExportMarkdown` and `Edit` entries are new in 0.15) |
| `BranchPickerPrimitive.{Root,Previous,Next,Number,Count}` | Regeneration/branch navigation |
| `SelectionToolbarPrimitive.Quote` | Quote-to-compose (outside `Viewport`) |
| `SuggestionPrimitive.{Title,Description,Trigger}` | Prompt chips |
| `AssistantModalPrimitive` | Optional floating assistant entry point |

Note the `If` conditions: `ThreadPrimitive.If` takes `empty | running | disabled`;
`ComposerPrimitive.If` only takes `editing | dictation` — gate Send/Cancel on
`ThreadPrimitive` state, not the composer. `useToolArgsStatus` (0.15) reports a
tool call's arg-streaming state if a future figure needs deferred rendering.

## Generative UI on this site (the two allowed shapes)

`AGENTS.md` §18.10 and `FIGURE_CONSTITUTION.md` Article 3 require every figure to
render in **two surfaces from one component**: the article body (MDX) and the
assistant thread. The thread today uses the legacy `tools.by_name` tool-UI path
(`GenerativeFigures.tsx`), which is the correct, supported mechanism for a
*tool-tied* widget — `generative-ui` skill's "Tool UI" pattern. The
`MessagePrimitive.GenerativeUI` allowlist is the *alternative* for a backend that
already emits a `generative-ui` part; we document it as the forward path for
composed surfaces (e.g. a `generative-ui` part that stacks several registry
components) but do not need it until a backend emits such parts. See the bridge
doc for the exact spec shapes and why they do not interchange.

**Security boundary (both paths):** the allowlist bounds *which* components
render (no `eval`, no dynamic import). It does **not** constrain the props those
components receive. Never forward agent-supplied props into
`dangerouslySetInnerHTML`, and validate/reject `href`/`src` values (no
`javascript:` URLs). The figure registry's `toolName`s are the only names the
thread can render.

## API questions

When unsure of a primitive's props or a hook's shape:
1. Ask the `assistant-ui` MCP server (`.mcp.json` — live docs, see
   `.agents/mcp/README.md`), and/or read `https://www.assistant-ui.com/llms.txt`.
2. Confirm against the **installed** version in
   `node_modules/@assistant-ui/react/dist` before writing code.
3. For the styled catalog (`Thread`, standalone elements), use the `shadcn` MCP
   server read-only against `r.assistant-ui.com` — never `add`/`init`; this
   project has no `components.json` and its theme is in `app/globals.css` +
   `tokens/`.

The library moves fast; the installed version outranks any doc page, and a doc
page outranks memory.

## Tests

- `lib/assistant/retrieval.ts` is covered by `test/assistant-retrieval.test.ts`
  (routing, composition, determinism).
- Figure constitution is covered by `test/figure-constitution.test.ts` and
  `test/post-figures.test.ts` (registry ↔ MDX ↔ manifest derivations).
- New reasoning behaviour (chunking, ranking, answer composition) belongs in that
  pure module and that suite — not in the component. See
  [test-quality](../test-quality/SKILL.md) for what a test must prove.
