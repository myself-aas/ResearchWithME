// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import ConflictPanel from '@/components/editor/ConflictPanel';

it('shows the selected side when both versions contain the same value', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const onResolve = vi.fn();
  const sides: Parameters<typeof ConflictPanel>[0]['sides'] = [
    { label: 'Local', capturedAt: '2026-11-01', authorId: 'author', values: { title: 'Same' } },
    { label: 'Remote', capturedAt: '2026-11-02', authorId: 'author', values: { title: 'Same' } },
  ];
  act(() => root.render(<ConflictPanel sides={sides} onResolve={onResolve} />));
  const [local, remote] = [...container.querySelectorAll<HTMLInputElement>('input[type=radio]')];
  expect(local.checked).toBe(false);
  expect(remote.checked).toBe(false);
  act(() => local.click());
  expect(local.checked).toBe(true);
  expect(remote.checked).toBe(false);
  act(() => remote.click());
  expect(local.checked).toBe(false);
  expect(remote.checked).toBe(true);
  const button = container.querySelector('button')!;
  expect(button.disabled).toBe(true);
  const rationale = container.querySelector('textarea')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(rationale, 'Reviewed both versions');
    rationale.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(button.disabled).toBe(false);
  act(() => button.click());
  expect(onResolve).toHaveBeenCalledWith({ title: 'Same' }, 'Reviewed both versions');
  act(() => root.unmount());
  container.remove();
});
