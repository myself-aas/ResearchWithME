import { composeAnswer } from './compose';
import { createGeminiGenerator } from './generate';
import type { AssistantAnswer, AssistantInput } from './types';

export type { AssistantInput } from './types';

/**
 * The one entry point for "answer this question from these records".
 * In this process the model is called directly; see `answerQuestion`.
 */
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

export async function answerQuestion(input: AssistantInput): Promise<AssistantAnswer> {
  if (override) return override(input);
  return answerInProcess(input);
}

/** Test hook: replace the assistant so a suite does not depend on a model or a binding. */
export function setAssistantForTesting(fn: ((input: AssistantInput) => Promise<AssistantAnswer>) | null) {
  override = fn;
}
