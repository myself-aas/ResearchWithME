'use client';

import { ArrowDown, BookOpenText, CloudOff, CloudUpload, CornerDownLeft, Library, Loader2, Quote, Sparkles } from 'lucide-react';
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  type ChatModelAdapter,
} from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import type { SearchDoc } from '@/lib/content/types';
import { searchDocs } from '@/lib/search';
import {
  composeAnswer,
  lastUserText,
  retrievePassages,
  routeFigure,
  type RetrievalHit,
} from '@/lib/assistant/retrieval';
import { generativeTools } from './GenerativeFigures';

/**
 * The Archive Assistant — the interactive half of `/assistant`.
 *
 * The reasoning lives in `lib/assistant/retrieval.ts` (pure, unit-tested).
 * This component wires it into an assistant-ui `LocalRuntime`, which owns
 * thread state, branching, regeneration, and cancellation so none of that is
 * hand-rolled here. There is no model service: the only model is the local
 * index, and the answers are extractive.
 *
 * Thread sync: when `NEXT_PUBLIC_ASSISTANT_BASE_URL` is set at build time
 * (production sets it to the author's Assistant Cloud project), the runtime
 * connects to Assistant Cloud with an anonymous, account-less session —
 * threads, messages, titles, and run reports persist there so the author can
 * see what readers ask, and returning visitors get a stable anonymous
 * identity in localStorage. When the variable is unset (local development),
 * the runtime falls back to in-memory state and nothing leaves the browser.
 * `cloudConnected` only switches the honesty copy; the behaviour switch is
 * the runtime's own env-driven one (AGENTS.md §18).
 *
 * The whole file is client-side and code-split to this route; the article
 * path never loads any of it (AGENTS.md §9).
 */

/** The full archive index, fetched once per session and cached module-wide. */
let cachedIndex: SearchDoc[] | null = null;
let pendingIndex: Promise<SearchDoc[]> | null = null;

function loadArchiveIndex(): Promise<SearchDoc[]> {
  if (cachedIndex) return Promise.resolve(cachedIndex);
  pendingIndex ??= fetch('/search-index.json', { headers: { accept: 'application/json' } })
    .then((response) => {
      if (!response.ok) throw new Error(`archive index returned ${response.status}`);
      return response.json() as Promise<{ docs: SearchDoc[] }>;
    })
    .then((payload) => {
      cachedIndex = payload.docs;
      return cachedIndex;
    })
    .finally(() => {
      pendingIndex = null;
    });
  return pendingIndex;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

/** Yield an answer word-group by word-group so the reply streams, not pops. */
const STREAM_DELAY_MS = 12;

const archiveAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const query = lastUserText(messages);
    if (!query) {
      yield { content: [{ type: 'text', text: 'Ask about any published essay and I will quote it.' }] };
      return;
    }

    let docs: SearchDoc[];
    try {
      docs = await loadArchiveIndex();
    } catch {
      yield {
        content: [
          {
            type: 'text',
            text: 'The archive index did not load, so I cannot quote anything yet. Reload the page, or use [Search](/search) directly.',
          },
        ],
      };
      return;
    }
    if (abortSignal.aborted) return;

    const hits: RetrievalHit[] = retrievePassages(docs, query);
    const fallback = hits.length === 0 ? (searchDocs(docs, query, 1)[0] ?? undefined) : undefined;
    const answer = composeAnswer(query, hits, fallback);

    // Generative figure (§18.10): when the question maps to one of the post's
    // interactive components, emit its tool-call part complete and first, so
    // the figure renders while the quoted answer streams beneath it.
    const figure = routeFigure(query);
    const figurePart = figure
      ? ({
          type: 'tool-call' as const,
          toolCallId: `fig-${Date.now().toString(36)}`,
          toolName: figure.toolName,
          args: figure.args,
          argsText: JSON.stringify(figure.args),
          result: { rendered: true },
        })
      : undefined;

    // Cumulative yields, per the LocalRuntime contract: every yield replaces
    // the previous content, so the text grows without the UI flickering.
    let streamed = '';
    for (const token of answer.split(/(?<=\s)/)) {
      streamed += token;
      yield {
        content: figurePart
          ? [figurePart, { type: 'text', text: streamed }]
          : [{ type: 'text', text: streamed }],
      };
      await wait(STREAM_DELAY_MS, abortSignal);
      if (abortSignal.aborted) return;
    }
  },
};

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md border border-line bg-surface-subtle px-4 py-2.5 font-sans text-sm leading-relaxed text-ink sm:max-w-[75%]">
        <MessagePrimitive.Content>
          {({ part }) =>
            part.type === 'text' ? <p className="whitespace-pre-wrap">{part.text}</p> : null
          }
        </MessagePrimitive.Content>
      </div>
    </MessagePrimitive.Root>
  );
}

