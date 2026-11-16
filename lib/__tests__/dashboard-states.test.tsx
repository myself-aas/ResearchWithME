import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardLayout from '@/app/dashboard/layout';
import StudioLayout from '@/app/dashboard/(studio)/layout';
import ApplyToWritePage from '@/app/dashboard/access/page';

const { currentUser, redirect, createClient } = vi.hoisted(() => ({ currentUser: vi.fn(), redirect: vi.fn((url: string): never => { throw new Error(`redirect:${url}`); }), createClient: vi.fn() }));
vi.mock('@/lib/cms/auth', () => ({ getDashboardUser: currentUser }));
vi.mock('@/lib/supabase/config', () => ({ isSupabaseConfigured: true }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: createClient }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/components/cms/DashboardShell', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/dashboard/AuthorApplication', () => ({ default: () => <div>Application form placeholder</div> }));
vi.mock('@/components/dashboard/ProfilePhotoCard', () => ({ default: () => <div>Profile photo</div> }));
const reader = { id: 'reader-1', email: 'reader@example.org', name: 'Reader', isEditor: false };
const editor = { ...reader, id: 'editor-1', isEditor: true };
beforeEach(() => { vi.clearAllMocks(); });

function render(node: React.ReactNode) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, node));
}

describe('configured dashboard authorization', () => {
  it('redirects signed-out and expired sessions before rendering private children', async () => {
    currentUser.mockResolvedValue(null);
    await expect(DashboardLayout({ children: 'PRIVATE-DRAFT' })).rejects.toThrow('redirect:/login?next=/dashboard/access');
    await expect(ApplyToWritePage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/login?next=/dashboard/access');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('lets readers use the dashboard but rejects them from the studio', async () => {
    currentUser.mockResolvedValue(reader);
    expect(render(await DashboardLayout({ children: 'reader dashboard' }))).toContain('reader dashboard');
    await expect(StudioLayout({ children: 'PRIVATE-DRAFT' })).rejects.toThrow('redirect:/dashboard/access?error=not-editor');
  });

  it('allows an authorized editor into the studio', async () => {
    currentUser.mockResolvedValue(editor);
    expect(render(await StudioLayout({ children: 'authorized studio' }))).toContain('authorized studio');
  });

  it('shows the application form for a reader with no application or profile', async () => {
    currentUser.mockResolvedValue(reader);
    createClient.mockResolvedValue({ from: (table: string) => ({ select: () => ({ eq: (column: string, id: string) => {
      expect(column).toBe('user_id');
      expect(id).toBe(reader.id);
      return table === 'author_applications'
        ? { order: async () => ({ data: [], error: null }) }
        : { maybeSingle: async () => ({ data: null, error: null }) };
    } }) }) });
    const html = render(await ApplyToWritePage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('Application form placeholder');
    expect(html).toContain('Your profile photo can be added');
    expect(html).not.toContain('role="alert"');
  });

  it('reports a profile read error rather than treating it as a missing profile', async () => {
    currentUser.mockResolvedValue(reader);
    createClient.mockResolvedValue({ from: (table: string) => ({ select: () => ({ eq: () => table === 'author_applications'
      ? { order: async () => ({ data: [], error: null }) }
      : { maybeSingle: async () => ({ data: null, error: { message: 'profile unavailable' } }) } }) }) });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const html = render(await ApplyToWritePage({ searchParams: Promise.resolve({}) }));
      expect(html).toContain('could not load your application or profile');
      expect(html).not.toContain('Application form placeholder');
      expect(html).not.toContain('Your profile photo can be added');
    } finally { consoleError.mockRestore(); }
  });

  it('does not show a new application form when application records cannot be read', async () => {
    currentUser.mockResolvedValue(reader);
    createClient.mockResolvedValue({ from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: null, error: { message: 'database offline' } }) }) }) }) });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const html = render(await ApplyToWritePage({ searchParams: Promise.resolve({}) }));
      expect(html).toContain('role="alert"');
      expect(html).toContain('could not load your application');
      expect(html).not.toContain('Application form placeholder');
      expect(html).not.toContain('Your profile photo can be added');
    } finally { consoleError.mockRestore(); }
  });
});
