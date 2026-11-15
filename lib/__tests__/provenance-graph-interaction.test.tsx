// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import ProvenanceGraph from '@/components/graph/ProvenanceGraph';

const objects: Parameters<typeof ProvenanceGraph>[0]['objects'] = [
  { id: 'one', type: 'source', title: 'First source' },
  { id: 'two', type: 'claim', title: 'Second claim' },
];

describe('provenance keyboard navigation', () => {
  it('keeps a valid roving target after the list shrinks and inspects that target', () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onInspect = vi.fn();
    const render = (items: typeof objects) => act(() => root.render(<ProvenanceGraph objects={items} relationships={[]} onInspect={onInspect} />));
    render(objects);
    const list = container.querySelector<HTMLUListElement>('[aria-label="Knowledge objects"]')!;
    const nodes = list.querySelectorAll<HTMLLIElement>('li');
    act(() => nodes[0].focus());
    act(() => nodes[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
    expect(document.activeElement).toBe(nodes[1]);
    render(objects.slice(0, 1));
    const remaining = list.querySelector('li')!;
    expect(remaining.tabIndex).toBe(0);
    act(() => remaining.focus());
    act(() => remaining.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(onInspect).toHaveBeenCalledWith('one');
    act(() => root.unmount());
    container.remove();
  });
  it('keeps all nodes visible in graph mode when there are more than two rows', () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const items = Array.from({ length: 9 }, (_, i) => ({ id: `node-${i}`, type: 'source' as const, title: `Node ${i}` }));
    act(() => root.render(<ProvenanceGraph objects={items} relationships={[]} />));
    const graphButton = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Graph')!;
    act(() => graphButton.click());
    const svg = container.querySelector('svg')!;
    const viewHeight = Number(svg.getAttribute('viewBox')!.split(' ')[3]);
    const lastLabel = [...svg.querySelectorAll('text')].find((node) => node.textContent === 'Node 8')!;
    expect(viewHeight).toBeGreaterThan(Number(lastLabel.getAttribute('y')));
    act(() => root.unmount());
    container.remove();
  });

});
