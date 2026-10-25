'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  ShieldCheck, 
  GraduationCap, 
  GitBranch, 
  Building2, 
  Mail, 
  CheckCircle2, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  ExternalLink, 
  Check, 
  AlertCircle, 
  KeyRound, 
  FileCheck2, 
  RefreshCw, 
  LogOut, 
  UserCheck 
} from 'lucide-react';
import { useAuth, AuthProviderType } from '@/lib/auth-context';

export default function VerifyPage(props: {
  searchParams?: Promise<{ method?: string; redirect?: string; error?: string }>;
}) {
  const router = useRouter();
  const searchParams = props.searchParams ? use(props.searchParams) : undefined;
  const initialMethod = (searchParams?.method as AuthProviderType) || undefined;
  const redirectTarget = searchParams?.redirect || '';
  const errorParam = searchParams?.error || '';

  const { 
    user, 
    hasAuthorPermissions, 
    verifyWithOrcid, 
    verifyWithGithub, 
    verifyWithInstitution, 
    loginWithGmail, 
    logout, 
    switchRoleForTesting 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthProviderType>(
    initialMethod && ['orcid', 'github', 'institution', 'gmail'].includes(initialMethod)
      ? initialMethod
      : user?.authProvider || 'orcid'
  );

  // Input states
  const [orcidId, setOrcidId] = useState('0000-0002-1825-0097');
  const [orcidName, setOrcidName] = useState('Dr. Elena Rostova');

  const [githubHandle, setGithubHandle] = useState('mayalin-sys');
  const [githubName, setGithubName] = useState('Maya Lin');

  const [instEmail, setInstEmail] = useState('schen@jhu.edu');
  const [instName, setInstName] = useState('Johns Hopkins Bloomberg School of Public Health');
  const [instDoctorName, setInstDoctorName] = useState('Dr. Sarah Chen, MD');

  const [gmailEmail, setGmailEmail] = useState('reader@gmail.com');
  const [gmailName, setGmailName] = useState('Alex Taylor');

  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleOrcidAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setStatusMessage(null);
    setTimeout(() => {
      verifyWithOrcid(orcidId, orcidName);
      setIsVerifying(false);
      setStatusMessage('ORCID identity successfully validated! Author publishing rights activated.');
    }, 600);
  };

  const handleGithubAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setStatusMessage(null);
    setTimeout(() => {
      verifyWithGithub(githubHandle, githubName);
      setIsVerifying(false);
      setStatusMessage('GitHub maintainer identity validated! Author publishing rights activated.');
    }, 600);
  };

  const handleInstitutionAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setStatusMessage(null);
    setTimeout(() => {
      verifyWithInstitution(instEmail, instName, instDoctorName);
      setIsVerifying(false);
      setStatusMessage('Institutional affiliation validated! Author publishing rights activated.');
    }, 600);
  };

  const handleGmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setStatusMessage(null);
    setTimeout(() => {
      loginWithGmail(gmailEmail, gmailName);
      setIsVerifying(false);
      setStatusMessage('Signed in via Gmail OAuth. Reader permissions active.');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      <BlogHeader />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Publications Feed</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Editorial Protocol:</span>
            <span className="text-[11px] font-mono bg-stone-200/70 text-stone-800 px-2 py-0.5 rounded">
              RFC-04 Domain Attestation
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="border-b border-stone-200 pb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-900" />
            <span>Identity & Domain Expertise Gateway</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Author Authentication & Access Control
          </h1>
          <p className="text-sm sm:text-base text-stone-600 font-serif max-w-3xl leading-relaxed">
            ResearchWithMe is an independent publication dedicated to rigorous analysis, scientific paper breakdowns, and open-source software teardowns. To protect our readership from unverified content and maintain editorial integrity, publishing permissions require verified domain credentials via <strong>ORCID</strong>, <strong>GitHub</strong>, or an accredited <strong>Institutional Email</strong>.
          </p>
        </div>

        {/* Unverified Redirect Alert */}
        {errorParam === 'unverified' && !hasAuthorPermissions && (
          <div className="p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-300 text-stone-900 flex items-start gap-3.5 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm text-amber-950">
                Author Domain Verification Required to Publish
              </div>
              <p className="text-stone-700 leading-relaxed font-sans">
                You were directed here because attempting to publish or draft reviewed articles requires domain credential validation. Choose one of the three accredited options below (ORCID, GitHub, or Institutional .edu) to activate your verified author privileges.
              </p>
            </div>
          </div>
        )}

        {/* Redirect Proceed Alert */}
        {redirectTarget && hasAuthorPermissions && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold text-xs sm:text-sm">
                Domain credentials confirmed! You now have author publishing rights.
              </span>
            </div>
            <Link
              href={redirectTarget}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
            >
              <span>Return to {redirectTarget === '/write' ? 'Writer Studio' : 'Previous Page'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Status Alert if triggered */}
        {statusMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{statusMessage}</span>
            </div>
            {hasAuthorPermissions ? (
              <Link
                href={redirectTarget || '/write'}
                className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
              >
                <span>{redirectTarget ? 'Proceed' : 'Launch Studio'}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            ) : null}
          </div>
        )}

        {/* Current Identity & Session Dashboard */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center font-serif text-base font-bold shadow-xs">
                {user?.avatar || 'GU'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-serif text-lg font-bold text-stone-900">
                    {user?.name || 'Guest / Unauthenticated'}
                  </h2>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                    hasAuthorPermissions 
                      ? 'bg-emerald-100 text-emerald-900' 
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {hasAuthorPermissions ? 'Verified Author' : 'Reader (Read-Only)'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  {user?.email || 'No active session'} · Provider: <strong className="uppercase">{user?.authProvider || 'None'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {hasAuthorPermissions && user?.authorProfileId && (
                <Link
                  href={`/author/${user.authorProfileId}`}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3 text-stone-500" />
                  <span>View Author Dossier</span>
                </Link>
              )}

              {user && (
                <button
                  onClick={() => {
                    logout();
                    setStatusMessage('Session terminated. You are now browsing as a guest.');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              )}

              {/* Developer Test Switcher */}
              <button
                onClick={() => switchRoleForTesting(hasAuthorPermissions ? 'reader' : 'author')}
                className="px-2.5 py-1.5 rounded-lg border border-dashed border-stone-300 text-[11px] font-mono text-stone-600 hover:bg-stone-100 transition-colors"
                title="Toggle role immediately to test permissions"
              >
                Switch Role to {hasAuthorPermissions ? 'Reader' : 'Author'}
              </button>
            </div>
          </div>

          {/* Capabilities Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
              <span className="text-[11px] text-stone-500 font-medium block">Explore & Read</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Granted (All users)</span>
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
              <span className="text-[11px] text-stone-500 font-medium block">Bookmarks & Citations</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Granted (All users)</span>
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
              <span className="text-[11px] text-stone-500 font-medium block">Write & Draft Articles</span>
              <span className={`font-semibold flex items-center gap-1 mt-1 ${
                hasAuthorPermissions ? 'text-emerald-700' : 'text-amber-800'
              }`}>
                {hasAuthorPermissions ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unlocked</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Domain Auth Required</span>
                  </>
                )}
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
              <span className="text-[11px] text-stone-500 font-medium block">Publish & Review Repos</span>
              <span className={`font-semibold flex items-center gap-1 mt-1 ${
                hasAuthorPermissions ? 'text-emerald-700' : 'text-amber-800'
              }`}>
                {hasAuthorPermissions ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Approved</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Restricted</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* OAuth Authentication Providers Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-stone-900">
              Select Your Authentication Authority
            </h2>
            <span className="text-xs text-stone-500">
              Pick your credential provider below
            </span>
          </div>

          {/* Provider Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveTab('orcid')}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeTab === 'orcid'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-900">ORCID</h3>
              <p className="text-[11px] text-stone-500 mt-0.5">Researchers & Scientists</p>
              <span className="inline-block mt-2 text-[10px] font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                Author Status: Yes
              </span>
            </button>

            <button
              onClick={() => setActiveTab('github')}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeTab === 'github'
                  ? 'border-stone-900 bg-stone-100 shadow-xs ring-1 ring-stone-900'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-900 flex items-center justify-center mb-2">
                <GitBranch className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-900">GitHub</h3>
              <p className="text-[11px] text-stone-500 mt-0.5">Systems & Code Authors</p>
              <span className="inline-block mt-2 text-[10px] font-mono text-stone-900 bg-stone-200 px-1.5 py-0.5 rounded">
                Author Status: Yes
              </span>
            </button>

            <button
              onClick={() => setActiveTab('institution')}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeTab === 'institution'
                  ? 'border-sky-600 bg-sky-50/70 shadow-xs ring-1 ring-sky-500'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-900 flex items-center justify-center mb-2">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-900">Institutional</h3>
              <p className="text-[11px] text-stone-500 mt-0.5">University / .edu email</p>
              <span className="inline-block mt-2 text-[10px] font-mono text-sky-900 bg-sky-100 px-1.5 py-0.5 rounded">
                Author Status: Yes
              </span>
            </button>

            <button
              onClick={() => setActiveTab('gmail')}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeTab === 'gmail'
                  ? 'border-amber-700 bg-amber-50/70 shadow-xs ring-1 ring-amber-600'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center mb-2">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-900">Google / Gmail</h3>
              <p className="text-[11px] text-stone-500 mt-0.5">General Readers & Students</p>
              <span className="inline-block mt-2 text-[10px] font-mono text-stone-600 bg-stone-200 px-1.5 py-0.5 rounded">
                Reader Status: Read-Only
              </span>
            </button>
          </div>

          {/* Verification Form Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            {activeTab === 'orcid' && (
              <form onSubmit={handleOrcidAuth} className="space-y-5">
                <div className="border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-700" />
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      ORCID Academic OAuth Gateway
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    Connecting your ORCID iD proves your authorship of peer-reviewed literature, grants you instant author credentials, and automatically formats your bibliography across ResearchWithMe.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Researcher Name *
                    </label>
                    <input
                      type="text"
                      value={orcidName}
                      onChange={(e) => setOrcidName(e.target.value)}
                      required
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white"
                      placeholder="Dr. Elena Rostova"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      ORCID Identifier (16 digits) *
                    </label>
                    <input
                      type="text"
                      value={orcidId}
                      onChange={(e) => setOrcidId(e.target.value)}
                      required
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white"
                      placeholder="0000-0002-1825-0097"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
                  <span>Grants permissions: Write essays, review arXiv preprints, mint DOIs.</span>
                  <span className="font-mono text-[11px] font-semibold text-emerald-800">OAuth 2.0 PKCE</span>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isVerifying ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <GraduationCap className="w-4 h-4" />
                      <span>Authenticate with ORCID & Activate Author Permissions</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {activeTab === 'github' && (
              <form onSubmit={handleGithubAuth} className="space-y-5">
                <div className="border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-stone-900" />
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      GitHub Developer & Maintainer OAuth Gateway
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    Connecting your GitHub account attests to your software architecture experience, repository maintenance, and open-source contributions to author high-impact repo teardowns.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Developer / Architect Name *
                    </label>
                    <input
                      type="text"
                      value={githubName}
                      onChange={(e) => setGithubName(e.target.value)}
                      required
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white"
                      placeholder="Maya Lin"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      GitHub Handle *
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400 font-mono">@</span>
                      <input
                        type="text"
                        value={githubHandle}
                        onChange={(e) => setGithubHandle(e.target.value)}
                        required
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white"
                        placeholder="mayalin-sys"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-800 flex items-center justify-between">
                  <span>Grants permissions: Write codebase teardowns, analyze kernels, critique distributed systems.</span>
                  <span className="font-mono text-[11px] font-semibold text-stone-700">OAuth 2.0 Token</span>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isVerifying ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <GitBranch className="w-4 h-4" />
                      <span>Authenticate with GitHub & Activate Author Permissions</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {activeTab === 'institution' && (
              <form onSubmit={handleInstitutionAuth} className="space-y-5">
                <div className="border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-sky-800" />
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      Institutional Faculty & Laboratory Validation
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    Verify faculty, postdoctoral, or research fellow credentials through your accredited university or research laboratory email domain (.edu, .ac.uk, or registered research institute).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Faculty Name *
                    </label>
                    <input
                      type="text"
                      value={instDoctorName}
                      onChange={(e) => setInstDoctorName(e.target.value)}
                      required
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white"
                      placeholder="Dr. Sarah Chen, MD"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Institutional Email (.edu domain) *
                    </label>
                    <input
                      type="email"
                      value={instEmail}
                      onChange={(e) => setInstEmail(e.target.value)}
                      required
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white"
                      placeholder="schen@jhu.edu"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      University / Institute *
                    </label>
                    <input
                      type="text"
                      value={instName}
                      onChange={(e) => setInstName(e.target.value)}
                      required
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white"
                      placeholder="Johns Hopkins University"
                    />
                  </div>
                </div>

                <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs text-sky-950 flex items-center justify-between">
                  <span>Grants permissions: Author clinical reviews, public policy analyses, and STEM essays.</span>
                  <span className="font-mono text-[11px] font-semibold text-sky-800">Domain SPF/DKIM</span>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3 bg-sky-900 hover:bg-sky-950 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isVerifying ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      <span>Verify Institutional Email & Activate Author Permissions</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {activeTab === 'gmail' && (
              <form onSubmit={handleGmailAuth} className="space-y-5">
                <div className="border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-amber-800" />
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      Google / Gmail OAuth (Reader Status)
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    Standard sign-in for readers, graduate students, and independent learners. Allows you to participate in moderated peer discussions, save articles to reading lists, and generate citations.
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Editorial Gate Policy:</strong> Gmail authentication grants <strong>Reader</strong> permissions only. To be approved as an author with rights to write and publish articles, you must authenticate through at least one of the three verified domain providers above (ORCID, GitHub, or Institutional Email).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={gmailName}
                      onChange={(e) => setGmailName(e.target.value)}
                      required
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white"
                      placeholder="Alex Taylor"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Gmail Address *
                    </label>
                    <input
                      type="email"
                      value={gmailEmail}
                      onChange={(e) => setGmailEmail(e.target.value)}
                      required
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white"
                      placeholder="alex.taylor@gmail.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isVerifying ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Sign in with Google OAuth (Reader Permissions Only)</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Access Control & Standards FAQ */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-lg font-bold text-stone-900">
            Frequently Asked Questions: Domain Verification
          </h2>
          <div className="space-y-3 text-xs text-stone-600 font-sans divide-y divide-stone-100">
            <div className="pt-2">
              <span className="font-semibold text-stone-900 block mb-1">
                Why does ResearchWithMe require domain verification to write articles?
              </span>
              <p className="leading-relaxed">
                To guarantee high scientific and technical standards, we restrict author accounts to domain practitioners. By authenticating via ORCID, GitHub, or institutional emails, we ensure every published essay, paper review, or repo teardown is written by someone with demonstrable expertise in the field.
              </p>
            </div>

            <div className="pt-3">
              <span className="font-semibold text-stone-900 block mb-1">
                What can I do if I only authenticate via standard Gmail?
              </span>
              <p className="leading-relaxed">
                As a standard user, you enjoy full, unmetered access to explore our entire publications catalog, save articles to custom reading queues, participate in moderated peer comment threads, and generate formatted academic citations.
              </p>
            </div>

            <div className="pt-3">
              <span className="font-semibold text-stone-900 block mb-1">
                Can I upgrade my reader account to an author account later?
              </span>
              <p className="leading-relaxed">
                Yes. You can visit this page anytime to connect your ORCID, GitHub, or institutional email, which immediately upgrades your account to verified author status.
              </p>
            </div>
          </div>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
