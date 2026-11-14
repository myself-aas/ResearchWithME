import { GoogleGenAI } from '@google/genai';
import type { Generate } from './compose';

export interface GeneratorEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  /** Optional AI Gateway base URL. Unset means the provider is called directly. */
  AI_GATEWAY_BASE_URL?: string;
}

/** Returns null when no model key is configured; the caller then answers from the catalogue. */
export function createGeminiGenerator(env: GeneratorEnv): Generate | null {
  const apiKey = (env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) return null;
  const baseUrl = (env.AI_GATEWAY_BASE_URL ?? '').trim();
  const model = (env.GEMINI_MODEL ?? '').trim() || 'gemini-3.8-flash';

  return async (prompt, signal) => {
    const ai = new GoogleGenAI(baseUrl ? { apiKey, httpOptions: { baseUrl } } : { apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { abortSignal: signal },
    });
    return response.text ?? '';
  };
}
