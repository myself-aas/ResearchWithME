import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@gradio/client';
import { requireEditor } from '@/lib/cms/auth';
import { isSameOrigin } from '@/lib/cms/http';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SPACE_TIMEOUT_MS = 60_000;
const GENERIC_ERROR = 'Cover generation is unavailable. Try again in a moment.';
const LIMITS = {
  width: { min: 256, max: 2048, fallback: 1024 },
  height: { min: 256, max: 2048, fallback: 576 }, // 16:9 standard for article covers
  steps: { min: 1, max: 50, fallback: 25 },
  quality: { min: 1, max: 100, fallback: 80 },
  guidanceScale: { min: 0, max: 20, fallback: 3.5 },
} as const;

function clamp(value: unknown, rule: { min: number; max: number; fallback: number }): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return rule.fallback;
  return Math.min(rule.max, Math.max(rule.min, parsed));
}

/** Bounds a call that has no cancellation support of its own. */
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

/**
 * Cover-image generation for the editorial studio.
 *
 * Editor-only: the endpoint spends the deployment's Hugging Face token, so it
 * must not be reachable by anonymous callers. Credentials come from the Worker
 * environment only — a token is never accepted in the request body, which keeps
 * it out of the browser entirely.
 */
export async function GET() {
  const gate = await requireEditor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const spaceName = (process.env.HF_SPACE_NAME ?? '').trim();
  return NextResponse.json({
    configured: Boolean(spaceName),
    spaceName: spaceName || null,
    hasToken: Boolean(process.env.HF_TOKEN),
    engine: 'Qwen 2.1 (Quantized ZeroGPU) -> AVIF Base64',
    endpoint: '/generate_avif',
  });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  const gate = await requireEditor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const limit = await rateLimit(clientKey(req, 'generate'), 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many covers generated in a short window. Wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'The request body could not be read.' }, { status: 400 });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length > 1000) {
    return NextResponse.json(
      { error: 'A prompt of 1 to 1,000 characters is required.' },
      { status: 400 },
    );
  }

  const spaceName = (process.env.HF_SPACE_NAME ?? '').trim();
  if (!spaceName) {
    return NextResponse.json(
      {
        error: 'Cover generation is not configured on this deployment. Set HF_SPACE_NAME as a Worker variable.',
        needsConfig: true,
      },
      { status: 503 },
    );
  }

  const hfToken = (process.env.HF_TOKEN ?? '').trim() || undefined;
  const negativePrompt = typeof body.negative_prompt === 'string' ? body.negative_prompt.slice(0, 500) : '';

  try {
    const result = await withTimeout(
      (async () => {
        const client = await Client.connect(spaceName, {
          hf_token: hfToken as `hf_${string}` | undefined,
        });
        // Calls the /generate_avif endpoint defined in the Space's app.py.
        return client.predict('/generate_avif', {
          prompt,
          negative_prompt: negativePrompt,
          seed: clamp(body.seed, { min: 0, max: 2 ** 31 - 1, fallback: 0 }),
          randomize_seed: body.randomize_seed !== false,
          width: clamp(body.width, LIMITS.width),
          height: clamp(body.height, LIMITS.height),
          guidance_scale: clamp(body.guidance_scale, LIMITS.guidanceScale),
          num_inference_steps: clamp(body.steps, LIMITS.steps),
          quality: clamp(body.quality, LIMITS.quality),
        });
      })(),
      SPACE_TIMEOUT_MS,
    );

    // Result array contains: [file_path, base64_data_uri, seed]
    const dataArray = Array.isArray(result?.data) ? result.data : [];
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
        return NextResponse.json({ success: true, imageUri: urlOrPath, seed: usedSeed, format: 'avif' });
      }
      throw new Error('no image data');
    }

    return NextResponse.json({ success: true, imageUri: avifDataUri, seed: usedSeed, format: 'avif' });
  } catch (error) {
    // The upstream message can carry Space internals and request details, so it
    // is logged for the operator and never returned to the browser.
    console.error('HF Space generation failed:', error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
