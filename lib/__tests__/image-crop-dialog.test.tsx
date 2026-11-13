// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import ImageCropDialog from '@/components/media/ImageCropDialog';

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
