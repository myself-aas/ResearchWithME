'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Code2,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Upload,
} from 'lucide-react';
import MarkdownBody from '@/components/MarkdownBody';
import { uploadBlogImage, validateImageFile } from '@/lib/supabase/storage';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { cn } from '@/lib/utils';
import { fieldClass, hintClass, inlineErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from './styles';

interface MarkdownEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

const toolbarButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50';

function isSafeImageUrl(value: string) {
  return /^https?:\/\//i.test(value) || /^\/images\/[a-z0-9][a-z0-9._-]*$/i.test(value);
}

export default function MarkdownEditor({ id, value, onChange, error, disabled = false }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [panel, setPanel] = useState<'link' | 'image' | null>(null);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [panelError, setPanelError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (error) setView('write');
  }, [error]);

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const readMinutes = Math.max(1, Math.round(words / 220));

  function selection() {
    const textarea = textareaRef.current;
    return {
      start: textarea?.selectionStart ?? value.length,
      end: textarea?.selectionEnd ?? value.length,
    };
  }

  function apply(next: string, start: number, end: number) {
    onChange(next);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  }

  function wrap(before: string, after: string, placeholder: string) {
    if (disabled) return;
    const { start, end } = selection();
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    apply(next, start + before.length, start + before.length + selected.length);
  }

  function prefixLines(prefix: string) {
    if (disabled) return;
    const { start, end } = selection();
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const newlineAfter = value.indexOf('\n', end);
    const lineEnd = newlineAfter === -1 ? value.length : newlineAfter;
    const lines = value.slice(lineStart, lineEnd).split('\n');
    const allPrefixed = lines.every((line) => line.startsWith(prefix));

    const nextBlock = lines
      .map((line) => {
        if (allPrefixed) return line.slice(prefix.length);
        return line ? `${prefix}${line}` : line;
      })
      .join('\n');

    const next = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`;
    apply(next, lineStart, lineStart + nextBlock.length);
  }

  function insertBlock(markdown: string) {
    const { start, end } = selection();
    const before = start > 0 && !value.slice(0, start).endsWith('\n') ? '\n\n' : '';
    const after = end < value.length && !value.slice(end).startsWith('\n') ? '\n\n' : '';
    const next = `${value.slice(0, start)}${before}${markdown}${after}${value.slice(end)}`;
    const blockStart = start + before.length;
    apply(next, blockStart, blockStart + markdown.length);
  }

  function togglePanel(next: 'link' | 'image') {
    setPanel((current) => (current === next ? null : next));
    setPanelError(null);
    setLinkText('');
    setLinkUrl('');
    setImageAlt('');
    setImageUrl('');
  }

  function insertLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = linkText.trim();
    const url = linkUrl.trim();

    if (!text) {
      setPanelError('Add the words that should be linked.');
      return;
    }
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/') && !url.startsWith('#')) {
      setPanelError('The address must start with https://, http://, /, or #.');
      return;
    }

    insertBlock(`[${text}](${url})`);
    setPanel(null);
    setPanelError(null);
  }

  function insertImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = imageUrl.trim();
    const alt = imageAlt.trim() || 'Illustration';

    if (!isSafeImageUrl(url)) {
      setPanelError('Use a public https image URL, or upload an image first.');
      return;
    }

    insertBlock(`![${alt}](${url})`);
    setPanel(null);
    setPanelError(null);
  }

  async function uploadImage(file: File) {
    const problem = validateImageFile(file);
    if (problem) {
      setPanelError(problem);
      return;
    }

    setUploading(true);
    setPanelError(null);
    try {
      const url = await uploadBlogImage(file);
      setImageUrl(url);
    } catch (cause) {
      setPanelError(cause instanceof Error ? cause.message : 'The image could not be uploaded.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {view === 'write' ? (
          <label htmlFor={id} className={labelClass}>
            Article body
          </label>
        ) : (
          <p className={labelClass}>Article body preview</p>
        )}

        <div role="group" aria-label="Editor view" className="inline-flex rounded-md border border-stone-300 bg-white p-0.5">
          <button
            type="button"
            aria-pressed={view === 'write'}
            onClick={() => setView('write')}
            className={cn(
              'min-h-9 rounded px-3 text-sm font-medium transition-colors',
              view === 'write' ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100',
            )}
          >
            Write
          </button>
          <button
            type="button"
            aria-pressed={view === 'preview'}
            onClick={() => setView('preview')}
            className={cn(
              'min-h-9 rounded px-3 text-sm font-medium transition-colors',
              view === 'preview' ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100',
            )}
          >
            Preview
          </button>
        </div>
      </div>

      {view === 'write' ? (
        <>
          <div
            role="group"
            aria-label="Formatting tools"
            aria-controls={id}
            className="mt-2 flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 border-stone-300 bg-stone-100 p-1.5"
          >
            <button type="button" className={toolbarButtonClass} onClick={() => wrap('**', '**', 'bold text')} disabled={disabled} aria-label="Bold">
              <Bold className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={toolbarButtonClass} onClick={() => wrap('_', '_', 'italic text')} disabled={disabled} aria-label="Italic">
              <Italic className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={toolbarButtonClass} onClick={() => prefixLines('## ')} disabled={disabled} aria-label="Heading level 2">
              <Heading2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-stone-300" />
            <button type="button" className={toolbarButtonClass} onClick={() => prefixLines('- ')} disabled={disabled} aria-label="Bulleted list">
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={toolbarButtonClass} onClick={() => prefixLines('1. ')} disabled={disabled} aria-label="Numbered list">
              <ListOrdered className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={toolbarButtonClass} onClick={() => prefixLines('> ')} disabled={disabled} aria-label="Block quote">
              <Quote className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={toolbarButtonClass} onClick={() => wrap('`', '`', 'code')} disabled={disabled} aria-label="Inline code">
              <Code2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-stone-300" />
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => togglePanel('link')}
              disabled={disabled}
              aria-label="Insert link"
              aria-expanded={panel === 'link'}
              aria-controls={`${id}-link-panel`}
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => togglePanel('image')}
              disabled={disabled}
              aria-label="Insert image"
              aria-expanded={panel === 'image'}
              aria-controls={`${id}-image-panel`}
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            id={id}
            rows={22}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            spellCheck
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
            placeholder={'Write the analysis. Use blank lines between paragraphs.\n\nMarkdown supports headings, lists, links, and images.'}
            className={cn(
              'w-full rounded-b-md border border-stone-300 bg-white px-3 py-3 font-mono text-sm leading-relaxed text-stone-900 placeholder:text-stone-600',
              error && 'border-red-700',
            )}
          />

          {panel === 'link' && (
            <form
              id={`${id}-link-panel`}
              onSubmit={insertLink}
              className="mt-3 rounded-md border border-stone-300 bg-stone-50 p-3"
            >
              <p className="text-sm font-semibold text-stone-900">Insert a link</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${id}-link-text`} className={labelClass}>
                    Link text
                  </label>
                  <input
                    id={`${id}-link-text`}
                    type="text"
                    value={linkText}
                    onChange={(event) => setLinkText(event.target.value)}
                    className={fieldClass}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-link-url`} className={labelClass}>
                    Address
                  </label>
                  <input
                    id={`${id}-link-url`}
                    type="text"
                    inputMode="url"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://doi.org/…"
                    className={cn(fieldClass, 'font-mono')}
                    autoComplete="off"
                  />
                </div>
              </div>
              {panelError && (
                <p role="alert" className={inlineErrorClass}>
                  {panelError}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="submit" className={primaryButtonClass}>
                  Insert link
                </button>
                <button type="button" onClick={() => setPanel(null)} className={secondaryButtonClass}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {panel === 'image' && (
            <form
              id={`${id}-image-panel`}
              onSubmit={insertImage}
              className="mt-3 rounded-md border border-stone-300 bg-stone-50 p-3"
            >
              <p className="text-sm font-semibold text-stone-900">Insert an image</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${id}-image-alt`} className={labelClass}>
                    Alternative text
                  </label>
                  <input
                    id={`${id}-image-alt`}
                    type="text"
                    value={imageAlt}
                    onChange={(event) => setImageAlt(event.target.value)}
                    placeholder="What the image shows"
                    className={fieldClass}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-image-url`} className={labelClass}>
                    Image URL
                  </label>
                  <input
                    id={`${id}-image-url`}
                    type="text"
                    inputMode="url"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="https://…"
                    className={cn(fieldClass, 'font-mono')}
                    autoComplete="off"
                  />
                </div>
              </div>

              {isSupabaseConfigured ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    className="hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={secondaryButtonClass}
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    <span>{uploading ? 'Uploading…' : 'Upload an image'}</span>
                  </button>
                  <span className="text-sm text-stone-600">JPEG, PNG, WebP, AVIF, or GIF up to 5 MB.</span>
                </div>
              ) : (
                <p className={hintClass}>
                  Image uploads need Supabase Storage. In local demo mode, use a public image URL or a bundled
                  <code className="mx-1 font-mono">/images/</code> path.
                </p>
              )}

              {panelError && (
                <p role="alert" className={inlineErrorClass}>
                  {panelError}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="submit" className={primaryButtonClass}>
                  Insert image
                </button>
                <button type="button" onClick={() => setPanel(null)} className={secondaryButtonClass}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        <div
          id={`${id}-preview`}
          role="region"
          aria-label="Article preview"
          className="mt-2 min-h-[22rem] rounded-md border border-stone-300 bg-white p-5"
        >
          {value.trim() ? (
            <MarkdownBody markdown={value} />
          ) : (
            <p className="text-base text-stone-600">
              Nothing to preview yet. Write a paragraph in the editor, then switch back.
            </p>
          )}
        </div>
      )}

      <p id={`${id}-hint`} className={cn(hintClass, 'flex flex-wrap justify-between gap-2')}>
        <span>Markdown is supported. Raw HTML is ignored for security.</span>
        <span>
          {words.toLocaleString('en-US')} {words === 1 ? 'word' : 'words'} · about {readMinutes} min read
        </span>
      </p>

      {error && (
        <p id={`${id}-error`} role="alert" className={inlineErrorClass}>
          {error}
        </p>
      )}
    </div>
  );
}