/** Renders the streamed markdown with the site's chat typography. */
function MarkdownText() {
  return <MarkdownTextPrimitive className="assistant-markdown" />;
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
        <Quote className="h-3 w-3 text-brand" aria-hidden="true" />
        <span>From the archive</span>
      </div>
      <div className="max-w-full rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 shadow-raised">
        <MessagePrimitive.Content components={{ Text: MarkdownText, tools: generativeTools }} />
      </div>
    </MessagePrimitive.Root>
  );
}

function EmptyState({ suggestions, cloudConnected }: { suggestions: string[]; cloudConnected: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-selection text-brand">
        <Library className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h3 className="font-serif text-xl font-semibold text-ink">Ask the archive</h3>
        <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink-secondary">
          Ask about any published essay. The answer is quoted from the text itself and every quote
          links to its source — nothing is invented.
        </p>
        <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink-secondary">
          {cloudConnected
            ? 'Conversations are stored anonymously in Assistant Cloud — no account, no sign-in — so the author can see what readers ask. Use Search instead to keep everything on your device.'
            : 'Nothing you type leaves your browser.'}
        </p>
      </div>
      {suggestions.length > 0 && (
        <ul className="flex flex-col items-stretch gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-center">
          {suggestions.map((prompt) => (
            <li key={prompt}>
              <ThreadPrimitive.Suggestion
                prompt={prompt}
                send
                className="inline-flex min-h-11 w-full items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-sans text-sm text-ink-secondary transition-colors hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:w-auto"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                {prompt}
              </ThreadPrimitive.Suggestion>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RunningIndicator() {
  return (
    <ThreadPrimitive.If running>
      <div
        aria-live="polite"
        className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" aria-hidden="true" />
        <span>Searching the archive…</span>
      </div>
    </ThreadPrimitive.If>
  );
}

function Composer({ cloudConnected }: { cloudConnected: boolean }) {
  return (
    <div className="border-t border-line bg-surface p-3">
      <ComposerPrimitive.Root className="flex items-end gap-2 rounded-2xl border border-line bg-canvas p-2 transition-colors focus-within:border-brand">
        <ComposerPrimitive.Input
          rows={1}
          placeholder="Ask about the essays — e.g. why did a benchmark not reproduce?"
          aria-label="Ask the archive"
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 font-sans text-sm text-ink outline-none placeholder:text-ink-secondary"
        />
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-on-primary transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50">
            <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Send question</span>
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            <span className="h-3 w-3 rounded-[2px] bg-current" aria-hidden="true" />
            <span className="sr-only">Stop the answer</span>
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </ComposerPrimitive.Root>
      <p className="mt-2 px-1 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
        {cloudConnected
          ? 'Answers quote the archive only · Threads sync anonymously to Assistant Cloud'
          : 'Runs in your browser · Answers quote the archive only'}
      </p>
    </div>
  );
}

function ScrollToBottomButton() {
  return (
    <ThreadPrimitive.ScrollToBottom
      className="absolute bottom-3 left-1/2 z-10 inline-flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-floating transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      aria-label="Scroll to the latest answer"
    >
      <ArrowDown className="h-4 w-4" aria-hidden="true" />
    </ThreadPrimitive.ScrollToBottom>
  );
}

export default function AssistantThread({
  suggestions,
  cloudConnected = false,
}: {
  suggestions: string[];
  cloudConnected?: boolean;
}) {
  const runtime = useLocalRuntime(archiveAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <section
        aria-labelledby="assistant-thread-heading"
        className="overflow-hidden rounded-2xl border border-line bg-surface shadow-raised"
      >
        <h2 id="assistant-thread-heading" className="sr-only">
          Archive assistant conversation
        </h2>
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-selection text-brand">
              <BookOpenText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-serif text-sm font-semibold text-ink">Archive assistant</p>
              <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
                {cloudConnected ? 'Assistant Cloud sync · no model service' : 'Deterministic retrieval · no model service'}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-wider ${
              cloudConnected ? 'border-trust-emerging/40 text-trust-emerging' : 'border-line text-ink-secondary'
            }`}
          >
            {cloudConnected ? <CloudUpload className="h-3 w-3" aria-hidden="true" /> : <CloudOff className="h-3 w-3" aria-hidden="true" />}
            {cloudConnected ? 'Sync on' : 'Local only'}
          </span>
        </div>

        <ThreadPrimitive.Root className="flex h-[32rem] flex-col sm:h-[36rem]">
          <div className="relative flex min-h-0 flex-1 flex-col">
            <ThreadPrimitive.Viewport autoScroll className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
                <ThreadPrimitive.Empty>
                  <EmptyState suggestions={suggestions} cloudConnected={cloudConnected} />
                </ThreadPrimitive.Empty>
                <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
                <RunningIndicator />
              </div>
            </ThreadPrimitive.Viewport>
            <ScrollToBottomButton />
          </div>
          <Composer cloudConnected={cloudConnected} />
        </ThreadPrimitive.Root>
      </section>
    </AssistantRuntimeProvider>
  );
}
