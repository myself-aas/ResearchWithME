'use client';

import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CodeToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  Separator,
  tablePlugin,
  linkPlugin,
  imagePlugin,
  linkDialogPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  ConditionalContents,
  ChangeCodeMirrorLanguage,
  InsertCodeBlock,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { uploadBlogImage } from '@/lib/supabase/storage';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { labelClass, inlineErrorClass, hintClass } from './styles';

interface MarkdownEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function MarkdownEditor({ id, value, onChange, error, disabled = false }: MarkdownEditorProps) {
  const ref = useRef<MDXEditorMethods>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate stats
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const readMinutes = Math.max(1, Math.round(words / 220));

  if (!mounted) {
    return <div className="h-[500px] bg-stone-100 animate-pulse rounded-md border border-stone-300" />;
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className={labelClass}>
        Article body
      </label>
      
      <div className={cn(
        "prose prose-stone max-w-none border rounded-md bg-white min-h-[500px] overflow-hidden",
        error ? "border-red-700" : "border-stone-300",
        disabled && "opacity-50 pointer-events-none"
      )}>
        <MDXEditor
          ref={ref}
          markdown={value}
          onChange={onChange}
          readOnly={disabled}
          contentEditableClassName="min-h-[450px] p-4 focus:outline-none"
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            imagePlugin({
              imageUploadHandler: async (file) => {
                if (isSupabaseConfigured) {
                  try {
                    return await uploadBlogImage(file);
                  } catch (e) {
                    console.error('Upload failed', e);
                    return URL.createObjectURL(file);
                  }
                }
                return URL.createObjectURL(file);
              },
            }),
            tablePlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
            codeMirrorPlugin({
              codeBlockLanguages: {
                js: 'JavaScript',
                ts: 'TypeScript',
                css: 'CSS',
                html: 'HTML',
                python: 'Python',
                rust: 'Rust',
                bash: 'Bash',
                json: 'JSON',
              },
            }),
            markdownShortcutPlugin(),
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <Separator />
                  <BlockTypeSelect />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <Separator />
                  <ListsToggle />
                  <Separator />
                  <CreateLink />
                  <InsertImage />
                  <Separator />
                  <InsertTable />
                  <InsertThematicBreak />
                  <Separator />
                  <ConditionalContents
                    options={[
                      {
                        when: (editor) => editor?.editorType === 'codeblock',
                        contents: () => <ChangeCodeMirrorLanguage />,
                      },
                      {
                        fallback: () => <InsertCodeBlock />,
                      },
                    ]}
                  />
                </>
              ),
            }),
          ]}
        />
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <p id={`${id}-hint`} className={cn(hintClass, 'flex flex-wrap gap-2')}>
          <span>MDX/Markdown supported. Stats: {words.toLocaleString()} words · ~{readMinutes} min read</span>
        </p>
        {error && (
          <p id={`${id}-error`} role="alert" className={inlineErrorClass}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
