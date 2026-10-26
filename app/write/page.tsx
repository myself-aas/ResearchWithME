'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, Lock, PenSquare, Plus, Save, Send, Sparkles, Trash2 } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import PageState from '@/components/PageState';
import QwenCoverGenerator from '@/components/cms/QwenCoverGenerator';
import { ArticleFormat, AUTHORS, BlogCategory, BlogPost, CATEGORIES } from '@/lib/blog-data';
import { useAuth } from '@/lib/auth-context';
import { readLocal, removeLocal, writeLocal } from '@/lib/storage';
import { cleanText, LIMITS, parseTags, slugify } from '@/lib/validation';
import { formatDate, readingTimeFromText } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';

const FORMATS: ArticleFormat[] = ['Paper Review', 'Repo Teardown', 'Deep-Dive Essay', 'Field Notes', 'Case Study'];
const DRAFT_KEY = 'rwm_writer_draft';

interface Draft {
  title: string;
  subtitle: string;
  category: BlogCategory;
  format: ArticleFormat;
  summary: string;
  content: string;
  takeaways: string[];
  tags: string;
  artifactType: 'github' | 'paper' | 'dataset';
  artifactIdentifier: string;
  artifactTitle: string;
  artifactUrl: string;
  artifactMeta: string;
  hasArtifact: boolean;
  coverImage?: string;
  updatedAt: string;
}

const emptyDraft: Draft = {
  title: '',
  subtitle: '',
  category: 'Research Reviews',
  format: 'Paper Review',
  summary: '',
  content: '',
  takeaways: [''],
  tags: '',
  artifactType: 'paper',
  artifactIdentifier: '',
  artifactTitle: '',
  artifactUrl: '',
  artifactMeta: '',
  hasArtifact: true,
  coverImage: '',
  updatedAt: '',
};

const fieldClass =
  'h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-600';

