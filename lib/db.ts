import fs from 'fs';
import path from 'path';
import { BlogPost, INITIAL_BLOG_POSTS, Author, AUTHORS } from './blog-data';

const DATA_DIR = path.join(process.cwd(), 'data');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');

export interface CommentRecord {
  id: string;
  postId: string;
  authorName: string;
  authorRole?: string;
  avatar: string;
  timestamp: string;
  text: string;
}

const DEFAULT_COMMENTS: CommentRecord[] = [
  {
    id: 'comm-1',
    postId: 'post-1',
    authorName: 'David K., Systems Eng',
    authorRole: 'Platform Team',
    avatar: 'DK',
    timestamp: '2 days ago',
    text: 'Brilliant breakdown. The section explaining how contiguous KV cache allocation blocked concurrent requests was eye-opening. We observed the exact same memory exhaustion pattern on our internal vLLM cluster.',
  },
  {
    id: 'comm-2',
    postId: 'post-1',
    authorName: 'Prof. Li Wei',
    authorRole: 'Academic Researcher',
    avatar: 'LW',
    timestamp: '1 day ago',
    text: 'Great synthesis of the empirical trade-offs. Would love to see a follow-up benchmarking chunked prefill vs speculative decoding under varying context windows.',
  },
  {
    id: 'comm-3',
    postId: 'post-2',
    authorName: 'Aria Sterling',
    authorRole: 'ML Alignment Researcher',
    avatar: 'AS',
    timestamp: '3 days ago',
    text: 'The finding that chain-of-thought length expands purely from reinforcement learning rewards without human demonstrations is one of the most consequential shifts of the year.',
  },
  {
    id: 'comm-4',
    postId: 'post-3',
    authorName: 'Dr. Robert Mendez',
    authorRole: 'Cardiologist',
    avatar: 'RM',
    timestamp: '4 days ago',
    text: 'The anti-inflammatory endothelial protection observed within 8 weeks prior to significant weight reduction aligns perfectly with clinical biomarkers we track in post-infarction cohorts.',
  },
  {
    id: 'comm-5',
    postId: 'post-5',
    authorName: 'Tariq Hassan',
    authorRole: 'DevOps Lead',
    avatar: 'TH',
    timestamp: '5 days ago',
    text: 'Can corroborate this 100%. Migrated from 3 EKS clusters to Nomad on bare metal Hetzner nodes last year. Reduced monthly cloud bill by 78% and haven’t had a single CNI outage.',
  },
];

// Helper to ensure data files exist
function ensureFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ARTICLES_FILE)) {
      fs.writeFileSync(ARTICLES_FILE, JSON.stringify(INITIAL_BLOG_POSTS, null, 2), 'utf8');
    }
    if (!fs.existsSync(COMMENTS_FILE)) {
      fs.writeFileSync(COMMENTS_FILE, JSON.stringify(DEFAULT_COMMENTS, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Failed to ensure data files:', err);
  }
}

export function getArticles(): BlogPost[] {
  ensureFiles();
  try {
    if (fs.existsSync(ARTICLES_FILE)) {
      const data = fs.readFileSync(ARTICLES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading articles:', err);
  }
  return INITIAL_BLOG_POSTS;
}

export function saveArticles(articles: BlogPost[]): boolean {
  ensureFiles();
  try {
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving articles:', err);
    return false;
  }
}

export function getArticleBySlug(slug: string): BlogPost | undefined {
  const articles = getArticles();
  return articles.find((a) => a.slug === slug || a.id === slug);
}

export function getArticleById(id: string): BlogPost | undefined {
  const articles = getArticles();
  return articles.find((a) => a.id === id);
}

export function getAuthorById(authorId: string): Author | undefined {
  if (AUTHORS[authorId]) {
    return AUTHORS[authorId];
  }
  // Try case-insensitive or name match
  const lower = authorId.toLowerCase().trim();
  const found = Object.values(AUTHORS).find(
    (a) => a.id.toLowerCase() === lower || a.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === lower || a.name.toLowerCase() === lower
  );
  if (found) return found;

  // Check if any articles have this author
  const articles = getArticles();
  const articleWithAuthor = articles.find(
    (a) => a.author.id.toLowerCase() === lower || a.author.name.toLowerCase() === lower
  );
  return articleWithAuthor?.author;
}

export function getAllAuthors(): Author[] {
  return Object.values(AUTHORS);
}

export function getArticlesByAuthor(authorIdOrName: string): BlogPost[] {
  const articles = getArticles();
  const needle = authorIdOrName.toLowerCase().trim();
  return articles.filter(
    (a) =>
      a.author.id.toLowerCase() === needle ||
      a.author.name.toLowerCase() === needle ||
      a.author.name.toLowerCase().includes(needle) ||
      (a.author.orcid && a.author.orcid.toLowerCase() === needle) ||
      (a.author.github && a.author.github.toLowerCase().includes(needle))
  );
}

export function addArticle(newArticle: BlogPost): BlogPost {
  const articles = getArticles();
  // prepend to list
  const updated = [newArticle, ...articles.filter((a) => a.id !== newArticle.id && a.slug !== newArticle.slug)];
  saveArticles(updated);
  return newArticle;
}

export function incrementLikes(id: string): number {
  const articles = getArticles();
  let newLikes = 0;
  const updated = articles.map((a) => {
    if (a.id === id || a.slug === id) {
      newLikes = (a.likes || 0) + 1;
      return { ...a, likes: newLikes };
    }
    return a;
  });
  saveArticles(updated);
  return newLikes;
}

export function getComments(postId?: string): CommentRecord[] {
  ensureFiles();
  try {
    if (fs.existsSync(COMMENTS_FILE)) {
      const data = fs.readFileSync(COMMENTS_FILE, 'utf8');
      const allComments: CommentRecord[] = JSON.parse(data);
      if (postId) {
        return allComments.filter((c) => c.postId === postId);
      }
      return allComments;
    }
  } catch (err) {
    console.error('Error reading comments:', err);
  }
  return postId ? DEFAULT_COMMENTS.filter((c) => c.postId === postId) : DEFAULT_COMMENTS;
}

export function addComment(comment: Omit<CommentRecord, 'id' | 'timestamp'>): CommentRecord {
  ensureFiles();
  const allComments = getComments();
  const newRecord: CommentRecord = {
    ...comment,
    id: 'comm-' + Date.now(),
    timestamp: 'Just now',
  };
  const updated = [newRecord, ...allComments];
  try {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(updated, null, 2), 'utf8');
    
    // Also update comment count on the article
    const articles = getArticles();
    const updatedArticles = articles.map((a) => {
      if (a.id === comment.postId || a.slug === comment.postId) {
        return { ...a, commentsCount: (a.commentsCount || 0) + 1 };
      }
      return a;
    });
    saveArticles(updatedArticles);
  } catch (err) {
    console.error('Error saving comment:', err);
  }
  return newRecord;
}
