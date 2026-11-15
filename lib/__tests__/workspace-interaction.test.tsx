// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import ResearchWorkspace from '@/components/workspace/ResearchWorkspace';

function Draft() {
  const [value, setValue] = useState('Initial draft');
  return <input aria-label="Draft" value={value} onChange={(event) => setValue(event.target.value)} />;
}

describe('workspace panels', () => {
  it('preserves a mounted draft while collapsed and associates the toggle with its panel', () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    act(() => root.render(<ResearchWorkspace regions={[{ id: 'synthesis', label: 'Synthesis', children: <Draft /> }]} />));
    const button = container.querySelector('button')!;
    const input = container.querySelector('input')!;
    const panel = document.getElementById(button.getAttribute('aria-controls')!)!;
    act(() => button.click());
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    expect(container.querySelector('input')).toBe(input);
    act(() => button.click());
    expect(panel.hidden).toBe(false);
    expect(container.querySelector('input')).toBe(input);
    expect(input.value).toBe('Initial draft');
    act(() => root.unmount());
    container.remove();
  });
});
