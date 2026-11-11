import type { RequestContext } from '../context';
import { rateLimit } from '../context';
import { clientKey, isSameOrigin } from '../http';
import { json, type ApiRoute, type ApiHandler } from './registry';
import { requireEditor } from '../auth';
import type { JsonValue } from '../context';

const GENERIC_ERROR = 'Cover generation is unavailable. Try again in a moment.';
const LIMITS = {
  width: { min: 256, max: 2048, fallback: 1024 },
  height: { min: 256, max: 2048, fallback: 576 }, // 16:9 standard for article covers
  steps: { min: 1, max: 50, fallback: 25 },
  quality: { min: 1, max: 100, fallback: 80 },
  guidanceScale: { min: 0, max: 20, fallback: 3.5 },
} as const;
const badOrigin = { error: 'Cross-site requests are not allowed.' };

function clamp(value: unknown, rule: { min: number; max: number; fallback: number }): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return rule.fallback;
  return Math.min(rule.max, Math.max(rule.min, parsed));
}

/**
 * Cover-image generation for the editorial studio.
 *
 * Editor-only: the endpoint spends the deployment's Hugging Face token, so it
 * must not be reachable by anonymous callers. Credentials come from the Worker
 * environment only — a token is never accepted in the request body, which keeps
 * it out of the browser entirely.
 */
const generateConfig: ApiHandler = async (ctx) => {
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });

  const spaceName = (ctx.env.HF_SPACE_NAME ?? '').trim();
  return json({
    configured: Boolean(spaceName),
    spaceName: spaceName || null,
    hasToken: Boolean(ctx.env.HF_TOKEN),
    engine: 'Qwen 2.1 (Quantized ZeroGPU) -> AVIF Base64',
    endpoint: '/generate_avif',
  });
};

const generateCover: ApiHandler = async (ctx: RequestContext) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin, { status: 403 });
  }

  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });

  const limit = await rateLimit(ctx, clientKey(ctx.request, 'generate'), 10, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many covers generated in a short window. Wait a minute and try again.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await ctx.request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'The request body could not be read.' }, { status: 400 });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length > 1000) {
    return json({ error: 'A prompt of 1 to 1,000 characters is required.' }, { status: 400 });
  }

  const spaceName = (ctx.env.HF_SPACE_NAME ?? '').trim();
  if (!spaceName) {
    return json(
      {
        error: 'Cover generation is not configured on this deployment. Set HF_SPACE_NAME as a Worker variable.',
        needsConfig: true,
      },
      { status: 503 },
    );
  }

  const hfToken = (ctx.env.HF_TOKEN ?? '').trim() || undefined;
  const negativePrompt =
    typeof body.negative_prompt === 'string' ? body.negative_prompt.slice(0, 500) : '';

  const params: Record<string, JsonValue> = {
    prompt,
    negative_prompt: negativePrompt,
    seed: clamp(body.seed, { min: 0, max: 2 ** 31 - 1, fallback: 0 }),
    randomize_seed: body.randomize_seed !== false,
    width: clamp(body.width, LIMITS.width),
    height: clamp(body.height, LIMITS.height),
    guidance_scale: clamp(body.guidance_scale, LIMITS.guidanceScale),
    num_inference_steps: clamp(body.steps, LIMITS.steps),
    quality: clamp(body.quality, LIMITS.quality),
  };

  try {
    const result = await ctx.services.models.generateCover({
      space: spaceName,
      token: hfToken,
      params,
      timeoutMs: 60_000,
    });

    // Result array contains: [file_path, base64_data_uri, seed]
    const dataArray = Array.isArray(result?.data) ? (result.data as unknown[]) : [];
    const avifDataUri =
      (typeof dataArray[1] === 'string' && dataArray[1].startsWith('data:') ? dataArray[1] : null) ??
      (typeof dataArray[0] === 'string' && dataArray[0].startsWith('data:') ? dataArray[0] : null);
    const usedSeed =
      (typeof dataArray[2] === 'number' ? dataArray[2] : null) ??
      (typeof dataArray[1] === 'number' ? dataArray[1] : 0);

    if (!avifDataUri) {
      // The Space returned a file reference instead of a data URI.
      const first = dataArray[0];
      const urlOrPath =
        typeof first === 'string'
          ? first
          : first && typeof first === 'object' && 'url' in first && typeof (first as { url: unknown }).url === 'string'
            ? (first as { url: string }).url
            : null;

      if (urlOrPath) {
        return json({ success: true, imageUri: urlOrPath, seed: usedSeed, format: 'avif' });
      }
      throw new Error('no image data');
    }

    return json({ success: true, imageUri: avifDataUri, seed: usedSeed, format: 'avif' });
  } catch (error) {
    // The upstream message can carry Space internals and request details, so it
    // is logged for the operator and never returned to the browser.
    console.error('HF Space generation failed:', error);
    return json({ error: GENERIC_ERROR }, { status: 502 });
  }
};

export const generateRoutes: ApiRoute[] = [
  { path: '/api/generate', handlers: { GET: generateConfig, POST: generateCover } },
];
