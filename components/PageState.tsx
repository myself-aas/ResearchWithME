import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageStateProps {
  title: string;
  description: string;
  code?: string;
  tone?: 'neutral' | 'error' | 'success';
  role?: 'status' | 'alert';
  primaryAction?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
  children?: ReactNode;
  className?: string;
}

export default function PageState({
  title,
  description,
  code,
  tone = 'neutral',
  role = 'status',
  primaryAction = { href: '/', label: 'Return to the journal' },
  secondaryAction,
  children,
  className,
}: PageStateProps) {
  return (
    <main
      className={cn(
        'mx-auto flex min-h-[62vh] w-full max-w-3xl flex-col justify-center px-4 py-16 sm:px-6',
        className,
      )}
      aria-labelledby="page-state-title"
    >
      <section
        role={role}
        aria-live={role === 'alert' ? 'assertive' : 'polite'}
        className="border-b border-stone-200 pb-12 sm:pb-16"
      >
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1 id="page-state-title" className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            {title}
          </h1>
          {code && (
            <span
              className={cn(
                'rounded-md px-2.5 py-1 font-mono text-sm font-semibold',
                tone === 'error' && 'bg-red-50 text-red-900',
                tone === 'success' && 'bg-emerald-50 text-emerald-900',
                tone === 'neutral' && 'bg-amber-50 text-amber-900',
              )}
            >
              {code}
            </span>
          )}
        </div>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-700 sm:text-lg">{description}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={primaryAction.href}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
          >
            {primaryAction.label}
          </a>
          {secondaryAction && (
            <a
              href={secondaryAction.href}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-white"
            >
              {secondaryAction.label}
            </a>
          )}
        </div>
        {children && <div className="mt-8">{children}</div>}
      </section>
    </main>
  );
}
