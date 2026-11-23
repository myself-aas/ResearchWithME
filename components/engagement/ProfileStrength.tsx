/**
 * ProfileStrength — truthful writer-onboarding meter.
 *
 * Shows exactly the sum of completed onboarding signals (Task 8 math); at
 * 100/100 the CTA disappears and the completion state appears instead.
 * Server component; the page hides it entirely when signals cannot be read
 * honestly (demo mode, signed out, failed read).
 *
 * No phantom credit, no "You're 20% set up!" — the number is the number.
 */
import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { nextStep, profileStrength, type EngagementSignals } from '@/lib/engagement/signals';

export interface ProfileStrengthProps {
  signals: EngagementSignals;
  className?: string;
}

export default function ProfileStrength({ signals, className }: ProfileStrengthProps) {
  const strength = profileStrength(signals);
  const step = nextStep(signals);
  const complete = step === null && strength === 100;

  return (
    <section
      aria-labelledby="profile-strength-heading"
      data-complete={complete ? 'true' : 'false'}
      className={className ?? 'rounded-lg border border-line bg-surface px-4 py-4'}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="profile-strength-heading" className="font-sans text-sm font-semibold text-ink">
          Profile strength
        </h2>
        <span className="font-mono text-sm tabular-nums text-ink-secondary">{strength}/100</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={strength}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile strength"
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-subtle"
      >
        <div className="h-full rounded-full bg-action-primary" style={{ width: `${strength}%` }} />
      </div>

      {complete ? (
        <p className="mt-3 flex items-center gap-2 font-sans text-sm font-medium text-ink">
          <BadgeCheck aria-hidden="true" className="h-4 w-4 text-trust-verified" />
          <span>
            You&apos;re publishable.{' '}
            <Link href="/dashboard/writing" className="font-semibold text-action-primary underline underline-offset-4">
              Open your writing
            </Link>
          </span>
        </p>
      ) : step ? (
        <Link
          href={step.href}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-sans text-sm font-semibold text-action-primary underline underline-offset-4"
        >
          {step.label}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      ) : null}
    </section>
  );
}
