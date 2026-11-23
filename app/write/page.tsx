'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, PenSquare, Plus, Save, Send, Trash2, Upload } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import PublishSplitButton from '@/components/cms/PublishSplitButton';
import { ArticleFormat, AUTHORS, BlogCategory, CATEGORIES, type PublicationType } from '@/lib/blog-data';
import { ApiError, cmsFetch } from '@/lib/cms/client-api';
import type { CmsPost } from '@/lib/cms/types';
import { readLocal, removeLocal, writeLocal } from '@/lib/storage';
import { cleanText, LIMITS, parseTags, slugify } from '@/lib/validation';
import { readingTimeFromText } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { useSession } from '@/lib/supabase/use-session';
import { uploadBlogImage, uploadCover } from '@/lib/supabase/storage';
import type { EncodedImage } from '@/lib/images/process';
import LazyImageCropDialog from '@/components/media/LazyImageCropDialog';
import MdxEditor from '@/components/editor/MdxEditor';
import dynamic from 'next/dynamic';
import { Text } from '@/components/primitives';
import { WorkflowDisclosure } from '@/components/workflows';
import { RESEARCH_WORKFLOWS } from '@/lib/workflows/research-workflows';

// The preview pane is a tab, not the default view. Loading the Markdown +
// citation renderer eagerly made every writer download it before typing a word,
// so it is fetched when the Preview tab is first opened.
const MarkdownBody = dynamic(() => import('@/components/MarkdownBody'), {
  loading: () => <p className="text-base text-ink-secondary">Preparing preview…</p>,
});


const FORMATS: ArticleFormat[] = ['Paper Review', 'Repo Teardown', 'Deep-Dive Essay', 'Field Notes', 'Case Study'];
const DRAFT_KEY = 'rwm_writer_draft';

