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
 * Timeouts match the Next handlers exactly (20s Gemini, 60s cover Space);
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

    async generateCover({ space, token, params, timeoutMs }) {
      const { Client } = await import('@gradio/client');
      return withTimeout(
        (async () => {
          const client = await Client.connect(space, {
            hf_token: token as `hf_${string}` | undefined,
          });
          // Calls the /generate_avif endpoint defined in the Space's app.py.
          return client.predict('/generate_avif', params) as Promise<{ data: unknown }>;
        })(),
        timeoutMs,
      );
    },
  };
}

/** Bounds a call that has no cancellation support of its own (Gradio client). */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
