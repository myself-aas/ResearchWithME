import type { ModelServices } from './context';

export const MODEL_TIMEOUT_MS = 20_000;
export const SPACE_TIMEOUT_MS = 60_000;

/**
 * Production model providers for the Pages runtime.
 *
 * The handlers never talk to Google or Hugging Face directly — they consume
 * the injected `RuntimeServices.models` contract, and this factory builds the
 * real one. It is deliberately NOT wired into the fail-closed default services:
 * the deployment layer (Tasks 14–16) decides when the edge build may spend
 * provider quota, by passing `createModelServices()` into handleRequest.
 *
 * Timeouts match the Next handlers exactly (20s Gemini);
 * provider failures throw and the callers map them onto catalog fallbacks,
 * local avatars, or 502s — they never leak provider internals to the browser.
 */
export function createModelServices(): ModelServices {
  return {
    async generateText({ apiKey, model, prompt, timeoutMs }) {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { abortSignal: AbortSignal.timeout(timeoutMs) },
      });
      return response.text ?? '';
    },
  };
}
