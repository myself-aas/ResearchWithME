'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { RenderElementProps, RenderLeafProps } from 'platejs';
import type { PlateEditor } from 'platejs/react';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import { MarkdownPlugin } from '@platejs/markdown';
import { unwrapLink, upsertLink } from '@platejs/link';
import { Eye, FileCode2 } from 'lucide-react';
import { canEditVisually } from '@/lib/editor/plate-markdown';
import { editorPlugins } from '@/lib/editor/plate-client-plugins';
import { sanitizeMdxUrl } from '@/lib/v34/mdx-security';
import {
  insertEditorDivider,
  setEditorBlockType,
  toggleEditorList,
  type EditorBlockType,
} from '@/lib/editor/plate-actions';
import type { EditorBlock } from '@/lib/editor/block-catalog';
import EditorToolbar from './EditorToolbar';
import BlockPalette from './BlockPalette';
import EditorInsertFab from './EditorInsertFab';
import LinkDialog from './LinkDialog';

interface Props {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  onUploadImage?: (file: File) => Promise<string>;
}

function renderElement({ attributes, children, element }: RenderElementProps) {
  const type = element.type;
  const listStyle = element.listStyleType;
  const listProps = listStyle
    ? {
        style: {
          display: 'list-item',
          listStyleType: String(listStyle),
          marginLeft: `${Number(element.indent || 1) * 1.5}rem`,
        },
      }
    : {};
  switch (type) {
    case 'h1':
      return (
        <h1 {...attributes} {...listProps} className="mb-3 mt-6 font-serif text-3xl font-semibold">
          {children}
        </h1>
      );
    case 'h2':
      return (
        <h2 {...attributes} {...listProps} className="mb-3 mt-6 font-serif text-2xl font-semibold">
          {children}
        </h2>
      );
    case 'h3':
      return (
        <h3 {...attributes} {...listProps} className="mb-2 mt-5 font-serif text-xl font-semibold">
          {children}
        </h3>
      );
    case 'h4':
      return (
        <h4 {...attributes} {...listProps} className="mb-2 mt-4 font-serif text-lg font-semibold">
          {children}
        </h4>
      );
    case 'h5':
      return (
        <h5 {...attributes} {...listProps} className="mb-2 mt-4 font-sans text-base font-semibold">
          {children}
        </h5>
      );
    case 'h6':
      return (
        <h6 {...attributes} {...listProps} className="mb-2 mt-4 font-sans text-sm font-semibold uppercase tracking-wide">
          {children}
        </h6>
      );
    case 'blockquote':
      return (
        <blockquote {...attributes} {...listProps} className="my-4 border-l-2 border-border-strong pl-4 text-ink-secondary">
          {children}
        </blockquote>
      );
    case 'code_block':
      return (
        <pre {...attributes} className="my-4 overflow-x-auto rounded-xl bg-surface p-4 font-mono text-sm">
          <code>{children}</code>
        </pre>
      );
    case 'code_line':
      return <div {...attributes}>{children}</div>;
    case 'hr':
      return (
        <div {...attributes}>
          <hr className="my-5 border-line" />
          {children}
        </div>
      );
    default:
      return (
        <p {...attributes} {...listProps} className="mb-3 min-h-[1.6em]">
          {children}
        </p>
      );
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

function textareaHint(mode: 'visual' | 'source') {
  return mode === 'visual'
    ? 'Standard Markdown edits in place. Tables, equations, diagrams, images, and MDX blocks open in Markdown source so their syntax stays exact.'
    : 'Markdown source. Use Insert block for every heading, structural block, and allowlisted MDX component.';
}

export default function PlateBodyEditor(props: Props) {
  const { onChange } = props;
  const [mode, setMode] = useState<'visual' | 'source'>(() => (canEditVisually(props.value) ? 'visual' : 'source'));
  const [notice, setNotice] = useState(() =>
    canEditVisually(props.value)
      ? ''
      : 'This draft contains Markdown that the visual editor cannot safely represent. Source mode preserves it.',
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkExisting, setLinkExisting] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastValue = useRef(props.value);
  const emitted = useRef(props.value);
  const externalValue = useRef<string | null>(null);
  const sourceSelection = useRef<{ start: number; end: number } | null>(null);
  const pendingSelection = useRef<number | null>(null);
  const linkSelection = useRef<PlateEditor['selection']>(null);

  const editor = usePlateEditor({
    plugins: editorPlugins,
    value: (instance) => instance.getApi(MarkdownPlugin).markdown.deserialize(props.value),
  });

  useEffect(() => {
    if (props.value === lastValue.current) return;
    lastValue.current = props.value;

    if (mode === 'visual' && !canEditVisually(props.value)) {
      setMode('source');
      setNotice('This draft now contains Markdown that the visual editor cannot safely represent. Source mode preserves it.');
    }

    if (canEditVisually(props.value) && props.value !== emitted.current) {
      emitted.current = props.value;
      editor.tf.setValue(editor.getApi(MarkdownPlugin).markdown.deserialize(props.value));
      externalValue.current = editor.getApi(MarkdownPlugin).markdown.serialize();
    }
  }, [editor, mode, props.value]);

  useEffect(() => {
    if (mode !== 'source' || pendingSelection.current === null) return;
    const position = pendingSelection.current;
    pendingSelection.current = null;
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(position, position);
  }, [mode, props.value]);

  const change = useCallback(() => {
    const next = editor.getApi(MarkdownPlugin).markdown.serialize();
    if (externalValue.current === next) {
      externalValue.current = null;
      return;
    }
    externalValue.current = null;
    emitted.current = next;
    lastValue.current = next;
    onChange(next);
  }, [editor, onChange]);

  function handleChange(next: string) {
    lastValue.current = next;
    emitted.current = next;
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

  function insertSource(snippet: string, label: string) {
    if (!snippet) return;
    const selection = mode === 'source' ? sourceSelection.current : null;
    const at = selection ? selection.start : props.value.length;
    const before = props.value.slice(0, at);
    const after = props.value.slice(at);
    const prefix = before.length === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const suffix = after.length === 0 || after.startsWith('\n') ? '' : '\n\n';
    const next = `${before}${prefix}${snippet}${suffix}${after}`;

    handleChange(next);
    setMode('source');
    setNotice(`${label} inserted in Markdown mode. Replace the placeholder text, then return to Visual for standard Markdown.`);
    pendingSelection.current = at + prefix.length + snippet.length;
    sourceSelection.current = null;
  }

  function applyVisualBlock(block: EditorBlock) {
    switch (block.kind) {
      case 'paragraph':
        setEditorBlockType(editor, 'p');
        return;
      case 'heading':
        setEditorBlockType(editor, (`h${block.level ?? 2}`) as EditorBlockType);
        return;
      case 'bullet':
        toggleEditorList(editor, 'disc');
        return;
      case 'number':
        toggleEditorList(editor, 'decimal');
        return;
      case 'quote':
        setEditorBlockType(editor, 'blockquote');
        return;
      case 'code':
        setEditorBlockType(editor, 'code_block');
        return;
      case 'divider':
        insertEditorDivider(editor);
        return;
      default:
        if (block.snippet) insertSource(block.snippet, block.label);
    }
  }

  function handleInsertBlock(block: EditorBlock) {
    if (block.kind === 'image' && props.onUploadImage) {
      fileInputRef.current?.click();
      return;
    }
    if (mode === 'visual') {
      applyVisualBlock(block);
      return;
    }
    if (block.snippet) insertSource(block.snippet, block.label);
  }

  async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !props.onUploadImage) return;
    setUploadingImage(true);
    setNotice('');
    try {
      const url = await props.onUploadImage(file);
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Figure';
      insertSource(`![${alt}](${url})\n`, 'Image');
    } catch (uploadError) {
      setNotice(uploadError instanceof Error ? uploadError.message : 'Image upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  }

  function openLinkDialog() {
    const selection = editor.selection;
    linkSelection.current = selection ? { ...selection } : null;
    const selected = selection && !editor.api.isCollapsed() ? editor.api.string(selection) : '';
    setLinkText(selected);
    const link = selection
      ? editor.api.node({ at: selection, match: (node) => (node as { type?: string }).type === 'a' })
      : undefined;
    const linkNode = link?.[0] as { url?: string } | undefined;
    setLinkUrl(typeof linkNode?.url === 'string' ? sanitizeMdxUrl(linkNode.url) ?? '' : '');
    setLinkExisting(Boolean(link));
    setLinkOpen(true);
  }

  function submitLink(url: string, text: string) {
    if (linkSelection.current) {
      editor.tf.select(linkSelection.current);
    } else if (!editor.selection) {
      // The toolbar can open the dialog before the writing surface has focus.
      editor.tf.select(editor.api.end([]));
    }
    upsertLink(editor, { url, text });
    editor.tf.focus();
    setLinkOpen(false);
    linkSelection.current = null;
  }

  function removeLink() {
    if (linkSelection.current) {
      editor.tf.select(linkSelection.current);
      unwrapLink(editor);
      editor.tf.focus();
    }
    setLinkOpen(false);
    linkSelection.current = null;
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented || props.disabled) return;
    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openLinkDialog();
      return;
    }
    if (event.altKey && /^[1-6]$/.test(event.key)) {
      event.preventDefault();
      setEditorBlockType(editor, `h${event.key}` as EditorBlockType);
      return;
    }
    if (event.key === '/' && !mod && !event.altKey) {
      const entry = editor.api.block();
      if (entry && editor.api.string(entry[1]).trim() === '') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }
  }

  const words = props.value.trim() ? props.value.trim().split(/\s+/).length : 0;
  const readMinutes = Math.max(1, Math.round(words / 220));

  return (
    <div className="space-y-2">
      {!props.label && (
        <span id={`${props.id}-label`} className="sr-only">
          Rich text body
        </span>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Body editor mode" className="inline-flex gap-1 rounded-full border border-line bg-surface-subtle p-1">
          {(['visual', 'source'] as const).map((item) => {
            const Icon = item === 'visual' ? Eye : FileCode2;
            return (
              <button
                key={item}
                type="button"
                disabled={props.disabled}
                aria-pressed={mode === item}
                onClick={() => switchMode(item)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  mode === item ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item === 'visual' ? 'Visual' : 'Markdown'}
              </button>
            );
          })}
        </div>
        <span className="text-sm text-ink-secondary">
          {uploadingImage
            ? 'Uploading image…'
            : `Saved as Markdown${words > 0 ? ` · ${words} words · ${readMinutes} min read` : ''}`}
        </span>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-line bg-surface-subtle px-3 py-2 text-sm leading-relaxed text-ink-secondary">
          {notice}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleImageSelected}
        className="sr-only"
        aria-label="Upload body image"
      />

      <div
        className={`rounded-2xl border bg-surface-raised ${props.error ? 'border-destructive' : 'border-border-strong'} ${
          props.disabled ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        {mode === 'visual' ? (
          <Plate editor={editor} onValueChange={change}>
            <div className="lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
              <div className="rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none">
                <EditorToolbar editor={editor} onOpenLink={openLinkDialog} disabled={props.disabled} />
              </div>
              <PlateContent
                id={props.id}
                role="textbox"
                aria-multiline="true"
                aria-labelledby={`${props.id}-label`}
                aria-describedby={`${props.id}-hint${props.error ? ` ${props.id}-error` : ''}`}
                aria-invalid={Boolean(props.error)}
                placeholder="Start writing, or type / to insert a block…"
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                onKeyDown={handleEditorKeyDown}
                className="min-h-[420px] p-4 font-serif text-base leading-relaxed text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:p-6 sm:text-lg"
              />
            </div>
          </Plate>
        ) : (
          <textarea
            ref={textareaRef}
            id={props.id}
            disabled={props.disabled}
            aria-labelledby={`${props.id}-label`}
            aria-describedby={`${props.id}-hint${props.error ? ` ${props.id}-error` : ''}`}
            aria-invalid={Boolean(props.error)}
            value={props.value}
            onChange={(event) => handleChange(event.target.value)}
            onSelect={(event) => {
              sourceSelection.current = {
                start: event.currentTarget.selectionStart,
                end: event.currentTarget.selectionEnd,
              };
            }}
            onClick={(event) => {
              sourceSelection.current = {
                start: event.currentTarget.selectionStart,
                end: event.currentTarget.selectionEnd,
              };
            }}
            onKeyUp={(event) => {
              sourceSelection.current = {
                start: event.currentTarget.selectionStart,
                end: event.currentTarget.selectionEnd,
              };
            }}
            className="min-h-[420px] w-full resize-y rounded-2xl bg-surface-raised p-4 font-mono text-base leading-relaxed text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
          />
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <p id={`${props.id}-hint`} className="max-w-2xl text-sm leading-relaxed text-ink-secondary">
          {textareaHint(mode)} Paste keeps supported structure (headings, lists, links, emphasis) and drops unsupported styling.
        </p>
        <p className="text-sm text-ink-secondary" aria-live="polite">
          {mode === 'visual' ? 'Rich text' : 'Markdown source'}
          {words > 0 ? ` · ${words} words` : ''}
        </p>
      </div>

      {props.error && (
        <p id={`${props.id}-error`} role="alert" className="text-sm text-destructive">
          {props.error}
        </p>
      )}

      {/* Keeps the fixed insertion FAB from covering the last field on phones. */}
      <div aria-hidden="true" className="h-16 lg:h-0" />

      <EditorInsertFab
        onOpenPalette={() => setPaletteOpen(true)}
        onInsert={handleInsertBlock}
        canUploadImage={Boolean(props.onUploadImage)}
      />

      <BlockPalette
        open={paletteOpen}
        mode={mode}
        canUploadImage={Boolean(props.onUploadImage)}
        onClose={() => setPaletteOpen(false)}
        onInsert={handleInsertBlock}
      />

      <LinkDialog
        open={linkOpen}
        initialText={linkText}
        initialUrl={linkUrl}
        isExistingLink={linkExisting}
        onClose={() => {
          setLinkOpen(false);
          linkSelection.current = null;
          setLinkUrl('');
        }}
        onSubmit={submitLink}
        onRemove={removeLink}
      />
    </div>
  );
}
