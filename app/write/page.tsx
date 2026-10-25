'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  PenSquare, 
  Eye, 
  Edit3, 
  GitBranch, 
  FileText, 
  Send, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  Save,
  HelpCircle,
  ShieldCheck,
  GraduationCap,
  Building2,
  Lock,
  User,
  ExternalLink,
  CheckCircle2,
  Mail
} from 'lucide-react';
import { BlogCategory, ArticleFormat, CATEGORIES, AUTHORS, Author, BlogPost } from '@/lib/blog-data';
import { useAuth } from '@/lib/auth-context';

export default function WritePage() {
  const router = useRouter();
  const { 
    user, 
    hasAuthorPermissions, 
    verifyWithOrcid, 
    verifyWithGithub, 
    verifyWithInstitution, 
    loginWithGmail,
    switchRoleForTesting 
  } = useAuth();

  // Mode: Editor or Live Preview
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<BlogCategory>('GitHub Repo Teardowns');
  const [format, setFormat] = useState<ArticleFormat>('Repo Teardown');
  const [selectedAuthorKey, setSelectedAuthorKey] = useState<string>('maya-lin');

  // Custom author state
  const [isCustomAuthor, setIsCustomAuthor] = useState(false);
  const [customAuthorName, setCustomAuthorName] = useState('');
  const [customAuthorRole, setCustomAuthorRole] = useState('');
  const [customAuthorDomain, setCustomAuthorDomain] = useState('');

  // Reviewed Artifact states
  const [hasReviewedArtifact, setHasReviewedArtifact] = useState(true);
  const [artifactType, setArtifactType] = useState<'github' | 'paper'>('github');
  const [artifactIdentifier, setArtifactIdentifier] = useState('');
  const [artifactTitle, setArtifactTitle] = useState('');
  const [artifactUrl, setArtifactUrl] = useState('');
  const [artifactMeta, setArtifactMeta] = useState('');

  // Content
  const [summary, setSummary] = useState('');
  const [takeaways, setTakeaways] = useState<string[]>([
    'First critical engineering or empirical insight...',
    'Key performance benchmark or replication note...',
  ]);
  const [fullContent, setFullContent] = useState('');
  const [tags, setTags] = useState('Systems, Open Source, Performance');

  // Status & Validation
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Draft loaded');

  // Auto-save draft in localStorage
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('rwm_writer_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.subtitle) setSubtitle(parsed.subtitle);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.format) setFormat(parsed.format);
        if (parsed.summary) setSummary(parsed.summary);
        if (parsed.fullContent) setFullContent(parsed.fullContent);
        if (parsed.artifactIdentifier) setArtifactIdentifier(parsed.artifactIdentifier);
        if (parsed.artifactTitle) setArtifactTitle(parsed.artifactTitle);
        if (parsed.artifactMeta) setArtifactMeta(parsed.artifactMeta);
        if (parsed.artifactUrl) setArtifactUrl(parsed.artifactUrl);
        if (parsed.takeaways && Array.isArray(parsed.takeaways)) setTakeaways(parsed.takeaways);
        setAutoSaveStatus('Draft restored from local session');
      }
    } catch (e) {
      console.warn('Draft load failed:', e);
    }
  }, []);

  const triggerAutoSave = () => {
    try {
      const draftObj = {
        title,
        subtitle,
        category,
        format,
        summary,
        fullContent,
        artifactIdentifier,
        artifactTitle,
        artifactMeta,
        artifactUrl,
        takeaways,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('rwm_writer_draft', JSON.stringify(draftObj));
      setAutoSaveStatus(`Saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch (e) {
      console.warn('Auto-save error:', e);
    }
  };

  const handleFormatChange = (newFormat: ArticleFormat) => {
    setFormat(newFormat);
    if (newFormat === 'Repo Teardown') {
      setHasReviewedArtifact(true);
      setArtifactType('github');
    } else if (newFormat === 'Paper Review') {
      setHasReviewedArtifact(true);
      setArtifactType('paper');
    }
    triggerAutoSave();
  };

  // Quick repo auto-fill presets for easy writing
  const handleQuickPreset = (presetName: string) => {
    if (presetName === 'vllm') {
      setArtifactType('github');
      setArtifactIdentifier('vllm-project/vllm');
      setArtifactTitle('vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention');
      setArtifactUrl('https://github.com/vllm-project/vllm');
      setArtifactMeta('44.8k Stars · Python / C++ · Apache-2.0');
      setTitle('Inside vLLM: Deconstructing PagedAttention and CUDA Kernels');
      setCategory('GitHub Repo Teardowns');
    } else if (presetName === 'deepseek') {
      setArtifactType('paper');
      setArtifactIdentifier('arXiv:2501.12948');
      setArtifactTitle('DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning');
      setArtifactUrl('https://arxiv.org/abs/2501.12948');
      setArtifactMeta('DeepSeek-AI · 32-page preprint · Jan 2026');
      setTitle('Reviewing DeepSeek-R1: Why Pure RL Emerged Without Human SFT');
      setCategory('Research Reviews');
    } else if (presetName === 'uv') {
      setArtifactType('github');
      setArtifactIdentifier('astral-sh/uv');
      setArtifactTitle('uv: An extremely fast Python package and project manager written in Rust');
      setArtifactUrl('https://github.com/astral-sh/uv');
      setArtifactMeta('32.4k Stars · Rust · Apache-2.0');
      setTitle('How Astral Built uv in Rust: Replacing pip, pip-tools, and virtualenv');
      setCategory('GitHub Repo Teardowns');
    }
    triggerAutoSave();
  };

  const handleAddTakeaway = () => {
    setTakeaways((prev) => [...prev, '']);
  };

  const handleTakeawayChange = (index: number, val: string) => {
    setTakeaways((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
    triggerAutoSave();
  };

  const handleRemoveTakeaway = (index: number) => {
    setTakeaways((prev) => prev.filter((_, i) => i !== index));
    triggerAutoSave();
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please provide an article title.');
      return;
    }
    if (!summary.trim()) {
      setErrorMsg('Please provide an executive summary.');
      return;
    }
    if (!fullContent.trim()) {
      setErrorMsg('Please write the article content body.');
      return;
    }

    if (!hasAuthorPermissions) {
      setErrorMsg('Publishing Permission Denied: An author must validate domain expertise via ORCID, GitHub, or Institutional email (.edu) to publish blog posts. Redirecting to verification...');
      setIsPublishing(false);
      router.push('/verify?redirect=/write&error=unverified');
      return;
    }

    setIsPublishing(true);

    try {
      let author: Author;
      if (user?.authorProfileId && AUTHORS[user.authorProfileId]) {
        author = AUTHORS[user.authorProfileId];
      } else if (user && hasAuthorPermissions) {
        author = {
          id: user.authorProfileId || user.id,
          name: user.name,
          avatar: user.avatar,
          role: user.verifiedTitle || 'Domain Specialist',
          domain: category,
          institution: user.institution || 'Verified Independent Lab',
          verifiedVia: (user.authProvider === 'orcid' || user.authProvider === 'github' || user.authProvider === 'institution') ? user.authProvider : 'institution',
          verifiedIdentifier: user.verifiedIdentifier || user.email,
          verifiedTitle: user.verifiedTitle || 'Verified Contributor',
          joinedDate: 'October 2026',
          articleCount: 1,
          bio: `${user.name} writes and reviews technical works on ResearchWithMe, with verified credentials via ${user.authProvider}.`,
        };
      } else {
        author = AUTHORS[selectedAuthorKey] || AUTHORS['maya-lin'];
      }

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const newArticle: BlogPost = {
        id: 'post-' + Date.now(),
        slug,
        title: title.trim(),
        subtitle: subtitle.trim() || summary.slice(0, 140),
        category,
        format,
        author,
        publishedAt: 'October 24, 2026',
        readTime: `${Math.max(3, Math.ceil(fullContent.split(/\s+/).length / 200))} min read`,
        coverImage: artifactType === 'github' ? '/images/folio-code.jpeg' : '/images/folio-hero.jpeg',
        featured: false,
        reviewedArtifact: hasReviewedArtifact && artifactIdentifier.trim() ? {
          type: artifactType,
          title: artifactTitle.trim() || artifactIdentifier.trim(),
          identifier: artifactIdentifier.trim(),
          url: artifactUrl.trim() || 'https://github.com',
          meta: artifactMeta.trim() || (artifactType === 'github' ? 'GitHub Open Source' : 'Verified Literature'),
        } : undefined,
        summary: summary.trim(),
        content: fullContent
          .split('\n\n')
          .map((p) => p.trim())
          .filter((p) => p.length > 0),
        keyTakeaways: takeaways.map((t) => t.trim()).filter((t) => t.length > 0),
        tags: tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0),
        likes: 1,
        commentsCount: 0,
      };

      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArticle),
      });

      if (!res.ok) {
        throw new Error('Failed to save article to database');
      }

      // Clear draft
      localStorage.removeItem('rwm_writer_draft');

      // Navigate to dedicated article URL!
      router.push(`/post/${newArticle.slug}`);
    } catch (err: unknown) {
      console.error('Publication error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to publish article');
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      <BlogHeader />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <Link href="/" className="hover:text-stone-900 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Feed</span>
              </Link>
              <span>·</span>
              <span className="font-mono text-stone-400">{autoSaveStatus}</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Writer & Reviewer Studio
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab: Editor vs Preview */}
            <div className="flex items-center p-1 bg-stone-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'editor'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            {/* Publish Button */}
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isPublishing ? 'Publishing...' : 'Publish Article'}</span>
            </button>
          </div>
        </div>

        {/* Identity & Domain Authentication Status Banner */}
        <div className="mb-6 bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            {hasAuthorPermissions ? (
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-stone-900">
                  {user ? user.name : 'Guest User'}
                </span>
                <span className="text-stone-400">·</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                  hasAuthorPermissions
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  {hasAuthorPermissions ? `Verified Author (${user?.authProvider?.toUpperCase()})` : 'Reader (Gmail OAuth)'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {hasAuthorPermissions 
                  ? `${user?.verifiedTitle || 'Verified Contributor'} · ${user?.verifiedIdentifier || 'Attested'}`
                  : 'Writing permissions locked. Must authenticate via ORCID, GitHub, or Institutional Email to publish.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hasAuthorPermissions && user?.authorProfileId && (
              <Link
                href={`/author/${user.authorProfileId}`}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-white transition-colors font-medium flex items-center gap-1 text-xs"
              >
                <User className="w-3.5 h-3.5 text-stone-500" />
                <span>My Profile</span>
              </Link>
            )}

            <Link
              href="/verify?redirect=/write"
              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium transition-colors text-xs flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{hasAuthorPermissions ? 'Identity Details' : 'Authenticate Domain'}</span>
            </Link>

            {/* Role switch toggle for testing */}
            <button
              type="button"
              onClick={() => switchRoleForTesting(hasAuthorPermissions ? 'reader' : 'author')}
              className="px-2.5 py-1.5 rounded-lg border border-dashed border-stone-300 text-stone-600 hover:bg-stone-200 transition-colors font-mono text-[11px]"
              title="Click to toggle between Reader and Author to test the permission gate"
            >
              Test as: {hasAuthorPermissions ? 'Reader' : 'Author'}
            </button>
          </div>
        </div>

        {/* DOMAIN VALIDATION GATE: Displayed when the user does not have author permissions */}
        {!hasAuthorPermissions ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 text-center space-y-6 shadow-xs my-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-8 h-8 text-amber-800" />
            </div>

            <div className="max-w-xl mx-auto space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-900 font-semibold bg-amber-100/70 px-2.5 py-1 rounded">
                Editorial Integrity Gate
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                Domain Expertise Validation Required
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
                ResearchWithMe is a publication of expert essays, scientific paper reviews, and systems engineering teardowns. To prevent unvetted speculative posts, writing and publishing permissions are restricted to contributors who validate their identity and credentials through at least one of three recognized authorities.
              </p>
              <p className="text-xs text-stone-500 font-sans italic">
                Users authenticated via Gmail or standard social logins remain as readers with full access to read, bookmark, and comment on articles.
              </p>
            </div>

            {/* 3 OAuth Options Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto pt-2">
              {/* Option 1: ORCID */}
              <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <h3 className="font-serif font-bold text-sm text-emerald-950">
                    ORCID OAuth
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    For academic, clinical, and scientific researchers. Validates peer-reviewed publication records and scholar identity.
                  </p>
                </div>
                <Link
                  href="/verify?method=orcid&redirect=/write"
                  className="w-full py-2 px-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Connect ORCID</span>
                </Link>
              </div>

              {/* Option 2: GitHub */}
              <div className="p-5 rounded-xl border border-stone-300 bg-stone-50 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-900 flex items-center justify-center">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <h3 className="font-serif font-bold text-sm text-stone-950">
                    GitHub OAuth
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    For software engineers, distributed systems builders, and open-source maintainers. Validates repository ownership and commit history.
                  </p>
                </div>
                <Link
                  href="/verify?method=github&redirect=/write"
                  className="w-full py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Connect GitHub</span>
                </Link>
              </div>

              {/* Option 3: Institutional Email */}
              <div className="p-5 rounded-xl border border-sky-200 bg-sky-50/50 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-900 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-serif font-bold text-sm text-sky-950">
                    Institutional / .edu
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    For university faculty, postdocs, and accredited research laboratory fellows. Validates accredited academic institution email domain.
                  </p>
                </div>
                <Link
                  href="/verify?method=institution&redirect=/write"
                  className="w-full py-2 px-3 bg-sky-900 hover:bg-sky-950 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Verify .edu Domain</span>
                </Link>
              </div>
            </div>

            <div className="pt-2 text-xs text-stone-500">
              Already verified an author profile?{' '}
              <button
                type="button"
                onClick={() => switchRoleForTesting('author')}
                className="text-amber-900 font-semibold hover:underline"
              >
                Restore Verified Author Session
              </button>
            </div>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Studio Body */}
            {activeTab === 'editor' ? (
              <form onSubmit={handlePublish} className="space-y-8">
            {/* Section 1: Core Article Metadata */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 space-y-4">
              <h2 className="font-serif text-base font-bold text-stone-900">
                1. Article Scope & Classification
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Primary Domain / Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as BlogCategory);
                      triggerAutoSave();
                    }}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Article Format *
                  </label>
                  <select
                    value={format}
                    onChange={(e) => handleFormatChange(e.target.value as ArticleFormat)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                  >
                    <option value="Repo Teardown">GitHub Repo Teardown</option>
                    <option value="Paper Review">Research Paper Review</option>
                    <option value="Deep-Dive Essay">Deep-Dive Essay</option>
                    <option value="Field Notes">Field Notes</option>
                    <option value="Case Study">Case Study</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Author Persona
                  </label>
                  {!isCustomAuthor ? (
                    <div className="space-y-1">
                      <select
                        value={selectedAuthorKey}
                        onChange={(e) => {
                          setSelectedAuthorKey(e.target.value);
                          triggerAutoSave();
                        }}
                        className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                      >
                        {Object.values(AUTHORS).map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.domain.split(',')[0]})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsCustomAuthor(true)}
                        className="text-[11px] text-amber-900 hover:underline"
                      >
                        + Use Custom Byline
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="Your Name (e.g. Dr. Alex Rivera)"
                        value={customAuthorName}
                        onChange={(e) => setCustomAuthorName(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomAuthor(false)}
                        className="text-[11px] text-stone-500 hover:underline"
                      >
                        Use platform author
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block font-semibold text-stone-800 text-xs mb-1">
                    Article Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inside vLLM & PagedAttention: Why Memory Fragmentation Was Killing Inference"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      triggerAutoSave();
                    }}
                    className="w-full bg-white border border-stone-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-stone-900 font-serif font-bold placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-800 text-xs mb-1">
                    Subtitle & Analytical Premise
                  </label>
                  <input
                    type="text"
                    placeholder="A deep architectural code teardown of how virtual memory paging solved KV cache bloat..."
                    value={subtitle}
                    onChange={(e) => {
                      setSubtitle(e.target.value);
                      triggerAutoSave();
                    }}
                    className="w-full bg-white border border-stone-300 rounded-xl px-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Reviewed Artifact (GitHub Repo or Paper DOI) */}
            <div className="bg-amber-50/40 border border-amber-900/15 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-base text-stone-900">
                    2. Reviewed Artifact & Source Verification
                  </span>
                  <span className="text-[11px] text-amber-900 font-mono">
                    (Optional for general essays)
                  </span>
                </div>

                {/* Quick Auto-fill Presets */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-stone-500 font-medium">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('vllm')}
                    className="px-2 py-1 bg-white border border-amber-200 rounded text-amber-900 hover:bg-amber-100"
                  >
                    vLLM Repo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('deepseek')}
                    className="px-2 py-1 bg-white border border-amber-200 rounded text-amber-900 hover:bg-amber-100"
                  >
                    DeepSeek Paper
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('uv')}
                    className="px-2 py-1 bg-white border border-amber-200 rounded text-amber-900 hover:bg-amber-100"
                  >
                    uv Rust Repo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Artifact Type
                  </label>
                  <select
                    value={artifactType}
                    onChange={(e) => {
                      setArtifactType(e.target.value as 'github' | 'paper');
                      triggerAutoSave();
                    }}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900"
                  >
                    <option value="github">GitHub Repository</option>
                    <option value="paper">Published Academic Paper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Identifier / Repo Handle
                  </label>
                  <input
                    type="text"
                    placeholder={artifactType === 'github' ? 'vllm-project/vllm' : 'arXiv:2501.12948'}
                    value={artifactIdentifier}
                    onChange={(e) => {
                      setArtifactIdentifier(e.target.value);
                      triggerAutoSave();
                    }}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Source URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={artifactUrl}
                    onChange={(e) => {
                      setArtifactUrl(e.target.value);
                      triggerAutoSave();
                    }}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Metadata (Stars, Language, DOI)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 44.8k Stars · Python / C++ · Apache-2.0"
                    value={artifactMeta}
                    onChange={(e) => {
                      setArtifactMeta(e.target.value);
                      triggerAutoSave();
                    }}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Summary & Key Takeaways */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 space-y-4 text-xs">
              <h2 className="font-serif text-base font-bold text-stone-900">
                3. Summary & Core Empirical Arguments
              </h2>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Executive Summary / Abstract (Shown in feed previews) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize the core engineering finding or scientific paper takeaway in 2-3 sentences..."
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    triggerAutoSave();
                  }}
                  className="w-full bg-white border border-stone-300 rounded-xl p-3.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed font-sans"
                />
              </div>

              {/* Key takeaways list builder */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-stone-800">
                    Key Takeaways (Bullet points)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTakeaway}
                    className="text-amber-900 font-semibold text-xs flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Point</span>
                  </button>
                </div>

                {takeaways.map((takeaway, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-amber-900 font-bold shrink-0">
                      0{i + 1}.
                    </span>
                    <input
                      type="text"
                      placeholder={`Key takeaway point #${i + 1}...`}
                      value={takeaway}
                      onChange={(e) => handleTakeawayChange(i, e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900"
                    />
                    {takeaways.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTakeaway(i)}
                        className="p-1.5 text-stone-400 hover:text-red-700 transition-colors"
                        title="Remove point"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Full Article Body */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-base font-bold text-stone-900">
                  4. Full Article Narrative & Technical Body *
                </h2>
                <span className="text-stone-500 font-mono text-[11px]">
                  Separate paragraphs with an empty line
                </span>
              </div>

              <textarea
                required
                rows={12}
                placeholder="Write your in-depth analysis, benchmark comparisons, code teardowns, and sociological reflections here..."
                value={fullContent}
                onChange={(e) => {
                  setFullContent(e.target.value);
                  triggerAutoSave();
                }}
                className="w-full bg-white border border-stone-300 rounded-xl p-4 text-sm font-serif text-stone-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-stone-400"
              />

              {/* Tags */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Tags & Taxonomy (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Systems, CUDA, High-Throughput, Rust"
                  value={tags}
                  onChange={(e) => {
                    setTags(e.target.value);
                    triggerAutoSave();
                  }}
                  className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900 font-mono"
                />
              </div>
            </div>

            {/* Bottom Publishing Bar */}
            <div className="p-6 bg-white border border-stone-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-stone-500">
                Articles are published immediately into the open scholarly stream under <strong className="text-stone-800">CC BY 4.0</strong>.
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 rounded-lg text-xs font-medium text-stone-700"
                >
                  Preview Layout
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-2.5 rounded-lg text-xs font-semibold tracking-wide flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isPublishing ? 'Publishing...' : 'Publish Article'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Live Preview Mode */
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 sm:p-12 space-y-8 font-sans">
            <div className="border-b border-stone-200 pb-6 space-y-3">
              <div className="text-xs text-stone-500 font-sans">
                <span className="font-semibold text-amber-900 uppercase tracking-wider">{format}</span> · {category} · Published by {isCustomAuthor && customAuthorName ? customAuthorName : AUTHORS[selectedAuthorKey]?.name}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
                {title || 'Untitled Article'}
              </h1>

              <p className="text-base sm:text-lg text-stone-600 font-serif italic">
                {subtitle || 'Your subtitle and hook will render here.'}
              </p>
            </div>

            {hasReviewedArtifact && artifactIdentifier && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  {artifactType === 'github' ? <GitBranch className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  <span>Reviewed Artifact: {artifactIdentifier}</span>
                </div>
                <div className="text-stone-600 font-mono">{artifactTitle || artifactIdentifier} · {artifactMeta}</div>
              </div>
            )}

            <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-2 text-xs">
              <span className="font-serif font-bold text-stone-900 text-sm block">
                Key Takeaways
              </span>
              <ul className="space-y-1.5 text-stone-700">
                {takeaways.filter(t => t.trim().length > 0).map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-800 font-bold font-mono">0{i + 1}.</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4 font-serif text-stone-800 text-base sm:text-lg leading-relaxed">
              {fullContent ? (
                fullContent.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))
              ) : (
                <p className="text-stone-400 italic">No article body written yet.</p>
              )}
            </div>

            <div className="pt-6 border-t border-stone-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold"
              >
                Back to Editing
              </button>
            </div>
            </div>
          )}
        </>
      )}
      </main>

      <BlogFooter onCategorySelect={() => router.push('/')} onOpenWriteModal={() => {}} />
    </div>
  );
}
