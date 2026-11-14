import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LoginForm from '@/components/auth/LoginForm';
import { applicationErrorMessage } from '@/lib/applications';

vi.mock('@/lib/supabase/client', () => ({ getSupabaseBrowserClient: () => ({}) }));
vi.mock('@/lib/supabase/oauth', () => ({ startOAuthSignIn: async () => ({ ok: true }) }));

function render(initialError?: string) {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(LoginForm, { configured: true, user: null, next: '/', initialError })),
  );
}

describe('sign-in failures reported by the auth callback', () => {
  it('shows nothing when there was no failure', () => {
    expect(render()).not.toContain('role="alert"');
  });

  it('shows the reason on first paint, as escaped text', () => {
    const html = render('<script>alert(1)</script>');
    expect(html).toContain('role="alert"');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('rewrites the common provider errors into a next step', () => {
    expect(render('access_denied')).toContain('cancelled on the provider');
    expect(render('Error getting user email from external provider')).toContain('did not share an email address');
    expect(render('redirect_to is not allowed')).toContain('allowed redirect URLs');
  });
});

describe('application errors', () => {
  it('explains an identity that is not linked, and a missing identifier', () => {
    expect(applicationErrorMessage('identity_not_linked')).toContain('not connected');
    expect(applicationErrorMessage('handle_required')).toContain('did not share');
    expect(applicationErrorMessage('not_editor')).toContain('Only an editor');
  });
});
