// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlateBodyEditor from '@/components/editor/PlateBodyEditor';

describe('Plate body editor', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onChange = vi.fn();
  const render = (value: string, error?: string) => act(() => root.render(<PlateBodyEditor id="body" value={value} onChange={onChange} error={error} />));
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    onChange.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  it('opens complex existing Markdown in source mode without modifying it', () => {
    const markdown = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    render(markdown, 'Required');
    const textarea = container.querySelector('textarea')!;
    expect(textarea.value).toBe(markdown);
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(container.querySelector('[role="status"]')?.textContent).toContain('preserves it');
    const visual = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Visual')!;
    act(() => visual.click());
    expect(container.querySelector('textarea')?.value).toBe(markdown);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a labeled Plate textbox and switches safely to Markdown', () => {
    render('A **draft**.');
    const editable = container.querySelector('[contenteditable="true"]');
    expect(editable?.id).toBe('body');
    expect(editable?.getAttribute('aria-labelledby')).toBe('body-label');
    expect(container.querySelector('[role="toolbar"]')).not.toBeNull();
    const source = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Markdown')!;
    act(() => source.click());
    expect(container.querySelector('textarea')?.value).toBe('A **draft**.');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('restores compatible content without emitting an edit', async () => {
    render('');
    render('# Restored title\n\nA restored paragraph.');
    await act(async () => { await Promise.resolve(); });
    expect(container.querySelector('[contenteditable="true"]')?.textContent).toContain('Restored title');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('preserves an externally restored unsupported draft when already in visual mode', () => {
    render('A draft.');
    const markdown = '![An image](https://example.org/image.png)';
    render(markdown);
    expect(container.querySelector('textarea')?.value).toBe(markdown);
    expect(onChange).not.toHaveBeenCalled();
  });
});
