import { describe, expect, it } from 'vitest';
import { createPlateEditor } from 'platejs/react';
import { MarkdownPlugin } from '@platejs/markdown';
import { canEditVisually, platePlugins } from '@/lib/editor/plate-markdown';

describe('Plate Markdown compatibility', () => {
  it.each([
    '',
    'Plain text with **bold**, *italic* and `code`.',
    '# Heading\n\nA [link](https://example.org).',
    '- First\n- Second',
    '```js\nconst n = 1;\n```',
  ])('accepts a safely round-trippable document: %s', (markdown) => {
    expect(canEditVisually(markdown)).toBe(true);
    if (markdown) {
      const editor = createPlateEditor({ plugins: platePlugins });
      editor.tf.setValue(editor.getApi(MarkdownPlugin).markdown.deserialize(markdown));
      expect(editor.getApi(MarkdownPlugin).markdown.serialize().trim()).not.toBe('');
    }
  });

  it.each([
    '| A | B |\n| --- | --- |\n| x | y |',
    '![Caption](https://example.org/image.png)',
    'Text with a footnote.[^1]\n\n[^1]: Source',
    '<CustomComponent value="1" />',
    'Line one  \nLine two',
  ])('retains unsupported material in source mode: %s', (markdown) => {
    expect(canEditVisually(markdown)).toBe(false);
  });
});
