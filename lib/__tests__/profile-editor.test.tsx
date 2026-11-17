// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileEditor from '@/components/dashboard/ProfileEditor';

const upsert = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/supabase/client', () => ({
  hasSupabaseBrowserConfig: () => true,
  getSupabaseBrowserClient: () => ({ from: () => ({ upsert }) }),
}));

const PROFILE = {
  userId: 'user-1',
  slug: 'ashif-ahmed-shuvo',
  displayName: 'Ashif Ahmed Shuvo',
  role: 'Editor-in-Chief',
  domain: 'Public health',
  institution: 'ResearchWithME',
  bio: 'I review evidence.',
  orcid: '0000-0002-1825-0097',
  github: 'octocat',
  website: 'https://example.org',
  scholar: '',
  avatarUrl: null,
  published: true,
  createdAt: '2026-01-04T00:00:00.000Z',
};

describe('ProfileEditor', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    upsert.mockReset().mockResolvedValue({ error: null });
    refresh.mockReset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(profile: typeof PROFILE | null) {
    act(() =>
      root.render(
        <ProfileEditor
          userId="user-1"
          email="ashif@example.org"
          sessionName="Ashif Ahmed Shuvo"
          profile={profile}
        />,
      ),
    );
  }

  function input(id: string) {
    return container.querySelector<HTMLInputElement>(`#${id}`)!;
  }

  function type(id: string, value: string) {
    const field = input(id);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('opens with the stored profile values and the public URL', () => {
    render(PROFILE);
    expect(input('profile-name').value).toBe('Ashif Ahmed Shuvo');
    expect(input('profile-slug').value).toBe('ashif-ahmed-shuvo');
    expect(input('profile-orcid').value).toBe('0000-0002-1825-0097');
    expect((input('profile-published') as HTMLInputElement).checked).toBe(true);
    expect(container.textContent).toContain('/author/ashif-ahmed-shuvo');
    expect(container.querySelector('a[href="/author/ashif-ahmed-shuvo"]')).not.toBeNull();
    expect(container.textContent).toContain('Save profile');
  });

  it('creates a suggested slug for an account without a profile', () => {
    render(null);
    expect(input('profile-slug').value).toBe('ashif-ahmed-shuvo');
    expect(container.textContent).toContain('Create profile');
  });

  it('keeps the slug in sync with the name until the slug is edited', () => {
    render(null);
    type('profile-name', 'Søren Kierkegaard');
    expect(input('profile-slug').value).toBe('soren-kierkegaard');

    type('profile-slug', 'sk');
    type('profile-name', 'Soren Kierkegaard');
    expect(input('profile-slug').value).toBe('sk');
  });

  it('blocks an invalid ORCID before writing anything', async () => {
    render(PROFILE);
    type('profile-orcid', '1234');
    const form = container.querySelector('form')!;
    await act(async () => {
      form.requestSubmit();
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(container.textContent).toContain('16-digit ORCID');
    expect(container.textContent).toContain('Check the highlighted fields');
  });

  it('writes the normalized row to public.profiles for the signed-in user', async () => {
    render(PROFILE);
    type('profile-github', '@octocat');
    type('profile-website', 'https://example.org/');
    await act(async () => {
      container.querySelector('form')!.requestSubmit();
    });

    expect(upsert).toHaveBeenCalledTimes(1);
    const [payload, options] = upsert.mock.calls[0];
    expect(options).toEqual({ onConflict: 'user_id' });
    expect(payload).toMatchObject({
      user_id: 'user-1',
      slug: 'ashif-ahmed-shuvo',
      display_name: 'Ashif Ahmed Shuvo',
      orcid: '0000-0002-1825-0097',
      github: 'octocat',
      website: 'https://example.org',
      published: true,
    });
    expect(container.textContent).toContain('Profile saved.');
    expect(refresh).toHaveBeenCalled();
  });

  it('reports a taken slug instead of silently overwriting another row', async () => {
    render(PROFILE);
    upsert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key' } });
    await act(async () => {
      container.querySelector('form')!.requestSubmit();
    });
    expect(container.textContent).toContain('already taken');
    expect(refresh).not.toHaveBeenCalled();
  });
});
