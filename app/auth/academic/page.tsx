'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Globe,
  Building2,
} from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { useAuth } from '@/lib/auth-context';
import { getInstitutionalRegionDetails } from '@/lib/validation';

export default function AcademicOAuthPage() {
  const router = useRouter();
  const { verifyWithInstitution, user, hasAuthorPermissions } = useAuth();

  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedPayload, setVerifiedPayload] = useState<{
    token: string;
    countryCode: string;
    countryName: string;
    regionLabel: string;
  } | null>(null);

  // Real-time analysis of institutional region & country code
  const regionInfo = useMemo(() => {
    if (!email.includes('@')) return null;
    return getInstitutionalRegionDetails(email);
  }, [email]);

  async function handleVerification(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      setError('Please provide your name and institutional email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-institutional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          institution: institution.trim() || regionInfo?.countryName,
          name: name.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Institutional verification failed');
      }

      // Update auth context
      const authRes = verifyWithInstitution(
        email.trim(),
        institution.trim() || data.countryName || 'Verified University',
        name.trim()
      );

      if (!authRes.ok) {
        throw new Error(authRes.error);
      }

      setVerifiedPayload({
        token: data.verificationToken,
        countryCode: data.countryCode,
        countryName: data.countryName,
        regionLabel: data.regionLabel,
      });

      setTimeout(() => {
        router.push('/write');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Institutional verification failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone-600">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-stone-900 hover:underline">
                Journal
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li>
              <Link href="/auth/providers" className="hover:text-stone-900 hover:underline">
                Authentication
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li aria-current="page" className="font-medium text-stone-900">
              Institutional & Regional (.edu / .edu.bd)
            </li>
          </ol>
        </nav>

        <div className="rounded-lg border border-stone-200 bg-white p-6 sm:p-10 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-900 text-white shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-900">
                  Unique Route: /auth/academic
                </span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                  Writer Role
                </span>
              </div>
              <h1 className="mt-1 font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
                Academic & Regional (.edu / .edu.bd) Verification
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            Verify academic status using your institutional domain. We support accredited educational email domains worldwide with automated country/region code detection—including <strong>.edu</strong>, <strong>.edu.bd</strong> (Bangladesh), <strong>.ac.uk</strong> (United Kingdom), <strong>.edu.au</strong> (Australia), <strong>.ac.in</strong> (India), and regional ccTLDs.
          </p>

          {/* Active Session Status */}
          {user && hasAuthorPermissions && (
            <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>Verified as {user.name} ({user.institution || user.email})</span>
                </span>
                <Link
                  href="/write"
                  className="rounded bg-emerald-800 px-3 py-1 font-semibold text-white hover:bg-emerald-900 transition-colors"
                >
                  Go to Writer Studio
                </Link>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleVerification} className="mt-8 space-y-5">
            <div>
              <label htmlFor="academic-email" className="block text-xs font-semibold text-stone-800 mb-1">
                Institutional Email Address <span className="text-red-700">*</span>
              </label>
              <input
                id="academic-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. researcher@du.edu.bd or scholar@mit.edu"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-800 font-mono"
                disabled={loading}
              />

              {/* Dynamic Country/Region Indicator */}
              {regionInfo && (
                <div className={`mt-2 flex items-center gap-2 rounded-md p-2 text-xs ${
                  regionInfo.isAcademic
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-stone-100 text-stone-700 border border-stone-200'
                }`}>
                  <Globe className="h-4 w-4 shrink-0" />
                  <div className="flex-1 flex flex-wrap items-center justify-between gap-1">
                    <span>
                      Detected: <strong>{regionInfo.regionLabel}</strong>
                    </span>
                    <span className="rounded bg-white/80 px-2 py-0.5 font-mono text-xs font-bold">
                      Region Code: {regionInfo.countryCode}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="academic-institution" className="block text-xs font-semibold text-stone-800 mb-1">
                University or Research Institution <span className="text-red-700">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">
                  <Building2 className="h-4 w-4" />
                </span>
                <input
                  id="academic-institution"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. University of Dhaka, BUET, or Harvard Medical School"
                  className="w-full rounded-md border border-stone-300 bg-white pl-9 pr-3 py-2.5 text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-800"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="academic-name" className="block text-xs font-semibold text-stone-800 mb-1">
                Author & Contributor Name <span className="text-red-700">*</span>
              </label>
              <input
                id="academic-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Asif Ahmed"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-800"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {verifiedPayload && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>Academic Attestation Verified!</span>
                </div>
                <div className="grid gap-1 font-mono text-xs text-emerald-900">
                  <div>Region: {verifiedPayload.regionLabel} [{verifiedPayload.countryCode}]</div>
                  <div>Token: {verifiedPayload.token}</div>
                  <div>Granted Role: Verified Academic Writer</div>
                </div>
                <p className="text-stone-600 pt-1 font-sans">
                  Redirecting to the Writer Studio...
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !name.trim()}
              className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-md bg-amber-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-amber-800 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying Institutional Domain...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verify Academic Credentials & Grant Writer Access</span>
                </>
              )}
            </button>
          </form>

          {/* Preset regional academic examples */}
          <div className="mt-8 rounded-md bg-stone-50 p-4 border border-stone-200 space-y-2">
            <span className="text-xs font-semibold text-stone-800 block">
              Quick Test Presets (Click to autofill):
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail('scholar@du.edu.bd');
                  setInstitution('University of Dhaka');
                  setName('Dr. Asif Ahmed');
                }}
                className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-800 hover:border-amber-800"
              >
                🇧🇩 .edu.bd · Univ of Dhaka
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('faculty@buet.ac.bd');
                  setInstitution('BUET');
                  setName('Prof. T. Rahman');
                }}
                className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-800 hover:border-amber-800"
              >
                🇧🇩 .ac.bd · BUET
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('vance@cam.ac.uk');
                  setInstitution('University of Cambridge');
                  setName('Prof. Marcus Vance');
                }}
                className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-800 hover:border-amber-800"
              >
                🇬🇧 .ac.uk · Cambridge
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('chen@jhu.edu');
                  setInstitution('Johns Hopkins Bloomberg School');
                  setName('Dr. Sarah Chen');
                }}
                className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-800 hover:border-amber-800"
              >
                🇺🇸 .edu · Johns Hopkins
              </button>
            </div>
          </div>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
