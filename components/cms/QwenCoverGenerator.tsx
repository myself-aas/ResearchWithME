'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Sliders,
  Check,
  AlertCircle,
  Download,
  Image as ImageIcon,
  Key,
  HelpCircle,
} from 'lucide-react';

interface QwenCoverGeneratorProps {
  currentCover?: string;
  articleTitle?: string;
  articleSubtitle?: string;
  articleCategory?: string;
  onApplyCover: (imageUri: string) => void;
}

interface ServerStatus {
  configured: boolean;
  spaceName: string | null;
  hasToken: boolean;
  engine: string;
}

export default function QwenCoverGenerator({
  currentCover: _currentCover,
  articleTitle = '',
  articleSubtitle = '',
  articleCategory = '',
  onApplyCover,
}: QwenCoverGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('blurry, deformed, low quality, artifact, watermark, low resolution');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(576); // 16:9 standard for blog cover
  const [steps, setSteps] = useState(25);
  const [quality, setQuality] = useState(80);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [randomizeSeed, setRandomizeSeed] = useState(true);
  const [seed, setSeed] = useState(0);

  const [showSettings, setShowSettings] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUri, setGeneratedUri] = useState<string | null>(null);
  const [generatedSeed, setGeneratedSeed] = useState<number | null>(null);
  const [applied, setApplied] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);

  // Report whether the deployment has a Space configured. Credentials live in
  // the Worker environment and are never sent to, or stored in, the browser.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/generate', { headers: { accept: 'application/json' } });
        if (res.ok && active) setServerStatus(await res.json());
      } catch {
        // Silent fallback: the generator reports its own error on submit.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Craft a scholarly visual prompt from the article metadata
  function suggestPrompt() {
    const parts: string[] = [];
    if (articleTitle) {
      parts.push(`Scholarly conceptual visualization of "${articleTitle.trim()}"`);
    } else {
      parts.push('Minimalist scholarly research illustration');
    }

    if (articleSubtitle) {
      parts.push(`reflecting "${articleSubtitle.trim()}"`);
    }

    if (articleCategory) {
      parts.push(`focusing on ${articleCategory.toLowerCase()}`);
    }

    parts.push('scientific aesthetic, clean editorial composition, deep ink and archival tones, high-resolution details, cinematic atmospheric lighting');
    setPrompt(parts.join(', '));
  }

  // Handle generation request
  async function handleGenerate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!prompt.trim()) {
      setError('Please provide a prompt describing the desired cover artwork.');
      return;
    }

    setLoading(true);
    setError(null);
    setApplied(false);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim(),
          width,
          height,
          steps,
          quality,
          guidance_scale: guidanceScale,
          seed,
          randomize_seed: randomizeSeed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsConfig) {
          setShowSettings(true);
        }
        throw new Error(data.error || 'Failed to generate image on Hugging Face ZeroGPU');
      }

      setGeneratedUri(data.imageUri);
      if (typeof data.seed === 'number') {
        setGeneratedSeed(data.seed);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Generation failed. Check your Space configuration and Hugging Face token.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // Commit cover to article
  function handleApply() {
    if (!generatedUri) return;
    onApplyCover(generatedUri);
    setApplied(true);
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-5 sm:p-6 space-y-5">
      {/* Header with Title and Connection Status */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-brand">
              <Sparkles className="h-3.5 w-3.5 text-brand-hover" aria-hidden="true" />
              <span>Qwen 2.1 Storage Bucket</span>
            </span>
            <span className="rounded-md bg-stone-200 px-2 py-0.5 font-mono text-xs font-semibold text-stone-700">
              AVIF ZeroGPU
            </span>
            {serverStatus?.configured ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
                <Check className="h-3 w-3" />
                <span>HF Secrets Active</span>
              </span>
            ) : serverStatus ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-brand">
                <span>Space Not Configured</span>
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 font-serif text-lg font-bold text-stone-900">
            Generate Editorial Cover Image
          </h3>
          <p className="mt-0.5 text-xs text-stone-600">
            Render high-fidelity, compressed AVIF cover artwork directly via your private Hugging Face Space.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <Key className="h-3.5 w-3.5 text-brand-hover" aria-hidden="true" />
          <span>Space Config</span>
        </button>
      </div>

      {/* Hugging Face Space configuration notice */}
      {showSettings && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-4 space-y-3">
          <div className="flex items-start justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand">
              Hugging Face Space Credentials
            </h4>
            <span className="text-xs text-stone-500">ZeroGPU Gradio SDK</span>
          </div>
          <p className="text-xs text-brand-pressed leading-relaxed">
            Cover generation runs against the private Hugging Face Space named by the deployment.
            Credentials are supplied by the server environment only, so no token is ever typed into,
            sent from, or stored in this browser.
          </p>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-md border border-indigo-200 bg-white px-3 py-2">
              <dt className="font-medium text-stone-600">Space</dt>
              <dd className="font-mono text-stone-900">{serverStatus?.spaceName ?? 'Not configured'}</dd>
            </div>
            <div className="rounded-md border border-indigo-200 bg-white px-3 py-2">
              <dt className="font-medium text-stone-600">Token present</dt>
              <dd className="text-stone-900">{serverStatus?.hasToken ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
          <p className="flex items-center gap-1 text-xs text-stone-600">
            <HelpCircle className="h-3 w-3" />
            Set <code className="rounded bg-indigo-100 px-1 py-0.5">HF_SPACE_NAME</code> and{' '}
            <code className="rounded bg-indigo-100 px-1 py-0.5">HF_TOKEN</code> as Worker variables, then redeploy.
          </p>
        </div>
      )}

      {/* Main Generator Form */}
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="qwen-prompt" className="text-xs font-semibold text-stone-800">
              Visual Artwork Prompt
            </label>
            <button
              type="button"
              onClick={suggestPrompt}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover underline underline-offset-2"
            >
              <Sparkles className="h-3 w-3" />
              <span>Suggest from article context</span>
            </button>
          </div>
          <textarea
            id="qwen-prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the conceptual cover image (e.g. 'A sleek architectural representation of distributed neural weights, copper traces on obsidian stone, soft volumetric studio lighting, 8k resolution')..."
            className="w-full rounded-md border border-stone-300 bg-white p-3 text-xs text-stone-900 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-hover font-sans"
            disabled={loading}
          />
        </div>

        {/* Aspect Ratio & Basic Tuning */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="qwen-dimensions" className="block text-xs font-medium text-stone-700 mb-1">
              Aspect Ratio / Dimensions
            </label>
            <select
              id="qwen-dimensions"
              value={`${width}x${height}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split('x').map(Number);
                setWidth(w);
                setHeight(h);
              }}
              className="w-full rounded-md border border-stone-300 bg-white px-2.5 py-2 text-xs text-stone-900"
              disabled={loading}
            >
              <option value="1024x576">16:9 Editorial Header (1024 × 576)</option>
              <option value="1024x1024">1:1 Square (1024 × 1024)</option>
              <option value="1280x720">16:9 HD Wide (1280 × 720)</option>
              <option value="1152x648">16:9 Mid Frame (1152 × 648)</option>
            </select>
          </div>

          <div>
            <label htmlFor="qwen-steps" className="block text-xs font-medium text-stone-700 mb-1">
              Inference Steps: <span className="font-semibold text-stone-900">{steps}</span>
            </label>
            <input
              id="qwen-steps"
              type="range"
              min="15"
              max="40"
              step="1"
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              className="w-full accent-brand"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="qwen-quality" className="block text-xs font-medium text-stone-700 mb-1">
              AVIF Quality: <span className="font-semibold text-stone-900">{quality}%</span>
            </label>
            <input
              id="qwen-quality"
              type="range"
              min="50"
              max="95"
              step="5"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-brand"
              disabled={loading}
            />
          </div>
        </div>

        {/* Advanced Accordion */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900"
          >
            <Sliders className="h-3 w-3" />
            <span>{showAdvanced ? 'Hide advanced settings' : 'Show advanced options (Negative prompt, seed, guidance)'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 rounded-md border border-stone-200 bg-white p-3.5 space-y-3">
              <div>
                <label htmlFor="qwen-negative-prompt" className="block text-xs font-medium text-stone-700 mb-1">
                  Negative Prompt
                </label>
                <input
                  id="qwen-negative-prompt"
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-2.5 py-1.5 text-xs text-stone-900"
                  disabled={loading}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="qwen-guidance" className="block text-xs font-medium text-stone-700 mb-1">
                    Guidance Scale ({guidanceScale})
                  </label>
                  <input
                    id="qwen-guidance"
                    type="range"
                    min="1.0"
                    max="8.0"
                    step="0.5"
                    value={guidanceScale}
                    onChange={(e) => setGuidanceScale(Number(e.target.value))}
                    className="w-full accent-brand"
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-4">
                  <input
                    id="random-seed"
                    type="checkbox"
                    checked={randomizeSeed}
                    onChange={(e) => setRandomizeSeed(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand-hover"
                    disabled={loading}
                  />
                  <label htmlFor="random-seed" className="text-xs font-medium text-stone-700">
                    Randomize Seed
                  </label>
                  {!randomizeSeed && (
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value))}
                      className="ml-2 w-28 rounded border border-stone-300 px-2 py-1 text-xs text-stone-900"
                      aria-label="Custom seed number"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Running ZeroGPU Diffusion Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate AVIF Cover with Qwen 2.1</span>
              </>
            )}
          </button>

          {serverStatus?.spaceName && (
            <span className="text-xs text-stone-600 font-mono">
              Target: {serverStatus.spaceName}
            </span>
          )}
        </div>
      </form>

      {/* Error Feedback */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-xs text-red-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Generation encountered an error:</p>
            <p className="leading-relaxed">{error}</p>
            <p className="text-stone-700 pt-1">
              Ensure your Hugging Face Space is online, your <code className="bg-red-100 px-1 py-0.5 rounded">HF_TOKEN</code> is authorized, and the Space exposes the <code className="bg-red-100 px-1 py-0.5 rounded">/generate_avif</code> API endpoint.
            </p>
          </div>
        </div>
      )}

      {/* Generated Image Result Display */}
      {generatedUri && (
        <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                <Check className="h-3 w-3" />
                <span>AVIF Rendered</span>
              </span>
              <span className="text-xs text-stone-600 font-mono">
                {width} × {height} px · Seed {generatedSeed ?? 'random'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={generatedUri}
                download={`qwen_cover_${Date.now()}.avif`}
                className="inline-flex min-h-8 items-center gap-1 rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                title="Download AVIF file"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download AVIF</span>
              </a>

              <button
                type="button"
                onClick={handleApply}
                disabled={applied}
                className="inline-flex min-h-8 items-center gap-1.5 rounded bg-brand px-3.5 py-1 text-xs font-semibold text-white hover:bg-brand-hover disabled:bg-emerald-800 transition-colors"
              >
                {applied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Applied to Article!</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Apply as Article Cover</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Native HTML <picture> Tag Rendering AVIF Data Stream */}
          <div className="relative overflow-hidden rounded-md border border-stone-200 bg-stone-900 flex items-center justify-center">
            <picture className="w-full">
              <source srcSet={generatedUri} type="image/avif" />
              <img
                src={generatedUri}
                alt={prompt}
                className="w-full h-auto max-h-[480px] object-cover"
              />
            </picture>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-600 font-mono">
            <span>Encoding: Native AVIF Base64 Data Stream</span>
            <span>ZeroGPU Accelerated</span>
          </div>
        </div>
      )}
    </div>
  );
}
