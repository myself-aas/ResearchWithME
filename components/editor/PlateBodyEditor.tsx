'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RenderElementProps, RenderLeafProps } from 'platejs';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import { MarkdownPlugin } from '@platejs/markdown';
import { toggleList } from '@platejs/list';
import { Bold, Italic, List, ListOrdered, Code2, Quote, Undo2, Redo2 } from 'lucide-react';
import { canEditVisually, platePlugins } from '@/lib/editor/plate-markdown';

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function renderElement({ attributes, children, element }: RenderElementProps) {
  const type = element.type;
  const listStyle = element.listStyleType;
  const listProps = listStyle ? { style: { display: 'list-item', listStyleType: String(listStyle), marginLeft: `${Number(element.indent || 1) * 1.5}rem` } } : {};
  switch (type) {
    case 'h1': return <h1 {...attributes} {...listProps} className="mb-3 mt-5 font-serif text-3xl font-semibold">{children}</h1>;
    case 'h2': return <h2 {...attributes} {...listProps} className="mb-3 mt-5 font-serif text-2xl font-semibold">{children}</h2>;
    case 'h3': return <h3 {...attributes} {...listProps} className="mb-2 mt-4 font-serif text-xl font-semibold">{children}</h3>;
    case 'h4': case 'h5': case 'h6': return <h4 {...attributes} {...listProps} className="mb-2 mt-4 font-serif text-lg font-semibold">{children}</h4>;
    case 'blockquote': return <blockquote {...attributes} {...listProps} className="my-4 border-l-2 border-border-strong pl-4 text-ink-secondary">{children}</blockquote>;
    case 'a': return <a {...attributes} href={typeof element.url === 'string' && /^(https?:|mailto:|\/|#)/i.test(element.url) ? element.url : undefined} className="text-brand underline">{children}</a>;
    case 'code_block': return <pre {...attributes} className="my-4 overflow-x-auto rounded-md bg-surface p-4 font-mono text-sm"><code>{children}</code></pre>;
    case 'code_line': return <div {...attributes}>{children}</div>;
    case 'hr': return <div {...attributes}><hr className="my-4 border-line" />{children}</div>;
    default: return <p {...attributes} {...listProps} className="mb-3 min-h-[1.6em]">{children}</p>;
  }
}

function renderLeaf({ attributes, children, leaf }: RenderLeafProps) {
  let content = children;
  if (leaf.bold) content = <strong>{content}</strong>;
  if (leaf.italic) content = <em>{content}</em>;
  if (leaf.strikethrough) content = <s>{content}</s>;
  if (leaf.code) content = <code className="rounded-sm bg-surface px-1 font-mono text-sm">{content}</code>;
  return <span {...attributes}>{content}</span>;
}

function VisualEditor({ id, value, onChange, error }: Props) {
  const emitted = useRef(value);
  const externalValue = useRef<string | null>(null);
  const editor = usePlateEditor({
    plugins: platePlugins,
    value: (instance) => instance.getApi(MarkdownPlugin).markdown.deserialize(value),
  });

  // Draft restore and discard come from outside Plate; do not reset selection
  // for updates that originated from the editor itself.
  useEffect(() => {
    if (value !== emitted.current && canEditVisually(value)) {
      emitted.current = value;
      editor.tf.setValue(editor.getApi(MarkdownPlugin).markdown.deserialize(value));
      externalValue.current = editor.getApi(MarkdownPlugin).markdown.serialize();
    }
  }, [editor, value]);

  const change = useCallback(() => {
    const next = editor.getApi(MarkdownPlugin).markdown.serialize();
    if (externalValue.current === next) {
      externalValue.current = null;
      return;
    }
    externalValue.current = null;
    emitted.current = next;
    onChange(next);
  }, [editor, onChange]);

  const buttonClass = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-ink-secondary hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
  const actions = [
    { label: 'Undo', icon: Undo2, action: () => editor.tf.undo() },
    { label: 'Redo', icon: Redo2, action: () => editor.tf.redo() },
    { label: 'Bold', icon: Bold, action: () => editor.tf.toggleMark('bold') },
    { label: 'Italic', icon: Italic, action: () => editor.tf.toggleMark('italic') },
    { label: 'Inline code', icon: Code2, action: () => editor.tf.toggleMark('code') },
    { label: 'Block quote', icon: Quote, action: () => editor.tf.setNodes({ type: 'blockquote' }) },
    { label: 'Bulleted list', icon: List, action: () => toggleList(editor, { listStyleType: 'disc' }) },
    { label: 'Numbered list', icon: ListOrdered, action: () => toggleList(editor, { listStyleType: 'decimal' }) },
  ];

  return (
    <Plate editor={editor} onValueChange={change}>
      <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap items-center gap-1 border-b border-line bg-surface px-2 py-1">
        <label htmlFor={`${id}-block`} className="sr-only">Paragraph style</label>
        <select id={`${id}-block`} defaultValue="p" onChange={(event) => { editor.tf.setNodes({ type: event.target.value }); editor.tf.focus(); }} className="min-h-11 rounded-sm border border-line bg-surface-raised px-2 text-sm text-ink">
          <option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option>
        </select>
        {actions.map(({ label, icon: Icon, action }) => (
          <button key={label} type="button" aria-label={label} title={label} className={buttonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => { action(); editor.tf.focus(); }}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
      </div>
      <PlateContent id={id} role="textbox" aria-multiline="true" aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} aria-invalid={Boolean(error)} placeholder="Start writing your article…" renderElement={renderElement} renderLeaf={renderLeaf} className="min-h-[400px] p-4 font-serif text-base leading-relaxed text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:text-lg" />
    </Plate>
  );
}

export default function PlateBodyEditor(props: Props) {
  const [mode, setMode] = useState<'visual' | 'source'>(() => canEditVisually(props.value) ? 'visual' : 'source');
  const [notice, setNotice] = useState(() => canEditVisually(props.value) ? '' : 'This draft contains Markdown that the visual editor cannot safely represent. Source mode preserves it.');
  const lastValue = useRef(props.value);

  useEffect(() => {
    if (props.value !== lastValue.current) {
      lastValue.current = props.value;
      if (mode === 'visual' && !canEditVisually(props.value)) {
        setMode('source');
        setNotice('This draft contains Markdown that the visual editor cannot safely represent. Source mode preserves it.');
      }
    }
  }, [props.value, mode]);

  function handleChange(next: string) {
    lastValue.current = next;
    props.onChange(next);
  }

  function switchMode(next: 'visual' | 'source') {
    if (next === 'visual' && !canEditVisually(props.value)) {
      setNotice('Visual mode cannot safely represent this Markdown. Continue in source mode to preserve it.');
      return;
    }
    setNotice('');
    setMode(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Body editor mode" className="flex gap-1 rounded-md border border-line bg-surface p-1">
          {(['visual', 'source'] as const).map((item) => <button key={item} type="button" aria-pressed={mode === item} onClick={() => switchMode(item)} className={`min-h-11 rounded-sm px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand ${mode === item ? 'bg-surface-raised text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'}`}>{item === 'visual' ? 'Visual' : 'Markdown'}</button>)}
        </div>
        <span className="text-sm text-ink-secondary">Saved as Markdown</span>
      </div>
      {notice && <p role="status" className="text-sm text-ink-secondary">{notice}</p>}
      <div className={`overflow-hidden rounded-md border bg-surface-raised ${props.error ? 'border-destructive' : 'border-border-strong'}`}>
        {mode === 'visual' ? <VisualEditor {...props} onChange={handleChange} /> : <textarea id={props.id} aria-labelledby={`${props.id}-label`} aria-describedby={`${props.id}-hint${props.error ? ` ${props.id}-error` : ''}`} aria-invalid={Boolean(props.error)} value={props.value} onChange={(event) => handleChange(event.target.value)} className="min-h-[400px] w-full resize-y bg-surface-raised p-4 font-mono text-base leading-relaxed text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand" />}
      </div>
      <p id={`${props.id}-hint`} className="text-sm text-ink-secondary">Use Markdown mode for images, tables, links, and advanced syntax. Your draft stays in this browser until published.</p>
      {props.error && <p id={`${props.id}-error`} role="alert" className="text-sm text-destructive">{props.error}</p>}
    </div>
  );
}
