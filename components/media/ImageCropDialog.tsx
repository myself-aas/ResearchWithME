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
import { useEffect, useId, useReducer, useState } from 'react';
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

type Source = { file: File; url: string };

export type CropEdits = {
  crop: { x: number; y: number };
  zoom: number;
  rotation: Rotation;
  /** The cropper's latest reported `croppedAreaPixels`; null until it reports one for the current photo. */
  area: PixelArea | null;
};

export type CropAction =
  | { type: 'crop'; crop: { x: number; y: number } }
  | { type: 'zoom'; zoom: number }
  | { type: 'rotate' }
  | { type: 'area'; area: PixelArea }
  | { type: 'reset' }
  | { type: 'newPhoto' };

export const INITIAL_EDITS: CropEdits = { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, area: null };

/**
 * Crop editing state. `reset` restores position, zoom and rotation but keeps
 * the last reported area: react-easy-crop only re-reports when something
 * actually changes, so clearing it would leave Save disabled. Only a new
 * photo clears the area.
 */
export function cropReducer(state: CropEdits, action: CropAction): CropEdits {
  switch (action.type) {
    case 'crop':
      return { ...state, crop: action.crop };
    case 'zoom':
      return { ...state, zoom: action.zoom };
    case 'rotate':
      return { ...state, rotation: ((state.rotation + 90) % 360) as Rotation };
    case 'area':
      return { ...state, area: action.area };
    case 'reset':
      return { ...INITIAL_EDITS, area: state.area };
    case 'newPhoto':
      return INITIAL_EDITS;
  }
}

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
  const inputHintId = useId();
  const policy = IMAGE_POLICY[kind];
  const copy = COPY[kind];

  const [source, setSource] = useState<Source | null>(null);
  const [edits, dispatch] = useReducer(cropReducer, INITIAL_EDITS);
  const { crop, zoom, rotation, area } = edits;
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  // Release the object URL whenever the chosen photo changes or the dialog unmounts.
  useEffect(() => {
    if (!source) return;
    return () => URL.revokeObjectURL(source.url);
  }, [source]);

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
    dispatch({ type: 'newPhoto' });
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
        <Dialog.Description className={hintClass}>
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
                onCropChange={(next) => dispatch({ type: 'crop', crop: next })}
                onZoomChange={(next) => dispatch({ type: 'zoom', zoom: next })}
                onCropAreaChange={(_, pixels) => dispatch({ type: 'area', area: pixels })}
                onCropComplete={(_, pixels) => dispatch({ type: 'area', area: pixels })}
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
                onChange={(event) => dispatch({ type: 'zoom', zoom: Number(event.target.value) })}
                className="w-full accent-brand"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => dispatch({ type: 'rotate' })}
                className={secondaryButtonClass}
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                <span>Rotate 90°</span>
              </button>
              <button type="button" disabled={busy} onClick={() => dispatch({ type: 'reset' })} className={secondaryButtonClass}>
                <Undo2 className="h-4 w-4" aria-hidden="true" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  dispatch({ type: 'newPhoto' });
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
              aria-describedby={inputHintId}
              onChange={(event) => {
                const input = event.currentTarget;
                void handleFile(input.files?.[0]).finally(() => {
                  input.value = '';
                });
              }}
              className="block w-full text-sm text-ink file:mr-3 file:min-h-11 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-4 file:text-sm file:font-semibold file:text-ink"
            />
            <p id={inputHintId} className={hintClass}>
              JPG or JPEG only, up to {maxKb} KB.
            </p>
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
