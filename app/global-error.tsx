'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" dir="ltr">
      <body className="bg-canvas font-sans text-ink antialiased">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-20 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-wider text-destructive">Application error</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-ink">
            The site failed to load.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-secondary">
            Reload the page to try again. If the problem persists, the deployment needs attention.
          </p>
          {error.digest && <p className="mt-3 font-mono text-xs text-ink-secondary">Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={() => reset()}
            className="mt-8 inline-flex min-h-11 w-fit items-center rounded-full bg-action-primary px-6 py-2.5 text-sm font-semibold text-on-primary"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
