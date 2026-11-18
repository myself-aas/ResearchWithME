'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  Bold,
  Boxes,
  Code2,
  FileCode2,
  GitBranch,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Search,
  Sigma,
  Table,
  X,
  type LucideProps,
} from 'lucide-react';
import EditorDialog from './EditorDialog';
import {
  EDITOR_BLOCKS,
  EDITOR_GROUPS,
  EDITOR_GROUP_LABELS,
  filterBlocks,
  type EditorBlock,
  type EditorBlockGroup,
} from '@/lib/editor/block-catalog';

const ICONS: Record<string, ComponentType<LucideProps>> = {
  paragraph: Pilcrow,
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  h4: Heading4,
  h5: Heading5,
  h6: Heading6,
  'bullet-list': List,
  'numbered-list': ListOrdered,
  blockquote: Quote,
  'code-block': Code2,
  divider: Minus,
  image: ImagePlus,
  table: Table,
  equation: Sigma,
  mermaid: GitBranch,
  'mdx-EvidenceCallout': Boxes,
  'mdx-ClaimSummary': FileCode2,
  'mdx-CitationRef': Link2,
  'mdx-LimitationBox': Italic,
  'mdx-ToolReviewCard': Code2,
  'mdx-DataTable': Table,
  'mdx-EquationBlock': Sigma,
  'mdx-DiagramBlock': GitBranch,
  'mdx-FigureBlock': ImagePlus,
  'mdx-Callout': Bold,
};

function iconFor(block: EditorBlock) {
  return ICONS[block.id] ?? FileCode2;
}

interface BlockPaletteProps {
  open: boolean;
  onClose: () => void;
  onInsert: (block: EditorBlock) => void;
  /** True when the surrounding studio can upload an image. */
  canUploadImage?: boolean;
  /** The palette reflects the surface it will write into. */
  mode: 'visual' | 'source';
}

/**
 * Full insertion surface behind the FAB and the `/` shortcut.
 *
 * M3 guidance: a FAB menu is capped at 2–6 actions; the rest of the catalogue
 * lives here in a searchable, grouped dialog. Segmented buttons switch between
 * the heading scale, structural blocks, and every allowlisted MDX component.
 */
export default function BlockPalette({
  open,
  onClose,
  onInsert,
  canUploadImage = false,
  mode,
}: BlockPaletteProps) {
  const [group, setGroup] = useState<EditorBlockGroup>('headings');
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    setGroup('headings');
  }, [open]);

  const searching = query.trim().length > 0;
  const results = useMemo(() => (searching ? filterBlocks(query) : EDITOR_BLOCKS.filter((block) => block.group === group)), [group, query, searching]);
  const grouped = useMemo(() => {
    if (!searching) return [{ group, blocks: results }];
    return EDITOR_GROUPS.map((key) => ({ group: key, blocks: results.filter((block) => block.group === key) })).filter(
      (entry) => entry.blocks.length > 0,
    );
  }, [group, results, searching]);

  function close() {
    onClose();
    triggerRef.current?.focus();
  }

  return (
    <EditorDialog open={open} onClose={close} labelledBy="block-palette-title">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 pb-4 pt-5">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary">Insert</p>
          <h2 id="block-palette-title" className="mt-1 font-serif text-2xl font-semibold tracking-tight text-ink">
            Blocks &amp; MDX components
          </h2>
          <p className="mt-1 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary">
            {mode === 'visual'
              ? 'Standard Markdown inserts in place. Tables, equations, diagrams, and MDX open in Markdown source so nothing is lost.'
              : 'Insert at the cursor in Markdown source. Tables, equations, diagrams, and MDX keep their exact syntax.'}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close block palette"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-secondary hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div className="border-b border-line px-5 py-3">
        <label htmlFor="block-palette-search" className="relative block">
          <span className="sr-only">Search blocks and components</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary" aria-hidden="true" />
          <input
            id="block-palette-search"
            data-autofocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search headings, blocks, and MDX components…"
            className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 pl-9 text-sm text-ink placeholder:text-ink-secondary focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
        </label>
      </div>

      {!searching && (
        <div className="px-5 pt-4">
          <div role="group" aria-label="Block categories" className="inline-flex max-w-full gap-1 rounded-full border border-line bg-surface-subtle p-1">
            {EDITOR_GROUPS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={group === key}
                onClick={() => setGroup(key)}
                className={`min-h-11 rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  group === key ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {EDITOR_GROUP_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-10 text-center">
            <p className="font-serif text-lg font-semibold text-ink">No blocks match “{query}”</p>
            <p className="mt-1 text-sm text-ink-secondary">Try “heading”, “table”, “evidence”, or “figure”.</p>
          </div>
        ) : (
          grouped.map((entry) => (
            <section key={entry.group} id={`block-group-${entry.group}`} aria-labelledby={`block-group-label-${entry.group}`} className="mb-5 last:mb-0">
              <h3 id={`block-group-label-${entry.group}`} className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                {EDITOR_GROUP_LABELS[entry.group]}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {entry.blocks.map((block) => {
                  const Icon = iconFor(block);
                  const upload = block.kind === 'image' && canUploadImage;
                  return (
                    <li key={block.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onInsert(block);
                          close();
                        }}
                        className="group flex min-h-11 w-full items-start gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left transition-colors hover:border-brand hover:bg-brand/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-ink-secondary group-hover:bg-brand/10 group-hover:text-brand">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">
                            {upload ? 'Upload image' : block.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-ink-secondary">{block.description}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <footer className="border-t border-line px-5 py-3 text-xs leading-relaxed text-ink-secondary">
        {mode === 'visual'
          ? 'Visual mode covers standard Markdown. Unsupported syntax is preserved in Markdown mode.'
          : 'Markdown mode preserves every allowlisted MDX component and unsafe-looking text is never executable.'}
      </footer>
    </EditorDialog>
  );
}
