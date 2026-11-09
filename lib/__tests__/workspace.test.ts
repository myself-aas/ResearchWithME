import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ResearchWorkspace from '@/components/workspace/ResearchWorkspace';
import FilterPanel from '@/components/scholarly/FilterPanel';
import DataTable, { type DataTableColumn, type DataTableProps } from '@/components/ui/DataTable';
type Row = { name: string; n?: number };
const Table = DataTable as (props: DataTableProps<Row>) => React.ReactElement;

describe('ResearchWorkspace (§5)', () => {
  it('renders Sources / Synthesis / Inspector regions on a 12-column grid with collapse toggles', () => {
    const html = renderToStaticMarkup(
      createElement(ResearchWorkspace, {
        regions: [
          { id: 'sources', label: 'Sources', children: createElement('p', null, 'src') },
          { id: 'synthesis', label: 'Synthesis', children: createElement('p', null, 'syn') },
          { id: 'inspector', label: 'Inspector', children: createElement('p', null, 'ins') },
        ],
      }),
    );
    expect(html).toContain('aria-label="Research workspace"');
    expect(html).toContain('lg:grid-cols-12');
    expect(html).toContain('lg:col-span-3');
    expect(html).toContain('lg:col-span-6');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('>Collapse<');
  });
});

describe('FilterPanel (§7 forms)', () => {
  it('checkbox mode allows many selections; radio mode allows one', () => {
    const multi = renderToStaticMarkup(
      createElement(FilterPanel, { title: 'Type', options: [{ value: 'article', label: 'Article' }], selected: ['article'], onChange: () => {}, multiple: true }),
    );
    expect(multi).toContain('type="checkbox"');
    expect(multi).toContain('checked=""');
    const single = renderToStaticMarkup(
      createElement(FilterPanel, { title: 'Trust', options: [{ value: 'verified', label: 'Verified' }], selected: [], onChange: () => {}, multiple: false }),
    );
    expect(single).toContain('type="radio"');
    expect(single).toContain('<legend');
  });
});

describe('DataTable (§7 tables)', () => {
  const cols: Array<DataTableColumn<{ name: string; n?: number }>> = [
    { key: 'name', header: 'Study', render: (r: { name: string; n?: number }) => r.name },
    { key: 'n', header: 'N', unit: 'participants', numeric: true, render: (r: { name: string; n?: number }) => r.n },
  ];

  it('units in headers, sticky header, tabular numerals for numbers', () => {
    const html = renderToStaticMarkup(createElement(Table, { columns: cols, rows: [{ name: 'A', n: 42 }], caption: 'Studies' }));
    expect(html).toContain('(participants)');
    expect(html).toContain('sticky');
    expect(html).toContain('tabular-nums');
    expect(html).toContain('>42<');
  });

  it('empty state renders the empty label', () => {
    const html = renderToStaticMarkup(createElement(Table, { columns: cols, rows: [], caption: 'Studies', emptyLabel: 'No studies yet' }));
    expect(html).toContain('No studies yet');
  });
});
