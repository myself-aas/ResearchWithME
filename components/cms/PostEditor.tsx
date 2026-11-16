'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  ImagePlus,
  Info,
  Plus,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { CATEGORIES, type ArticleFormat, type BlogCategory, type PublicationType } from '@/lib/blog-data';
import { ApiError, cmsFetch } from '@/lib/cms/client-api';
import { ARTICLE_FORMATS, normalizePostInput } from '@/lib/cms/schema';
import type { CmsArtifact, CmsPost, FieldErrors } from '@/lib/cms/types';
import { useDashboardUser } from './DashboardShell';
import { formatDate } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { uploadCover } from '@/lib/supabase/storage';
import type { EncodedImage } from '@/lib/images/process';
import LazyImageCropDialog from '@/components/media/LazyImageCropDialog';
import { slugify } from '@/lib/validation';
import { cn } from '@/lib/utils';
import ConfirmDelete from './ConfirmDelete';
import dynamic from 'next/dynamic';
const MarkdownEditor = dynamic(() => import('./MarkdownEditor'), { ssr: false });
import PublishSplitButton from './PublishSplitButton';
import StatusBadge from './StatusBadge';
import {
  fieldClass,
  hintClass,
  inlineErrorClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  subtleButtonClass,
  textareaClass,
} from './styles';
import { Text } from '@/components/primitives';

const COVER_PRESETS = [
  '/images/folio-hero.jpeg',
  '/images/folio-code.jpeg',
  '/images/folio-design.jpeg',
  '/images/folio-dashboard.jpeg',
  '/images/folio-process.jpeg',
];

const FIELD_DOM_IDS: Record<string, string> = {
  title: 'post-title',
  slug: 'post-slug',
  subtitle: 'post-subtitle',
  summary: 'post-summary',
  content: 'post-content',
  keyTakeaways: 'post-takeaway-0',
  authorId: 'post-author',
  coverImage: 'post-cover-preset-0',
};

interface AuthorOption {
  id: string;
  name: string;
  role: string;
}

interface PostFormState {
  title: string;
  slug: string;
  subtitle: string;
  summary: string;
  category: BlogCategory;
  format: ArticleFormat;
  publicationType: PublicationType;
  authorId: string;
  coverImage: string;
  tags: string;
  keyTakeaways: string[];
  content: string;
  featured: boolean;
  /**
   * The reviewed-artifact record. The studio has no editor for it, so it is
   * carried through every save untouched instead of being cleared.
   */
  artifact: CmsArtifact | null;
}

