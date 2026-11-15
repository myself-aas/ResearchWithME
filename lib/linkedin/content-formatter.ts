import { ArticleData } from '@/lib/linkedin/client';

export interface FormattedPost {
  text: string;
  hashtags: string[];
  media?: string;
}

const MAX_LENGTH = 3000;
const TRUNCATION_SUFFIX = '...';
const READ_MORE_TEMPLATE = '\n\nRead the full review: {url}';

export function formatLinkedInPost(article: ArticleData): FormattedPost {
  const hashtags = generateHashtags(article.category, article.tags);
  const doiLine = article.doi ? `\n\nDOI: https://doi.org/${article.doi}` : '';
  const readMore = READ_MORE_TEMPLATE.replace('{url}', article.url);

  let content = `📖 New Research Review: ${article.title}\n\n`;
  content += `${article.summary}${doiLine}${readMore}\n\n`;
  content += `By ${article.authorName} | ${article.category}\n\n`;
  content += hashtags.join(' ');

  // Truncate if needed
  if (content.length > MAX_LENGTH) {
    // Calculate available length for summary
    const fixedParts = `📖 New Research Review: ${article.title}\n\n${doiLine}${readMore}\n\nBy ${article.authorName} | ${article.category}\n\n${hashtags.join(' ')}`;
    const availableLength = MAX_LENGTH - fixedParts.length - TRUNCATION_SUFFIX.length;
    const truncatedSummary = truncateForLinkedIn(article.summary, Math.max(0, availableLength));
    content = `📖 New Research Review: ${article.title}\n\n`;
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

function generateHashtags(category: string, tags: string[]): string[] {
  const categoryTag = category.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tagHashtags = tags
    .slice(0, 3)
    .map(t => t.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);
  
  const baseTags = ['ResearchWithMe', 'OpenScience', 'ResearchReview'];
  if (categoryTag) baseTags.push(categoryTag);
  
  // Prioritize tag hashtags over base tags to ensure important tags are included
  const allTags = [...new Set([...tagHashtags, ...baseTags])].slice(0, 5);
  return allTags.map(t => `#${t}`);
}