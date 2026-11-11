'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { readLocalString, readStringArray, writeLocal, writeLocalString } from '@/lib/storage';

export const PREFERENCES_STORAGE_KEY = 'rwm-preferences-v1';

export type DigestTopicKey = 'teardowns' | 'papers' | 'clinical' | 'policy';

export interface DigestPreferences {
  subscribed: boolean;
  email: string;
  topics: Record<DigestTopicKey, boolean>;
  updatedAt: string | null;
}

export interface PersistedPreferencesSlice {
  savedPostIds: string[];
  savedPaperIds: string[];
  likedPostIds: string[];
  digest: DigestPreferences;
  theme: 'light' | 'dark' | 'system';
}

export interface PreferencesState extends PersistedPreferencesSlice {
  hydrated: boolean;
  storagePersisted: boolean;
  toggleSavedPost: (id: string) => boolean;
  removeSavedPost: (id: string) => boolean;
  clearSavedPosts: () => void;
  toggleSavedPaper: (id: string) => boolean;
  setPostLiked: (id: string, liked: boolean) => void;
  subscribeDigest: (email: string, topics: Record<DigestTopicKey, boolean>) => boolean;
  setDigestTopic: (key: DigestTopicKey, enabled: boolean) => void;
  unsubscribeDigest: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const DEFAULT_DIGEST_TOPICS: Record<DigestTopicKey, boolean> = {
  teardowns: true,
  papers: true,
  clinical: false,
  policy: false,
};

const DEFAULT_DIGEST: DigestPreferences = {
  subscribed: false,
  email: '',
  topics: { ...DEFAULT_DIGEST_TOPICS },
  updatedAt: null,
};

let lastWriteOk = true;

const safeStateStorage: StateStorage = {
  getItem(name: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name: string, value: string): void {
    if (typeof window === 'undefined') {
      lastWriteOk = false;
      return;
    }
    try {
      window.localStorage.setItem(name, value);
      lastWriteOk = true;
    } catch {
      lastWriteOk = false;
    }
  },
  removeItem(name: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      lastWriteOk = false;
    }
  },
};

export function migrateLegacyPreferences(): PersistedPreferencesSlice {
  const savedPostIds = readStringArray('rwm_saved_posts');
  const savedPaperIds = readStringArray('rwm_saved_papers');
  const likedPostIds = readStringArray('rwm_liked_posts');
  const subscribed = readLocalString('rwm_newsletter_subscribed') === 'true';
  const email = readLocalString('rwm_newsletter_email').trim();
  const rawTheme = readLocalString('rwm-theme');
  const theme: 'light' | 'dark' | 'system' =
    rawTheme === 'light' || rawTheme === 'dark' || rawTheme === 'system' ? rawTheme : 'system';

  return {
    savedPostIds,
    savedPaperIds,
    likedPostIds,
    digest: {
      subscribed,
      email,
      topics: { ...DEFAULT_DIGEST_TOPICS },
      updatedAt: subscribed ? new Date().toISOString() : null,
    },
    theme,
  };
}

