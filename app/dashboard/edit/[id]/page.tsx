'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import PostEditor from '@/components/cms/PostEditor';
import { cmsFetch, isUnauthorized } from '@/lib/cms/client-api';
import type { CmsPost } from '@/lib/cms/types';
import { primaryButtonClass, secondaryButtonClass } from '@/components/cms/styles';

export default function EditArticlePage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [post, setPost] = useState<CmsPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!id) {
      setError('This review has no address in the URL.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    cmsFetch<{ post: CmsPost }>(`/api/cms/posts/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((data) => {
        if (active) setPost(data.post);
      })
      .catch((cause) => {
        if (!active || isUnauthorized(cause)) return;
        setError(
          cause instanceof Error
            ? cause.message
            : 'The review did not load. It may have been deleted.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, nonce]);

  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite" className="max-w-3xl">
        <p className="text-sm font-medium text-stone-600">Loading article…</p>
        <div aria-hidden="true" className="mt-4 space-y-3">
          <div className="h-9 w-2/3 rounded bg-stone-200" />
          <div className="h-4 w-1/3 rounded bg-stone-200" />
          <div className="mt-6 h-64 rounded-lg border border-stone-200 bg-white" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl">
        <Link href="/dashboard/manage" className={secondaryButtonClass}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>All reviews</span>
        </Link>
        <div role="alert" className="mt-5 border-l-2 border-red-700 bg-red-50 px-4 py-3">
          <p className="flex items-start gap-2 text-sm font-semibold text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error ?? 'That review was not found.'}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setNonce((value) => value + 1)} className={primaryButtonClass}>
              Try again
            </button>
            <Link href="/dashboard" className={secondaryButtonClass}>
              Start a new article
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <PostEditor mode="edit" initialPost={post} />;
}
