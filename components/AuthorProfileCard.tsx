'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { Author } from '@/lib/blog-data';
import AuthorAvatar from '@/components/AuthorAvatar';
import SpecialistBadgePopover from '@/components/reader/SpecialistBadgePopover';
import { Card, Text } from '@/components/primitives';
import { githubProfileUrl } from '@/lib/profile/validation';

interface AuthorProfileCardProps {
  author: Author;
  metrics?: {
    totalArticles?: number;
    totalLikes?: number;
    totalComments?: number;
    reviewedArtifactsCount?: number;
  };
  compact?: boolean;
  headingLevel?: 'h1' | 'h2';
  /**
   * Show the specialist-credential badge. Callers that already render the badge
   * beside the byline pass `false`, so the same credential is not a second
   * control further down the page.
   */
  showSpecialistBadge?: boolean;
}

function verification(author: Author) {
  if (!author.verifiedVia) return null;
  switch (author.verifiedVia) {
    case 'orcid':
      return {
        label: 'ORCID verified researcher',
        detail: author.orcid ? `iD ${author.orcid}` : author.verifiedIdentifier,
        link: author.orcid ? `https://orcid.org/${author.orcid.replace(/^https?:\/\/orcid\.org\//, '')}` : undefined,
      };
    case 'github':
      return {
        label: 'GitHub verified maintainer',
        detail: author.verifiedIdentifier,
        link: githubProfileUrl(author.github),
      };
  }
}

function ProfileLinks({ author }: { author: Author }) {
  const links = [
    author.orcid ? { href: `https://orcid.org/${author.orcid.replace(/^https?:\/\/orcid\.org\//, '')}`, label: 'ORCID' } : null,
    author.github ? { href: githubProfileUrl(author.github) ?? '', label: 'GitHub' } : null,
    author.scholar ? { href: author.scholar, label: 'Google Scholar' } : null,
    author.twitter ? { href: author.twitter, label: 'X / Twitter' } : null,
    author.website ? { href: author.website, label: 'Lab website' } : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link));

  if (links.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 items-center gap-1 text-brand underline-offset-4 hover:underline"
          >
            <span>{link.label}</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function AuthorProfileCard({
  author,
  metrics,
  compact = false,
  headingLevel = 'h2',
  showSpecialistBadge = true,
}: AuthorProfileCardProps) {
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const badge = verification(author);
  const Heading = headingLevel;

  async function shareProfile() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: `${author.name} on ResearchWithMe`, url });
        setShareMessage('Profile shared.');
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage('Profile link copied.');
    } catch {
      setShareMessage('Sharing is unavailable in this browser. Copy the address from the browser bar.');
    }
  }

  if (compact) {
    return (
      <Card aria-labelledby="author-compact-heading" as="section" padding="lg" radius="lg">
        <div className="flex items-start gap-3">
          <AuthorAvatar author={author} size="md" />
          <div className="min-w-0">
            <Heading id="author-compact-heading" className="font-serif text-lg font-semibold text-ink">
              <Link href={`/author/${author.id}`} className="hover:text-brand">
                {author.name}
              </Link>
            </Heading>
            <p className="font-mono text-xs font-medium text-brand">{author.role}</p>
            {author.institution && <p className="mt-0.5 font-sans text-xs text-ink-secondary">{author.institution}</p>}
          </div>
        </div>

        <p className="mt-3 font-sans text-sm leading-relaxed text-ink-secondary">
          {author.bio.length > 180 ? `${author.bio.slice(0, 177)}…` : author.bio}
        </p>

        {showSpecialistBadge && (
          <div className="mt-3">
            <SpecialistBadgePopover author={author} />
          </div>
        )}

        <div className="mt-3">
          <ProfileLinks author={author} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 font-mono text-xs">
          <span className="text-ink-secondary">{metrics?.totalArticles ?? author.articleCount} articles</span>
          <Link
            href={`/author/${author.id}`}
            className="inline-flex min-h-11 items-center gap-1 font-sans font-medium text-brand underline-offset-4 hover:underline"
          >
            <span>Full profile</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card aria-labelledby="author-profile-heading" as="section" padding="xl" radius="lg" className="sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <AuthorAvatar author={author} size="xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <Heading id="author-profile-heading" className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {author.name}
              </Heading>
              {showSpecialistBadge && <SpecialistBadgePopover author={author} />}
            </div>
            <p className="mt-1 font-mono text-xs font-medium text-brand">{author.role}</p>
            {author.institution && (
              <p className="mt-1 flex items-start gap-1.5 font-sans text-sm text-ink-secondary">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{author.institution}</span>
              </p>
            )}
            <p className="mt-2 max-w-2xl font-sans text-xs text-ink-secondary">{author.domain}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={shareProfile}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-6 py-2 font-sans text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>Share profile</span>
          </button>
          <Link
            href="/write"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand bg-brand px-6 py-2 font-sans text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Writer studio</span>
          </Link>
        </div>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 font-sans text-xs text-ink-secondary">
        {shareMessage}
      </p>

      <dl className="mt-6 grid gap-6 border-y border-line py-5 sm:grid-cols-4">
        <div>
          <Text as="dt" variant="eyebrow" color="secondary">Articles</Text>
          <dd className="mt-1 font-mono text-2xl font-semibold text-ink">
            {metrics?.totalArticles ?? author.articleCount}
          </dd>
        </div>
        <div>
          <Text as="dt" variant="eyebrow" color="secondary">Likes</Text>
          <dd className="mt-1 font-mono text-2xl font-semibold text-ink">
            {metrics?.totalLikes ?? '—'}
          </dd>
        </div>
        <div>
          <Text as="dt" variant="eyebrow" color="secondary">Comments</Text>
          <dd className="mt-1 font-mono text-2xl font-semibold text-ink">
            {metrics?.totalComments ?? '—'}
          </dd>
        </div>
        <div>
          <Text as="dt" variant="eyebrow" color="secondary">Contributor since</Text>
          <dd className="mt-1 font-mono text-sm font-semibold text-ink">{author.joinedDate}</dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <Text as="h2" variant="eyebrow" weight="semibold">
            Research background
          </Text>
          <p className="mt-2 max-w-prose font-sans text-sm leading-relaxed text-ink-secondary">
            {author.bio}
          </p>
          <div className="mt-4">
            <ProfileLinks author={author} />
          </div>
        </div>

        {badge && (
          <div className="border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <Text as="h2" variant="eyebrow" weight="semibold">
              Verification record
            </Text>
            <p className="mt-2 flex items-start gap-1.5 font-sans text-xs font-medium text-brand">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{badge.label}</span>
            </p>
            {badge.detail && (
              <p className="mt-1 break-all font-mono text-xs text-ink">{badge.detail}</p>
            )}
            {badge.link && (
              <a
                href={badge.link}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex min-h-11 items-center gap-1 font-sans text-xs font-medium text-brand underline-offset-4 hover:underline"
              >
                <span>Public record</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            <p className="mt-3 font-sans text-xs leading-relaxed text-ink-secondary">
              Confirm credentials with the issuing registry when citing formal attestations.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
