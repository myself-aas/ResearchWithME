'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { PlateEditor } from 'platejs/react';
import { useEditorVersion, useSelectionVersion } from 'platejs/react';
import {
  Bold,
  ChevronDown,
  Code2,
  Eraser,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react';
import EditorMenu, { EditorMenuItem } from './EditorMenu';
import { insertEditorDivider, setEditorBlockType, toggleEditorBlockType, toggleEditorList } from '@/lib/editor/plate-actions';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote' | 'code_block';

interface ToolbarState {
  blockType: string;
  listStyleType?: string;
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  code: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

function readState(editor: PlateEditor): ToolbarState {
  const entry = editor.api.block();
  const node = entry?.[0] as { type?: string; listStyleType?: string } | undefined;
  const history = (editor as unknown as { history?: { undos: unknown[]; redos: unknown[] } }).history;
  return {
    blockType: node?.type ?? 'p',
    listStyleType: node?.listStyleType,
    bold: editor.api.hasMark('bold'),
    italic: editor.api.hasMark('italic'),
    strikethrough: editor.api.hasMark('strikethrough'),
    code: editor.api.hasMark('code'),
    canUndo: Boolean(history?.undos.length),
    canRedo: Boolean(history?.redos.length),
  };
}

function ToolbarButton({
  label,
  icon,
  active,
  disabled,
  shortcut,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-toolbar-item
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={typeof active === 'boolean' ? active : undefined}
      aria-keyshortcuts={shortcut}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-35 ${
        active
          ? 'bg-brand text-on-primary hover:bg-brand-hover'
          : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
      }`}
    >
      {icon}
    </button>
  );
}

function Separator() {
  return <span aria-hidden="true" className="mx-1 h-7 w-px shrink-0 bg-line lg:mx-0 lg:my-1 lg:h-px lg:w-7" />;
}

function blockLabel(type: string) {
  if (/^h[1-6]$/.test(type)) return `H${type.slice(1)}`;
  if (type === 'p') return 'Text';
  if (type === 'blockquote') return 'Quote';
  if (type === 'code_block' || type === 'code_line') return 'Code';
  return 'Style';
}

/**
 * Dropdown menu component for mobile toolbar groups
 */
function DropdownMenu({
  label,
  triggerRef,
  children,
}: {
  label: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
}) {
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-toolbar-item
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        onClick={() => setMenuOpen((open) => !open)}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40 lg:hidden ${
          menuOpen ? 'bg-surface-subtle text-ink' : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
        }`}>
        <ChevronDown
          className={`h-4 w-4 transition-transform motion-reduce:transition-none ${menuOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <EditorMenu
        id={menuId}
        label={label}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        triggerRef={triggerRef}
        anchorRef={triggerRef}
        placement="bottom-start"
        className="w-52">
        {children}
      </EditorMenu>
    </div>
  );
}

/**
 * Responsive toolbar group that shows dropdown on mobile and regular buttons on desktop
 */
function ResponsiveToolbarGroup({
  label,
  mobileItems,
  desktopItems,
  triggerRef,
}: {
  label: string;
  mobileItems: React.ReactNode;
  desktopItems: React.ReactNode;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div role="group" aria-label={label} className="contents">
      {/* Mobile: Dropdown menu */}
      <DropdownMenu
        label={label}
        triggerRef={triggerRef}
      >
        {mobileItems}
      </DropdownMenu>
      {/* Desktop: Regular buttons */}
      <div className="hidden lg:flex lg:flex-col">
        {desktopItems}
      </div>
    </div>
  );
}

interface EditorToolbarProps {
  editor: PlateEditor;
  onOpenLink: () => void;
  disabled?: boolean;
}

/**
 * One toolbar, two orientations: a horizontal scroller above the writing
 * surface on phones/tablets, and a docked vertical rail beside it from `lg`.
 *
 * Groups follow the writing task (history → inline text → block style → lists
 * and structural blocks). Toggle buttons expose `aria-pressed`, every control
 * is 44px, and arrow keys move focus within the toolbar.
 */
export default function EditorToolbar({ editor, onOpenLink, disabled = false }: EditorToolbarProps) {
  // The two version hooks intentionally re-render this toolbar on value and
  // selection changes; reading the state on render keeps it in sync.
  useEditorVersion();
  useSelectionVersion();
  const state = readState(editor);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const headingLevel = /^h[1-6]$/.test(state.blockType) ? (Number(state.blockType.slice(1)) as HeadingLevel) : null;

  function applyBlock(type: BlockType) {
    setEditorBlockType(editor, type);
  }

  function toggleHeading() {
    applyBlock(headingLevel ? 'p' : 'h2');
  }

  function toggleBlockType(type: 'blockquote' | 'code_block', current: boolean) {
    toggleEditorBlockType(editor, type, current);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[role="menu"]')) return;
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[data-toolbar-item]:not([disabled])'),
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowRight' || event.key === 'ArrowDown'
            ? (index + 1) % items.length
            : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      onKeyDown={onKeyDown}
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-surface px-2 py-1.5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:flex-col lg:items-stretch lg:self-start lg:overflow-y-auto lg:overflow-x-visible lg:border-b-0 lg:border-r lg:px-1.5 lg:py-2"
    >
      <ResponsiveToolbarGroup
        label="History"
        triggerRef={useRef<HTMLButtonElement | null>(null)}
        mobileItems={(
          <>
            <EditorMenuItem
              onSelect={() => {
                editor.tf.undo();
                editor.tf.focus();
              }}
              disabled={disabled || !state.canUndo}
            >
              Undo
            </EditorMenuItem>
            <EditorMenuItem
              onSelect={() => {
                editor.tf.redo();
                editor.tf.focus();
              }}
              disabled={disabled || !state.canRedo}
            >
              Redo
            </EditorMenuItem>
          </>
        )}
        desktopItems={(
          <>
            <ToolbarButton
              label="Undo"
              icon={<Undo2 className="h-4 w-4" aria-hidden="true" />}
              disabled={disabled || !state.canUndo}
              shortcut="Control+Z"
              onClick={() => {
                editor.tf.undo();
                editor.tf.focus();
              }}
            />
            <ToolbarButton
              label="Redo"
              icon={<Redo2 className="h-4 w-4" aria-hidden="true" />}
              disabled={disabled || !state.canRedo}
              shortcut="Control+Shift+Z"
              onClick={() => {
                editor.tf.redo();
                editor.tf.focus();
              }}
            />
          </>
        )}
      />

      <Separator />

      <ResponsiveToolbarGroup
        label="Text formatting"
        triggerRef={useRef<HTMLButtonElement | null>(null)}
        mobileItems={(
          <>
            <EditorMenuItem
              onSelect={() => {
                editor.tf.toggleMark('bold');
                editor.tf.focus();
              }}
              disabled={disabled}
              checked={state.bold}
            >
              Bold
            </EditorMenuItem>
            <EditorMenuItem
              onSelect={() => {
                editor.tf.toggleMark('italic');
                editor.tf.focus();
              }}
              disabled={disabled}
              checked={state.italic}
            >
              Italic
            </EditorMenuItem>
            <EditorMenuItem
              onSelect={() => {
                editor.tf.toggleMark('strikethrough');
                editor.tf.focus();
              }}
              disabled={disabled}
              checked={state.strikethrough}
            >
              Strikethrough
            </EditorMenuItem>
            <EditorMenuItem
              onSelect={() => {
                editor.tf.toggleMark('code');
                editor.tf.focus();
              }}
              disabled={disabled}
              checked={state.code}
            >
              Inline code
            </EditorMenuItem>
            <EditorMenuItem
              onSelect={onOpenLink}
              disabled={disabled}
            >
              Link
            </EditorMenuItem>
            <EditorMenuItem
              onSelect={() => {
                editor.tf.removeMarks();
                editor.tf.focus();
              }}
              disabled={disabled}
            >
              Clear formatting
            </EditorMenuItem>
          </>
        )}
        desktopItems={(
          <>
            <ToolbarButton
              label="Bold"
              icon={<Bold className="h-4 w-4" aria-hidden="true" />}
              active={state.bold}
              disabled={disabled}
              shortcut="Control+B"
              onClick={() => {
                editor.tf.toggleMark('bold');
                editor.tf.focus();
              }}
            />
            <ToolbarButton
              label="Italic"
              icon={<Italic className="h-4 w-4" aria-hidden="true" />}
              active={state.italic}
              disabled={disabled}
              shortcut="Control+I"
              onClick={() => {
                editor.tf.toggleMark('italic');
                editor.tf.focus();
              }}
            />
            <ToolbarButton
              label="Strikethrough"
              icon={<Strikethrough className="h-4 w-4" aria-hidden="true" />}
              active={state.strikethrough}
              disabled={disabled}
              onClick={() => {
                editor.tf.toggleMark('strikethrough');
                editor.tf.focus();
              }}
            />
            <ToolbarButton
              label="Inline code"
              icon={<Code2 className="h-4 w-4" aria-hidden="true" />}
              active={state.code}
              disabled={disabled}
              shortcut="Control+E"
              onClick={() => {
                editor.tf.toggleMark('code');
                editor.tf.focus();
              }}
            />
            <ToolbarButton
              label="Link"
              icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
              disabled={disabled}
              shortcut="Control+K"
              onClick={onOpenLink}
            />
            <ToolbarButton
              label="Clear formatting"
              icon={<Eraser className="h-4 w-4" aria-hidden="true" />}
              disabled={disabled}
              onClick={() => {
                editor.tf.removeMarks();
                editor.tf.focus();
              }}
            />
          </>
        )}
      />

      <Separator />

      <div className="relative flex shrink-0 items-center">
        <div className="inline-flex items-center overflow-hidden rounded-full border border-line">
          <button
            type="button"
            data-toolbar-item
            onMouseDown={(event) => event.preventDefault()}
            onClick={toggleHeading}
            disabled={disabled}
            aria-label={`Text style: ${blockLabel(state.blockType)}. Activate to ${headingLevel ? 'return to paragraph' : 'apply Heading 2'}.`}
            className={`inline-flex h-11 min-w-12 items-center justify-center px-2.5 font-mono text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40 ${
              headingLevel ? 'bg-brand text-on-primary' : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
            }`}
          >
            {blockLabel(state.blockType)}
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            data-toolbar-item
            aria-label="Choose text style"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            disabled={disabled}
            onClick={() => setMenuOpen((open) => !open)}
            className={`inline-flex h-11 w-11 items-center justify-center border-l border-line transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40 ${
              menuOpen ? 'bg-surface-subtle text-ink' : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
            }`}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform motion-reduce:transition-none ${menuOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
        <EditorMenu
          id={menuId}
          label="Text style"
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          triggerRef={menuButtonRef}
          anchorRef={menuButtonRef}
          placement="bottom-start"
          className="w-52"
        >
          <EditorMenuItem
            checked={!headingLevel}
            onSelect={() => {
              applyBlock('p');
              setMenuOpen(false);
            }}
          >
            Paragraph
          </EditorMenuItem>
          {([1, 2, 3, 4, 5, 6] as HeadingLevel[]).map((level) => (
            <EditorMenuItem
              key={level}
              checked={headingLevel === level}
              onSelect={() => {
                applyBlock(`h${level}` as BlockType);
                setMenuOpen(false);
              }}
            >
              Heading {level}
            </EditorMenuItem>
          ))}
        </EditorMenu>
      </div>

      <Separator />

      <ResponsiveToolbarGroup
        label="Lists and blocks"
        triggerRef={useRef<HTMLButtonElement | null>(null)}
        mobileItems={
          <>
            <EditorMenuItem
              onSelect={() => toggleEditorList(editor, 'disc')}
              disabled={disabled}
              checked={state.listStyleType === 'disc'}
            >
              Bulleted list
            </EditorMenuItem>
            <EditorMenuItem
              onSelect={() => toggleEditorList(editor, 'decimal')}
              disabled={disabled}
              checked={state.listStyleType === 'decimal'}
            >
              Numbered list
            </EditorMenuItem>
            <EditorMenuItem
              onSelect={() => toggleBlockType('blockquote', state.blockType === 'blockquote')}
              disabled={disabled}
              checked={state.blockType === 'blockquote'}
            >
              Block quote
            </EditorMenuItem>
            <EditorMenuItem
              onSelect={() => toggleBlockType('code_block', state.blockType === 'code_block' || state.blockType === 'code_line')}
              disabled={disabled}
              checked={state.blockType === 'code_block' || state.blockType === 'code_line'}
            >
              Code block
            </EditorMenuItem>
            <EditorMenuItem
              onSelect={() => insertEditorDivider(editor)}
              disabled={disabled}
            >
              Divider
            </EditorMenuItem>
          </>
        }
        desktopItems={
          <>
            <ToolbarButton
              label="Bulleted list"
              icon={<List className="h-4 w-4" aria-hidden="true" />}
              active={state.listStyleType === 'disc'}
              disabled={disabled}
              onClick={() => toggleEditorList(editor, 'disc')}
            />
            <ToolbarButton
              label="Numbered list"
              icon={<ListOrdered className="h-4 w-4" aria-hidden="true" />}
              active={state.listStyleType === 'decimal'}
              disabled={disabled}
              onClick={() => toggleEditorList(editor, 'decimal')}
            />
            <ToolbarButton
              label="Block quote"
              icon={<Quote className="h-4 w-4" aria-hidden="true" />}
              active={state.blockType === 'blockquote'}
              disabled={disabled}
              onClick={() => toggleBlockType('blockquote', state.blockType === 'blockquote')}
            />
            <ToolbarButton
              label="Code block"
              icon={<Code2 className="h-5 w-5" aria-hidden="true" />}
              active={state.blockType === 'code_block' || state.blockType === 'code_line'}
              disabled={disabled}
              onClick={() => toggleBlockType('code_block', state.blockType === 'code_block' || state.blockType === 'code_line')}
            />
            <ToolbarButton
              label="Divider"
              icon={<Minus className="h-4 w-4" aria-hidden="true" />}
              disabled={disabled}
              onClick={() => insertEditorDivider(editor)}
            />
          </>
        }
      />
    </div>
  );
}
