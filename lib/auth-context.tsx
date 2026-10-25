'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { AUTHORS } from './blog-data';
import { safeInitials } from './format';
import { readLocal, removeLocal, writeLocal } from './storage';
import {
  cleanText,
  isInstitutionalEmail,
  isValidEmail,
  normalizeGithubHandle,
  normalizeOrcid,
  orcidChecksumIsValid,
} from './validation';

export type UserRole = 'reader' | 'author';
export type AuthProviderType = 'guest' | 'gmail' | 'orcid' | 'github' | 'institution';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readLocal<AuthUser | null>(SESSION_KEY, null);
    if (stored && typeof stored.name === 'string' && (stored.role === 'reader' || stored.role === 'author')) {
      setUser(stored);
    }
    setHydrated(true);
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

    saveSession({
      id: `author-institution-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      avatar: safeInitials(cleanName, 'IN'),
      role: 'author',
      authProvider: 'institution',
      verifiedTitle: 'Institutional affiliation recorded (prototype)',
      verifiedIdentifier: `${cleanEmail} (${cleanInstitution})`,
      institution: cleanInstitution,
      authorProfileId: matchAuthorProfile(cleanName),
    });
    return { ok: true };
  }

  function logout() {
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
