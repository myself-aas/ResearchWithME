// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PlateBodyEditor from '@/components/editor/PlateBodyEditor';
import { MDX_COMPONENT_TEMPLATES } from '@/lib/editor/block-catalog';

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <PlateBodyEditor id="body" value={value} onChange={setValue} />;
}

function buttonByLabel(label: string): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
}

describe('Rich text editor toolbar, FAB, and palette', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(value = 'A **draft**.') {
    act(() => root.render(<Harness initial={value} />));
  }

  it('renders one grouped toolbar with the full heading scale in a split menu', () => {
    render();
    const toolbar = container.querySelector('[role="toolbar"][aria-label="Text formatting"]');
    expect(toolbar).not.toBeNull();
    for (const label of ['History', 'Text formatting', 'Lists and blocks']) {
      expect(toolbar?.querySelector(`[role="group"][aria-label="${label}"]`)).not.toBeNull();
    }
    expect(container.querySelectorAll('[role="toolbar"]')).toHaveLength(1);

    act(() => buttonByLabel('Choose text style')?.click());
    const menu = document.querySelector('[role="menu"][aria-label="Text style"]');
    expect(menu).not.toBeNull();
    const choices = [...(menu?.querySelectorAll('[role="menuitemradio"]') ?? [])].map((item) => item.textContent);
    expect(choices).toEqual(['Paragraph', 'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6']);
  });

  it('opens the searchable palette from the desktop extended FAB and lists every MDX component', () => {
    render();
    const fab = document.querySelector<HTMLButtonElement>('[data-testid="insert-block-extended-fab"]');
    expect(fab?.textContent).toContain('Insert block');
    act(() => fab?.click());

    const dialog = document.querySelector('[role="dialog"][aria-labelledby="block-palette-title"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('Blocks & MDX components');

    const mdxGroup = [...(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
      (button) => button.textContent === 'MDX components',
    );
    act(() => mdxGroup?.click());
    for (const template of MDX_COMPONENT_TEMPLATES) {
      expect(dialog?.textContent).toContain(template.label);
    }
  });

  it('inserts an MDX template into Markdown source and preserves it', () => {
    render('A draft.');
    act(() => document.querySelector<HTMLButtonElement>('[data-testid="insert-block-extended-fab"]')?.click());
    const dialog = document.querySelector('[role="dialog"]');
    const mdxGroup = [...(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
      (button) => button.textContent === 'MDX components',
    );
    act(() => mdxGroup?.click());
    const citation = [...(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find((button) =>
      button.textContent?.includes('Citation reference'),
    );
    act(() => citation?.click());

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toContain('<CitationRef id="source-id" />');
    expect(container.textContent).toContain('Citation reference inserted in Markdown mode');
  });

  it('filters across groups from the palette search field', () => {
    render();
    act(() => document.querySelector<HTMLButtonElement>('[data-testid="insert-block-extended-fab"]')?.click());
    const search = document.querySelector<HTMLInputElement>('#block-palette-search');
    expect(search).not.toBeNull();
    act(() => {
      if (search) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(search, 'evidence');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Evidence callout');
    expect(dialog?.textContent).not.toContain('Heading 1');
  });

  it('offers a mobile FAB menu with five quick blocks and the full palette', () => {
    render();
    const fab = document.querySelector<HTMLButtonElement>('[data-testid="insert-block-fab"]');
    expect(fab?.getAttribute('aria-haspopup')).toBe('menu');
    act(() => fab?.click());
    const menu = document.querySelector('[role="menu"][aria-label="Insert block"]');
    expect(menu).not.toBeNull();
    const labels = [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])].map((item) => item.textContent);
    expect(labels).toHaveLength(6);
    expect(labels[labels.length - 1]).toContain('All blocks & MDX');
  });

  it('validates link destinations in an outlined text field before inserting', async () => {
    render();
    act(() => buttonByLabel('Link')?.click());
    const dialog = document.querySelector('[role="dialog"][aria-labelledby="link-dialog-title"]');
    const url = document.querySelector<HTMLInputElement>('#editor-link-url');
    expect(dialog).not.toBeNull();
    expect(url).not.toBeNull();

    act(() => {
      if (url) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(url, 'javascript:alert(1)');
        url.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    const form = document.querySelector<HTMLFormElement>('form');
    act(() => form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Script URLs are blocked');
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();

    // A safe destination closes the dialog and leaves an editable link behind.
    act(() => {
      if (url) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(url, 'https://example.org/paper');
        url.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(document.querySelector('[aria-labelledby="link-dialog-title"]')).toBeNull();
    expect(container.querySelector('a[href="https://example.org/paper"]')).not.toBeNull();
  });
});
