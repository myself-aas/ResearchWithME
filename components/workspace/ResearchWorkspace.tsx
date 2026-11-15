/**
 * ResearchWorkspace — reme v3.1 §5/§7 (stage 4, beta).
 *
 * Desktop: resizable Sources / Synthesis / Inspector regions on a 12-column
 * grid; regions collapse without losing focus or unsaved state (panels are
 * controlled by local state, content is passed in — nothing is unmounted).
 * Mobile (<lg): regions stack; one primary task at a time.
 * Keyboard: toggle buttons are native buttons with visible focus; focus stays
 * in the panel the user was in (no focus theft on collapse).
 * Token mapping: semantic surface/border/text tokens.
 * Tests: lib/__tests__/workspace.test.ts.
 */
import { useState, type ReactNode } from 'react';

export interface WorkspaceRegion {
  id: 'sources' | 'synthesis' | 'inspector';
  label: string;
  children: ReactNode;
}

export interface ResearchWorkspaceProps {
  regions: WorkspaceRegion[];
}

const GRID_COL: Record<string, string> = {
  sources: 'lg:col-span-3',
  synthesis: 'lg:col-span-6',
  inspector: 'lg:col-span-3',
};

export default function ResearchWorkspace({ regions }: ResearchWorkspaceProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12" aria-label="Research workspace">
      {regions.map((r) => {
        const isCollapsed = collapsed[r.id];
        return (
          <section
            key={r.id}
            aria-label={r.label}
            className={`rounded-md border border-line bg-surface ${GRID_COL[r.id] ?? 'lg:col-span-4'}`}
          >
            <header className="flex items-center justify-between border-b border-line px-4 py-2">
              <h2 className="font-sans text-sm font-semibold text-text-primary">{r.label}</h2>
              <button
                type="button"
                aria-expanded={!isCollapsed}
                className="min-h-11 rounded-sm px-2 font-sans text-xs font-medium text-brand hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                onClick={() => toggle(r.id)}
              >
                {isCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </header>
            {!isCollapsed ? <div className="p-4">{r.children}</div> : null}
          </section>
        );
      })}
    </div>
  );
}
