'use client';

/**
 * ImageCropDialog — choose a JPEG, crop it to the policy aspect, then encode.
 *
 * Two stages inside one Radix dialog:
 * - Choose: a visible JPG/JPEG file input, validated against the image policy
 *   (type, extension, 512 KB, magic bytes) before anything is decoded.
 * - Edit: `react-easy-crop` at `IMAGE_POLICY[kind].aspect` with a labelled
 *   zoom range, quarter-turn rotation and reset. Save runs `cropAndEncode`
 *   and hands the encoded images to `onConfirm` (which uploads them).
 *
 * Behaviour is driven by `kind` only, so the same dialog serves banners
 * (16:9, rectangle) and avatars (1:1, round). Load it through
 * `LazyImageCropDialog`; the cropper is an interactive-only widget.
 */
import { useEffect, useId, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Cropper from 'react-easy-crop';
import { AlertCircle, RotateCw, Undo2, Upload, X } from 'lucide-react';
import { cropAndEncode, type EncodedImage, type PixelArea, type Rotation } from '@/lib/images/process';
import { IMAGE_POLICY, MAX_INPUT_BYTES, validateJpegInput, type ImageKind } from '@/lib/images/policy';
import {
  hintClass,
  inlineErrorClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  subtleButtonClass,
} from '@/components/cms/styles';

export interface ImageCropDialogProps {
  kind: ImageKind;
  open: boolean;
  onCancel: () => void;
  onConfirm: (images: EncodedImage[]) => Promise<void>;
}

const COPY: Record<ImageKind, { title: string; frame: string }> = {
  banner: { title: 'Upload banner', frame: 'a 16:9 banner' },
  avatar: { title: 'Upload profile photo', frame: 'a square profile photo' },
};

const INITIAL_CROP = { x: 0, y: 0 };

type Source = { file: File; url: string };

export default function ImageCropDialog({ kind, open, onCancel, onConfirm }: ImageCropDialogProps) {
  // The Portal only renders while open, so every visit starts fresh at the choose stage.
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <CropPanel kind={kind} onConfirm={onConfirm} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CropPanel({ kind, onConfirm }: Pick<ImageCropDialogProps, 'kind' | 'onConfirm'>) {
  const inputId = useId();
  const zoomId = useId();
  const hintId = useId();
  const policy = IMAGE_POLICY[kind];
  const copy = COPY[kind];

  const [source, setSource] = useState<Source | null>(null);
  const [crop, setCrop] = useState(INITIAL_CROP);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [area, setArea] = useState<PixelArea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  // Release the object URL whenever the chosen photo changes or the dialog unmounts.
  useEffect(() => {
    if (!source) return;
    return () => URL.revokeObjectURL(source.url);
  }, [source]);

  function resetEdits() {
    setCrop(INITIAL_CROP);
    setZoom(1);
    setRotation(0);
    setArea(null);
  }

  async function handleFile(file: File | undefined) {
    setError(null);
    setStatus('');
    if (!file) return;
    const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
    const problem = validateJpegInput(file, head);
    if (problem) {
      setError(problem);
      return;
    }
    resetEdits();
    setSource({ file, url: URL.createObjectURL(file) });
  }

  async function handleSave() {
    if (!source || !area) return;
    setBusy(true);
    setError(null);
    setStatus('Compressing…');
    try {
      const images = await cropAndEncode(source.file, area, rotation, kind);
      const kb = Math.round(images[0].blob.size / 1024);
      setStatus(`Saved size: ${kb} KB`);
      await onConfirm(images);
    } catch (cause) {
      setStatus('');
      setError(cause instanceof Error ? cause.message : 'The photo could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  const maxKb = Math.round(MAX_INPUT_BYTES / 1024);

  return (
    <Dialog.Overlay className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/40 p-4">
      <Dialog.Content
        className="w-full max-w-2xl rounded-lg border border-line bg-surface-raised p-5 text-ink shadow-dialog focus:outline-none sm:p-6"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <Dialog.Title className="font-serif text-xl font-semibold text-ink">{copy.title}</Dialog.Title>
          <Dialog.Close asChild>
            <button type="button" disabled={busy} className={subtleButtonClass}>
              <X className="h-4 w-4" aria-hidden="true" />
              <span>Close</span>
            </button>
          </Dialog.Close>
        </div>
        <Dialog.Description id={hintId} className={hintClass}>
          Choose a JPG or JPEG photo up to {maxKb} KB, then crop it to {copy.frame}. The crop must cover at least{' '}
          {policy.minCrop.width} × {policy.minCrop.height} px. Location and camera data are removed when it is saved.
        </Dialog.Description>

        {source ? (
          <div className="mt-5 space-y-4">
            <div className="relative h-72 w-full overflow-hidden rounded-md bg-surface-inverse sm:h-96">
              <Cropper
                image={source.url}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={policy.aspect}
                cropShape={kind === 'avatar' ? 'round' : 'rect'}
                minZoom={1}
                maxZoom={3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
              />
            </div>

            <div>
              <label htmlFor={zoomId} className={labelClass}>
                Zoom <span className="font-mono text-ink-secondary">{zoom.toFixed(2)}×</span>
              </label>
              <input
                id={zoomId}
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                disabled={busy}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-brand"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setRotation((current) => ((current + 90) % 360) as Rotation)}
                className={secondaryButtonClass}
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                <span>Rotate 90°</span>
              </button>
              <button type="button" disabled={busy} onClick={resetEdits} className={secondaryButtonClass}>
                <Undo2 className="h-4 w-4" aria-hidden="true" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSource(null);
                  setError(null);
                  setStatus('');
                }}
                className={subtleButtonClass}
              >
                <span>Choose another photo</span>
              </button>
              <button
                type="button"
                disabled={busy || !area}
                onClick={() => void handleSave()}
                className={`${primaryButtonClass} sm:ml-auto`}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>{busy ? 'Saving…' : 'Save'}</span>
              </button>
            </div>

            <p role="status" className="min-h-5 font-mono text-sm text-ink-secondary">
              {status}
            </p>
          </div>
        ) : (
          <div className="mt-5">
            <label htmlFor={inputId} className={labelClass}>
              Photo
            </label>
            <input
              id={inputId}
              type="file"
              accept=".jpg,.jpeg,image/jpeg"
              aria-describedby={hintId}
              onChange={(event) => {
                const input = event.currentTarget;
                void handleFile(input.files?.[0]).finally(() => {
                  input.value = '';
                });
              }}
              className="block w-full text-sm text-ink file:mr-3 file:min-h-11 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-4 file:text-sm file:font-semibold file:text-ink"
            />
          </div>
        )}

        {error && (
          <p role="alert" className={inlineErrorClass}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </Dialog.Content>
    </Dialog.Overlay>
  );
}
