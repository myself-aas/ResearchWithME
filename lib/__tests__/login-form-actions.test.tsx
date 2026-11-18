// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import LoginForm from '@/components/auth/LoginForm';

const { signInWithPassword, startOAuth } = vi.hoisted(() => ({ signInWithPassword: vi.fn(), startOAuth: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ getSupabaseBrowserClient: () => ({ auth: { signInWithPassword } }) }));
vi.mock('@/lib/supabase/oauth', () => ({ startOAuthSignIn: startOAuth }));
afterEach(() => { vi.clearAllMocks(); });

it('reports invalid credentials, preserves email, and focuses the alert', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><LoginForm configured user={null} next="/dashboard" /></MemoryRouter>));
    const inputs = element.querySelectorAll('input');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      set.call(inputs[0], 'reader@example.org'); inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      set.call(inputs[1], 'incorrect'); inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'reader@example.org', password: 'incorrect' });
    const alert = element.querySelector<HTMLElement>('[role=alert]')!;
    expect(alert.textContent).toContain('do not match');
    expect(inputs[0].value).toBe('reader@example.org');
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(resolve)); });
    expect(document.activeElement).toBe(alert);
  } finally { await act(async () => root.unmount()); element.remove(); }
});

it('shows provider denial without claiming sign-in succeeded', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  startOAuth.mockResolvedValue({ ok: false, error: 'access_denied' });
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><LoginForm configured user={null} next="/dashboard" /></MemoryRouter>));
    await act(async () => { [...element.querySelectorAll('button')].find((b) => b.textContent?.includes('Continue with Google'))!.click(); });
    expect(startOAuth).toHaveBeenCalledWith('google', '/dashboard');
    expect(element.querySelector('[role=alert]')?.textContent).toContain('cancelled on the provider');
    expect(element.textContent).not.toContain('You are signed in');
  } finally { await act(async () => root.unmount()); element.remove(); }
});


it('starts Discord sign-in with the same session flow as the other providers', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  startOAuth.mockResolvedValue({ ok: true });
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><LoginForm configured user={null} next="/dashboard" /></MemoryRouter>));
    await act(async () => { [...element.querySelectorAll('button')].find((b) => b.textContent?.includes('Continue with Discord'))!.click(); });
    expect(startOAuth).toHaveBeenCalledWith('discord', '/dashboard');
    expect(element.querySelector('[role=alert]')).toBeNull();
  } finally { await act(async () => root.unmount()); element.remove(); }
});

it('starts LinkedIn sign-in as a normal session rather than an identity link', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  startOAuth.mockResolvedValue({ ok: true });
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><LoginForm configured user={null} next="/dashboard" /></MemoryRouter>));
    await act(async () => { [...element.querySelectorAll('button')].find((b) => b.textContent?.includes('Continue with LinkedIn'))!.click(); });
    expect(startOAuth).toHaveBeenCalledWith('linkedin', '/dashboard');
    expect(element.querySelector('[role=alert]')).toBeNull();
  } finally { await act(async () => root.unmount()); element.remove(); }
});
