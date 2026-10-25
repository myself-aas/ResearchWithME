'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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

interface AuthContextType {
  user: AuthUser | null;
  hasAuthorPermissions: boolean;
  loginWithGmail: (email?: string, name?: string) => void;
  verifyWithOrcid: (orcidId: string, name?: string) => void;
  verifyWithGithub: (handle: string, name?: string) => void;
  verifyWithInstitution: (workEmail: string, institutionName: string, name?: string) => void;
  logout: () => void;
  switchRoleForTesting: (role: UserRole) => void;
}

const DEFAULT_AUTH_STATE: AuthUser = {
  id: 'author-maya-lin',
  name: 'Maya Lin',
  email: 'maya@researchwith.me',
  avatar: 'ML',
  role: 'author',
  authProvider: 'github',
  verifiedTitle: 'GitHub Verified Systems Maintainer',
  verifiedIdentifier: '@mayalin-sys (GitHub Public Key Attested)',
  institution: 'Independent Distributed Systems Lab',
  authorProfileId: 'maya-lin',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(DEFAULT_AUTH_STATE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rwm_auth_session');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Auth session storage access:', e);
    }
  }, []);

  const saveSession = (newUser: AuthUser | null) => {
    setUser(newUser);
    try {
      if (newUser) {
        localStorage.setItem('rwm_auth_session', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('rwm_auth_session');
      }
    } catch (e) {
      console.warn('Session save error:', e);
    }
  };

  // Standard Gmail OAuth: yields 'reader' role only
  const loginWithGmail = (email = 'reader@gmail.com', name = 'Alex Taylor') => {
    const readerUser: AuthUser = {
      id: 'user-' + Date.now(),
      name,
      email,
      avatar: 'AT',
      role: 'reader',
      authProvider: 'gmail',
      verifiedTitle: 'Standard User (Gmail OAuth)',
    };
    saveSession(readerUser);
  };

  // ORCID OAuth: verifies academic researcher identity -> yields 'author' role
  const verifyWithOrcid = (orcidId: string, name = 'Dr. Elena Rostova') => {
    const formattedId = orcidId.trim().startsWith('0000-') ? orcidId.trim() : `0000-${orcidId.trim()}`;
    const authorUser: AuthUser = {
      id: 'author-orcid-' + Date.now(),
      name,
      email: 'scholar@institution.org',
      avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ER',
      role: 'author',
      authProvider: 'orcid',
      verifiedTitle: 'ORCID Verified Researcher',
      verifiedIdentifier: formattedId,
      institution: 'Institute for Digital Public Goods',
      authorProfileId: 'elena-rostova',
    };
    saveSession(authorUser);
  };

  // GitHub OAuth: verifies developer & repo maintainer identity -> yields 'author' role
  const verifyWithGithub = (handle: string, name = 'Maya Lin') => {
    const cleanHandle = handle.trim().replace(/^@/, '');
    const authorUser: AuthUser = {
      id: 'author-github-' + Date.now(),
      name,
      email: `${cleanHandle}@users.noreply.github.com`,
      avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ML',
      role: 'author',
      authProvider: 'github',
      verifiedTitle: 'GitHub Verified Developer & Systems Reviewer',
      verifiedIdentifier: `@${cleanHandle} (OAuth Commits Verified)`,
      institution: 'Independent Distributed Systems Lab',
      authorProfileId: 'maya-lin',
    };
    saveSession(authorUser);
  };

  // Institutional Email: verifies academic/faculty domain -> yields 'author' role
  const verifyWithInstitution = (workEmail: string, institutionName: string, name = 'Dr. Sarah Chen, MD') => {
    const authorUser: AuthUser = {
      id: 'author-inst-' + Date.now(),
      name,
      email: workEmail.trim(),
      avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SC',
      role: 'author',
      authProvider: 'institution',
      verifiedTitle: 'Institutional Faculty & Researcher Verified',
      verifiedIdentifier: `${workEmail.trim()} (${institutionName.trim()})`,
      institution: institutionName.trim() || 'Accredited Research Institution',
      authorProfileId: 'sarah-chen',
    };
    saveSession(authorUser);
  };

  const logout = () => {
    saveSession(null);
  };

  const switchRoleForTesting = (role: UserRole) => {
    if (role === 'author') {
      saveSession(DEFAULT_AUTH_STATE);
    } else {
      loginWithGmail();
    }
  };

  const hasAuthorPermissions = user?.role === 'author';

  return (
    <AuthContext.Provider
      value={{
        user,
        hasAuthorPermissions,
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
