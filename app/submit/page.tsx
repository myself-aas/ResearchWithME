'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Send } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { BlogCategory, CATEGORIES } from '@/lib/blog-data';
import { LIMITS, cleanText, isValidEmail } from '@/lib/validation';

const inputClass =
  'h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-600';

interface FormState {
  title: string;
  authorName: string;
  email: string;
  category: BlogCategory;
  abstract: string;
  artifact: string;
  dataUrl: string;
  consent: boolean;
}

const initialState: FormState = {
  title: '',
  authorName: '',
  email: '',
  category: 'Research Reviews',
  abstract: '',
  artifact: '',
  dataUrl: '',
  consent: false,
};

const FIELD_ORDER: Array<[keyof FormState, string, string]> = [
  ['title', 'submit-title', 'Title'],
  ['authorName', 'submit-author', 'Submitting author'],
  ['email', 'submit-email', 'Contact email'],
  ['abstract', 'submit-abstract', 'Abstract'],
  ['dataUrl', 'submit-data', 'Data or code repository'],
  ['consent', 'submit-consent', 'Declaration'],
];

export default function SubmitPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; title: string } | null>(null);
  const submittedRef = useRef(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setFieldErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  const fieldErrorsRef = useRef<Partial<Record<keyof FormState, string>>>({});

  function validate() {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (cleanText(form.title, LIMITS.title).length < 8) errors.title = 'Give the title at least 8 characters.';
    if (cleanText(form.authorName, LIMITS.name).length < 2) errors.authorName = 'Add the name of the submitting author.';
    if (!isValidEmail(form.email)) errors.email = 'That email is incomplete. Include the @ and the domain.';
    if (cleanText(form.abstract, LIMITS.summary).length < 80) {
      errors.abstract = 'Write at least 80 characters so the editors can assess it.';
    }
    if (form.dataUrl && !/^https?:\/\//i.test(form.dataUrl.trim())) {
      errors.dataUrl = 'Use the full link, starting with http:// or https://.';
    }
    if (!form.consent) errors.consent = 'Tick the declaration before submitting.';
    fieldErrorsRef.current = errors;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || submittedRef.current) return;
    setSubmitError(null);
    if (!validate()) {
      setSubmitError('Some fields need another look. Your text is still in the form.');
      const first = FIELD_ORDER.find(([key]) => key in fieldErrorsRef.current);
      if (first) document.getElementById(first[1])?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          authorName: form.authorName,
          email: form.email,
          category: form.category,
          abstract: form.abstract,
          artifact: form.artifact,
          dataUrl: form.dataUrl,
          consent: form.consent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The submission was not recorded.');
      submittedRef.current = false;
      setReceipt({ id: data.submission?.id ?? 'Received', title: form.title });
      setForm(initialState);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? `${error.message} Your draft is still in the form.`
          : 'The submission was not recorded. Your text is still in the form.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="border-b border-stone-200 pb-8">
          <h1 className="max-w-3xl font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Submit a review or manuscript
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-stone-700">
            Send a paper breakdown, repository teardown, or analytical essay. The editorial desk checks that claims point to a public artifact and that funding conflicts are disclosed.
          </p>
        </header>

        {receipt ? (
          <section role="status" aria-labelledby="receipt-heading" className="mt-8 border border-stone-200 bg-white p-8 sm:p-10">
            <CheckCircle2 className="h-10 w-10 text-emerald-700" aria-hidden="true" />
            <h2 id="receipt-heading" className="mt-4 font-serif text-2xl font-bold text-stone-900">
              Submission received
            </h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-stone-700">
              &ldquo;{receipt.title}&rdquo; was recorded in this prototype archive with tracking ID{' '}
              <span className="break-all font-mono font-semibold text-stone-900">{receipt.id}</span>.
            </p>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-stone-700">
              No reviewer has been assigned and no email has been sent. The editorial desk would reply to the address you gave.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="inline-flex min-h-11 items-center rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
              >
                Submit another
              </button>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400"
              >
                Return to the journal
              </Link>
            </div>
          </section>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-8">
            {submitError && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              >
                <p className="font-semibold">{submitError}</p>
                {(() => {
                  const invalid = FIELD_ORDER.filter(([key]) => fieldErrors[key]);
                  if (invalid.length === 0) return null;
                  return (
                    <ul className="mt-1.5 list-disc space-y-1 pl-5">
                      {invalid.map(([key, id, label]) => (
                        <li key={key}>
                          <a
                            href={`#${id}`}
                            className="underline underline-offset-2 hover:text-red-950"
                            onClick={(event) => {
                              event.preventDefault();
                              document.getElementById(id)?.focus();
                            }}
                          >
                            {label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            )}

            <fieldset className="space-y-4">
              <legend className="font-serif text-xl font-semibold text-stone-900">Manuscript details</legend>

              <div>
                <label htmlFor="submit-title" className="mb-1.5 block text-sm font-medium text-stone-800">
                  Title <span className="text-stone-600">(required)</span>
                </label>
                <input
                  id="submit-title"
                  type="text"
                  value={form.title}
                  onChange={(event) => update('title', event.target.value)}
                  maxLength={LIMITS.title}
                  aria-invalid={fieldErrors.title ? true : undefined}
                  aria-describedby={fieldErrors.title ? 'submit-title-error' : undefined}
                  placeholder="Architectural review of the Astral uv package manager"
                  className={inputClass}
                />
                {fieldErrors.title && (
                  <p id="submit-title-error" className="mt-1 text-sm text-red-800">{fieldErrors.title}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="submit-author" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Submitting author <span className="text-stone-600">(required)</span>
                  </label>
                  <input
                    id="submit-author"
                    type="text"
                    autoComplete="name"
                    value={form.authorName}
                    onChange={(event) => update('authorName', event.target.value)}
                    maxLength={LIMITS.name}
                    aria-invalid={fieldErrors.authorName ? true : undefined}
                    aria-describedby={fieldErrors.authorName ? 'submit-author-error' : undefined}
                    placeholder="Dr. Jordan Rivera"
                    className={inputClass}
                  />
                  {fieldErrors.authorName && (
                    <p id="submit-author-error" className="mt-1 text-sm text-red-800">{fieldErrors.authorName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="submit-email" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Contact email <span className="text-stone-600">(required)</span>
                  </label>
                  <input
                    id="submit-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                    maxLength={LIMITS.email}
                    aria-invalid={fieldErrors.email ? true : undefined}
                    aria-describedby={fieldErrors.email ? 'submit-email-error' : 'submit-email-hint'}
                    placeholder="author@institution.org"
                    className={inputClass}
                  />
                  {fieldErrors.email ? (
                    <p id="submit-email-error" className="mt-1 text-sm text-red-800">{fieldErrors.email}</p>
                  ) : (
                    <p id="submit-email-hint" className="mt-1 text-sm text-stone-600">
                      Used only to contact you about this submission.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="submit-category" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Field
                  </label>
                  <select
                    id="submit-category"
                    value={form.category}
                    onChange={(event) => update('category', event.target.value as BlogCategory)}
                    className={inputClass}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="submit-artifact" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Reviewed artifact <span className="text-stone-600">(optional)</span>
                  </label>
                  <input
                    id="submit-artifact"
                    type="text"
                    value={form.artifact}
                    onChange={(event) => update('artifact', event.target.value)}
                    maxLength={240}
                    placeholder="github.com/astral-sh/uv or 10.1038/s41587"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="submit-abstract" className="mb-1.5 block text-sm font-medium text-stone-800">
                  Abstract <span className="text-stone-600">(required, at least 80 characters)</span>
                </label>
                <textarea
                  id="submit-abstract"
                  rows={5}
                  value={form.abstract}
                  onChange={(event) => update('abstract', event.target.value)}
                  maxLength={LIMITS.summary}
                  aria-invalid={fieldErrors.abstract ? true : undefined}
                  aria-describedby={fieldErrors.abstract ? 'submit-abstract-error' : 'submit-abstract-hint'}
                  placeholder="State the question, the artifact you examined, the method, and the result a reader should take away."
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-600"
                />
                {fieldErrors.abstract ? (
                  <p id="submit-abstract-error" className="mt-1 text-sm text-red-800">{fieldErrors.abstract}</p>
                ) : (
                  <p id="submit-abstract-hint" className="mt-1 text-sm text-stone-600">
                    {form.abstract.length} of {LIMITS.summary} characters
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="submit-data" className="mb-1.5 block text-sm font-medium text-stone-800">
                  Data or code repository <span className="text-stone-600">(optional)</span>
                </label>
                <input
                  id="submit-data"
                  type="url"
                  value={form.dataUrl}
                  onChange={(event) => update('dataUrl', event.target.value)}
                  aria-invalid={fieldErrors.dataUrl ? true : undefined}
                  aria-describedby={fieldErrors.dataUrl ? 'submit-data-error' : undefined}
                  placeholder="https://github.com/… or https://zenodo.org/…"
                  className={`${inputClass} font-mono`}
                />
                {fieldErrors.dataUrl && (
                  <p id="submit-data-error" className="mt-1 text-sm text-red-800">{fieldErrors.dataUrl}</p>
                )}
              </div>
            </fieldset>

            <fieldset className="space-y-3 border-t border-stone-200 pt-6">
              <legend className="font-serif text-xl font-semibold text-stone-900">Declaration</legend>
              <div className="flex items-start gap-3">
                <input
                  id="submit-consent"
                  type="checkbox"
                  checked={form.consent}
                  onChange={(event) => update('consent', event.target.checked)}
                  aria-invalid={fieldErrors.consent ? true : undefined}
                  aria-describedby={fieldErrors.consent ? 'submit-consent-error' : undefined}
                  className="mt-1 h-5 w-5 rounded border-stone-400 text-amber-800"
                />
                <label htmlFor="submit-consent" className="text-base leading-relaxed text-stone-700">
                  I confirm that empirical claims cite a public artifact, that I have disclosed relevant funding or corporate conflicts, and that accepted work may be published under CC BY 4.0.
                </label>
              </div>
              {fieldErrors.consent && (
                <p id="submit-consent-error" className="text-sm text-red-800">{fieldErrors.consent}</p>
              )}
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-6">
              <p className="text-sm text-stone-600">No publication or article processing fees.</p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>{submitting ? 'Submitting…' : 'Submit for editorial review'}</span>
              </button>
            </div>
          </form>
        )}
      </main>

      <BlogFooter />
    </div>
  );
}
