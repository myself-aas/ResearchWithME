// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import ImageCropDialog, { cropReducer, INITIAL_EDITS } from '@/components/media/ImageCropDialog';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function renderDialog() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root!.render(
      createElement(ImageCropDialog, {
        kind: 'banner',
        open: true,
        onCancel: () => {},
        onConfirm: async () => {},
      }),
    ),
  );
}

function fileInput(): HTMLInputElement {
  const input = document.body.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('file input not rendered');
  return input;
}

/** Minimal `fireEvent.change` for a file input. */
async function chooseFile(file: File) {
  const input = fileInput();
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  // Validation reads the file head asynchronously; let it settle.
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

function alertText(): string | null {
  return document.body.querySelector('[role="alert"]')?.textContent ?? null;
}

describe('ImageCropDialog (choose stage)', () => {
  it('rejects a PNG before cropping', async () => {
    renderDialog();
    await chooseFile(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'a.png', { type: 'image/png' }));
    expect(alertText()).toContain('Choose a JPG or JPEG photo.');
  });

  it('rejects a JPEG over 512 KB', async () => {
    renderDialog();
    const bytes = new Uint8Array(524_289);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    bytes[2] = 0xff;
    await chooseFile(new File([bytes], 'big.jpg', { type: 'image/jpeg' }));
    expect(alertText()).toContain('Choose a photo under 512 KB.');
  });

  it('accepts .jpg and .jpeg', () => {
    renderDialog();
    expect(fileInput().getAttribute('accept')).toBe('.jpg,.jpeg,image/jpeg');
  });
});

describe('ImageCropDialog accessibility', () => {
  it('describes the dialog with the hint text', () => {
    renderDialog();
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const ids = (dialog!.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    expect(ids.length).toBeGreaterThan(0);
    const text = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    expect(ids.every((id) => document.getElementById(id))).toBe(true);
    expect(text).toContain('Choose a JPG or JPEG photo up to 512 KB');
  });

  it('describes the file input with a hint that exists', () => {
    renderDialog();
    const id = fileInput().getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)?.textContent).toContain('512 KB');
  });
});

describe('cropReducer', () => {
  const reported = { x: 10, y: 20, width: 1600, height: 900 };

  it('keeps the latest reported area after Reset so Save stays enabled', () => {
    let state = cropReducer(INITIAL_EDITS, { type: 'area', area: reported });
    state = cropReducer(state, { type: 'crop', crop: { x: 40, y: -12 } });
    state = cropReducer(state, { type: 'rotate' });
    state = cropReducer(state, { type: 'zoom', zoom: 2 });
    state = cropReducer(state, { type: 'reset' });
    expect(state).toEqual({ crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, area: reported });
  });

  it('keeps the area when Reset is pressed with nothing changed', () => {
    const state = cropReducer(cropReducer(INITIAL_EDITS, { type: 'area', area: reported }), { type: 'reset' });
    expect(state.area).toEqual(reported);
  });

  it('rotates in quarter turns and clears the area only for a new photo', () => {
    let state = cropReducer(INITIAL_EDITS, { type: 'area', area: reported });
    for (const expected of [90, 180, 270, 0]) {
      state = cropReducer(state, { type: 'rotate' });
      expect(state.rotation).toBe(expected);
    }
    expect(cropReducer(state, { type: 'newPhoto' })).toEqual(INITIAL_EDITS);
  });
});
