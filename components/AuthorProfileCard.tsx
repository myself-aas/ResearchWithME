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
}

function verification(author: Author) {
  switch (author.verifiedVia) {
    case 'orcid':
      return {
        label: 'ORCID record on file',
        detail: author.orcid ? `iD ${author.orcid}` : author.verifiedIdentifier,
        link: author.orcid ? `https://orcid.org/${author.orcid.replace(/^https?:\/\/orcid\.org\//, '')}` : undefined,
      };
    case 'github':
      return {
        label: 'GitHub maintainer',
        detail: author.verifiedIdentifier,
        link: author.github,
      };
    default:
      return {
        label: 'Institutional affiliation on file',
        detail: author.verifiedIdentifier || author.institution || 'Affiliation on file',
        link: author.website,
      };
  }
}

function ProfileLinks({ author }: { author: Author }) {
  const links = [
    author.orcid ? { href: `https://orcid.org/${author.orcid.replace(/^https?:\/\/orcid\.org\//, '')}`, label: 'ORCID' } : null,
    author.github ? { href: author.github, label: 'GitHub' } : null,
    author.scholar ? { href: author.scholar, label: 'Google Scholar' } : null,
    author.twitter ? { href: author.twitter, label: 'X / Twitter' } : null,
    author.website ? { href: author.website, label: 'Lab website' } : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link));

  if (links.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-9 items-center gap-1 text-amber-900 underline-offset-4 hover:underline"
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
}: AuthorProfileCardProps) {
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const badge = verification(author);
  const Heading = headingLevel;

  async function shareProfile() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: `${author.name} on πeme`, url });
        setShareMessage('Profile shared.');
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage('Profile link copied.');
    } catch {
      setShareMessage('This browser cannot share. Copy the address from the browser bar.');
    }
  }

  if (compact) {
    return (
      <section aria-labelledby="author-compact-heading" className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <AuthorAvatar author={author} size="md" showControls={false} />
          <div className="min-w-0">
            <Heading id="author-compact-heading" className="font-serif text-lg font-semibold text-stone-900">
              <Link href={`/author/${author.id}`} className="hover:text-amber-900">
                {author.name}
              </Link>
            </Heading>
            <p className="text-sm font-medium text-stone-700">{author.role}</p>
            {author.institution && <p className="text-sm text-stone-600">{author.institution}</p>}
          </div>
        </div>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone-700">{author.bio}</p>

        <p className="mt-3 flex items-start gap-1.5 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{badge.label}</span>
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-3 text-sm">
          <span className="text-stone-600">{metrics?.totalArticles ?? author.articleCount} reviews on record</span>
          <Link
            href={`/author/${author.id}`}
            className="inline-flex min-h-9 items-center gap-1 font-medium text-amber-900 underline-offset-4 hover:underline"
          >
            <span>Full profile</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="author-profile-heading" className="rounded-lg border border-stone-200 bg-white p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <AuthorAvatar author={author} size="xl" showControls={true} />
          <div className="min-w-0">
            <Heading id="author-profile-heading" className="font-serif text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              {author.name}
            </Heading>
            <p className="mt-1 text-base font-medium text-stone-800">{author.role}</p>
            {author.institution && (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-stone-600">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{author.institution}</span>
              </p>
            )}
            <p className="mt-2 max-w-2xl text-sm text-stone-600">{author.domain}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={shareProfile}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-50"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>Share profile</span>
          </button>
          <Link
            href="/write"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Open the writer studio</span>
          </Link>
        </div>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-stone-600">
        {shareMessage}
      </p>

      <dl className="mt-6 grid gap-6 border-y border-stone-200 py-5 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-stone-600">Reviews here</dt>
          <dd className="mt-1 font-serif text-2xl font-semibold text-stone-900">
            {metrics?.totalArticles ?? author.articleCount}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-stone-600">Likes</dt>
          <dd className="mt-1 font-serif text-2xl font-semibold text-stone-900">
            {metrics?.totalLikes ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-stone-600">Comments</dt>
          <dd className="mt-1 font-serif text-2xl font-semibold text-stone-900">
            {metrics?.totalComments ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-stone-600">Contributor since</dt>
          <dd className="mt-1 text-base font-semibold text-stone-900">{author.joinedDate}</dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,1fr)_var(--container-rail)]">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Research background</h2>
          <p className="mt-2 max-w-prose text-base leading-relaxed text-stone-700">{author.bio}</p>
          <div className="mt-4">
            <ProfileLinks author={author} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-stone-900">Credential on file</h2>
          <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{badge.label}</span>
          </p>
          <p className="mt-1 break-all font-mono text-sm text-stone-700">{badge.detail}</p>
          {badge.link && (
            <a
              href={badge.link}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-amber-900 underline-offset-4 hover:underline"
            >
              <span>Public record</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            This is the credential as recorded here. Check it with the issuing registry before you rely on it.
          </p>
        </div>
      </div>
    </section>
  );
}
