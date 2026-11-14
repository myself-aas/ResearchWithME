import { getCloudflareContext } from '@opennextjs/cloudflare';
import { composeAnswer, parseAssistantAnswer } from './compose';
import { createGeminiGenerator } from './generate';
import type { AssistantAnswer, AssistantInput } from './types';

export type { AssistantInput } from './types';

/**
 * The one entry point for "answer this question from these records".
 *
 * On Cloudflare the model call runs in a second Worker,
 * `researchwithme-assistant` (workers/assistant), reached through the
 * `ASSISTANT` service binding. Where the binding does not exist — `next dev`,
 * unit tests, Worker Previews (which do not support service bindings) — or
 * when the call fails, the same `composeAnswer` runs in this process instead.
 * Both paths end in a catalogue answer if the model is unavailable, so this
 * function only throws if composing itself is broken.
 */
export interface AssistantBindingLike {
  answer(input: AssistantInput): Promise<unknown>;
}

function assistantBinding(): AssistantBindingLike | null {
  try {
    const env = getCloudflareContext().env as Partial<Record<string, unknown>> | undefined;
    const candidate = env?.ASSISTANT as AssistantBindingLike | undefined;
    if (candidate && typeof candidate.answer === 'function') return candidate;
  } catch {
    // Outside a Worker request there is no context.
  }
  return null;
}

async function answerInProcess(input: AssistantInput): Promise<AssistantAnswer> {
  return composeAnswer(
    input,
    createGeminiGenerator({
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
      AI_GATEWAY_BASE_URL: process.env.AI_GATEWAY_BASE_URL,
    }),
  );
}

let override: ((input: AssistantInput) => Promise<AssistantAnswer>) | null = null;

export async function answerQuestion(
  input: AssistantInput,
  binding: AssistantBindingLike | null | undefined = assistantBinding(),
): Promise<AssistantAnswer> {
  if (override) return override(input);

  if (binding) {
    try {
      // The reply crosses a process boundary: validate it like any other input.
      const answer = parseAssistantAnswer(await binding.answer(input));
      if (answer) return answer;
      console.error(JSON.stringify({ event: 'assistant.binding_fallback', reason: 'malformed reply' }));
    } catch (error) {
      console.error(
        JSON.stringify({ event: 'assistant.binding_fallback', reason: error instanceof Error ? error.message : 'error' }),
      );
    }
  }
  return answerInProcess(input);
}

/** Test hook: replace the assistant so a suite does not depend on a model or a binding. */
export function setAssistantForTesting(fn: ((input: AssistantInput) => Promise<AssistantAnswer>) | null) {
  override = fn;
}
