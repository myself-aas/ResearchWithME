'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AUTHORS } from './blog-data';
import { safeInitials } from './format';
import { readLocal, removeLocal, writeLocal } from './storage';
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from './supabase/client';
import {
  cleanText,
  getInstitutionalRegionDetails,
  isInstitutionalEmail,
  isValidEmail,
  normalizeGithubHandle,
  normalizeOrcid,
  orcidChecksumIsValid,
} from './validation';

export type UserRole = 'reader' | 'author';
export type AuthProviderType = 'guest' | 'gmail' | 'google' | 'email' | 'orcid' | 'github' | 'institution';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  authProvider: AuthProviderType;
  verifiedTitle?: string;
  verifiedIdentifier?: string;
  institution?: string;
  countryCode?: string;
  regionLabel?: string;
  authorProfileId?: string;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

interface AuthContextType {
  user: AuthUser | null;
  hydrated: boolean;
  hasAuthorPermissions: boolean;
  loginWithGmail: (email: string, name: string) => AuthResult;
  verifyWithOrcid: (orcidId: string, name: string) => AuthResult;
  verifyWithGithub: (handle: string, name: string) => AuthResult;
  verifyWithInstitution: (workEmail: string, institutionName: string, name: string) => AuthResult;
  setSessionUser: (user: AuthUser) => void;
  logout: () => void;
  switchRoleForTesting: (role: UserRole) => void;
}

const SESSION_KEY = 'rwm_auth_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function matchAuthorProfile(name: string) {
  const needle = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!needle) return undefined;
  return Object.values(AUTHORS).find((author) => {
    const candidate = author.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return candidate === needle || candidate.includes(needle) || needle.includes(candidate);
  })?.id;
}

function readStoredSession() {
  const stored = readLocal<AuthUser | null>(SESSION_KEY, null);
  if (stored && typeof stored.name === 'string' && (stored.role === 'reader' || stored.role === 'author')) {
    return stored;
  }
  return null;
}

const SUPABASE_PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  email: 'email',
};

