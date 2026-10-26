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
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { AUTHORS, CATEGORIES, type ArticleFormat, type BlogCategory } from '@/lib/blog-data';
import QwenCoverGenerator from './QwenCoverGenerator';
import { ApiError, cmsFetch } from '@/lib/cms/client-api';
import { ARTICLE_FORMATS, normalizePostInput } from '@/lib/cms/schema';
import type { CmsPost, FieldErrors } from '@/lib/cms/types';
import { formatDate } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { uploadBlogImage, validateImageFile } from '@/lib/supabase/storage';
import { slugify } from '@/lib/validation';
import { cn } from '@/lib/utils';
import ConfirmDelete from './ConfirmDelete';
import MarkdownEditor from './MarkdownEditor';
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

interface PostFormState {
  title: string;
  slug: string;
  subtitle: string;
  summary: string;
  category: BlogCategory;
  format: ArticleFormat;
  authorId: string;
  coverImage: string;
  tags: string;
  keyTakeaways: string[];
  content: string;
  featured: boolean;
}

function stateFromPost(post?: CmsPost | null): PostFormState {
  return {
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    subtitle: post?.subtitle ?? '',
    summary: post?.summary ?? '',
    category: post?.category ?? 'Research Reviews',
    format: post?.format ?? 'Paper Review',
    authorId: post?.authorId && AUTHORS[post.authorId] ? post.authorId : Object.keys(AUTHORS)[0],
    coverImage: post?.coverImage ?? '',
    tags: (post?.tags ?? []).join(', '),
    keyTakeaways: post?.keyTakeaways.length ? post.keyTakeaways : [''],
    content: post?.content ?? '',
    featured: post?.featured ?? false,
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
}: {
  mode: 'create' | 'edit';
  initialPost?: CmsPost | null;
}) {
  const router = useRouter();
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAiCover, setShowAiCover] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline]);
  const savedAt = initialPost ? formatDate(initialPost.updatedAt) : null;

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
      title: form.title,
      slug: form.slug,
      subtitle: form.subtitle,
      summary: form.summary,
      category: form.category,
      format: form.format,
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
          ? 'Published. The article is live and the journal index has been revalidated.'
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

  async function handleCoverFile(file: File) {
    const problem = validateImageFile(file);
    if (problem) {
      setUploadError(problem);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadBlogImage(file);
      update('coverImage', url);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : 'The cover image could not be uploaded.');
    } finally {
      setUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  const errorKeys = Object.keys(fieldErrors);
  const primaryLabel = status === 'published' ? 'Save published changes' : 'Publish article';
  const secondaryLabel = status === 'published' ? 'Revert to draft' : 'Save draft';

  return (
    <div className="pb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/dashboard/manage" className={cn(subtleButtonClass, '-ml-2.5')}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>All articles</span>
          </Link>
          <h1 className="mt-2 break-words font-serif text-3xl font-bold tracking-tight text-stone-900">
            {mode === 'create' && !postId ? 'New article' : form.title || 'Untitled article'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
            <StatusBadge status={status} />
            <span>
              {dirty
                ? 'Unsaved changes'
                : savedAt
                  ? `Saved ${savedAt}`
                  : 'Not saved yet'}
            </span>
            {status === 'published' && form.slug && (
              <span className="font-mono text-stone-600">/post/{form.slug}</span>
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
          className="mt-5 flex items-start gap-2 border-l-2 border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
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
          className="mt-5 border-l-2 border-red-700 bg-red-50 px-4 py-3"
        >
          <p className="flex items-start gap-2 text-sm font-semibold text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
          {errorKeys.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-9 text-sm text-red-900">
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
        className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white"
        onSubmit={(event) => event.preventDefault()}
      >
        <section aria-labelledby="record-heading" className="space-y-5 p-5 sm:p-6">
          <h2 id="record-heading" className="font-serif text-xl font-semibold text-stone-900">
            The record
          </h2>

          <div>
            <label htmlFor="post-title" className={labelClass}>
              Title
            </label>
            <input
              id="post-title"
              type="text"
              value={form.title}
              onChange={(event) => updateTitle(event.target.value)}
              maxLength={180}
              aria-invalid={fieldErrors.title ? true : undefined}
              aria-describedby={`post-title-hint${fieldErrors.title ? ' post-title-error' : ''}`}
              placeholder="What did you find, and why does it matter?"
              className={cn(fieldClass, 'h-12 font-serif text-lg', fieldErrors.title && 'border-red-700')}
            />
            <p id="post-title-hint" className={hintClass}>
              At least 8 characters. The title becomes the URL unless you change the slug.
            </p>
            <FieldError id="post-title-error" message={fieldErrors.title} />
          </div>

          <div>
            <label htmlFor="post-slug" className={labelClass}>
              URL
            </label>
            <div className="flex">
              <span
                aria-hidden="true"
                className="inline-flex h-11 items-center rounded-l-md border border-r-0 border-stone-300 bg-stone-100 px-3 font-mono text-sm text-stone-600"
              >
                /post/
              </span>
              <input
                id="post-slug"
                type="text"
                value={form.slug}
                onChange={(event) => updateSlug(event.target.value)}
                onBlur={() => update('slug', slugify(form.slug))}
                maxLength={96}
                aria-invalid={fieldErrors.slug ? true : undefined}
                aria-describedby={`post-slug-hint${fieldErrors.slug ? ' post-slug-error' : ''}`}
                className={cn(fieldClass, 'rounded-l-none font-mono', fieldErrors.slug && 'border-red-700')}
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
              Standfirst <span className="font-normal text-stone-600">(optional)</span>
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
              className={cn(textareaClass, fieldErrors.summary && 'border-red-700')}
            />
            <p id="post-summary-hint" className={cn(hintClass, 'flex flex-wrap justify-between gap-2')}>
              <span>Shown in the journal feed. At least 40 characters to publish.</span>
              <span>{form.summary.length} of 1200</span>
            </p>
            <FieldError id="post-summary-error" message={fieldErrors.summary} />
          </div>
        </section>

        <section aria-labelledby="byline-heading" className="space-y-5 p-5 sm:p-6">
          <h2 id="byline-heading" className="font-serif text-xl font-semibold text-stone-900">
            Byline and classification
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
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
                className={cn(fieldClass, fieldErrors.authorId && 'border-red-700')}
              >
                {Object.values(AUTHORS).map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name} — {author.role}
                  </option>
                ))}
              </select>
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
                Tags <span className="font-normal text-stone-600">(comma separated, up to eight)</span>
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
          <h2 id="cover-heading" className="font-serif text-xl font-semibold text-stone-900">
            Cover image
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
            Covers use the 16:9 editorial frame at the top of the article. Upload a new image to the media library, or
            choose a bundled photograph.
          </p>

          {form.coverImage ? (
            <div className="max-w-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.coverImage}
                alt=""
                className="h-40 w-full rounded-md border border-stone-200 object-cover"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="break-all font-mono text-sm text-stone-600">{form.coverImage}</span>
                <button type="button" onClick={() => update('coverImage', '')} className={subtleButtonClass}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>Remove cover</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="border-l-2 border-stone-300 pl-4 text-sm leading-relaxed text-stone-600">
              No cover selected. The default editorial image is used if this article is published without one.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAiCover(!showAiCover)}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>{showAiCover ? 'Hide Qwen 2.1 Generator' : 'Generate with Qwen 2.1 (AVIF)'}</span>
            </button>

            {isSupabaseConfigured && (
              <>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleCoverFile(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploading}
                  className={secondaryButtonClass}
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>{uploading ? 'Uploading…' : 'Upload cover'}</span>
                </button>
              </>
            )}
          </div>

          {showAiCover && (
            <div className="pt-2">
              <QwenCoverGenerator
                currentCover={form.coverImage}
                articleTitle={form.title}
                articleSubtitle={form.subtitle}
                articleCategory={form.category}
                onApplyCover={(imageUri) => {
                  update('coverImage', imageUri);
                  setUploadError(null);
                }}
              />
            </div>
          )}

          {uploadError && (
            <p role="alert" className={inlineErrorClass}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{uploadError}</span>
            </p>
          )}

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
                onClick={() => {
                  update('coverImage', preset);
                  setUploadError(null);
                }}
                className={cn(
                  'h-16 w-24 overflow-hidden rounded-md border-2 transition-colors',
                  form.coverImage === preset
                    ? 'border-amber-900'
                    : 'border-transparent hover:border-stone-400',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preset} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <FieldError id="post-cover-error" message={fieldErrors.coverImage} />
        </section>

        <section aria-labelledby="takeaways-heading" className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 id="takeaways-heading" className="font-serif text-xl font-semibold text-stone-900">
              Key takeaways
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">
              At least one is required before publishing. These appear above the body in the reader.
            </p>
          </div>

          <ul aria-labelledby="takeaways-heading" className="space-y-3">
            {form.keyTakeaways.map((takeaway, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-3 w-7 shrink-0 font-mono text-sm text-stone-600">
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
                    className={cn(fieldClass, fieldErrors.keyTakeaways && index === 0 && 'border-red-700')}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeTakeaway(index)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition-colors hover:border-red-300 hover:text-red-800"
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
          <h2 id="body-heading" className="font-serif text-xl font-semibold text-stone-900">
            Body
          </h2>
          <MarkdownEditor
            id="post-content"
            value={form.content}
            onChange={(value) => update('content', value)}
            error={fieldErrors.content}
          />
        </section>

        <section aria-labelledby="publishing-heading" className="space-y-4 p-5 sm:p-6">
          <h2 id="publishing-heading" className="font-serif text-xl font-semibold text-stone-900">
            Publishing
          </h2>
          <label
            htmlFor="post-featured"
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-stone-200 bg-stone-50 px-4 py-3"
          >
            <input
              id="post-featured"
              type="checkbox"
              checked={form.featured}
              onChange={(event) => update('featured', event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-400 text-amber-900"
            />
            <span className="text-sm leading-relaxed text-stone-800">
              <span className="block font-medium">Feature on the journal home page</span>
              <span className="block text-stone-600">
                The featured article occupies the lead slot. Use it for at most one live article at a time.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-5 sm:p-6">
          <p aria-live="polite" className="text-sm text-stone-600">
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save('draft')}
              disabled={Boolean(saving) || deleting}
              className={secondaryButtonClass}
              aria-label={status === 'published' ? 'Unpublish and revert to draft' : 'Save draft'}
            >
              {secondaryLabel}
            </button>
            <button
              type="button"
              onClick={() => void save('published')}
              disabled={Boolean(saving) || deleting}
              className={primaryButtonClass}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>{saving === 'published' ? 'Publishing…' : saving === 'draft' ? 'Saving…' : primaryLabel}</span>
            </button>
          </div>
        </div>
      </form>

      {!postId && (
        <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-stone-600">
          <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden="true" />
          <span>Nothing is public until you publish. Drafts stay in the studio.</span>
        </p>
      )}

      {postId && status === 'published' && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <Link href={`/dashboard/comments`} className="font-medium text-amber-900 underline underline-offset-4">
            Moderate the discussion
          </Link>
          <span aria-hidden="true">·</span>
          <span>Comments on this article appear publicly immediately.</span>
        </p>
      )}

      {postId && status === 'draft' && (
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          This draft is not visible on the journal. Publishing revalidates the home page and its reader URL.
        </p>
      )}

      <p className={cn(hintClass, 'mt-4 flex items-center gap-2')}>
        <Info className="h-4 w-4 shrink-0 text-stone-600" aria-hidden="true" />
        <span>Markdown source is stored as-is. The reader ignores raw HTML.</span>
      </p>
    </div>
  );
}
