import { AUTHORS, type Author, type BlogPost } from '@/lib/blog-data';
import { formatDate, safeInitials } from '@/lib/format';
import { slugify } from '@/lib/validation';
import type { CmsComment, CmsPost } from './types';
import { toPublicPostId } from './schema';

/**
 * Fallback profile for bylines that are not part of the verified catalogue.
 * The editor only accepts known authors, but legacy or imported rows must still
 * render without a broken author link.
 */
function fallbackAuthor(post: CmsPost): Author {
  const joinedYear = post.insertedAt ? new Date(post.insertedAt).getUTCFullYear() : new Date().getUTCFullYear();
  return {
    // The stored authorId is the public.profiles slug -- the post routes
    // validate it there -- so it is the canonical identity. Deriving an id from
    // the display name instead would only match a profile by coincidence.
    id: post.authorId || slugify(post.authorName) || 'editorial',
    name: post.authorName || 'ResearchWithMe editors',
    avatar: safeInitials(post.authorName, 'RW'),
    role: 'Contributing editor',
    domain: post.category,
    joinedDate: String(joinedYear),
    articleCount: 1,
    bio: `${post.authorName || 'The editorial team'} writes for ResearchWithMe.`,
  };
}

/** Maps a CMS row onto the shape the public reader already understands. */
export function cmsPostToArticle(post: CmsPost): BlogPost {
  const knownAuthor = post.authorId ? AUTHORS[post.authorId] : undefined;
  const author = knownAuthor ?? fallbackAuthor(post);
  const published = post.publishedAt ?? post.insertedAt;

  return {
    id: toPublicPostId(post.id),
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle || post.summary.slice(0, 140),
    category: post.category,
    format: post.format,
    publicationType: post.publicationType === 'editorial' ? 'editorial' : 'review',
    author,
    publishedAt: formatDate(published),
    dateISO: published,
    readTime: post.readTime,
    coverImage: post.coverImage ?? '/images/folio-hero.jpeg',
    featured: post.featured,
    summary: post.summary,
    content: post.content
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean),
    bodyMarkdown: post.content,
    keyTakeaways: post.keyTakeaways,
    tags: post.tags,
    likes: post.likes,
    commentsCount: 0,
    // A CMS article renders the same artifact record as a bundled one, so the
    // reader and the research assistant treat both alike.
    reviewedArtifact: post.artifact
      ? {
          type: post.artifact.type,
          title: post.artifact.title,
          url: post.artifact.url,
          identifier: post.artifact.identifier,
          meta: post.artifact.meta || 'Artifact record supplied by the author',
        }
      : undefined,
  };
}

export function cmsCommentToRecord(comment: CmsComment) {
  return {
    id: `cms-comment-${comment.id}`,
    postId: toPublicPostId(comment.postId),
    authorName: comment.authorName,
    authorRole: comment.authorRole,
    avatar: safeInitials(comment.authorName, 'RD'),
    timestamp: formatDate(comment.insertedAt),
    text: comment.content,
  };
}