function stateFromPost(post?: CmsPost | null): PostFormState {
  return {
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    subtitle: post?.subtitle ?? '',
    summary: post?.summary ?? '',
    category: post?.category ?? 'Research Reviews',
    format: post?.format ?? 'Paper Review',
    publicationType: post?.publicationType === 'editorial' ? 'editorial' : 'review',
    authorId: post?.authorId ?? '',
    coverImage: post?.coverImage ?? '',
    tags: (post?.tags ?? []).join(', '),
    keyTakeaways: post?.keyTakeaways.length ? post.keyTakeaways : [''],
    content: post?.content ?? '',
    featured: post?.featured ?? false,
    artifact: post?.artifact ?? null,
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={inlineErrorClass}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export default function PostEditor({
  mode,
  initialPost = null,
  canSelectPublicationType,
}: {
  mode: 'create' | 'edit';
  initialPost?: CmsPost | null;
  /** Defaults to true only when signed in as Editor-in-Chief via DashboardShell. */
  canSelectPublicationType?: boolean;
}) {
  const router = useRouter();
  const dashboardUser = useDashboardUser();
  const allowPublicationType =
    canSelectPublicationType ?? dashboardUser?.isEditorInChief === true;
  const [postId, setPostId] = useState<string | null>(initialPost?.id ?? null);
  const [status, setStatus] = useState<'draft' | 'published'>(initialPost?.status ?? 'draft');
  const [form, setForm] = useState<PostFormState>(() => stateFromPost(initialPost));
  const [baseline, setBaseline] = useState(() => JSON.stringify(stateFromPost(initialPost)));
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<'draft' | 'published' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [authorOptions, setAuthorOptions] = useState<AuthorOption[]>([]);
  const [authorsError, setAuthorsError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline]);
  const savedAt = initialPost ? formatDate(initialPost.updatedAt) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/authors', { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(String(response.status));
        const payload = (await response.json()) as { authors?: AuthorOption[] };
        if (cancelled) return;
        const list = payload.authors ?? [];
        setAuthorOptions(list);
        // Default a new post to the first profile, and move the baseline with it
        // so pre-filling the byline does not mark the form as edited.
        if (list.length > 0) {
          setForm((previous) =>
            previous.authorId ? previous : { ...previous, authorId: list[0].id },
          );
          setBaseline((previous) => {
            const parsed = JSON.parse(previous) as PostFormState;
            return parsed.authorId ? previous : JSON.stringify({ ...parsed, authorId: list[0].id });
          });
        }
      } catch {
        if (!cancelled) setAuthorsError('Author profiles could not be loaded. Reload to try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A post can predate its author's profile, or the profile was unpublished
  // after publication. Keep the stored byline visible instead of quietly
  // re-attributing the article to whoever is first in the list.
  const selectableAuthors = useMemo(() => {
    if (!form.authorId || authorOptions.some((author) => author.id === form.authorId)) {
      return authorOptions;
    }
    const stored = initialPost?.authorName || form.authorId;
    return [{ id: form.authorId, name: stored, role: 'profile unavailable' }, ...authorOptions];
  }, [authorOptions, form.authorId, initialPost?.authorName]);

  useEffect(() => {
    if (!dirty || saving) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);

  function clearFieldError(key: string) {
    setError(null);
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setNotice(null);
  }

  function update<K extends keyof PostFormState>(key: K, value: PostFormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    clearFieldError(key);
  }

  function updateTitle(value: string) {
    setForm((previous) => ({
      ...previous,
      title: value,
      slug: slugTouched ? previous.slug : slugify(value),
    }));
    clearFieldError('title');
    if (!slugTouched) clearFieldError('slug');
  }

  function updateSlug(value: string) {
    setSlugTouched(true);
    update('slug', value);
  }

  function updateTakeaway(index: number, value: string) {
    setForm((previous) => {
      const keyTakeaways = [...previous.keyTakeaways];
      keyTakeaways[index] = value;
      return { ...previous, keyTakeaways };
    });
    clearFieldError('keyTakeaways');
  }

  function addTakeaway() {
    setForm((previous) => ({ ...previous, keyTakeaways: [...previous.keyTakeaways, ''] }));
  }

  function removeTakeaway(index: number) {
    setForm((previous) => ({
      ...previous,
      keyTakeaways:
        previous.keyTakeaways.length > 1 ? previous.keyTakeaways.filter((_, i) => i !== index) : [''],
    }));
  }

  function focusFirstError(errors: FieldErrors) {
    const firstKey = Object.keys(errors)[0];
    const targetId = firstKey ? FIELD_DOM_IDS[firstKey] : undefined;
    requestAnimationFrame(() => {
      if (targetId) {
        const field = document.getElementById(targetId);
        if (field) {
          field.focus();
          field.scrollIntoView({ block: 'center', behavior: 'smooth' });
          return;
        }
      }
      errorRef.current?.focus();
    });
  }

  function payload(targetStatus: 'draft' | 'published') {
    return {
      artifact: form.artifact,
      title: form.title,
      slug: form.slug,
      subtitle: form.subtitle,
      summary: form.summary,
      category: form.category,
      format: form.format,
      publicationType: form.publicationType,
      authorId: form.authorId,
      coverImage: form.coverImage || null,
      tags: form.tags,
      keyTakeaways: form.keyTakeaways.filter((item) => item.trim()),
      content: form.content,
      featured: form.featured,
      status: targetStatus,
    };
  }

  async function save(targetStatus: 'draft' | 'published') {
    if (saving) return;

    const parsed = normalizePostInput(payload(targetStatus));
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      setError(parsed.message);
      setNotice(null);
      focusFirstError(parsed.fieldErrors);
      return;
    }

    setSaving(targetStatus);
    setError(null);
    setFieldErrors({});
    setNotice(null);

    try {
      const endpoint = postId ? `/api/cms/posts/${postId}` : '/api/cms/posts';
      const data = await cmsFetch<{ post: CmsPost }>(endpoint, {
        method: postId ? 'PATCH' : 'POST',
        body: JSON.stringify(parsed.value),
      });

      const saved = stateFromPost(data.post);
      setForm(saved);
      setBaseline(JSON.stringify(saved));
      setStatus(data.post.status);
      setPostId(data.post.id);
      setSlugTouched(true);
      setNotice(
        data.post.status === 'published'
          ? 'Published. The article is live and the platform index has been revalidated.'
          : 'Draft saved. It is private until you publish it.',
      );
      router.refresh();

      if (!postId) {
        router.replace(`/dashboard/edit/${data.post.id}`);
      }
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        if (cause.fieldErrors) {
          setFieldErrors(cause.fieldErrors);
          focusFirstError(cause.fieldErrors);
        }
      } else {
        setError('The article could not be saved. Your text is still in the editor.');
      }
    } finally {
      setSaving(null);
    }
  }

  async function remove() {
    if (!postId || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await cmsFetch(`/api/cms/posts/${postId}`, { method: 'DELETE' });
      router.push('/dashboard/manage');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The article could not be deleted.');
      setDeleting(false);
    }
  }

  async function handleCoverImages(images: EncodedImage[]) {
    // Errors propagate to the dialog, which shows them and keeps the crop.
    const url = await uploadCover(images);
    update('coverImage', url);
    setCropOpen(false);
  }

  const errorKeys = Object.keys(fieldErrors);
  const primaryLabel = status === 'published' ? 'Save published changes' : 'Publish article';
  const splitPublishLabel =
    saving === 'published'
      ? 'Publishing…'
      : saving === 'draft'
        ? 'Saving…'
        : status === 'published'
          ? form.publicationType === 'editorial'
            ? 'Save editorial changes'
            : 'Save review changes'
          : form.publicationType === 'editorial'
            ? 'Publish editorial'
            : 'Publish review';
  const secondaryLabel = status === 'published' ? 'Revert to draft' : 'Save draft';

  return (
    <div className="pb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/dashboard/manage" className={cn(subtleButtonClass, '-ml-2.5')}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>All articles</span>
          </Link>
          <h1 className="mt-2 break-words font-serif text-3xl font-bold tracking-tight text-ink">
            {mode === 'create' && !postId ? 'New article' : form.title || 'Untitled article'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-secondary">
            <StatusBadge status={status} />
            <span>
              {dirty
                ? 'Unsaved changes'
                : savedAt
                  ? `Saved ${savedAt}`
                  : 'Not saved yet'}
            </span>
            {status === 'published' && form.slug && (
              <span className="font-mono text-ink-secondary">/post/{form.slug}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status === 'published' && form.slug && (
            <Link href={`/post/${form.slug}`} className={secondaryButtonClass}>
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span>View article</span>
            </Link>
          )}
          {postId && (
            <ConfirmDelete
              onConfirm={remove}
              busy={deleting}
              label="Delete article"
              question="Delete this article and its comments?"
              busyLabel="Deleting…"
            />
          )}
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 border-l-2 border-success bg-success/5 px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </p>
      )}

      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-5 border-l-2 border-destructive bg-destructive/5 px-4 py-3"
        >
          <p className="flex items-start gap-2 text-sm font-semibold text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
          {errorKeys.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-9 text-sm text-destructive">
              {errorKeys.map((key) => (
                <li key={key}>
                  <a href={`#${FIELD_DOM_IDS[key] ?? 'post-title'}`} className="underline underline-offset-4">
                    {key === 'keyTakeaways' ? 'Key takeaways' : key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form
        className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface-raised"
        onSubmit={(event) => event.preventDefault()}
      >
        <section aria-labelledby="record-heading" className="space-y-5 p-5 sm:p-6">
          <Text id="record-heading" as="h2" variant="card-title">
            The record
          </Text>

          <div>
            <label htmlFor="post-title" className={labelClass}>
              Title
            </label>
            <input
              id="post-title"
              type="text"
              enterKeyHint="next"
              value={form.title}
              onChange={(event) => updateTitle(event.target.value)}
              maxLength={180}
              aria-invalid={fieldErrors.title ? true : undefined}
              aria-describedby={`post-title-hint${fieldErrors.title ? ' post-title-error' : ''}`}
              placeholder="What did you find, and why does it matter?"
              className={cn(fieldClass, 'h-12 font-serif text-lg', fieldErrors.title && 'border-destructive')}
            />
            <p id="post-title-hint" className={hintClass}>
              At least 8 characters. The title becomes the URL unless you change the slug.
            </p>
            <FieldError id="post-title-error" message={fieldErrors.title} />
          </div>

          <div>
            <label htmlFor="post-slug" className={labelClass}>
              Article slug
            </label>
            <div className="flex">
              <span
                aria-hidden="true"
                className="inline-flex h-11 items-center rounded-l-md border border-r-0 border-border-strong bg-surface px-3 font-mono text-sm text-ink-secondary"
              >
                /post/
              </span>
              <input
                id="post-slug"
                type="text"
                enterKeyHint="next"
                value={form.slug}
                onChange={(event) => updateSlug(event.target.value)}
                onBlur={() => update('slug', slugify(form.slug))}
                maxLength={96}
                aria-invalid={fieldErrors.slug ? true : undefined}
                aria-describedby={`post-slug-hint${fieldErrors.slug ? ' post-slug-error' : ''}`}
                className={cn(fieldClass, 'rounded-l-none font-mono', fieldErrors.slug && 'border-destructive')}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <p id="post-slug-hint" className={hintClass}>
              {status === 'published'
                ? 'Changing the URL of a published article breaks existing links.'
                : 'Letters, numbers, and hyphens only.'}
            </p>
            <FieldError id="post-slug-error" message={fieldErrors.slug} />
          </div>

          <div>
            <label htmlFor="post-subtitle" className={labelClass}>
              Standfirst <span className="font-normal text-ink-secondary">(optional)</span>
            </label>
            <input
              id="post-subtitle"
              type="text"
              value={form.subtitle}
              onChange={(event) => update('subtitle', event.target.value)}
              maxLength={400}
              placeholder="One sentence that sets up the analysis"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="post-summary" className={labelClass}>
              Summary
            </label>
            <textarea
              id="post-summary"
              rows={3}
              value={form.summary}
              onChange={(event) => update('summary', event.target.value)}
              maxLength={1200}
              aria-invalid={fieldErrors.summary ? true : undefined}
              aria-describedby={`post-summary-hint${fieldErrors.summary ? ' post-summary-error' : ''}`}
              placeholder="What the review covers, what was tested, and what a reader should take away."
              className={cn(textareaClass, fieldErrors.summary && 'border-destructive')}
            />
            <p id="post-summary-hint" className={cn(hintClass, 'flex flex-wrap justify-between gap-2')}>
              <span>Shown in the platform feed. At least 40 characters to publish.</span>
              <span>{form.summary.length} of 1200</span>
            </p>
            <FieldError id="post-summary-error" message={fieldErrors.summary} />
          </div>
        </section>

        <section aria-labelledby="byline-heading" className="space-y-5 p-5 sm:p-6">
          <Text id="byline-heading" as="h2" variant="card-title">
            Byline and classification
          </Text>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Bylines must map to a verified author profile so every published article has a credential the reader can
            inspect.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="post-author" className={labelClass}>
                Author profile
              </label>
              <select
                id="post-author"
                value={form.authorId}
                onChange={(event) => update('authorId', event.target.value)}
                aria-invalid={fieldErrors.authorId ? true : undefined}
                aria-describedby={fieldErrors.authorId ? 'post-author-error' : undefined}
                className={cn(fieldClass, fieldErrors.authorId && 'border-destructive')}
              >
                {selectableAuthors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.role ? `${author.name} — ${author.role}` : author.name}
                  </option>
                ))}
              </select>
              {authorsError ? (
                <FieldError id="post-author-load-error" message={authorsError} />
              ) : authorOptions.length === 0 ? (
                <p className={hintClass}>
                  No published author profiles yet. An author has to publish their profile before
                  they can be credited here.
                </p>
              ) : null}
              <FieldError id="post-author-error" message={fieldErrors.authorId} />
            </div>

            <div>
              <label htmlFor="post-category" className={labelClass}>
                Category
              </label>
              <select
                id="post-category"
                value={form.category}
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
              <label htmlFor="post-format" className={labelClass}>
                Format
              </label>
              <select
                id="post-format"
                value={form.format}
                onChange={(event) => update('format', event.target.value as ArticleFormat)}
                className={fieldClass}
              >
                {ARTICLE_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="post-tags" className={labelClass}>
                Tags <span className="font-normal text-ink-secondary">(comma separated, up to eight)</span>
              </label>
              <input
                id="post-tags"
                type="text"
                value={form.tags}
                onChange={(event) => update('tags', event.target.value)}
                maxLength={240}
                placeholder="GPU inference, paged attention"
                className={fieldClass}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="cover-heading" className="space-y-4 p-5 sm:p-6">
          <Text id="cover-heading" as="h2" variant="card-title">
            Cover image
          </Text>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Covers use the 16:9 editorial frame at the top of the article. Upload a JPG or JPEG banner (up to 512 KB) to crop
            and compress it, or choose a bundled photograph.
          </p>

          {form.coverImage ? (
            <div className="max-w-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.coverImage}
                alt=""
                width={640}
                height={360}
                fetchPriority="high"
                className="h-40 w-full rounded-md border border-line object-cover"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="break-all font-mono text-sm text-ink-secondary">{form.coverImage}</span>
                <button type="button" onClick={() => update('coverImage', '')} className={subtleButtonClass}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>Remove cover</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="border-l-2 border-border-strong pl-4 text-sm leading-relaxed text-ink-secondary">
              No cover selected. The default editorial image is used if this article is published without one.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {isSupabaseConfigured && (
              <>
                <button
                  type="button"
                  onClick={() => setCropOpen(true)}
                  aria-haspopup="dialog"
                  className={secondaryButtonClass}
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>Upload banner</span>
                </button>
                {cropOpen && (
                  <LazyImageCropDialog
                    kind="banner"
                    open={cropOpen}
                    onCancel={() => setCropOpen(false)}
                    onConfirm={handleCoverImages}
                  />
                )}
              </>
            )}
          </div>

          <div
            role="group"
            aria-label="Bundled cover images"
            aria-describedby={fieldErrors.coverImage ? 'post-cover-error' : undefined}
            className="flex flex-wrap gap-2"
          >
            {COVER_PRESETS.map((preset, index) => (
              <button
                key={preset}
                id={index === 0 ? 'post-cover-preset-0' : undefined}
                type="button"
                aria-pressed={form.coverImage === preset}
                aria-label={`Use the bundled cover ${preset.split('/').pop()}`}
                onClick={() => update('coverImage', preset)}
                className={cn(
                  'h-16 w-24 overflow-hidden rounded-md border-2 transition-colors',
                  form.coverImage === preset
                    ? 'border-brand'
                    : 'border-transparent hover:border-border-strong',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preset}
                  alt=""
                  width={192}
                  height={128}
                  loading={index < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
          <FieldError id="post-cover-error" message={fieldErrors.coverImage} />
        </section>

        <section aria-labelledby="takeaways-heading" className="space-y-4 p-5 sm:p-6">
          <div>
            <Text id="takeaways-heading" as="h2" variant="card-title">
              Key takeaways
            </Text>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-secondary">
              At least one is required before publishing. These appear above the body in the reader.
            </p>
          </div>

          <ul aria-labelledby="takeaways-heading" className="space-y-3">
            {form.keyTakeaways.map((takeaway, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-3 w-7 shrink-0 font-mono text-sm text-ink-secondary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <label htmlFor={`post-takeaway-${index}`} className="sr-only">
                    Key takeaway {index + 1}
                  </label>
                  <input
                    id={`post-takeaway-${index}`}
                    type="text"
                    value={takeaway}
                    onChange={(event) => updateTakeaway(index, event.target.value)}
                    maxLength={300}
                    aria-invalid={fieldErrors.keyTakeaways && index === 0 ? true : undefined}
                    aria-describedby={fieldErrors.keyTakeaways && index === 0 ? 'post-takeaways-error' : undefined}
                    placeholder="The one result a reader should remember"
                    className={cn(fieldClass, fieldErrors.keyTakeaways && index === 0 && 'border-destructive')}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeTakeaway(index)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface-raised text-ink-secondary transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Remove key takeaway {index + 1}</span>
                </button>
              </li>
            ))}
          </ul>

          <button type="button" onClick={addTakeaway} className={secondaryButtonClass}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add a takeaway</span>
          </button>
          <FieldError id="post-takeaways-error" message={fieldErrors.keyTakeaways} />
        </section>

        <section aria-labelledby="body-heading" className="space-y-4 p-5 sm:p-6">
          <Text id="body-heading" as="h2" variant="card-title">
            Body
          </Text>
          <MarkdownEditor
            id="post-content"
            value={form.content}
            onChange={(value) => update('content', value)}
            error={fieldErrors.content}
          />
        </section>

        <section aria-labelledby="publishing-heading" className="space-y-4 p-5 sm:p-6">
          <Text id="publishing-heading" as="h2" variant="card-title">
            Publishing
          </Text>
          <label
            htmlFor="post-featured"
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-line bg-canvas px-4 py-3"
          >
            <input
              id="post-featured"
              type="checkbox"
              checked={form.featured}
              onChange={(event) => update('featured', event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border-strong text-brand"
            />
            <span className="text-sm leading-relaxed text-ink">
              <span className="block font-medium">Feature on the platform home page</span>
              <span className="block text-ink-secondary">
                The featured article occupies the lead slot. Use it for at most one live article at a time.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas p-5 sm:p-6">
          <p aria-live="polite" className="text-sm text-ink-secondary">
            {saving
              ? 'Saving…'
              : error
                ? 'Nothing was saved. Fix the fields above and try again.'
                : dirty
                  ? 'Unsaved changes.'
                  : savedAt
                    ? 'All changes saved.'
                    : 'Nothing saved yet.'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void save('draft')}
              disabled={Boolean(saving) || deleting}
              className={secondaryButtonClass}
              aria-label={status === 'published' ? 'Unpublish and revert to draft' : 'Save draft'}
            >
              {secondaryLabel}
            </button>
            {allowPublicationType ? (
              <PublishSplitButton
                id="cms-publication-type"
                value={form.publicationType}
                onChange={(next) => update('publicationType', next)}
                label={splitPublishLabel}
                disabled={Boolean(saving) || deleting}
                onPublish={() => void save('published')}
                radius="full"
              />
            ) : (
              <button
                type="button"
                onClick={() => void save('published')}
                disabled={Boolean(saving) || deleting}
                className={primaryButtonClass}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>{saving === 'published' ? 'Publishing…' : saving === 'draft' ? 'Saving…' : primaryLabel}</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {!postId && (
        <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-ink-secondary">
          <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-brand-hover" aria-hidden="true" />
          <span>Nothing is public until you publish. Drafts stay in the studio.</span>
        </p>
      )}

      {postId && status === 'published' && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-secondary">
          <Link href={`/dashboard/comments`} className="font-medium text-brand underline underline-offset-4">
            Moderate the discussion
          </Link>
          <span aria-hidden="true">·</span>
          <span>Comments on this article appear publicly immediately.</span>
        </p>
      )}

      {postId && status === 'draft' && (
        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
          This draft is not visible on the platform. Publishing revalidates the home page and its reader URL.
        </p>
      )}

      <p className={cn(hintClass, 'mt-4 flex items-center gap-2')}>
        <Info className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden="true" />
        <span>Markdown source is stored as-is. The reader ignores raw HTML.</span>
      </p>
    </div>
  );
}