/** Maps a real Supabase session onto the reader/author profile the UI expects. */
function fromSupabaseUser(account: User, isEditor: boolean): AuthUser {
  const metadata = (account.user_metadata ?? {}) as Record<string, unknown>;
  const provider = typeof account.app_metadata?.provider === 'string' ? account.app_metadata.provider : 'email';
  const handle = typeof metadata.user_name === 'string' ? metadata.user_name : undefined;
  const email = account.email ?? '';
  const name =
    [metadata.full_name, metadata.name, handle].find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    ) ?? (email.split('@')[0] || 'Reader');
  const cleanName = cleanText(name, 120);

  return {
    id: account.id,
    name: cleanName,
    email,
    avatar: safeInitials(cleanName, 'RD'),
    role: isEditor ? 'author' : 'reader',
    authProvider: provider === 'github' ? 'github' : provider === 'google' ? 'google' : 'email',
    verifiedTitle: `${isEditor ? 'Editor' : 'Reader'} · signed in with ${SUPABASE_PROVIDER_LABELS[provider] ?? provider}`,
    verifiedIdentifier: provider === 'github' && handle ? `@${handle}` : email || undefined,
    authorProfileId: matchAuthorProfile(cleanName),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // True while `user` mirrors a Supabase session rather than the local prototype.
  const supabaseBacked = useRef(false);

  useEffect(() => {
    setUser(readStoredSession());

    if (!hasSupabaseBrowserConfig()) {
      setHydrated(true);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function sync(account: User | null) {
      if (!account) {
        if (supabaseBacked.current) {
          supabaseBacked.current = false;
          setUser(readStoredSession());
        }
        return;
      }
      const { data: isEditor } = await supabase.rpc('is_editor');
      if (!active) return;
      supabaseBacked.current = true;
      setUser(fromSupabaseUser(account, isEditor === true));
    }

    supabase.auth
      .getUser()
      .then(({ data }) => sync(data.user))
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrated(true);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Defer: Supabase must not be called synchronously inside this callback.
        setTimeout(() => void sync(session?.user ?? null), 0);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  function saveSession(nextUser: AuthUser | null) {
    setUser(nextUser);
    if (nextUser) {
      writeLocal(SESSION_KEY, nextUser);
    } else {
      removeLocal(SESSION_KEY);
    }
    window.dispatchEvent(new Event('rwm:session-changed'));
  }

  function loginWithGmail(email: string, name: string): AuthResult {
    const cleanEmail = cleanText(email, 254);
    const cleanName = cleanText(name, 120);
    if (!cleanName) return { ok: false, error: 'Add the name that should appear on your reading profile.' };
    if (!isValidEmail(cleanEmail)) return { ok: false, error: 'Enter a complete email address, including an @ and a domain.' };

    saveSession({
      id: `reader-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      avatar: safeInitials(cleanName, 'RD'),
      role: 'reader',
      authProvider: 'gmail',
      verifiedTitle: 'Reader account',
    });
    return { ok: true };
  }

  function verifyWithOrcid(orcidId: string, name: string): AuthResult {
    const cleanName = cleanText(name, 120);
    const orcid = normalizeOrcid(orcidId);
    if (!cleanName) return { ok: false, error: 'Add the researcher name associated with the ORCID record.' };
    if (!orcid) return { ok: false, error: 'An ORCID iD has 16 digits, formatted as 0000-0000-0000-0000.' };
    if (!orcidChecksumIsValid(orcid)) {
      return { ok: false, error: 'That ORCID iD does not pass the checksum. Recheck the final character.' };
    }

    saveSession({
      id: `author-orcid-${orcid}`,
      name: cleanName,
      email: '',
      avatar: safeInitials(cleanName, 'OR'),
      role: 'author',
      authProvider: 'orcid',
      verifiedTitle: 'ORCID iD recorded (prototype)',
      verifiedIdentifier: orcid,
      authorProfileId: matchAuthorProfile(cleanName),
    });
    return { ok: true };
  }

  function verifyWithGithub(handle: string, name: string): AuthResult {
    const cleanName = cleanText(name, 120);
    const cleanHandle = normalizeGithubHandle(cleanText(handle, 72));
    if (!cleanName) return { ok: false, error: 'Add the name that should appear with the GitHub handle.' };
    if (!cleanHandle) return { ok: false, error: 'Enter a GitHub handle using letters, numbers, and single hyphens.' };

    saveSession({
      id: `author-github-${cleanHandle.toLowerCase()}`,
      name: cleanName,
      email: `${cleanHandle.toLowerCase()}@users.noreply.github.com`,
      avatar: safeInitials(cleanName, 'GH'),
      role: 'author',
      authProvider: 'github',
      verifiedTitle: 'GitHub handle recorded (prototype)',
      verifiedIdentifier: `@${cleanHandle}`,
      authorProfileId: matchAuthorProfile(cleanName),
    });
    return { ok: true };
  }

  function verifyWithInstitution(workEmail: string, institutionName: string, name: string): AuthResult {
    const cleanEmail = cleanText(workEmail, 254);
    const cleanName = cleanText(name, 120);
    const cleanInstitution = cleanText(institutionName, 160);
    if (!cleanName) return { ok: false, error: 'Add the faculty or researcher name.' };
    if (!isValidEmail(cleanEmail)) return { ok: false, error: 'Enter a complete institutional email address.' };
    if (!isInstitutionalEmail(cleanEmail)) {
      return { ok: false, error: 'Use an academic address such as name@university.edu or name@lab.ac.uk.' };
    }
    if (!cleanInstitution) return { ok: false, error: 'Add the institution that issued the address.' };

    const regionInfo = getInstitutionalRegionDetails(cleanEmail);

    saveSession({
      id: `author-institution-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      avatar: safeInitials(cleanName, 'IN'),
      role: 'author',
      authProvider: 'institution',
      verifiedTitle: `Verified Academic (${regionInfo.regionLabel})`,
      verifiedIdentifier: `${cleanEmail} (${cleanInstitution} · ${regionInfo.countryCode})`,
      institution: cleanInstitution,
      countryCode: regionInfo.countryCode,
      regionLabel: regionInfo.regionLabel,
      authorProfileId: matchAuthorProfile(cleanName),
    });
    return { ok: true };
  }

  function logout() {
    if (supabaseBacked.current && hasSupabaseBrowserConfig()) {
      void getSupabaseBrowserClient().auth.signOut();
    }
    supabaseBacked.current = false;
    saveSession(null);
  }

  function switchRoleForTesting(role: UserRole) {
    if (role === 'author') {
      const author = AUTHORS['maya-lin'];
      saveSession({
        id: `author-github-${author.id}`,
        name: author.name,
        email: 'maya@researchwith.me',
        avatar: author.avatar,
        role: 'author',
        authProvider: 'github',
        verifiedTitle: 'GitHub handle recorded (prototype)',
        verifiedIdentifier: author.verifiedIdentifier,
        institution: author.institution,
        authorProfileId: author.id,
      });
    } else {
      saveSession({
        id: `reader-${Date.now()}`,
        name: 'Alex Taylor',
        email: 'reader@example.com',
        avatar: 'AT',
        role: 'reader',
        authProvider: 'gmail',
        verifiedTitle: 'Reader account',
      });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        hydrated,
        hasAuthorPermissions: user?.role === 'author',
        loginWithGmail,
        verifyWithOrcid,
        verifyWithGithub,
        verifyWithInstitution,
        setSessionUser: saveSession,
        logout,
        switchRoleForTesting,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
