'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LogOut, PenSquare, Settings2, ShieldCheck } from 'lucide-react';
import type { DashboardProfileSummary } from '@/lib/dashboard/profile';
import { socialStats } from '@/lib/profile/counters';

import { isProfileImageUrl } from '@/lib/images/urls';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'R';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * The social-profile header that sits above every dashboard page: cover band,
 * circular photo, name, role/affiliation line, bio, and the actions a reader or
 * writer actually needs. One header for the whole dashboard is what removes the
 * repeated menus that used to be spread across the page.
 */
export default function DashboardProfileHeader({
  profile,
  isEditor,
  isEditorInChief,
  signingOut,
  signOutError,
  onSignOut,
}: {
  profile: DashboardProfileSummary;
  isEditor: boolean;
  isEditorInChief: boolean;
  signingOut: boolean;
  signOutError: string | null;
  onSignOut: () => void;
}) {
  const affiliation = profile.institution || profile.domain;
  const stats = profile.counts ? socialStats(profile.counts, { isSelf: true }) : [];

  return (
    <section
      aria-label="Your profile"
      className="relative mt-4 overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <div
        aria-hidden="true"
        className="h-20 bg-gradient-to-r from-brand/15 via-surface-subtle to-surface sm:h-24"
      />

      <div className="px-4 pb-5 sm:px-6">
        <div className="-mt-10 flex items-start justify-between gap-3 sm:-mt-12">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-surface bg-brand/10 shadow-floating sm:h-24 sm:w-24">
            {profile.avatarUrl && isProfileImageUrl(profile.avatarUrl) ? (
              <Image
                src={profile.avatarUrl}
                alt={`${profile.displayName}'s profile photo`}
                width={96}
                height={96}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-full w-full items-center justify-center font-serif text-2xl font-semibold text-brand sm:text-3xl"
              >
                {initials(profile.displayName)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 pt-12 sm:pt-14">
            <Link
              href="/dashboard/profile"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-canvas px-3 text-xs font-semibold text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:text-sm"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              <span>Edit profile</span>
            </Link>
            <Link
              href={isEditor ? '/dashboard' : '/dashboard/access'}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-semibold text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:text-sm"
            >
              <PenSquare className="h-4 w-4" aria-hidden="true" />
              <span>{isEditor ? 'New article' : 'Write for us'}</span>
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              aria-label="Sign out"
              title="Sign out"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-3 min-w-0">
          {/* A paragraph, not a heading: each dashboard page keeps its own h1,
              and two competing page titles read as a duplicated header. */}
          <p className="truncate font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {profile.displayName}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-secondary">
            <span className="inline-flex items-center gap-1 font-medium text-ink">
              {isEditorInChief ? (
                <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
              ) : null}
              {profile.role}
            </span>
            {affiliation ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{affiliation}</span>
              </>
            ) : null}
            {profile.joinedYear ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Member since {profile.joinedYear}</span>
              </>
            ) : null}
          </p>
          {profile.bio ? (
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-ink">
              {profile.bio}
            </p>
          ) : (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
              {isEditor
                ? 'Publish reviews and manage the desk from the tabs below.'
                : 'Your reading list, saved work, and account live in the tabs below.'}
            </p>
          )}

          {stats.length > 0 ? (
            <dl
              aria-label="Profile activity"
              className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-secondary"
            >
              {stats.map((stat) => (
                <div key={stat.key} className="inline-flex items-baseline gap-1.5">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="font-semibold text-ink">{stat.value.toLocaleString('en-GB')}</span>{' '}
                    {stat.noun}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {signOutError ? (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {signOutError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
