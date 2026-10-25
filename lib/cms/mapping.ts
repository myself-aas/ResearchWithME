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
    id: slugify(post.authorName) || 'editorial',
    name: post.authorName || 'ResearchWithMe editors',
    avatar: safeInitials(post.authorName, 'RW'),
    role: 'Contributing editor',
    domain: post.category,
    verifiedVia: 'institution',
    verifiedIdentifier: 'Editorial account',
    verifiedTitle: 'ResearchWithMe editorial account',
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
  };
}

export function cmsPostAuthorIsVerified(post: CmsPost) {
  return Boolean(post.authorId && AUTHORS[post.authorId]);
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
