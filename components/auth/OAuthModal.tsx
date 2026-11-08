'use client';

import { useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import {
  GitBranch,
  Mail,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  X,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getInstitutionalRegionDetails, normalizeOrcid, orcidChecksumIsValid } from '@/lib/validation';

export type OAuthModalProvider = 'github' | 'google' | 'orcid' | 'academic';

interface OAuthModalProps {
  isOpen: boolean;
  provider: OAuthModalProvider;
  next?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function OAuthModal({
  isOpen,
  provider,
  next = '/write',
  onClose,
  onSuccess,
}: OAuthModalProps) {
  const router = useRouter();
  const { verifyWithGithub, loginWithGmail, verifyWithOrcid, verifyWithInstitution } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states per provider
  const [ghHandle, setGhHandle] = useState('shuvo-researcher');
  const [ghName, setGhName] = useState('Shuvo (Open Science Contributor)');

  const [googleEmail, setGoogleEmail] = useState('shuvo.1807016@bau.edu.bd');
  const [googleName, setGoogleName] = useState('Shuvo');

  const [orcidId, setOrcidId] = useState('0000-0002-1825-0097');
  const [orcidName, setOrcidName] = useState('Dr. Maya Lin');

  const [academicEmail, setAcademicEmail] = useState('shuvo.1807016@bau.edu.bd');
  const [academicName, setAcademicName] = useState('Shuvo');
  const [academicInstitution, setAcademicInstitution] = useState('Bangladesh Agricultural University (BAU)');

  if (!isOpen) return null;

  async function handleAuthorize() {
    setLoading(true);
    setError(null);

    try {
      // Simulate real OAuth authorization round-trip
      await new Promise((res) => setTimeout(res, 600));

      let result: { ok: boolean; error?: string } = { ok: false };
      let redirectPath = next;

      if (provider === 'github') {
        const handle = ghHandle.trim().replace(/^@/, '');
        if (!handle) throw new Error('Please enter a GitHub handle');
        result = verifyWithGithub(handle, ghName.trim() || handle);
        redirectPath = next || '/write';
      } else if (provider === 'google') {
        if (!googleEmail.trim()) throw new Error('Please enter your Google account email');
        const region = getInstitutionalRegionDetails(googleEmail);
        if (region.isAcademic) {
          // If the Google email is an academic address (.edu, .edu.bd), automatically grant writer status!
          result = verifyWithInstitution(
            googleEmail.trim(),
            region.countryName || 'Academic Institution',
            googleName.trim() || 'Scholar'
          );
          redirectPath = next || '/write';
        } else {
          result = loginWithGmail(googleEmail.trim(), googleName.trim() || 'Reader');
          redirectPath = next || '/';
        }
      } else if (provider === 'orcid') {
        const clean = normalizeOrcid(orcidId);
        if (!clean) throw new Error('Please enter a valid 16-digit ORCID iD');
        if (!orcidChecksumIsValid(clean)) {
          throw new Error('The ORCID iD failed the ISO 7064 checksum. Check the final digit.');
        }
        result = verifyWithOrcid(clean, orcidName.trim() || 'Verified Researcher');
        redirectPath = next || '/write';
      } else if (provider === 'academic') {
        const res = await fetch('/api/auth/verify-institutional', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: academicEmail.trim(),
            institution: academicInstitution.trim(),
            name: academicName.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed');

        result = verifyWithInstitution(
          academicEmail.trim(),
          academicInstitution.trim() || data.countryName || 'University',
          academicName.trim()
        );
        redirectPath = next || '/write';
      }

      if (!result.ok) {
        throw new Error(result.error || 'Authorization was rejected');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
        router.push(redirectPath);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authorization failed';
      setError(msg);
      setLoading(false);
    }
  }

  // Provider branding & scopes
  const configs = {
    github: {
      title: 'GitHub OAuth 2.0 Authorization',
      badge: 'Writer Role',
      badgeClass: 'bg-emerald-100 text-emerald-900',
      icon: GitBranch,
      headerBg: 'bg-stone-900 text-white',
      scopes: [
        'read:user (Read public profile and GPG keys)',
        'user:email (Access verified email address)',
        'public_repo (Attest open-source code and commit signatures)',
      ],
      description:
        'Authorize ResearchWithMe to read your GitHub public profile and grant verified author privileges for publishing reviews and code teardowns.',
    },
    google: {
      title: 'Sign in with Google OAuth',
      badge: 'Reader / Scholar',
      badgeClass: 'bg-amber-100 text-amber-900',
      icon: Mail,
      headerBg: 'bg-red-800 text-white',
      scopes: [
        'openid (Authenticate digital identity)',
        'email (Read your Google email address)',
        'profile (Read basic profile name and picture)',
      ],
      description:
        'Authorize ResearchWithMe to sign in with your Google Account. Enables personal bookmarks, citation builders, and peer discussion.',
    },
    orcid: {
      title: 'ORCID Researcher OAuth 2.0',
      badge: 'Writer Role',
      badgeClass: 'bg-emerald-100 text-emerald-900',
      icon: BookOpen,
      headerBg: 'bg-emerald-800 text-white',
      scopes: [
        'openid (Authenticate 16-digit ORCID persistent iD)',
        '/read-public (Read public publications and peer reviews)',
        '/activities/update (Optional citation attestation)',
      ],
      description:
        'Connect your official 16-digit ORCID persistent identifier with ISO 7064 MOD 11-2 checksum validation to unlock author publishing privileges.',
    },
    academic: {
      title: 'Institutional .edu / .edu.bd Academic SSO',
      badge: 'Writer Role',
      badgeClass: 'bg-emerald-100 text-emerald-900',
      icon: GraduationCap,
      headerBg: 'bg-amber-900 text-white',
      scopes: [
        'edu:identity (Academic faculty or researcher verification)',
        'domain:region (Automated country code .edu.bd, .ac.uk, .edu)',
        'institution:attest (Issue cryptographic attestation token)',
      ],
      description:
        'Verify academic status using your accredited institutional address with automated ccTLD resolution (.edu.bd for Bangladesh, .ac.uk for UK, etc.).',
    },
  };

  const current = configs[provider];
  const Icon = current.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="oauth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${current.headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 id="oauth-modal-title" className="font-serif text-lg font-bold">
                {current.title}
              </h2>
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${current.badgeClass}`}>
                {current.badge}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Authentication Successful!
              </h3>
              <p className="text-sm text-stone-600">
                Identity verified via {provider.toUpperCase()} OAuth. Redirecting to your workspace…
              </p>
              <div className="flex items-center justify-center gap-1.5 font-mono text-xs text-amber-900">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Redirecting now...</span>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-stone-600">
                {current.description}
              </p>

              {/* Scopes Box */}
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3.5">
                <p className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-stone-600" />
                  <span>Requested Scopes & Permissions</span>
                </p>
                <ul className="space-y-1 text-xs text-stone-700">
                  {current.scopes.map((scope, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 font-mono">
                      <span className="text-emerald-700 font-bold">✓</span>
                      <span>{scope}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Account Customization Fields */}
              <div className="space-y-3 border-t border-stone-100 pt-4">
                <p className="text-xs font-semibold text-stone-800">
                  Authorizing Account Credentials:
                </p>

                {provider === 'github' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        GitHub Username
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-stone-400">
                          @
                        </span>
                        <input
                          type="text"
                          value={ghHandle}
                          onChange={(e) => setGhHandle(e.target.value)}
                          className="w-full rounded border border-stone-300 bg-white py-1.5 pl-6 pr-2 font-mono text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={ghName}
                        onChange={(e) => setGhName(e.target.value)}
                        className="w-full rounded border border-stone-300 bg-white py-1.5 px-2.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                    </div>
                  </div>
                )}

                {provider === 'google' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Google Account Email
                      </label>
                      <input
                        type="email"
                        value={googleEmail}
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        className="w-full rounded border border-stone-300 bg-white py-1.5 px-2.5 font-mono text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={googleName}
                        onChange={(e) => setGoogleName(e.target.value)}
                        className="w-full rounded border border-stone-300 bg-white py-1.5 px-2.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                    </div>
                    {googleEmail.includes('.edu') && (
                      <div className="rounded bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                        <span>Academic domain detected! Grants instant Writer & Author role.</span>
                      </div>
                    )}
                  </div>
                )}

                {provider === 'orcid' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        16-digit ORCID iD
                      </label>
                      <input
                        type="text"
                        value={orcidId}
                        onChange={(e) => setOrcidId(e.target.value)}
                        placeholder="0000-0002-1825-0097"
                        className="w-full rounded border border-stone-300 bg-white py-1.5 px-2.5 font-mono text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Researcher Name
                      </label>
                      <input
                        type="text"
                        value={orcidName}
                        onChange={(e) => setOrcidName(e.target.value)}
                        className="w-full rounded border border-stone-300 bg-white py-1.5 px-2.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                    </div>
                  </div>
                )}

                {provider === 'academic' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Institutional Email (.edu / .edu.bd)
                      </label>
                      <input
                        type="email"
                        value={academicEmail}
                        onChange={(e) => setAcademicEmail(e.target.value)}
                        className="w-full rounded border border-stone-300 bg-white py-1.5 px-2.5 font-mono text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Researcher Name
                        </label>
                        <input
                          type="text"
                          value={academicName}
                          onChange={(e) => setAcademicName(e.target.value)}
                          className="w-full rounded border border-stone-300 bg-white py-1.5 px-2.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          University / Institution
                        </label>
                        <input
                          type="text"
                          value={academicInstitution}
                          onChange={(e) => setAcademicInstitution(e.target.value)}
                          className="w-full rounded border border-stone-300 bg-white py-1.5 px-2.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-md border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAuthorize}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Authorizing…</span>
                    </>
                  ) : (
                    <>
                      <span>Authorize & Sign In</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
