import type { PlateEditor } from 'platejs/react';
import { toggleList } from '@platejs/list';

export type EditorBlockType = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote' | 'code_block';

/** Set the current block(s) to a Markdown block type and return focus. */
export function setEditorBlockType(editor: PlateEditor, type: EditorBlockType) {
  editor.tf.setNodes({ type } as never);
  editor.tf.focus();
}

export function toggleEditorBlockType(editor: PlateEditor, type: 'blockquote' | 'code_block', active: boolean) {
  setEditorBlockType(editor, active ? 'p' : type);
}

export function toggleEditorList(editor: PlateEditor, listStyleType: 'disc' | 'decimal') {
  toggleList(editor, { listStyleType });
  editor.tf.focus();
}

/**
 * Insert a thematic break plus a fresh paragraph after the current block.
 * Splitting the current block instead would move the cursor and leave an
 * encoded space in the serialized Markdown.
 */
export function insertEditorDivider(editor: PlateEditor) {
  const entry = editor.api.block();
  if (!entry) return;
  const next = [entry[1][0] + 1];
  editor.tf.insertNodes(
    [
      { type: 'hr', children: [{ text: '' }] },
      { type: 'p', children: [{ text: '' }] },
    ] as never,
    { at: next },
  );
  editor.tf.focus();
}