function toggleInList(items: string[], id: string): string[] {
  const clean = id.trim();
  if (!clean) return items;
  return items.includes(clean)
    ? items.filter((entry) => entry !== clean)
    : [...items, clean].slice(-500);
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => {
      function commitMutation(updater: (state: PreferencesState) => Partial<PreferencesState>): boolean {
        lastWriteOk = true;
        set(updater);
        const ok = lastWriteOk;
        if (get().storagePersisted !== ok) {
          set({ storagePersisted: ok });
        }
        return ok;
      }

      return {
        savedPostIds: [],
        savedPaperIds: [],
        likedPostIds: [],
        digest: { ...DEFAULT_DIGEST, topics: { ...DEFAULT_DIGEST_TOPICS } },
        theme: 'system',
        hydrated: false,
        storagePersisted: true,

        toggleSavedPost(id: string) {
          const ok = commitMutation((state) => ({
            savedPostIds: toggleInList(state.savedPostIds, id),
          }));
          if (ok) writeLocal('rwm_saved_posts', get().savedPostIds);
          return ok;
        },

        removeSavedPost(id: string) {
          const ok = commitMutation((state) => ({
            savedPostIds: state.savedPostIds.filter((entry) => entry !== id),
          }));
          if (ok) writeLocal('rwm_saved_posts', get().savedPostIds);
          return ok;
        },

        clearSavedPosts() {
          const ok = commitMutation(() => ({ savedPostIds: [] }));
          if (ok) writeLocal('rwm_saved_posts', []);
        },

        toggleSavedPaper(id: string) {
          const ok = commitMutation((state) => ({
            savedPaperIds: toggleInList(state.savedPaperIds, id),
          }));
          if (ok) writeLocal('rwm_saved_papers', get().savedPaperIds);
          return ok;
        },

        setPostLiked(id: string, liked: boolean) {
          const clean = id.trim();
          if (!clean) return;
          const ok = commitMutation((state) => {
            const without = state.likedPostIds.filter((entry) => entry !== clean);
            return { likedPostIds: liked ? [...without, clean].slice(-500) : without };
          });
          if (ok) writeLocal('rwm_liked_posts', get().likedPostIds);
        },

        subscribeDigest(email: string, topics: Record<DigestTopicKey, boolean>) {
          const trimmed = email.trim();
          const ok = commitMutation(() => ({
            digest: {
              subscribed: true,
              email: trimmed,
              topics: { ...topics },
              updatedAt: new Date().toISOString(),
            },
          }));
          if (ok) {
            writeLocalString('rwm_newsletter_subscribed', 'true');
            writeLocalString('rwm_newsletter_email', trimmed);
          }
          return ok;
        },

        setDigestTopic(key: DigestTopicKey, enabled: boolean) {
          commitMutation((state) => ({
            digest: {
              ...state.digest,
              topics: { ...state.digest.topics, [key]: enabled },
              updatedAt: new Date().toISOString(),
            },
          }));
        },

        unsubscribeDigest() {
          const ok = commitMutation((state) => ({
            digest: {
              ...state.digest,
              subscribed: false,
              updatedAt: new Date().toISOString(),
            },
          }));
          if (ok) writeLocalString('rwm_newsletter_subscribed', 'false');
        },

        setTheme(theme: 'light' | 'dark' | 'system') {
          const ok = commitMutation(() => ({ theme }));
          if (ok) writeLocalString('rwm-theme', theme);
        },
      };
    },
    {
      name: PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => safeStateStorage),
      skipHydration: true,
      partialize: (state): PersistedPreferencesSlice => ({
        savedPostIds: state.savedPostIds,
        savedPaperIds: state.savedPaperIds,
        likedPostIds: state.likedPostIds,
        digest: state.digest,
        theme: state.theme,
      }),
    },
  ),
);

let hydrationStarted = false;

export function hydratePreferencesOnce(): void {
  if (typeof window === 'undefined') return;
  if (hydrationStarted || usePreferencesStore.getState().hydrated) return;
  hydrationStarted = true;

  const existingRaw = safeStateStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (existingRaw) {
    void Promise.resolve(usePreferencesStore.persist.rehydrate()).finally(() => {
      usePreferencesStore.setState({ hydrated: true });
    });
    return;
  }

  const migrated = migrateLegacyPreferences();
  const hasAnyLegacy =
    migrated.savedPostIds.length > 0 ||
    migrated.savedPaperIds.length > 0 ||
    migrated.likedPostIds.length > 0 ||
    migrated.digest.subscribed ||
    migrated.theme !== 'system';

  if (hasAnyLegacy) {
    lastWriteOk = true;
    usePreferencesStore.setState({
      ...migrated,
      hydrated: true,
      storagePersisted: lastWriteOk,
    });
  } else {
    usePreferencesStore.setState({ hydrated: true });
  }
}

export function useHydratePreferences(): boolean {
  const hydrated = usePreferencesStore((state) => state.hydrated);
  useEffect(() => {
    hydratePreferencesOnce();
  }, []);
  return hydrated;
}

export function useSavedTotalCount(): number {
  const hydrated = useHydratePreferences();
  const count = usePreferencesStore(
    (state) => state.savedPostIds.length + state.savedPaperIds.length,
  );
  return hydrated ? count : 0;
}

export function useDigestSubscribed(): boolean {
  const hydrated = useHydratePreferences();
  const subscribed = usePreferencesStore((state) => state.digest.subscribed);
  return hydrated ? subscribed : false;
}
