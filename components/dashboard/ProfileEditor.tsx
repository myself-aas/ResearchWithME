'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, Loader2, Save } from 'lucide-react';
import type { EditableProfile } from '@/lib/dashboard/profile';
import { hasSupabaseBrowserConfig, getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  PROFILE_LIMITS,
  suggestProfileSlug,
  validateProfileDraft,
  type ProfileDraft,
  type ProfileErrors,
} from '@/lib/profile/validation';
import {
  fieldClass,
  hintClass,
  inlineErrorClass,
  labelClass,
  primaryButtonClass,
} from '@/components/cms/styles';

const SAVED = 'Profile saved.';

function draftFrom(profile: EditableProfile | null, sessionName: string, email: string): ProfileDraft {
  if (profile) {
    return {
      slug: profile.slug,
      displayName: profile.displayName || sessionName,
      role: profile.role,
      domain: profile.domain,
      institution: profile.institution,
      bio: profile.bio,
      orcid: profile.orcid,
      github: profile.github,
      website: profile.website,
      scholar: profile.scholar,
      published: profile.published,
    };
  }
  return {
    slug: suggestProfileSlug({ displayName: sessionName, email }),
    displayName: sessionName,
    role: '',
    domain: '',
    institution: '',
    bio: '',
    orcid: '',
    github: '',
    website: '',
    scholar: '',
    published: false,
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={inlineErrorClass}>
      {message}
    </p>
  );
}

/**
 * Editor for the caller's own `public.profiles` row.
 *
 * Writes go straight through the cookie-backed browser client, so the database
 * policies remain the authority: the "owner only" insert/update policies mean a
 * crafted request cannot touch another person's profile. Nothing is mirrored to
 * a second store — the public author page reads the same row.
 */
