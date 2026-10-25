'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  X, 
  GraduationCap, 
  GitBranch, 
  Building2, 
  Mail, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  ExternalLink,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface IdentityAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'orcid' | 'github' | 'institution' | 'gmail';
}

export default function IdentityAuthModal({
  isOpen,
  onClose,
  defaultTab = 'orcid',
}: IdentityAuthModalProps) {
  const router = useRouter();
  const { 
    user, 
    hasAuthorPermissions, 
    loginWithGmail, 
    verifyWithOrcid, 
    verifyWithGithub, 
    verifyWithInstitution, 
    logout 
  } = useAuth();

  useEffect(() => {
    if (isOpen) {
      router.push(`/verify?method=${defaultTab}`);
      onClose();
    }
  }, [isOpen, defaultTab, onClose, router]);

  const [activeTab, setActiveTab] = useState<'orcid' | 'github' | 'institution' | 'gmail'>(defaultTab);

  // Form states for verification
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
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOrcidAuth = () => {
    setIsVerifying(true);
    setTimeout(() => {
      verifyWithOrcid(orcidId, orcidName);
      setIsVerifying(false);
      setVerificationSuccess('ORCID identity validated! Author publishing rights granted.');
      setTimeout(() => {
        setVerificationSuccess(null);
        onClose();
      }, 1500);
    }, 600);
  };

  const handleGithubAuth = () => {
    setIsVerifying(true);
    setTimeout(() => {
      verifyWithGithub(githubHandle, githubName);
      setIsVerifying(false);
      setVerificationSuccess('GitHub maintainer identity validated! Author publishing rights granted.');
      setTimeout(() => {
        setVerificationSuccess(null);
        onClose();
      }, 1500);
    }, 600);
  };

  const handleInstitutionAuth = () => {
    setIsVerifying(true);
    setTimeout(() => {
      verifyWithInstitution(instEmail, instName, instDoctorName);
      setIsVerifying(false);
      setVerificationSuccess('Institutional domain validated! Author publishing rights granted.');
      setTimeout(() => {
        setVerificationSuccess(null);
        onClose();
      }, 1500);
    }, 600);
  };

  const handleGmailAuth = () => {
    setIsVerifying(true);
    setTimeout(() => {
      loginWithGmail(gmailEmail, gmailName);
      setIsVerifying(false);
      setVerificationSuccess('Logged in via Gmail OAuth. Standard reader permissions active.');
      setTimeout(() => {
        setVerificationSuccess(null);
        onClose();
      }, 1500);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Identity & Domain Verification
              </h3>
              <p className="text-xs text-stone-500">
                Peer-reviewed platform authentication criteria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Identity status banner */}
        {user && (
          <div className="px-6 py-3 bg-stone-100/80 border-b border-stone-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-600">Current Session:</span>
              <span className="font-semibold text-stone-900">{user.name}</span>
              <span className="text-stone-400">·</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                hasAuthorPermissions 
                  ? 'bg-emerald-100 text-emerald-900' 
                  : 'bg-stone-200 text-stone-700'
              }`}>
                {hasAuthorPermissions ? 'Verified Author' : 'Reader (Read-Only)'}
              </span>
            </div>
            {hasAuthorPermissions && user.authorProfileId && (
              <Link
                href={`/author/${user.authorProfileId}`}
                onClick={onClose}
                className="text-amber-900 font-semibold hover:underline flex items-center gap-1"
              >
                <span>My Profile</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}

        {/* Success notification */}
        {verificationSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{verificationSuccess}</span>
          </div>
        )}

        {/* Editorial Policy Callout */}
        <div className="px-6 pt-4 pb-2">
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950">
            <p className="leading-relaxed">
              <strong>Publication Policy:</strong> Writing and publishing rights require verified credentials from <strong>ORCID</strong> (academic researchers), <strong>GitHub</strong> (code maintainers), or an accredited <strong>Institutional Email (.edu)</strong>. Standard Gmail OAuth is welcome for reading, bookmarking, and commenting, but cannot author articles.
            </p>
          </div>
        </div>

        {/* Tabs for Providers */}
        <div className="px-6 pt-3 flex border-b border-stone-200 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('orcid')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'orcid'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>ORCID (Academic)</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'github'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-stone-700" />
            <span>GitHub (Maintainer)</span>
          </button>

          <button
            onClick={() => setActiveTab('institution')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'institution'
                ? 'border-sky-800 text-sky-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-sky-700" />
            <span>Institutional / .edu</span>
          </button>

          <button
            onClick={() => setActiveTab('gmail')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'gmail'
                ? 'border-amber-900 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-stone-500" />
            <span>Gmail (Reader Only)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'orcid' && (
            <div className="space-y-4">
              <div className="text-xs text-stone-600 leading-relaxed">
                Connect your Open Researcher and Contributor ID (ORCID). This connects your peer-reviewed publication record, granting full author status to review papers and publish scientific essays.
              </div>

              <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Researcher Full Name
                  </label>
                  <input
                    type="text"
                    value={orcidName}
                    onChange={(e) => setOrcidName(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 font-sans"
                    placeholder="e.g. Dr. Elena Rostova"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    ORCID Identifier (16 digits)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 font-mono">https://orcid.org/</span>
                    <input
                      type="text"
                      value={orcidId}
                      onChange={(e) => setOrcidId(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono"
                      placeholder="0000-0002-1825-0097"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-emerald-800 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Will grant <strong>Verified Author</strong> status on ResearchWithMe</span>
                </div>
              </div>

              <button
                onClick={handleOrcidAuth}
                disabled={isVerifying || !orcidId.trim()}
                className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isVerifying ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4" />
                    <span>Authenticate via ORCID OAuth</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="text-xs text-stone-600 leading-relaxed">
                Connect your GitHub account. Confirms repository maintenance, public commit history, and technical architecture expertise to publish repo teardowns and systems engineering essays.
              </div>

              <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Maintainer Full Name
                  </label>
                  <input
                    type="text"
                    value={githubName}
                    onChange={(e) => setGithubName(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 font-sans"
                    placeholder="e.g. Maya Lin"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    GitHub Handle / Username
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 font-mono">@</span>
                    <input
                      type="text"
                      value={githubHandle}
                      onChange={(e) => setGithubHandle(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono"
                      placeholder="mayalin-sys"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-stone-800 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-700 shrink-0" />
                  <span>Will grant <strong>Verified Author</strong> status on ResearchWithMe</span>
                </div>
              </div>

              <button
                onClick={handleGithubAuth}
                disabled={isVerifying || !githubHandle.trim()}
                className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isVerifying ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4" />
                    <span>Authenticate via GitHub OAuth</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'institution' && (
            <div className="space-y-4">
              <div className="text-xs text-stone-600 leading-relaxed">
                Validate your affiliation through an accredited academic university or institutional email (.edu, .ac.uk, .gov, or approved research lab).
              </div>

              <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Faculty / Researcher Name
                  </label>
                  <input
                    type="text"
                    value={instDoctorName}
                    onChange={(e) => setInstDoctorName(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 font-sans"
                    placeholder="e.g. Dr. Sarah Chen, MD"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Institutional Email (.edu or accredited domain)
                  </label>
                  <input
                    type="email"
                    value={instEmail}
                    onChange={(e) => setInstEmail(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono"
                    placeholder="schen@jhu.edu"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Institution / University Name
                  </label>
                  <input
                    type="text"
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 font-sans"
                    placeholder="Johns Hopkins University"
                  />
                </div>

                <div className="text-[11px] text-sky-900 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <span>Will grant <strong>Verified Author</strong> status on ResearchWithMe</span>
                </div>
              </div>

              <button
                onClick={handleInstitutionAuth}
                disabled={isVerifying || !instEmail.trim()}
                className="w-full py-2.5 px-4 bg-sky-900 hover:bg-sky-950 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isVerifying ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    <span>Verify Institutional Affiliation</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'gmail' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Notice:</strong> Gmail OAuth logs you in as a <strong>Standard User (Reader)</strong>. You can bookmark articles, save reading lists, and participate in peer discussions, but you will <strong>not</strong> have permissions to publish articles until domain-verified via ORCID, GitHub, or an Institutional email.
                </p>
              </div>

              <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={gmailName}
                    onChange={(e) => setGmailName(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 font-sans"
                    placeholder="Alex Taylor"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Gmail Address
                  </label>
                  <input
                    type="email"
                    value={gmailEmail}
                    onChange={(e) => setGmailEmail(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono"
                    placeholder="alex.taylor@gmail.com"
                  />
                </div>
              </div>

              <button
                onClick={handleGmailAuth}
                disabled={isVerifying || !gmailEmail.trim()}
                className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isVerifying ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Sign in with Google / Gmail (Reader Only)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer with Session Control */}
        {user && (
          <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
            <span className="text-stone-500">Need to switch identity?</span>
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="text-rose-700 hover:text-rose-900 font-medium"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
