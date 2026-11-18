'use client';

import { useId, useRef, useState } from 'react';
import { Code2, Heading2, ImagePlus, LayoutGrid, List, Plus, Quote } from 'lucide-react';
import EditorMenu, { EditorMenuItem } from './EditorMenu';
import { EDITOR_BLOCKS, type EditorBlock } from '@/lib/editor/block-catalog';

interface EditorInsertFabProps {
  onOpenPalette: () => void;
  onInsert: (block: EditorBlock) => void;
  canUploadImage: boolean;
}

const QUICK_BLOCKS: Array<{ id: string; label: string; icon: typeof Heading2 }> = [
  { id: 'h2', label: 'Heading 2', icon: Heading2 },
  { id: 'bullet-list', label: 'Bulleted list', icon: List },
  { id: 'blockquote', label: 'Block quote', icon: Quote },
  { id: 'code-block', label: 'Code block', icon: Code2 },
  { id: 'image', label: 'Image', icon: ImagePlus },
];

/**
 * M3 insertion affordances.
 *
 * Mobile: a regular FAB opens a six-item FAB menu (five quick blocks + all
 * blocks). Desktop: an extended FAB goes straight to the searchable palette,
 * because a FAB menu must not be paired with an extended FAB.
 */
export default function EditorInsertFab({ onOpenPalette, onInsert, canUploadImage }: EditorInsertFabProps) {
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  function quickInsert(id: string) {
    setMenuOpen(false);
    const block = EDITOR_BLOCKS.find((item) => item.id === id);
    if (block) onInsert(block);
  }

  return (
    <>
      {/* Desktop: extended FAB */}
      <button
        type="button"
        data-testid="insert-block-extended-fab"
        aria-haspopup="dialog"
        onClick={onOpenPalette}
        className="fixed bottom-8 right-8 z-40 hidden min-h-14 items-center gap-2 rounded-2xl bg-brand px-5 font-sans text-sm font-semibold text-on-primary shadow-floating transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:inline-flex"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        Insert block
      </button>

      {/* Mobile: FAB + FAB menu */}
      <button
        ref={fabRef}
        type="button"
        data-testid="insert-block-fab"
        aria-label={menuOpen ? 'Close insert menu' : 'Insert block'}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        onClick={() => setMenuOpen((open) => !open)}
        className="fixed bottom-4 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-on-primary shadow-floating transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Plus
          className={`h-6 w-6 transition-transform motion-reduce:transition-none ${menuOpen ? 'rotate-45' : ''}`}
          aria-hidden="true"
        />
      </button>

      {menuOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 bg-ink/10 lg:hidden"
          />
          <EditorMenu
            id={menuId}
            label="Insert block"
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            triggerRef={fabRef}
            className="fixed bottom-24 right-4 w-60 lg:hidden"
          >
            {QUICK_BLOCKS.map(({ id, label, icon: Icon }) => (
              <EditorMenuItem
                key={id}
                icon={<Icon className="h-4 w-4" aria-hidden="true" />}
                onSelect={() => quickInsert(id)}
              >
                {id === 'image' && canUploadImage ? 'Upload image' : label}
              </EditorMenuItem>
            ))}
            <div className="my-1 h-px bg-line" />
            <EditorMenuItem
              icon={<LayoutGrid className="h-4 w-4" aria-hidden="true" />}
              onSelect={() => {
                setMenuOpen(false);
                onOpenPalette();
              }}
            >
              All blocks &amp; MDX
            </EditorMenuItem>
          </EditorMenu>
        </>
      )}
    </>
  );
}
