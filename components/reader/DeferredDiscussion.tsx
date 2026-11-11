'use client';

/**
 * DeferredDiscussion — loads the peer-discussion panel when the reader nears it.
 *
 * The panel fetches comments on mount and owns a form; both are wasted work for
 * readers who never scroll past the manuscript, and the fetch can start later
 * without changing the result. Mounting is gated by `LazyMount` (600px ahead of
 * the viewport) and the code itself is split, so the article route's first
 * bundle carries the paper, not the conversation.
 *
 * The `#discussion` anchor lives on the wrapping section in the page, so it
 * resolves even before the panel has mounted.
 */

import LazyMount from '@/components/motion/LazyMount';
import { SkeletonShard } from '@/components/motion/LoadingState';
import { lazyWidget } from '@/lib/motion/lazy';

const Discussion = lazyWidget(() => import('@/components/ArticleDiscussion'), {
  label: 'Loading the discussion panel',
  minHeight: 220,
});

export interface DeferredDiscussionProps {
  postId: string;
  commentCount: number;
}

export default function DeferredDiscussion({ postId, commentCount }: DeferredDiscussionProps) {
  return (
    <LazyMount
      label="Loading the discussion panel"
      minHeight={220}
      fallback={
        <div className="rounded-sm border border-line bg-surface p-6" aria-hidden="true">
          <SkeletonShard height={20} width="35%" />
          <div className="mt-5">
            <SkeletonShard lines={3} />
          </div>
        </div>
      }
    >
      <Discussion postId={postId} commentCount={commentCount} />
    </LazyMount>
  );
}