interface Draft {
  title: string;
  subtitle: string;
  /** Verified author profile from the catalogue the article is published under. */
  authorId: string;
  category: BlogCategory;
  format: ArticleFormat;
  publicationType: PublicationType;
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

const AUTHOR_IDS = Object.keys(AUTHORS);

const emptyDraft: Draft = {
  title: '',
  subtitle: '',
  authorId: '',
  category: 'Research Reviews',
  format: 'Paper Review',
  publicationType: 'review',
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
  'h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-secondary';

export default function WritePage() {
  const router = useRouter();
  const { user } = useSession();
  const canSelectPublicationType = user?.isEditorInChief === true;
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [tab, setTab] = useState<'editor' | 'preview'>('editor');
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Draft not saved yet');
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [restored, setRestored] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = readLocal<Partial<Draft> | null>(DRAFT_KEY, null);
    if (stored && typeof stored === 'object') {
      setDraft((previous) => ({
        ...previous,
        ...stored,
        publicationType: stored.publicationType === 'editorial' ? 'editorial' : 'review',
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

  async function handleCoverImages(images: EncodedImage[]) {
    // Errors propagate to the dialog, which shows them and keeps the crop.
    const url = await uploadCover(images);
    update('coverImage', url);
    setCropOpen(false);
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
  // The byline is chosen in the editor and validated against the AUTHORS
  // registry; access itself is enforced by app/write/layout.tsx on the server.
  const resolvedAuthorId = useMemo(
    () => (draft.authorId && AUTHORS[draft.authorId] ? draft.authorId : ''),
    [draft.authorId],
  );
  const readTime = useMemo(() => readingTimeFromText(`${draft.summary} ${draft.content}`), [draft.summary, draft.content]);

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishing) return;
    setError(null);

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

    if (!resolvedAuthorId) {
      fail('Choose the verified author profile this article is published under.', 'write-author');
      return;
    }

    const slug = slugify(draft.title);
    if (!slug) {
      fail('The title needs at least one letter or number to build a URL.', 'write-title');
      return;
    }

    setPublishing(true);
    try {
      // The writer studio publishes through the same CMS store as /dashboard, so
      // the article lands in Supabase (or the local archive in demo mode), joins
      // the canonical reader and sitemap, and is revalidated on publish.
      const saved = await cmsFetch<{ post: CmsPost }>('/api/cms/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: cleanText(draft.title, LIMITS.title),
          slug,
          subtitle: cleanText(draft.subtitle, 400) || cleanText(draft.summary, 140),
          summary: cleanText(draft.summary, LIMITS.summary),
          content: draft.content,
          status: 'published',
          category: draft.category,
          format: draft.format,
          ...(canSelectPublicationType ? { publicationType: draft.publicationType } : {}),
          authorId: resolvedAuthorId,
          coverImage:
            draft.coverImage?.trim() ||
            (draft.artifactType === 'github' ? '/images/folio-code.jpeg' : '/images/folio-hero.jpeg'),
          tags: parsedTags,
          keyTakeaways: takeaways,
          featured: false,
          artifact: draft.hasArtifact
            ? {
                type: draft.artifactType,
                title: cleanText(draft.artifactTitle, 200) || cleanText(draft.artifactIdentifier, LIMITS.identifier),
                identifier: cleanText(draft.artifactIdentifier, LIMITS.identifier),
                url: draft.artifactUrl.trim() || (draft.artifactType === 'github' ? 'https://github.com' : 'https://doi.org'),
                meta: cleanText(draft.artifactMeta, 160),
              }
            : null,
        }),
      });

      removeLocal(DRAFT_KEY);
      router.push(`/post/${saved.post.slug}`);
    } catch (publishError) {
      const message =
        publishError instanceof ApiError
          ? publishError.message
          : 'The article could not be saved.';
      setError(`${message} Your draft is preserved in this browser.`);
      setPublishing(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />

      <main tabIndex={-1} id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        {isSupabaseConfigured && (
          <div className="mb-6 border-l-2 border-trust-uncertain bg-brand/5 px-4 py-3 text-sm leading-relaxed text-brand-pressed">
            <p className="font-semibold">Publishing now happens in the editorial studio</p>
            <p className="mt-1 max-w-2xl">
              This prototype form still autosaves a draft in your browser, but publishing is disabled because the site
              is connected to Supabase.{' '}
              <Link href="/dashboard" className="font-semibold underline underline-offset-4">
                Open the studio
              </Link>{' '}
              to write and publish with the live database.
            </p>
          </div>
        )}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-surface p-4 text-xs">
          <div className="space-y-0.5">
            <p className="font-mono font-semibold uppercase text-brand">
              Scholarly MDX Workspace (v3.4)
            </p>
            <p className="text-ink-secondary">
              Author structured evidence, claims, tool reviews, equations, and diagrams with offline
              autosave and 409 conflict recovery.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/contribute"
              className="inline-flex min-h-10 items-center rounded-lg border border-line bg-canvas px-3 py-1.5 font-medium text-ink hover:border-brand"
            >
              Guided Wizard
            </Link>
            <Link
              href="/editor"
              className="inline-flex min-h-10 items-center rounded-lg bg-brand px-3 py-1.5 font-semibold text-on-primary hover:opacity-90"
            >
              Open MDX Workspace →
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">Writer studio</h1>
            <p className="mt-2 text-base text-ink">
              Signed in as <span className="font-medium text-ink">{user?.name}</span>. {saveStatus}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Editor mode" className="flex rounded-md border border-border-strong bg-surface-raised p-1">
              <button
                type="button"
                onClick={() => setTab('editor')}
                aria-pressed={tab === 'editor'}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded px-3 text-sm font-medium ${
                  tab === 'editor' ? 'bg-surface-inverse text-text-inverse' : 'text-ink hover:bg-surface'
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
                  tab === 'preview' ? 'bg-surface-inverse text-text-inverse' : 'text-ink hover:bg-surface'
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
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Discard draft</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-6 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          </div>
        )}

        {tab === 'preview' ? (
          <article aria-labelledby="preview-title" className="mt-8 max-w-3xl">
            <p className="text-sm text-ink-secondary">
              {draft.category} · {draft.format} · {readTime} min read
            </p>
            <h2 id="preview-title" className="mt-2 font-serif text-3xl font-bold leading-tight text-ink sm:text-4xl">
              {draft.title || 'Untitled review'}
            </h2>
            {draft.subtitle && <p className="mt-3 font-serif text-xl leading-relaxed text-ink">{draft.subtitle}</p>}
            <p className="mt-4 text-sm text-ink-secondary">By {user?.name}</p>

            {draft.coverImage && (
              <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface-inverse">
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
              <section aria-labelledby="preview-summary" className="mt-8 border-y border-line py-5">
                <Text id="preview-summary" as="h3" variant="card-title">
                  Summary
                </Text>
                <p className="mt-2 text-lg leading-relaxed text-ink">{draft.summary}</p>
              </section>
            )}

            {draft.takeaways.filter(Boolean).length > 0 && (
              <section aria-labelledby="preview-takeaways" className="mt-8">
                <Text id="preview-takeaways" as="h3" variant="card-title">
                  Key takeaways
                </Text>
                <ul className="mt-2 space-y-2">
                  {draft.takeaways.filter(Boolean).map((takeaway, index) => (
                    <li key={`${takeaway}-${index}`} className="flex gap-2 text-base leading-relaxed text-ink">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-hover" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-8 space-y-4">
              {draft.content.trim() ? (
                <MarkdownBody markdown={draft.content} />
              ) : (
                <p className="text-base text-ink-secondary">The article body will appear here as you write.</p>
              )}
            </div>

            {parsedTags.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-2">
                {parsedTags.map((tag) => (
                  <li key={tag} className="rounded border border-border-strong bg-surface-raised px-2 py-1 font-mono text-sm text-ink">
                    #{tag}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ) : (
          <form onSubmit={publish} className="mt-8 space-y-10">
            <fieldset className="space-y-4 sm:space-y-5">
              <Text as="legend" variant="card-title">Article</Text>

              <div>
                <label htmlFor="write-title" className="mb-1.5 block text-sm font-medium text-ink">
                  Title <span className="text-ink-secondary">(required)</span>
                </label>
                <input
                  id="write-title"
                  type="text"
                  enterKeyHint="next"
                  value={draft.title}
                  onChange={(event) => update('title', event.target.value)}
                  maxLength={LIMITS.title}
                  aria-invalid={errorField === 'write-title' ? true : undefined}
                  placeholder="Inside vLLM: how paged attention changed inference"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="write-subtitle" className="mb-1.5 block text-sm font-medium text-ink">
                  Subtitle <span className="text-ink-secondary">(optional)</span>
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
                  <label htmlFor="write-category" className="mb-1.5 block text-sm font-medium text-ink">
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
                  <label htmlFor="write-author" className="mb-1.5 block text-sm font-medium text-ink">
                    Published under
                  </label>
                  <select
                    id="write-author"
                    value={resolvedAuthorId}
                    onChange={(event) => update('authorId', event.target.value)}
                    aria-invalid={errorField === 'write-author' ? true : undefined}
                    className={fieldClass}
                  >
                    {resolvedAuthorId ? null : <option value="">Choose a verified author</option>}
                    {AUTHOR_IDS.map((id) => (
                      <option key={id} value={id}>
                        {AUTHORS[id].name} — {AUTHORS[id].role}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-ink-secondary">
                    Articles are attributed to a verified profile in the catalogue.
                  </p>
                </div>

                <div>
                  <label htmlFor="write-format" className="mb-1.5 block text-sm font-medium text-ink">
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
                <label htmlFor="write-summary" className="mb-1.5 block text-sm font-medium text-ink">
                  Executive summary <span className="text-ink-secondary">(required)</span>
                </label>
                <textarea
                  id="write-summary"
                  rows={3}
                  autoComplete="off"
                  value={draft.summary}
                  onChange={(event) => update('summary', event.target.value)}
                  maxLength={LIMITS.summary}
                  aria-invalid={errorField === 'write-summary' ? true : undefined}
                  placeholder="Summarize the research question, evidence, and key finding in two or three sentences."
                  className="w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2.5 text-base text-ink placeholder:text-ink-secondary"
                />
                <p className="mt-1 text-sm text-ink-secondary">
                  {draft.summary.length} of {LIMITS.summary} characters
                </p>
              </div>
            </fieldset>

            <fieldset className="space-y-4 sm:space-y-5 border-t border-line pt-8">
              <Text as="legend" variant="card-title">Reviewed artifact</Text>

              <label className="flex items-start gap-3 text-base text-ink">
                <input
                  type="checkbox"
                  checked={draft.hasArtifact}
                  onChange={(event) => update('hasArtifact', event.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-border-strong text-brand-hover"
                />
                <span>This article reviews a paper, repository, or dataset.</span>
              </label>

              {draft.hasArtifact && (
                <div className="space-y-4 rounded-lg border border-line bg-surface-raised p-5">
                  <div>
                    <label htmlFor="write-artifact-type" className="mb-1.5 block text-sm font-medium text-ink">
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
                    <label htmlFor="write-artifact-identifier" className="mb-1.5 block text-sm font-medium text-ink">
                      Identifier <span className="text-ink-secondary">(required when the block is on)</span>
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
                    <label htmlFor="write-artifact-title" className="mb-1.5 block text-sm font-medium text-ink">
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
                      <label htmlFor="write-artifact-url" className="mb-1.5 block text-sm font-medium text-ink">
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
                      <label htmlFor="write-artifact-meta" className="mb-1.5 block text-sm font-medium text-ink">
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

            <fieldset className="space-y-4 sm:space-y-5 border-t border-line pt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Text as="legend" variant="card-title">Cover image</Text>
                  <p className="mt-1 text-sm text-ink-secondary">
                    Editorial 16:9 header image. Upload a JPG or JPEG (up to 512 KB) to crop and compress it.
                  </p>
                </div>

                {isSupabaseConfigured && user && (
                  <button
                    type="button"
                    onClick={() => setCropOpen(true)}
                    aria-haspopup="dialog"
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border-strong bg-surface-raised px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    <span>Upload banner</span>
                  </button>
                )}
              </div>

              {cropOpen && (
                <LazyImageCropDialog
                  kind="banner"
                  open={cropOpen}
                  onCancel={() => setCropOpen(false)}
                  onConfirm={handleCoverImages}
                />
              )}

              {draft.coverImage ? (
                <div className="rounded-lg border border-line bg-surface-raised p-4">
                  <div className="overflow-hidden rounded-md border border-line bg-surface-inverse">
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
                    <span className="font-mono text-xs text-ink-secondary">
                      {draft.coverImage.startsWith('data:') ? 'AVIF Base64 Data Stream' : draft.coverImage}
                    </span>
                    <button
                      type="button"
                      onClick={() => update('coverImage', '')}
                      className="inline-flex items-center gap-1 text-xs text-ink-secondary hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove cover</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="border-l-2 border-border-strong pl-4 text-sm leading-relaxed text-ink-secondary">
                  No custom cover image applied yet. The platform will use default editorial photography if published without one.
                </p>
              )}
            </fieldset>

            <fieldset className="space-y-4 sm:space-y-5 border-t border-line pt-8">
              <Text as="legend" variant="card-title">Body</Text>

              <div>
                <label id="write-content-label" htmlFor="write-content" className="mb-1.5 block text-sm font-medium text-ink">
                  Article body <span className="text-ink-secondary">(required)</span>
                </label>
                <div className="mt-1">
                  <MdxEditor
                    id="write-content"
                    value={draft.content}
                    onChange={(value) => update('content', value)}
                    error={errorField === 'write-content' ? (error ?? undefined) : undefined}
                    onUploadImage={isSupabaseConfigured ? (file) => uploadBlogImage(file) : undefined}
                  />
                </div>
                <p className="mt-1 flex flex-wrap justify-between gap-2 text-sm text-ink-secondary">
                  <span>Estimated reading time: {readTime} min.</span>
                  <span>
                    {draft.content.length} of {LIMITS.body} characters
                  </span>
                </p>
              </div>

              <div>
                <p id="takeaway-label" className="mb-1.5 text-sm font-medium text-ink">
                  Key takeaways <span className="text-ink-secondary">(at least one)</span>
                </p>
                <ul aria-labelledby="takeaway-label" className="space-y-3 sm:space-y-4">
                  {draft.takeaways.map((takeaway, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-3 font-mono text-sm text-ink-secondary">{String(index + 1).padStart(2, '0')}</span>
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
                        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border-strong bg-surface-raised text-ink-secondary transition-colors hover:border-destructive/40 hover:text-destructive"
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
                  className="mt-3 sm:mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border-strong bg-surface-raised px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-border-strong"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Add a takeaway</span>
                </button>
              </div>

              <div>
                <label htmlFor="write-tags" className="mb-1.5 block text-sm font-medium text-ink">
                  Tags <span className="text-ink-secondary">(comma separated, up to eight)</span>
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

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <p className="flex items-center gap-2 text-sm text-ink-secondary">
                <Save className="h-4 w-4" aria-hidden="true" />
                <span>{saveStatus}</span>
              </p>
              {canSelectPublicationType ? (
                <PublishSplitButton
                  id="write-publication-type"
                  value={draft.publicationType}
                  onChange={(next) => update('publicationType', next)}
                  label={
                    publishing
                      ? 'Publishing…'
                      : draft.publicationType === 'editorial'
                        ? 'Publish editorial'
                        : 'Publish review'
                  }
                  disabled={publishing}
                  submitType="submit"
                  radius="md"
                />
              ) : (
                <button
                  type="submit"
                  disabled={publishing}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover disabled:opacity-60"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>{publishing ? 'Publishing…' : 'Publish review'}</span>
                </button>
              )}
            </div>

            <p className="flex items-start gap-2 border-l-2 border-border-strong pl-4 text-sm leading-relaxed text-ink-secondary">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span>
                {isSupabaseConfigured
                  ? 'Publishing is disabled on this prototype form while the Supabase studio is active. Your draft stays in this browser.'
                  : 'Publishing writes to the local JSON archive in this prototype. In a read-only deployment the save will fail without losing your draft.'}
              </span>
            </p>
          </form>
        )}

        <section aria-label="How methodology design works" className="mt-12 border-t border-line pt-8">
          <WorkflowDisclosure workflow={RESEARCH_WORKFLOWS.methodology} heading="h2" summary="How a review's methodology is designed" />
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