export default function WritePage() {
  const router = useRouter();
  const { user, hydrated, hasAuthorPermissions } = useAuth();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [tab, setTab] = useState<'editor' | 'preview'>('editor');
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Draft not saved yet');
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [restored, setRestored] = useState(false);
  const [showAiCover, setShowAiCover] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = readLocal<Partial<Draft> | null>(DRAFT_KEY, null);
    if (stored && typeof stored === 'object') {
      setDraft((previous) => ({
        ...previous,
        ...stored,
        takeaways: Array.isArray(stored.takeaways) && stored.takeaways.length > 0 ? stored.takeaways : [''],
      }));
      setRestored(true);
      setSaveStatus(
        stored.updatedAt ? `Draft from ${new Date(stored.updatedAt).toLocaleString()}` : 'Draft restored from this browser',
      );
    }
    setHydratedDraft(true);
  }, []);

  useEffect(() => {
    if (!hydratedDraft) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      const next = { ...draft, updatedAt: new Date().toISOString() };
      const saved = writeLocal(DRAFT_KEY, next);
      setSaveStatus(
        saved
          ? `Saved locally at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Autosave is blocked by this browser. Copy your text before leaving.',
      );
    }, 700);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [draft, hydratedDraft]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrorField(null);
  }

  function fail(message: string, fieldId?: string) {
    setError(message);
    setErrorField(fieldId ?? null);
    if (fieldId) {
      const field = document.getElementById(fieldId);
      field?.focus();
      field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function updateTakeaway(index: number, value: string) {
    setDraft((previous) => {
      const takeaways = [...previous.takeaways];
      takeaways[index] = value;
      return { ...previous, takeaways };
    });
  }

  function addTakeaway() {
    setDraft((previous) => ({ ...previous, takeaways: [...previous.takeaways, ''] }));
  }

  function removeTakeaway(index: number) {
    setDraft((previous) => ({
      ...previous,
      takeaways: previous.takeaways.length > 1 ? previous.takeaways.filter((_, i) => i !== index) : [''],
    }));
  }

  function discardDraft() {
    setDraft(emptyDraft);
    removeLocal(DRAFT_KEY);
    setSaveStatus('Draft cleared');
    setRestored(false);
    setError(null);
  }

  const parsedTags = useMemo(() => parseTags(draft.tags), [draft.tags]);
  const readTime = useMemo(() => readingTimeFromText(`${draft.summary} ${draft.content}`), [draft.summary, draft.content]);
  const previewParagraphs = useMemo(
    () => draft.content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean),
    [draft.content],
  );

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishing) return;
    setError(null);

    if (!hasAuthorPermissions || !user) {
      router.push('/verify?redirect=/write&error=unverified');
      return;
    }
    if (cleanText(draft.title, LIMITS.title).length < 8) {
      fail('Add a title of at least 8 characters before publishing.', 'write-title');
      return;
    }
    if (cleanText(draft.summary, LIMITS.summary).length < 40) {
      fail('The executive summary needs at least 40 characters so readers can judge the article from the feed.', 'write-summary');
      return;
    }
    if (cleanText(draft.content, LIMITS.body).length < 200) {
      fail('The article body needs at least 200 characters.', 'write-content');
      return;
    }
    const takeaways = draft.takeaways.map((item) => cleanText(item, 300)).filter(Boolean);
    if (takeaways.length === 0) {
      fail('Add at least one key takeaway.', 'takeaway-0');
      return;
    }
    if (draft.hasArtifact) {
      if (!cleanText(draft.artifactIdentifier, LIMITS.identifier)) {
        fail('Add the identifier of the artifact you reviewed, or turn the artifact block off.', 'write-artifact-identifier');
        return;
      }
      if (draft.artifactUrl && !/^https?:\/\//i.test(draft.artifactUrl.trim())) {
        fail('The artifact URL must start with http:// or https://.', 'write-artifact-url');
        return;
      }
    }

    const knownAuthor = user.authorProfileId ? AUTHORS[user.authorProfileId] : undefined;
    const author =
      knownAuthor ?? {
        id: slugify(user.name) || user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.verifiedTitle ?? 'Verified contributor',
        domain: draft.category,
        institution: user.institution ?? 'Independent researcher',
        verifiedVia:
          user.authProvider === 'orcid' || user.authProvider === 'github' || user.authProvider === 'institution'
            ? user.authProvider
            : 'institution',
        verifiedIdentifier: user.verifiedIdentifier ?? user.email,
        verifiedTitle: user.verifiedTitle ?? 'Contributor identity on file',
        joinedDate: formatDate(new Date(), { day: undefined, month: 'long', year: 'numeric' }),
        articleCount: 1,
        bio: `${user.name} reviews work in ${draft.category.toLowerCase()} on ResearchWithME.`,
      };

    const slug = slugify(draft.title);
    if (!slug) {
      fail('The title needs at least one letter or number to build a URL.', 'write-title');
      return;
    }

    const article: BlogPost = {
      id: `post-${Date.now()}`,
      slug,
      title: cleanText(draft.title, LIMITS.title),
      subtitle: cleanText(draft.subtitle, 400) || cleanText(draft.summary, 140),
      category: draft.category,
      format: draft.format,
      author,
      publishedAt: new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
      readTime: `${readTime} min read`,
      coverImage: draft.coverImage?.trim() || (draft.artifactType === 'github' ? '/images/folio-code.jpeg' : '/images/folio-hero.jpeg'),
      featured: false,
      reviewedArtifact: draft.hasArtifact
        ? {
            type: draft.artifactType,
            title: cleanText(draft.artifactTitle, 200) || cleanText(draft.artifactIdentifier, LIMITS.identifier),
            identifier: cleanText(draft.artifactIdentifier, LIMITS.identifier),
            url: draft.artifactUrl.trim() || (draft.artifactType === 'github' ? 'https://github.com' : 'https://doi.org'),
            meta: cleanText(draft.artifactMeta, 160) || 'Metadata supplied by the author',
          }
        : undefined,
      summary: cleanText(draft.summary, LIMITS.summary),
      content: draft.content
        .split(/\n{2,}/)
        .map((paragraph) => cleanText(paragraph, 40_000))
        .filter(Boolean),
      keyTakeaways: takeaways,
      tags: parsedTags,
      likes: 0,
      commentsCount: 0,
    };

    setPublishing(true);
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'The publication could not be saved.');
      removeLocal(DRAFT_KEY);
      const savedSlug = payload.article?.slug ?? slug;
      router.push(`/post/${savedSlug}`);
    } catch (publishError) {
      setError(
        `${publishError instanceof Error ? publishError.message : 'The publication could not be saved.'} Your draft is preserved in this browser.`,
      );
      setPublishing(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-stone-50">
        <BlogHeader />
        <PageState
          role="status"
          code="Loading"
          title="Opening the writer studio"
          description="Checking the contributor session stored in this browser."
          primaryAction={{ href: '/', label: 'Return to the journal' }}
        />
      </div>
    );
  }

  if (!hasAuthorPermissions) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <BlogHeader />
        <PageState
          code="Contributor access"
          title="The writer studio needs a contributor identity"
          description="Publishing is restricted to contributors who have recorded a scholarly identity. You can still read, save, and cite every article without an account."
          primaryAction={{ href: '/verify?redirect=/write', label: 'Record an identity' }}
          secondaryAction={{ href: '/', label: 'Browse the journal' }}
        >
          <p className="flex items-start gap-2 border-l-2 border-stone-300 pl-4 text-sm leading-relaxed text-stone-600">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Verification here is a local prototype; no credentials are sent anywhere.</span>
          </p>
        </PageState>
        <BlogFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        {isSupabaseConfigured && (
          <div className="mb-6 border-l-2 border-amber-700 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
            <p className="font-semibold">Publishing now happens in the editorial studio</p>
            <p className="mt-1 max-w-2xl">
              This prototype form still autosaves a draft in your browser, but publication is disabled because the site
              is connected to Supabase.{' '}
              <Link href="/dashboard" className="font-semibold underline underline-offset-4">
                Open the studio
              </Link>{' '}
              to write and publish with the live database.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">Writer studio</h1>
            <p className="mt-2 text-base text-stone-700">
              Signed in as <span className="font-medium text-stone-900">{user?.name}</span>. {saveStatus}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Editor mode" className="flex rounded-md border border-stone-300 bg-white p-1">
              <button
                type="button"
                onClick={() => setTab('editor')}
                aria-pressed={tab === 'editor'}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded px-3 text-sm font-medium ${
                  tab === 'editor' ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <PenSquare className="h-4 w-4" aria-hidden="true" />
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('preview')}
                aria-pressed={tab === 'preview'}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded px-3 text-sm font-medium ${
                  tab === 'preview' ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                <span>Preview</span>
              </button>
            </div>

            {restored && (
              <button
                type="button"
                onClick={discardDraft}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-red-300 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Discard draft</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-6 border-l-2 border-red-800 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          </div>
        )}

        {tab === 'preview' ? (
          <article aria-labelledby="preview-title" className="mt-8 max-w-3xl">
            <p className="text-sm text-stone-600">
              {draft.category} · {draft.format} · {readTime} min read
            </p>
            <h2 id="preview-title" className="mt-2 font-serif text-3xl font-bold leading-tight text-stone-900 sm:text-4xl">
              {draft.title || 'Untitled review'}
            </h2>
            {draft.subtitle && <p className="mt-3 font-serif text-xl leading-relaxed text-stone-700">{draft.subtitle}</p>}
            <p className="mt-4 text-sm text-stone-600">By {user?.name}</p>

            {draft.coverImage && (
              <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-stone-900">
                <picture>
                  <source srcSet={draft.coverImage} type="image/avif" />
                  <img
                    src={draft.coverImage}
                    alt={draft.title || 'Article cover preview'}
                    className="h-auto max-h-[380px] w-full object-cover"
                  />
                </picture>
              </div>
            )}

            {draft.summary && (
              <section aria-labelledby="preview-summary" className="mt-8 border-y border-stone-200 py-5">
                <h3 id="preview-summary" className="font-serif text-xl font-semibold text-stone-900">
                  Summary
                </h3>
                <p className="mt-2 text-lg leading-relaxed text-stone-800">{draft.summary}</p>
              </section>
            )}

            {draft.takeaways.filter(Boolean).length > 0 && (
              <section aria-labelledby="preview-takeaways" className="mt-8">
                <h3 id="preview-takeaways" className="font-serif text-xl font-semibold text-stone-900">
                  Key takeaways
                </h3>
                <ul className="mt-2 space-y-2">
                  {draft.takeaways.filter(Boolean).map((takeaway, index) => (
                    <li key={`${takeaway}-${index}`} className="flex gap-2 text-base leading-relaxed text-stone-800">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-800" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-8 space-y-4">
              {previewParagraphs.length > 0 ? (
                previewParagraphs.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 20)}`} className="max-w-prose text-lg leading-relaxed text-stone-800">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-base text-stone-600">The article body will appear here as you write.</p>
              )}
            </div>

            {parsedTags.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-2">
                {parsedTags.map((tag) => (
                  <li key={tag} className="rounded border border-stone-300 bg-white px-2 py-1 font-mono text-sm text-stone-700">
                    #{tag}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ) : (
          <form onSubmit={publish} noValidate className="mt-8 space-y-10">
            <fieldset className="space-y-4">
              <legend className="font-serif text-xl font-semibold text-stone-900">Article</legend>

              <div>
                <label htmlFor="write-title" className="mb-1.5 block text-sm font-medium text-stone-800">
                  Title <span className="text-stone-600">(required)</span>
                </label>
                <input
                  id="write-title"
                  type="text"
                  value={draft.title}
                  onChange={(event) => update('title', event.target.value)}
                  maxLength={LIMITS.title}
                  aria-invalid={errorField === 'write-title' ? true : undefined}
                  placeholder="Inside vLLM: how paged attention changed inference"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="write-subtitle" className="mb-1.5 block text-sm font-medium text-stone-800">
                  Subtitle <span className="text-stone-600">(optional)</span>
                </label>
                <input
                  id="write-subtitle"
                  type="text"
                  value={draft.subtitle}
                  onChange={(event) => update('subtitle', event.target.value)}
                  maxLength={400}
                  placeholder="One sentence that states the argument"
                  className={fieldClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="write-category" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Editorial column
                  </label>
                  <select
                    id="write-category"
                    value={draft.category}
                    onChange={(event) => update('category', event.target.value as BlogCategory)}
                    className={fieldClass}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="write-format" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Format
                  </label>
                  <select
                    id="write-format"
                    value={draft.format}
                    onChange={(event) => {
                      const nextFormat = event.target.value as ArticleFormat;
                      update('format', nextFormat);
                      if (nextFormat === 'Deep-Dive Essay' || nextFormat === 'Field Notes') {
                        update('hasArtifact', false);
                      }
                    }}
                    className={fieldClass}
                  >
                    {FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="write-summary" className="mb-1.5 block text-sm font-medium text-stone-800">
                  Executive summary <span className="text-stone-600">(required)</span>
                </label>
                <textarea
                  id="write-summary"
                  rows={3}
                  value={draft.summary}
                  onChange={(event) => update('summary', event.target.value)}
                  maxLength={LIMITS.summary}
                  aria-invalid={errorField === 'write-summary' ? true : undefined}
                  placeholder="State the question, evidence, and result in two or three sentences."
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-600"
                />
                <p className="mt-1 text-sm text-stone-600">
                  {draft.summary.length} of {LIMITS.summary} characters
                </p>
              </div>
            </fieldset>

            <fieldset className="space-y-4 border-t border-stone-200 pt-8">
              <legend className="font-serif text-xl font-semibold text-stone-900">Reviewed artifact</legend>

              <label className="flex items-start gap-3 text-base text-stone-800">
                <input
                  type="checkbox"
                  checked={draft.hasArtifact}
                  onChange={(event) => update('hasArtifact', event.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-stone-400 text-amber-800"
                />
                <span>This article reviews a paper, repository, or dataset.</span>
              </label>

              {draft.hasArtifact && (
                <div className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
                  <div>
                    <label htmlFor="write-artifact-type" className="mb-1.5 block text-sm font-medium text-stone-800">
                      Artifact type
                    </label>
                    <select
                      id="write-artifact-type"
                      value={draft.artifactType}
                      onChange={(event) => update('artifactType', event.target.value as Draft['artifactType'])}
                      className={fieldClass}
                    >
                      <option value="paper">Paper or preprint</option>
                      <option value="github">GitHub repository</option>
                      <option value="dataset">Dataset</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="write-artifact-identifier" className="mb-1.5 block text-sm font-medium text-stone-800">
                      Identifier <span className="text-stone-600">(required when the block is on)</span>
                    </label>
                    <input
                      id="write-artifact-identifier"
                      type="text"
                      value={draft.artifactIdentifier}
                      onChange={(event) => update('artifactIdentifier', event.target.value)}
                      maxLength={LIMITS.identifier}
                      aria-invalid={errorField === 'write-artifact-identifier' ? true : undefined}
                      placeholder="vllm-project/vllm or arXiv:2501.12948"
                      className={`${fieldClass} font-mono`}
                    />
                  </div>

                  <div>
                    <label htmlFor="write-artifact-title" className="mb-1.5 block text-sm font-medium text-stone-800">
                      Artifact title
                    </label>
                    <input
                      id="write-artifact-title"
                      type="text"
                      value={draft.artifactTitle}
                      onChange={(event) => update('artifactTitle', event.target.value)}
                      maxLength={200}
                      placeholder="The published title of the work you reviewed"
                      className={fieldClass}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="write-artifact-url" className="mb-1.5 block text-sm font-medium text-stone-800">
                        Source URL
                      </label>
                      <input
                        id="write-artifact-url"
                        type="url"
                        aria-invalid={errorField === 'write-artifact-url' ? true : undefined}
                        value={draft.artifactUrl}
                        onChange={(event) => update('artifactUrl', event.target.value)}
                        placeholder="https://github.com/…"
                        className={`${fieldClass} font-mono`}
                      />
                    </div>
                    <div>
                      <label htmlFor="write-artifact-meta" className="mb-1.5 block text-sm font-medium text-stone-800">
                        Version or metadata
                      </label>
                      <input
                        id="write-artifact-meta"
                        type="text"
                        value={draft.artifactMeta}
                        onChange={(event) => update('artifactMeta', event.target.value)}
                        maxLength={160}
                        placeholder="Commit abc1234 · released 12 March 2026"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-4 border-t border-stone-200 pt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <legend className="font-serif text-xl font-semibold text-stone-900">Cover image</legend>
                  <p className="mt-1 text-sm text-stone-600">
                    Editorial 16:9 header image. Generate artwork with your Qwen 2.1 Hugging Face Space (AVIF) or select presets.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAiCover(!showAiCover)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span>{showAiCover ? 'Hide Qwen 2.1 Generator' : 'Generate Cover with Qwen 2.1 (AVIF)'}</span>
                </button>
              </div>

              {draft.coverImage ? (
                <div className="rounded-lg border border-stone-200 bg-white p-4">
                  <div className="overflow-hidden rounded-md border border-stone-200 bg-stone-900">
                    <picture>
                      <source srcSet={draft.coverImage} type="image/avif" />
                      <img
                        src={draft.coverImage}
                        alt="Article cover"
                        className="h-44 w-full object-cover"
                      />
                    </picture>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="font-mono text-xs text-stone-600">
                      {draft.coverImage.startsWith('data:') ? 'AVIF Base64 Data Stream' : draft.coverImage}
                    </span>
                    <button
                      type="button"
                      onClick={() => update('coverImage', '')}
                      className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove cover</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="border-l-2 border-stone-300 pl-4 text-sm leading-relaxed text-stone-600">
                  No custom cover image applied yet. The journal will use default editorial photography if published without one.
                </p>
              )}

              {showAiCover && (
                <div className="pt-2">
                  <QwenCoverGenerator
                    currentCover={draft.coverImage}
                    articleTitle={draft.title}
                    articleSubtitle={draft.subtitle}
                    articleCategory={draft.category}
                    onApplyCover={(imageUri) => update('coverImage', imageUri)}
                  />
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-4 border-t border-stone-200 pt-8">
              <legend className="font-serif text-xl font-semibold text-stone-900">Body</legend>

              <div>
                <label htmlFor="write-content" className="mb-1.5 block text-sm font-medium text-stone-800">
                  Article body <span className="text-stone-600">(required)</span>
                </label>
                <textarea
                  id="write-content"
                  rows={16}
                  value={draft.content}
                  onChange={(event) => update('content', event.target.value)}
                  maxLength={LIMITS.body}
                  aria-invalid={errorField === 'write-content' ? true : undefined}
                  placeholder="Write the analysis. Separate paragraphs with an empty line."
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-base leading-relaxed text-stone-900 placeholder:text-stone-600"
                />
                <p className="mt-1 flex flex-wrap justify-between gap-2 text-sm text-stone-600">
                  <span>Separate paragraphs with an empty line. Estimated reading time: {readTime} min.</span>
                  <span>
                    {draft.content.length} of {LIMITS.body} characters
                  </span>
                </p>
              </div>

              <div>
                <p id="takeaway-label" className="mb-1.5 text-sm font-medium text-stone-800">
                  Key takeaways <span className="text-stone-600">(at least one)</span>
                </p>
                <ul aria-labelledby="takeaway-label" className="space-y-3">
                  {draft.takeaways.map((takeaway, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-3 font-mono text-sm text-stone-600">{String(index + 1).padStart(2, '0')}</span>
                      <div className="flex-1">
                        <label htmlFor={`takeaway-${index}`} className="sr-only">
                          Key takeaway {index + 1}
                        </label>
                        <input
                          id={`takeaway-${index}`}
                          type="text"
                          value={takeaway}
                          onChange={(event) => updateTakeaway(index, event.target.value)}
                          maxLength={300}
                          aria-invalid={errorField === `takeaway-${index}` ? true : undefined}
                          placeholder="The one result a reader should remember"
                          className={fieldClass}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTakeaway(index)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition-colors hover:border-red-300 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Remove takeaway {index + 1}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={addTakeaway}
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-stone-400"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Add a takeaway</span>
                </button>
              </div>

              <div>
                <label htmlFor="write-tags" className="mb-1.5 block text-sm font-medium text-stone-800">
                  Tags <span className="text-stone-600">(comma separated, up to eight)</span>
                </label>
                <input
                  id="write-tags"
                  type="text"
                  value={draft.tags}
                  onChange={(event) => update('tags', event.target.value)}
                  maxLength={LIMITS.tags}
                  placeholder="distributed systems, GPU, inference"
                  className={fieldClass}
                />
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-6">
              <p className="flex items-center gap-2 text-sm text-stone-600">
                <Save className="h-4 w-4" aria-hidden="true" />
                <span>{saveStatus}</span>
              </p>
              <button
                type="submit"
                disabled={publishing}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>{publishing ? 'Publishing…' : 'Publish review'}</span>
              </button>
            </div>

            <p className="flex items-start gap-2 border-l-2 border-stone-300 pl-4 text-sm leading-relaxed text-stone-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>
                {isSupabaseConfigured
                  ? 'Publishing is disabled on this prototype form while the Supabase studio is active. Your draft stays in this browser.'
                  : 'Publication writes to the local JSON archive in this prototype. In a read-only deployment the save will fail without losing your draft.'}
              </span>
            </p>
          </form>
        )}
      </main>

      <BlogFooter />
    </div>
  );
}
