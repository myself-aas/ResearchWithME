// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ApiKeys from '@/components/account/ApiKeys';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KEY = 'rwm_' + 'A'.repeat(43);
const record = { id: 'k1', name: 'laptop', prefix: 'rwm_AAAAAAAA', createdAt: '2026-11-10T09:00:00.000Z', lastUsedAt: null, revokedAt: null };

let container: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();

async function render(props: Partial<Parameters<typeof ApiKeys>[0]> = {}) {
  await act(async () => {
    root.render(<ApiKeys initialKeys={[]} monthlyIncluded={100} used={0} {...props} />);
  });
}
const button = (label: string) =>
  [...container.querySelectorAll('button')].find((node) => node.textContent?.trim() === label) as HTMLButtonElement | undefined;
async function click(label: string) {
  const node = button(label);
  if (!node) throw new Error(`No button "${label}"`);
  await act(async () => { node.click(); });
}
async function typeName(value: string) {
  const input = container.querySelector('input[name="name"]') as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const reply = (status: number, body?: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('ApiKeys', () => {
  it('explains the empty state', async () => {
    await render();
    expect(container.textContent).toContain('No keys yet. Create one to call the Assistant API.');
  });
  it('shows usage as a count, and as a dash when it is unknown', async () => {
    await render({ used: 12 });
    expect(container.textContent).toContain('12 of 100 answers used this month');
    await render({ used: null });
    expect(container.textContent).toContain('—');
    expect(container.textContent).not.toContain('0 of');
  });
  it('shows a new key once, then forgets it', async () => {
    fetchMock.mockResolvedValue(reply(201, { ...record, key: KEY }));
    await render();
    await typeName('laptop');
    await click('Create key');
    expect(fetchMock).toHaveBeenCalledWith('/api/account/api-keys', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'laptop' }) }));
    const field = container.querySelector('input[readonly]') as HTMLInputElement;
    expect(field.value).toBe(KEY);
    expect(container.textContent).toContain('This key is shown once. Store it now.');
    expect(container.textContent).toContain('laptop');
    await click('Done');
    expect(container.querySelector('input[readonly]')).toBeNull();
    expect(container.innerHTML).not.toContain(KEY);
    expect(container.textContent).toContain('rwm_AAAAAAAA');
  });
  it('reports the server message when creation fails', async () => {
    fetchMock.mockResolvedValue(reply(400, { error: { code: 'INVALID_REQUEST', message: 'You can have at most 5 active keys. Revoke one first.' } }));
    await render();
    await typeName('sixth');
    await click('Create key');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('You can have at most 5 active keys. Revoke one first.');
  });
  it('asks before revoking, and can be cancelled', async () => {
    await render({ initialKeys: [record] });
    await click('Revoke');
    expect(container.textContent).toContain('Requests that use this key will be refused.');
    expect(fetchMock).not.toHaveBeenCalled();
    await click('Keep key');
    expect(container.textContent).not.toContain('Requests that use this key will be refused.');
  });
  it('marks a key revoked after the server confirms', async () => {
    fetchMock.mockResolvedValue(reply(204));
    await render({ initialKeys: [record] });
    await click('Revoke');
    await click('Revoke key');
    expect(fetchMock).toHaveBeenCalledWith('/api/account/api-keys/k1', expect.objectContaining({ method: 'DELETE' }));
    expect(container.textContent).toContain('Revoked');
    expect(button('Revoke')).toBeUndefined();
  });
});
