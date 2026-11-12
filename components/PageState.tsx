import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Reveal from '@/components/motion/Reveal';

interface PageStateProps {
  title: string;
  description: string;
  code?: string;
  tone?: 'neutral' | 'error' | 'success';
  role?: 'status' | 'alert';
  as?: 'main' | 'div';
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
  as: Root = 'main',
  primaryAction = { href: '/', label: 'Return to the platform' },
  secondaryAction,
  children,
  className,
}: PageStateProps) {
  return (
    <Root
      className={cn(
        'mx-auto flex min-h-[62vh] w-full max-w-3xl flex-col justify-center px-4 py-16 sm:px-6',
        className,
      )}
      aria-labelledby="page-state-title"
    >
      <Reveal
        as="section"
        variant="stage"
        amount={0.1}
        role={role}
        aria-live={role === 'alert' ? 'assertive' : 'polite'}
        className="border-b border-line pb-12 sm:pb-16"
      >
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1 id="page-state-title" className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl">
            {title}
          </h1>
          {code && (
            <span
              className={cn(
                'rounded-md px-2.5 py-1 font-mono text-sm font-semibold',
                tone === 'error' && 'bg-destructive/5 text-destructive',
                tone === 'success' && 'bg-success/5 text-success',
                tone === 'neutral' && 'bg-brand/5 text-brand',
              )}
            >
              {code}
            </span>
          )}
        </div>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink sm:text-lg">{description}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={primaryAction.href}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover"
          >
            {primaryAction.label}
          </a>
          {secondaryAction && (
            <a
              href={secondaryAction.href}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-strong px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-border-strong hover:bg-surface-raised"
            >
              {secondaryAction.label}
            </a>
          )}
        </div>
        {children && <div className="mt-8">{children}</div>}
      </Reveal>
    </Root>
  );
}
