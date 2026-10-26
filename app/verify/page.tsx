'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, Building2, Check, CheckCircle2, GitBranch, GraduationCap, Lock, LogOut, Mail, ShieldCheck } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import PageState from '@/components/PageState';
import { AuthProviderType, useAuth } from '@/lib/auth-context';

const methods: Array<{ id: Exclude<AuthProviderType, 'guest'>; label: string; description: string; icon: typeof GraduationCap; role: string }> = [
  { id: 'orcid', label: 'ORCID', description: 'Researchers with an ORCID iD', icon: GraduationCap, role: 'Publishing access' },
  { id: 'github', label: 'GitHub', description: 'Maintainers of public repositories', icon: GitBranch, role: 'Publishing access' },
  { id: 'institution', label: 'Institutional', description: 'Academic .edu or .ac address', icon: Building2, role: 'Publishing access' },
  { id: 'gmail', label: 'Email reader', description: 'Reading, citing, and saving', icon: Mail, role: 'Read-only' },
];

const fieldClass =
  'h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-600';

function VerifyContent() {
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') ?? '';
  const unverified = searchParams.get('error') === 'unverified';
  const requestedMethod = searchParams.get('method');
  const {
    user,
    hydrated,
    hasAuthorPermissions,
    verifyWithOrcid,
    verifyWithGithub,
    verifyWithInstitution,
    loginWithGmail,
    logout,
    switchRoleForTesting,
  } = useAuth();

  const [method, setMethod] = useState<Exclude<AuthProviderType, 'guest'>>(
    methods.some((item) => item.id === requestedMethod) ? (requestedMethod as Exclude<AuthProviderType, 'guest'>) : 'orcid',
  );
  const [name, setName] = useState('');
  const [orcid, setOrcid] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setBusy(true);

    const result =
      method === 'orcid'
        ? verifyWithOrcid(orcid, name)
        : method === 'github'
          ? verifyWithGithub(handle, name)
          : method === 'institution'
            ? verifyWithInstitution(email, institution, name)
            : loginWithGmail(email, name);

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus(
      method === 'gmail'
        ? 'Reader account saved in this browser. You can now save articles and build citations.'
        : 'Scholarly identity recorded in this prototype. Publishing tools are now available.',
    );
  }

  function resetForm() {
    setName('');
    setOrcid('');
    setHandle('');
    setEmail('');
    setInstitution('');
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="border-b border-stone-200 pb-8">
          <h1 className="max-w-3xl font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Contributor identity, without the theatre
          </h1>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-stone-700">
            Publishing tools are reserved for contributors with a checkable scholarly identity. This page records a prototype attestation in your browser. It does not contact ORCID, GitHub, or your institution.
          </p>
          <p className="mt-3 max-w-[60ch] border-l-2 border-amber-800 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
            No credentials leave this device, and no external OAuth exchange takes place. Treat the resulting session as a demonstration of the permission model, not proof of identity.
          </p>
        </header>

        <div className="mt-8 rounded-lg border border-amber-300 bg-amber-50/70 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Dedicated OAuth Authentication Portals
              </span>
              <p className="mt-0.5 text-xs text-amber-950">
                Authenticate via dedicated portals with unique URLs for GitHub, ORCID, .edu / .edu.bd regional SSO, or Google.
              </p>
            </div>
            <Link
              href="/auth/providers"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-amber-900 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 transition-colors shrink-0"
            >
              <span>View All OAuth Portals</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link href="/auth/github" className="rounded border border-amber-300 bg-white px-2.5 py-1 text-stone-800 hover:bg-stone-50">
              /auth/github (GitHub)
            </Link>
            <Link href="/auth/orcid" className="rounded border border-amber-300 bg-white px-2.5 py-1 text-stone-800 hover:bg-stone-50">
              /auth/orcid (ORCID)
            </Link>
            <Link href="/auth/academic" className="rounded border border-amber-300 bg-white px-2.5 py-1 text-stone-800 hover:bg-stone-50">
              /auth/academic (.edu / .edu.bd)
            </Link>
            <Link href="/auth/google" className="rounded border border-amber-300 bg-white px-2.5 py-1 text-stone-800 hover:bg-stone-50">
              /auth/google (Gmail)
            </Link>
          </div>
        </div>

        {unverified && !hasAuthorPermissions && (
          <section role="alert" className="mt-6 border-l-2 border-amber-800 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <p className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <span>Publishing requires a contributor identity</span>
            </p>
            <p className="mt-1 leading-relaxed">
              The writer studio redirected here because the current session is read-only. Record an identity below to continue, or keep reading without publishing.
            </p>
          </section>
        )}

        {status && (
          <p role="status" className="mt-6 flex flex-wrap items-center gap-2 border-l-2 border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{status}</span>
            {hasAuthorPermissions && (
              <Link
                href={redirectTarget || '/write'}
                className="inline-flex min-h-9 items-center gap-1 font-semibold underline underline-offset-4"
              >
                <span>{redirectTarget ? 'Continue' : 'Open the writer studio'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </p>
        )}

        <section aria-labelledby="session-heading" className="mt-8 rounded-lg border border-stone-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-stone-900 font-serif text-base font-bold text-stone-50"
              >
                {user?.avatar ?? 'GU'}
              </span>
              <div>
                <h2 id="session-heading" className="font-serif text-xl font-semibold text-stone-900">
                  {hydrated ? user?.name ?? 'Guest session' : 'Checking this browser…'}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-600">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                      hasAuthorPermissions ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-800'
                    }`}
                  >
                    {hasAuthorPermissions ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span>{hasAuthorPermissions ? 'Contributor' : 'Reader'}</span>
                  </span>
                  {user?.authProvider && user.authProvider !== 'guest' && <span>via {user.authProvider}</span>}
                  {user?.verifiedIdentifier && <span className="break-all font-mono">{user.verifiedIdentifier}</span>}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {user?.authorProfileId && (
                <Link
                  href={`/author/${user.authorProfileId}`}
                  className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-stone-400"
                >
                  View profile
                </Link>
              )}
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setStatus('Session cleared from this browser.');
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-red-300 hover:text-red-800"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    switchRoleForTesting('author');
                    setStatus('Demonstration contributor session started.');
                  }}
                  className="inline-flex min-h-11 items-center rounded-md border border-dashed border-stone-400 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  Use a demo contributor
                </button>
              )}
            </div>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-stone-200 pt-5 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-stone-600">Read articles</dt>
              <dd className="mt-1 font-medium text-emerald-900">All visitors</dd>
            </div>
            <div>
              <dt className="text-stone-600">Save and cite</dt>
              <dd className="mt-1 font-medium text-emerald-900">All visitors</dd>
            </div>
            <div>
              <dt className="text-stone-600">Draft in the studio</dt>
              <dd className={`mt-1 font-medium ${hasAuthorPermissions ? 'text-emerald-900' : 'text-stone-700'}`}>
                {hasAuthorPermissions ? 'Contributor' : 'Sign-in required'}
              </dd>
            </div>
            <div>
              <dt className="text-stone-600">Publish a review</dt>
              <dd className={`mt-1 font-medium ${hasAuthorPermissions ? 'text-emerald-900' : 'text-stone-700'}`}>
                {hasAuthorPermissions ? 'Contributor' : 'Sign-in required'}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="method-heading" className="mt-10">
          <h2 id="method-heading" className="font-serif text-2xl font-bold text-stone-900">
            Record an identity
          </h2>

          <div role="tablist" aria-label="Verification method" className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {methods.map((item) => {
              const selected = method === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${item.id}`}
                  id={`tab-${item.id}`}
                  onClick={() => {
                    setMethod(item.id);
                    resetForm();
                  }}
                  className={`min-h-24 rounded-md border p-4 text-left transition-colors ${
                    selected ? 'border-amber-900 bg-amber-50' : 'border-stone-300 bg-white hover:border-stone-400'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${selected ? 'text-amber-900' : 'text-stone-600'}`} aria-hidden="true" />
                  <span className="mt-2 block font-serif text-base font-semibold text-stone-900">{item.label}</span>
                  <span className="mt-0.5 block text-sm text-stone-600">{item.description}</span>
                  <span className="mt-1 block text-sm font-medium text-stone-700">{item.role}</span>
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`panel-${method}`}
            aria-labelledby={`tab-${method}`}
            className="mt-6 rounded-lg border border-stone-200 bg-white p-6"
          >
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="verify-name" className="mb-1.5 block text-sm font-medium text-stone-800">
                  Name for this session
                </label>
                <input
                  id="verify-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Dr. Elena Rostova"
                  className={fieldClass}
                />
              </div>

              {method === 'orcid' && (
                <div>
                  <label htmlFor="verify-orcid" className="mb-1.5 block text-sm font-medium text-stone-800">
                    ORCID iD
                  </label>
                  <input
                    id="verify-orcid"
                    type="text"
                    inputMode="numeric"
                    value={orcid}
                    onChange={(event) => setOrcid(event.target.value)}
                    placeholder="0000-0002-1825-0097"
                    aria-describedby="verify-orcid-hint"
                    className={`${fieldClass} font-mono`}
                  />
                  <p id="verify-orcid-hint" className="mt-1 text-sm text-stone-600">
                    16 digits, usually written in four groups of four. The checksum is validated locally.
                  </p>
                </div>
              )}

              {method === 'github' && (
                <div>
                  <label htmlFor="verify-github" className="mb-1.5 block text-sm font-medium text-stone-800">
                    GitHub handle
                  </label>
                  <input
                    id="verify-github"
                    type="text"
                    autoComplete="username"
                    value={handle}
                    onChange={(event) => setHandle(event.target.value)}
                    placeholder="mayalin-sys"
                    aria-describedby="verify-github-hint"
                    className={`${fieldClass} font-mono`}
                  />
                  <p id="verify-github-hint" className="mt-1 text-sm text-stone-600">
                    Letters, numbers, and single hyphens. The handle is recorded, not authenticated.
                  </p>
                </div>
              )}

              {method === 'institution' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="verify-institution" className="mb-1.5 block text-sm font-medium text-stone-800">
                      Institution
                    </label>
                    <input
                      id="verify-institution"
                      type="text"
                      value={institution}
                      onChange={(event) => setInstitution(event.target.value)}
                      placeholder="Johns Hopkins University"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="verify-email" className="mb-1.5 block text-sm font-medium text-stone-800">
                      Institutional email
                    </label>
                    <input
                      id="verify-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@university.edu"
                      className={fieldClass}
                    />
                  </div>
                </div>
              )}

              {method === 'gmail' && (
                <div>
                  <label htmlFor="verify-reader-email" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Email address
                  </label>
                  <input
                    id="verify-reader-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="reader@example.com"
                    className={fieldClass}
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="border-l-2 border-red-800 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {method === 'gmail' ? 'Save reader account' : 'Record contributor identity'}
                  </span>
                </button>
                <p className="text-sm text-stone-600">Stored in this browser only.</p>
              </div>
            </form>
          </div>
        </section>

        <section aria-labelledby="verify-limits" className="mt-10 border-t border-stone-200 pt-8">
          <h2 id="verify-limits" className="font-serif text-xl font-semibold text-stone-900">
            What this does not do
          </h2>
          <ul className="mt-3 grid gap-3 text-base leading-relaxed text-stone-700 sm:grid-cols-2">
            <li className="flex gap-2">
              <Check className="mt-1 h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
              <span>It does not verify that an ORCID iD or GitHub handle belongs to you.</span>
            </li>
            <li className="flex gap-2">
              <Check className="mt-1 h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
              <span>It does not send an email or confirm an institutional address.</span>
            </li>
            <li className="flex gap-2">
              <Check className="mt-1 h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
              <span>It does not grant access to any server-side action beyond this demonstration.</span>
            </li>
            <li className="flex gap-2">
              <Check className="mt-1 h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
              <span>It can be cleared at any time with “Sign out” above.</span>
            </li>
          </ul>
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50">
          <PageState
            role="status"
            code="Loading"
            title="Opening the verification record"
            description="Reading the current session from this browser."
            primaryAction={{ href: '/', label: 'Return to the journal' }}
          />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
