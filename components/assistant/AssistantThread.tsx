'use client';

import { ArrowDown, BookOpenText, CornerDownLeft, Library, Quote, Sparkles } from 'lucide-react';
import {
  AuiIf,
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
import { ResearchSummaryTool } from './reme-catalog';
import { LocalModelAvailability } from './LocalModelAvailability';
import { genui } from '@/src/design/genui.manifest';
import { generativeTools } from './GenerativeFigures';

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
const STREAM_DELAY_MS = genui.streaming.updateThrottleMs;

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
    const args = { component: 'RemeStatusNotice', props: { state: hits.length ? 'localLive' : 'unavailable', detail: hits.length ? `${hits.length} matching archive passages. Check the linked quotations below; retrieval is not independent fact verification.` : 'No matching passage was found. Search the archive instead.' } };
    const summaryPart = { type: 'tool-call' as const, toolCallId: 'research-summary', toolName: 'show_research_summary', args, argsText: JSON.stringify(args), result: { rendered: true } };
    let streamed = '';
    for (const token of (answer.match(/.{1,100}(?:\s|$)|.{1,100}/gs) ?? [answer])) {
      streamed += token;
      yield {
        content: figurePart
          ? [summaryPart, figurePart, { type: 'text', text: streamed }]
          : [summaryPart, { type: 'text', text: streamed }],
      };
      await wait(STREAM_DELAY_MS, abortSignal);
      if (abortSignal.aborted) return;
    }
  },
};

function UserMessage() {
  return <MessagePrimitive.Root className="assistant-user"><div className="assistant-user-bubble"><MessagePrimitive.Parts>{({ part }) => part.type === 'text' ? <p className="r-body assistant-whitespace">{part.text}</p> : null}</MessagePrimitive.Parts></div></MessagePrimitive.Root>;
}
function MarkdownText() { return <MarkdownTextPrimitive className="assistant-markdown" />; }
function AssistantMessage() {
  return <MessagePrimitive.Root className="r-flow assistant-message"><p className="r-meta r-muted assistant-label"><Quote className="r-icon" aria-hidden="true" />From the archive</p><div className="assistant-answer"><MessagePrimitive.Parts components={{ Text: MarkdownText, tools: { by_name: { ...generativeTools.by_name, show_research_summary: ResearchSummaryTool } } }} /></div></MessagePrimitive.Root>;
}
function EmptyState({ suggestions }: { suggestions: string[] }) {
  return <div className="assistant-empty r-flow"><Library className="r-icon" aria-hidden="true" /><h3 className="r-h3">Ask the archive</h3><p className="r-body">Answers quote published essays and link to their sources. Nothing you type leaves your browser. This is retrieval, not a language model.</p><ul className="r-list genui-actions">{suggestions.map(prompt => <li key={prompt}><ThreadPrimitive.Suggestion prompt={prompt} send className="r-control-secondary"><Sparkles className="r-icon" aria-hidden="true" />{prompt}</ThreadPrimitive.Suggestion></li>)}</ul></div>;
}
function Composer() {
  return <div className="assistant-composer"><ComposerPrimitive.Root className="assistant-composer-row"><ComposerPrimitive.Input rows={1} placeholder="Ask about the published essays" aria-label="Ask the archive" className="r-field r-input assistant-input" /><AuiIf condition={s => !s.thread.isRunning}><ComposerPrimitive.Send className="r-control-primary" aria-label="Send question"><CornerDownLeft className="r-icon" aria-hidden="true" /></ComposerPrimitive.Send></AuiIf><AuiIf condition={s => s.thread.isRunning}><ComposerPrimitive.Cancel className="r-control-secondary">Stop answer</ComposerPrimitive.Cancel></AuiIf></ComposerPrimitive.Root><p className="r-meta r-muted">Local retrieval · Answers quote the archive only</p></div>;
}
export default function AssistantThread({ suggestions }: { suggestions: string[] }) {
  const runtime = useLocalRuntime(archiveAdapter);
  return <AssistantRuntimeProvider runtime={runtime}><section aria-labelledby="assistant-thread-heading" className="assistant-shell"><div className="assistant-toolbar"><BookOpenText className="r-icon" aria-hidden="true" /><h2 id="assistant-thread-heading" className="r-h3">Archive conversation</h2></div><ThreadPrimitive.Root className="assistant-thread"><div className="assistant-viewport-wrap"><ThreadPrimitive.Viewport autoScroll className="assistant-viewport"><div className="r-flow assistant-messages"><AuiIf condition={s => s.thread.isEmpty}><EmptyState suggestions={suggestions} /></AuiIf><ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} /><AuiIf condition={s => s.thread.isRunning}><output className="r-live r-meta" aria-live="polite">Searching the archive…</output></AuiIf></div></ThreadPrimitive.Viewport><ThreadPrimitive.ScrollToBottom className="r-control-secondary assistant-scroll" aria-label="Scroll to the latest answer"><ArrowDown className="r-icon" aria-hidden="true" /></ThreadPrimitive.ScrollToBottom></div><Composer /></ThreadPrimitive.Root></section><LocalModelAvailability /></AssistantRuntimeProvider>;
}
