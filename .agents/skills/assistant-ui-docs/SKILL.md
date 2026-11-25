---
name: assistant-ui-docs
description: How to build or change the ResearchWithMe archive assistant correctly with assistant-ui. Use when a change touches components/assistant/, lib/assistant/, app/assistant, or any @assistant-ui/react usage; covers the runtime pattern, primitive inventory, streaming rules, and the budget constraints that bound the integration.
---

# assistant-ui on ResearchWithMe

The site's chat surface (`/assistant`) is built on `@assistant-ui/react` and
`@assistant-ui/react-markdown`. This skill keeps changes to it consistent with
what the library actually does and what this site can afford.

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
- **CSS is global.** Tailwind utilities in the client component land in the
  site-wide stylesheet; keep the class set lean and prefer the existing
  semantic tokens (`bg-surface`, `text-ink`, `border-line`, `bg-brand`) over
  raw palette values.

## The runtime pattern

`AssistantThread.tsx` uses the LocalRuntime: a single `ChatModelAdapter`, with
the runtime owning messages, branching, editing, regeneration, and
cancellation. Two rules the adapter must keep:

1. **`run` is an async generator that yields cumulative content.** Every yield
   replaces the previous content — yield the full text so far, never deltas:
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

## Primitive inventory (what exists, what we use)

| Primitive | Used for |
| --- | --- |
| `ThreadPrimitive.Root / Viewport / Messages / Empty / If / ScrollToBottom / Suggestion` | The thread shell, auto-scroll, message list, empty state with prompt chips |
| `MessagePrimitive.Root / Content / If` | User and assistant bubbles; `components={{ Text }}` picks the text renderer |
| `ComposerPrimitive.Root / Input / Send / Cancel` | The input row; Send auto-disables while running, Cancel shows via `ThreadPrimitive.If running` |
| `MarkdownTextPrimitive` (from `@assistant-ui/react-markdown`) | Assistant markdown; wrap it in a zero-prop component before passing it as `Text` — passing the primitive directly fails the `TextMessagePartComponent` prop type |

Note the `If` filters: `ThreadPrimitive.If` takes `empty | running | disabled`;
`ComposerPrimitive.If` only takes `editing | dictation` — gate Send/Cancel on
`ThreadPrimitive.If`, not the composer.

## API questions

When unsure of a primitive's props or a hook's shape, ask the `assistant-ui`
MCP server (`.mcp.json` — live docs, see `.agents/mcp/README.md`) and confirm
against the **installed** version in `node_modules/@assistant-ui/react/dist`
before writing code. The library moves fast; the installed version outranks
any doc page, and a doc page outranks memory.

## Tests

`lib/assistant/retrieval.ts` is covered by `test/assistant-retrieval.test.ts`.
New reasoning behaviour (chunking, ranking, answer composition) belongs in
that pure module and that suite — not in the component. See
[test-quality](../test-quality/SKILL.md) for what a test must prove.
