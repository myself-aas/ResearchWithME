// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { usePreferencesStore, useSavedTotalCount, migrateLegacyPreferences } from '@/lib/stores/preferences-store';

describe('preferences-store (zustand + persist)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePreferencesStore.setState({
      savedPostIds: [],
      savedPaperIds: [],
      likedPostIds: [],
      digest: { subscribed: false, email: '', topics: { teardowns: true, papers: true, clinical: false, policy: false }, updatedAt: null },
      theme: 'system',
      hydrated: true,
      storagePersisted: true,
    });
  });

  it('migrates legacy rwm_saved_posts and rwm_newsletter_* keys once when rwm-preferences-v1 is empty', () => {
    window.localStorage.setItem('rwm_saved_posts', JSON.stringify(['post-1', 'post-2']));
    window.localStorage.setItem('rwm_newsletter_subscribed', 'true');
    window.localStorage.setItem('rwm_newsletter_email', 'ada@ox.ac.uk');
    const migrated = migrateLegacyPreferences();
    expect(migrated.savedPostIds).toEqual(['post-1', 'post-2']);
    expect(migrated.digest.subscribed).toBe(true);
    expect(migrated.digest.email).toBe('ada@ox.ac.uk');
  });

  it('Review Focus #1: updates in-memory state and flags storagePersisted=false when localStorage.setItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const ok = usePreferencesStore.getState().toggleSavedPost('post-1');
    expect(ok).toBe(false);
    expect(usePreferencesStore.getState().savedPostIds).toContain('post-1');
    expect(usePreferencesStore.getState().storagePersisted).toBe(false);
    spy.mockRestore();
  });

  it('Review Focus #4a: returns 0 saved count before client hydration so SSR markup matches', () => {
    usePreferencesStore.setState({ savedPostIds: ['post-1'], hydrated: false });
    function Probe() {
      return createElement('span', null, String(useSavedTotalCount()));
    }
    expect(renderToStaticMarkup(createElement(Probe))).toBe('<span>0</span>');
  });
});
