// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BodyTextEditor from '@/components/cms/BodyTextEditor';

const originalMarkdown = '# A draft\n\nA **bold** claim with a [source](https://example.org).';

describe('dashboard body text editor', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onChange = vi.fn();

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    onChange.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('replaces the rich editor with a labeled text field while preserving Markdown drafts', () => {
    act(() => root.render(<BodyTextEditor id="post-content" value={originalMarkdown} onChange={onChange} />));

    const textarea = container.querySelector<HTMLTextAreaElement>('#post-content')!;
    expect(textarea.value).toBe(originalMarkdown);
    expect(container.querySelector('label[for="post-content"]')?.textContent).toContain('Text');
    expect(container.querySelector('[aria-label="About the body text editor"]')).not.toBeNull();
    expect(container.querySelector('[contenteditable], [role="toolbar"], input[type="file"]')).toBeNull();
    expect(container.textContent).not.toContain('Visual');
    expect(container.textContent).not.toContain('Saved as Markdown');
    expect(onChange).not.toHaveBeenCalled();

    const updated = `${originalMarkdown}\n\nAnother paragraph.`;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, updated);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith(updated);
    act(() => root.render(<BodyTextEditor id="post-content" value={updated} onChange={onChange} />));
    expect(textarea.value).toBe(updated);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('opens the React Bits help tooltip on pointer hover', () => {
    vi.useFakeTimers();
    try {
      act(() => root.render(<BodyTextEditor id="post-content" value="" onChange={onChange} />));
      const button = container.querySelector<HTMLButtonElement>('[aria-label="About the body text editor"]')!;
      const enter = new Event('pointerover', { bubbles: true });
      Object.defineProperties(enter, { pointerType: { value: 'mouse' }, buttons: { value: 0 } });
      act(() => button.dispatchEvent(enter));
      act(() => vi.advanceTimersByTime(410));
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('no rich-text toolbar');
      expect(button.getAttribute('aria-describedby')).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows validation errors and disables editing while saving', () => {
    act(() => root.render(
      <BodyTextEditor
        id="post-content"
        value={originalMarkdown}
        onChange={onChange}
        error="Add more body copy."
        disabled
      />,
    ));

    const textarea = container.querySelector<HTMLTextAreaElement>('#post-content')!;
    expect(textarea.disabled).toBe(true);
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(textarea.getAttribute('aria-describedby')).toBe('post-content-hint post-content-error');
    expect(container.querySelector('#post-content-error')?.textContent).toContain('Add more body copy.');
    expect(container.querySelector<HTMLButtonElement>('[aria-label="About the body text editor"]')?.disabled).toBe(true);
    expect(textarea.value).toBe(originalMarkdown);
  });
});
