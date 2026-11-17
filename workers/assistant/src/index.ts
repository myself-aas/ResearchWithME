/**
 * researchwithme-assistant: the Assistant's model call, as its own Worker.
 *
 * It has no route and no public URL. The site Worker reaches it through the
 * `ASSISTANT` service binding and calls `answer()` over RPC, passing the
 * question and the article records it already retrieved. This Worker never
 * reads the database; the only secret it holds is the model key.
 *
 * All of the logic is in lib/assistant/compose.ts, which the site Worker also
 * runs in-process as its fallback, and which is unit tested there.
 */
import { WorkerEntrypoint } from 'cloudflare:workers';
import { composeAnswer, parseAssistantInput } from '../../../lib/assistant/compose';
import { createGeminiGenerator } from '../../../lib/assistant/generate';
import type { AssistantAnswer } from '../../../lib/assistant/types';

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  AI_GATEWAY_BASE_URL?: string;
}

export class AssistantService extends WorkerEntrypoint<Env> {
  async answer(input: unknown): Promise<AssistantAnswer> {
    const parsed = parseAssistantInput(input);
    if (!parsed) throw new Error('Invalid assistant input.');
    const started = Date.now();
    const result = await composeAnswer(parsed, createGeminiGenerator(this.env));
    console.log(
      JSON.stringify({ event: 'assistant.answer', mode: result.mode, records: parsed.articles.length, ms: Date.now() - started }),
    );
    return result;
  }
}

const assistantWorker = {
  fetch(): Response {
    return new Response(null, { status: 404 });
  },
};

export default assistantWorker;