export default function ProfileEditor({
  userId,
  email,
  sessionName,
  profile,
}: {
  userId: string;
  email: string;
  sessionName: string;
  profile: EditableProfile | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFrom(profile, sessionName, email));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(Boolean(profile));
  const [hasRow, setHasRow] = useState(Boolean(profile));

  const previewHref = draft.slug ? `/author/${draft.slug}` : null;
  const bioCount = draft.bio.trim().length;

  const update = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setStatus('idle');
    setFormError(null);
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'displayName' && !slugEdited) {
        next.slug = suggestProfileSlug({ displayName: String(value) });
      }
      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateProfileDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      setStatus('idle');
      setFormError('Check the highlighted fields before saving.');
      return;
    }
    setErrors({});
    setFormError(null);
    if (!hasSupabaseBrowserConfig()) {
      setFormError('Profile editing needs the Supabase connection, which is not configured in this environment.');
      return;
    }

    setStatus('saving');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('profiles').upsert(
        { user_id: userId, ...result.value },
        { onConflict: 'user_id' },
      );
      if (error) throw error;
      setStatus('saved');
      setHasRow(true);
      router.refresh();
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        setErrors({ slug: 'That profile URL is already taken. Choose a different slug.' });
        setFormError('Check the highlighted fields before saving.');
      } else {
        setFormError(
          error instanceof Error ? error.message : 'Could not save your profile. Try again in a moment.',
        );
      }
      setStatus('idle');
    }
  }

  const previewLabel = useMemo(() => (previewHref ? `/author/${draft.slug}` : ''), [draft.slug, previewHref]);

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-line bg-surface-raised p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold text-ink">
            {hasRow ? 'Edit your public profile' : 'Create your public profile'}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-secondary">
            These details power your byline and your <Link href="/authors" className="font-medium text-link underline-offset-2 hover:underline">author page</Link>. Only what you fill in is shown.
          </p>
        </div>
        {previewHref && hasRow && draft.published ? (
          <Link
            href={previewHref}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-subtle"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            <span>View public page</span>
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="profile-name" className={labelClass}>
            Display name
          </label>
          <input
            id="profile-name"
            className={fieldClass}
            value={draft.displayName}
            onChange={(event) => update('displayName', event.target.value)}
            maxLength={PROFILE_LIMITS.displayName + 20}
            autoComplete="name"
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={errors.displayName ? 'profile-name-error' : 'profile-name-hint'}
          />
          <p id="profile-name-hint" className={hintClass}>
            The name readers see on bylines, e.g. “Ashif Ahmed Shuvo”.
          </p>
          <FieldError id="profile-name-error" message={errors.displayName} />
        </div>

        <div>
          <label htmlFor="profile-slug" className={labelClass}>
            Profile URL
          </label>
          <div className="flex items-center rounded-lg border border-border-strong bg-surface-raised focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
            <span className="pl-3 text-sm text-ink-secondary">/author/</span>
            <input
              id="profile-slug"
              className="h-11 w-full min-w-0 rounded-lg bg-transparent px-2 text-base text-ink placeholder:text-ink-secondary focus:outline-none"
              value={draft.slug}
              onChange={(event) => {
                setSlugEdited(true);
                update('slug', event.target.value);
              }}
              maxLength={PROFILE_LIMITS.slug + 20}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={errors.slug ? 'profile-slug-error' : 'profile-slug-hint'}
            />
          </div>
          <p id="profile-slug-hint" className={hintClass}>
            Lowercase letters, numbers, and dashes. Must be unique.
          </p>
          <FieldError id="profile-slug-error" message={errors.slug} />
        </div>

        <div>
          <label htmlFor="profile-role" className={labelClass}>
            Role <span className="font-normal text-ink-secondary">(optional)</span>
          </label>
          <input
            id="profile-role"
            className={fieldClass}
            value={draft.role}
            onChange={(event) => update('role', event.target.value)}
            placeholder="Independent researcher"
            maxLength={PROFILE_LIMITS.role + 20}
            aria-invalid={Boolean(errors.role)}
            aria-describedby="profile-role-hint"
          />
          <p id="profile-role-hint" className={hintClass}>
            Shown next to your name, e.g. “Editor-in-Chief” or “PhD candidate”.
          </p>
          <FieldError id="profile-role-error" message={errors.role} />
        </div>

        <div>
          <label htmlFor="profile-institution" className={labelClass}>
            Institution <span className="font-normal text-ink-secondary">(optional)</span>
          </label>
          <input
            id="profile-institution"
            className={fieldClass}
            value={draft.institution}
            onChange={(event) => update('institution', event.target.value)}
            placeholder="University or organisation"
            maxLength={PROFILE_LIMITS.institution + 20}
            autoComplete="organization"
            aria-invalid={Boolean(errors.institution)}
            aria-describedby="profile-institution-hint"
          />
          <p id="profile-institution-hint" className={hintClass}>
            Your affiliation, shown in the directory.
          </p>
          <FieldError id="profile-institution-error" message={errors.institution} />
        </div>

        <div>
          <label htmlFor="profile-domain" className={labelClass}>
            Field <span className="font-normal text-ink-secondary">(optional)</span>
          </label>
          <input
            id="profile-domain"
            className={fieldClass}
            value={draft.domain}
            onChange={(event) => update('domain', event.target.value)}
            placeholder="Public health"
            maxLength={PROFILE_LIMITS.domain + 20}
            aria-invalid={Boolean(errors.domain)}
            aria-describedby="profile-domain-hint"
          />
          <p id="profile-domain-hint" className={hintClass}>
            The area you review in.
          </p>
          <FieldError id="profile-domain-error" message={errors.domain} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="profile-bio" className={labelClass}>
            Bio <span className="font-normal text-ink-secondary">(optional)</span>
          </label>
          <textarea
            id="profile-bio"
            className="w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 text-base leading-relaxed text-ink placeholder:text-ink-secondary"
            rows={5}
            value={draft.bio}
            onChange={(event) => update('bio', event.target.value)}
            maxLength={PROFILE_LIMITS.bio + 100}
            placeholder="What you research, how you review evidence, and what you are working on."
            aria-invalid={Boolean(errors.bio)}
            aria-describedby="profile-bio-hint"
          />
          <p id="profile-bio-hint" className={hintClass}>
            {bioCount}/{PROFILE_LIMITS.bio} characters. Plain text; links go in the fields below.
          </p>
          <FieldError id="profile-bio-error" message={errors.bio} />
        </div>

        <div>
          <label htmlFor="profile-orcid" className={labelClass}>
            ORCID iD <span className="font-normal text-ink-secondary">(optional)</span>
          </label>
          <input
            id="profile-orcid"
            className={fieldClass}
            value={draft.orcid}
            onChange={(event) => update('orcid', event.target.value)}
            placeholder="0000-0002-1825-0097"
            maxLength={PROFILE_LIMITS.orcid + 20}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.orcid)}
            aria-describedby="profile-orcid-hint"
          />
          <p id="profile-orcid-hint" className={hintClass}>
            Accepts the bare iD or an orcid.org link.
          </p>
          <FieldError id="profile-orcid-error" message={errors.orcid} />
        </div>

        <div>
          <label htmlFor="profile-github" className={labelClass}>
            GitHub <span className="font-normal text-ink-secondary">(optional)</span>
          </label>
          <input
            id="profile-github"
            className={fieldClass}
            value={draft.github}
            onChange={(event) => update('github', event.target.value)}
            placeholder="octocat"
            maxLength={PROFILE_LIMITS.github + 20}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.github)}
            aria-describedby="profile-github-hint"
          />
          <p id="profile-github-hint" className={hintClass}>
            Handle, @handle, or github.com URL.
          </p>
          <FieldError id="profile-github-error" message={errors.github} />
        </div>

        <div>
          <label htmlFor="profile-website" className={labelClass}>
            Website <span className="font-normal text-ink-secondary">(optional)</span>
          </label>
          <input
            id="profile-website"
            className={fieldClass}
            type="url"
            inputMode="url"
            value={draft.website}
            onChange={(event) => update('website', event.target.value)}
            placeholder="https://example.org"
            maxLength={PROFILE_LIMITS.website + 20}
            autoComplete="url"
            aria-invalid={Boolean(errors.website)}
            aria-describedby="profile-website-hint"
          />
          <p id="profile-website-hint" className={hintClass}>
            Your own site or lab page.
          </p>
          <FieldError id="profile-website-error" message={errors.website} />
        </div>

        <div>
          <label htmlFor="profile-scholar" className={labelClass}>
            Google Scholar <span className="font-normal text-ink-secondary">(optional)</span>
          </label>
          <input
            id="profile-scholar"
            className={fieldClass}
            type="url"
            inputMode="url"
            value={draft.scholar}
            onChange={(event) => update('scholar', event.target.value)}
            placeholder="https://scholar.google.com/citations?user=…"
            maxLength={PROFILE_LIMITS.scholar + 20}
            autoComplete="url"
            aria-invalid={Boolean(errors.scholar)}
            aria-describedby="profile-scholar-hint"
          />
          <p id="profile-scholar-hint" className={hintClass}>
            The citation profile you want readers to find.
          </p>
          <FieldError id="profile-scholar-error" message={errors.scholar} />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-canvas p-4">
        <label htmlFor="profile-published" className="flex items-start gap-3">
          <input
            id="profile-published"
            type="checkbox"
            className="mt-1 h-5 w-5 rounded border-border-strong text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            checked={draft.published}
            onChange={(event) => update('published', event.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-ink">List me in the authors directory</span>
            <span className="mt-1 block text-sm leading-relaxed text-ink-secondary">
              Public at <span className="font-mono text-xs text-ink">{previewLabel || '/author/<slug>'}</span> and on{' '}
              <Link href="/authors" className="font-medium text-link underline-offset-2 hover:underline">
                /authors
              </Link>
              . You can unpublish at any time; your profile stays saved.
            </span>
          </span>
        </label>
      </div>

      {formError ? (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
          {formError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButtonClass} disabled={status === 'saving'}>
          {status === 'saving' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : status === 'saved' ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{status === 'saving' ? 'Saving…' : hasRow ? 'Save profile' : 'Create profile'}</span>
        </button>
        <p role="status" className="text-sm text-ink-secondary">
          {status === 'saved' ? SAVED : ''}
        </p>
      </div>
    </form>
  );
}
