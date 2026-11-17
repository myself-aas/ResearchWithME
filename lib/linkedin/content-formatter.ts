import { ArticleData } from '@/lib/linkedin/client';

export interface FormattedPost {
  text: string;
  hashtags: string[];
  media?: string;
}

const MAX_LENGTH = 3000;
const TRUNCATION_SUFFIX = '...';

export function formatLinkedInPost(article: ArticleData): FormattedPost {
  const isEditorial = article.publicationType === 'editorial';
  const headingPrefix = isEditorial ? '📖 New Editorial:' : '📖 New Research Review:';
  const readMoreLabel = isEditorial ? 'Read the full editorial:' : 'Read the full review:';

  const hashtags = generateHashtags(article.category, article.tags, isEditorial);
  const doiLine = article.doi ? `\n\nDOI: https://doi.org/${article.doi}` : '';
  const readMore = `\n\n${readMoreLabel} ${article.url}`;

  let content = `${headingPrefix} ${article.title}\n\n`;
  content += `${article.summary}${doiLine}${readMore}\n\n`;
  content += `By ${article.authorName} | ${article.category}\n\n`;
  content += hashtags.join(' ');

  if (content.length > MAX_LENGTH) {
    const fixedParts = `${headingPrefix} ${article.title}\n\n${doiLine}${readMore}\n\nBy ${article.authorName} | ${article.category}\n\n${hashtags.join(' ')}`;
    const availableLength = MAX_LENGTH - fixedParts.length - TRUNCATION_SUFFIX.length;
    const truncatedSummary = truncateForLinkedIn(article.summary, Math.max(0, availableLength));
    content = `${headingPrefix} ${article.title}\n\n`;
    content += `${truncatedSummary}${doiLine}${readMore}\n\n`;
    content += `By ${article.authorName} | ${article.category}\n\n`;
    content += hashtags.join(' ');
  }

  return {
    text: content,
    hashtags,
    media: article.coverImage,
  };
}

export function truncateForLinkedIn(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength - TRUNCATION_SUFFIX.length);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.5) {
    return truncated.slice(0, lastSpace) + TRUNCATION_SUFFIX;
  }

  return truncated + TRUNCATION_SUFFIX;
}

function generateHashtags(category: string, tags: string[], isEditorial: boolean): string[] {
  const categoryTag = category.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tagHashtags = tags
    .slice(0, 3)
    .map((t) => t.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);

  const baseTags = isEditorial
    ? ['ResearchWithMe', 'OpenScience', 'Editorial']
    : ['ResearchWithMe', 'OpenScience', 'ResearchReview'];
  if (categoryTag) baseTags.push(categoryTag);

  const allTags = [...new Set([...tagHashtags, ...baseTags])].slice(0, 5);
  return allTags.map((t) => `#${t}`);
}
