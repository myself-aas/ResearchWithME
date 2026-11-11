import fs from 'node:fs';
import path from 'node:path';
import type { BlogPost } from '@/lib/blog-data';
import { DEFAULT_LEGACY_SEEDS } from './seeds';
import type { CommentRecord, LegacyCommentInput, LegacyStore } from './types';

function writeJsonAtomic(file: string, value: unknown): boolean {
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(temporary, file);
    return true;
  } catch (error) {
    console.error(`Failed to write ${path.basename(file)}:`, error);
    try {
      fs.rmSync(temporary, { force: true });
    } catch {
      // Best effort cleanup only.
    }
    return false;
  }
}

function readJsonArray<T>(file: string, fallback: T[]): T[] {
  try {
    if (!fs.existsSync(file)) return fallback;
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch (error) {
    console.error(`Failed to read ${path.basename(file)}:`, error);
    return fallback;
  }
}

/** Initials avatar, same scheme as the legacy UI and the Supabase RPC. */
export function avatarInitials(authorName: string): string {
  const parts = authorName.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || 'RD';
}

/**
 * Filesystem adapter for the Node demo (RWM_DATA_DIR or ./data). Mirrors the
 * legacy lib/db.ts semantics but is async, interface-compatible with the
 * Supabase adapter, and — unlike lib/db.ts — throws when a write cannot be
 * persisted so callers can answer 503 instead of a false success.
 */
export function createLocalLegacyStore({ dataDir }: { dataDir: string }): LegacyStore {
  const articlesFile = path.join(dataDir, 'articles.json');
  const commentsFile = path.join(dataDir, 'comments.json');

  async function getArticles(): Promise<BlogPost[]> {
    const articles = readJsonArray<BlogPost>(articlesFile, DEFAULT_LEGACY_SEEDS.articles);
    const bySlug = new Map<string, BlogPost>();
    for (const article of [...DEFAULT_LEGACY_SEEDS.articles, ...articles]) {
      if (article && typeof article.slug === 'string' && article.slug.length > 0) {
        bySlug.set(article.slug, article);
      }
    }
    return [...bySlug.values()];
  }

  async function findArticle(key: string): Promise<BlogPost | undefined> {
    const articles = await getArticles();
    return articles.find((article) => article.slug === key || article.id === key);
  }

  async function incrementLikes(id: string): Promise<number> {
    const articles = await getArticles();
    let newLikes: number | null = null;
    const updated = articles.map((article) => {
      if (article.id === id || article.slug === id) {
        newLikes = (article.likes || 0) + 1;
        return { ...article, likes: newLikes };
      }
      return article;
    });
    if (newLikes === null) throw new Error(`Unknown legacy article id: ${id}`);
    if (!writeJsonAtomic(articlesFile, updated)) {
      throw new Error('The reaction could not be persisted.');
    }
    return newLikes;
  }

  async function getComments(postId?: string): Promise<CommentRecord[]> {
    const all = readJsonArray<CommentRecord>(commentsFile, DEFAULT_LEGACY_SEEDS.comments);
    const comments = all.length > 0 ? all : DEFAULT_LEGACY_SEEDS.comments;
    return postId ? comments.filter((comment) => comment.postId === postId) : comments;
  }

  async function addComment(postId: string, input: LegacyCommentInput): Promise<CommentRecord> {
    const article = await findArticle(postId);
    if (!article) throw new Error(`Unknown legacy article id: ${postId}`);
    const authorName = input.authorName.trim();
    const record: CommentRecord = {
      id: 'comm-' + Date.now(),
      postId: article.id,
      authorName,
      authorRole: (input.authorRole ?? '').trim(),
      avatar: avatarInitials(authorName),
      timestamp: 'Just now',
      text: input.content.trim(),
    };
    const all = await getComments();
    if (!writeJsonAtomic(commentsFile, [record, ...all])) {
      throw new Error('The comment could not be persisted.');
    }
    const articles = await getArticles();
    const updatedArticles = articles.map((candidate) =>
      candidate.id === article.id
        ? { ...candidate, commentsCount: (candidate.commentsCount || 0) + 1 }
        : candidate,
    );
    if (!writeJsonAtomic(articlesFile, updatedArticles)) {
      throw new Error('The comment count could not be persisted.');
    }
    return record;
  }

  return {
    kind: 'local',
    getArticles,
    findArticle,
    incrementLikes,
    getComments,
    addComment,
  };
}
