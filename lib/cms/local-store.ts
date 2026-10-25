import fs from 'node:fs';
import path from 'node:path';
import { CmsConflictError, CmsNotFoundError, CmsUnavailableError } from './errors';
import type { CmsComment, CmsCommentInput, CmsPost, CmsPostInput, CmsStore } from './types';

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');

interface StoredComment {
  id: string;
  postId: string;
  authorName: string;
  authorRole: string;
  content: string;
  insertedAt: string;
}

function readArray<T>(file: string): T[] {
  try {
    if (!fs.existsSync(file)) return [];
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error(`Failed to read ${path.basename(file)}:`, error);
    return [];
  }
}

function writeArrayAtomic(file: string, value: unknown) {
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(temporary, file);
  } catch (error) {
    try {
      fs.rmSync(temporary, { force: true });
    } catch {
      // Best-effort cleanup.
    }
    console.error(`Failed to write ${path.basename(file)}:`, error);
    throw new CmsUnavailableError('The local content archive is not writable.');
  }
}

function nextId(records: Array<{ id: string }>) {
  const highest = records.reduce((max, record) => {
    const value = Number.parseInt(record.id, 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return String(highest + 1);
}

function sortByInsertedAt<T extends { insertedAt: string }>(records: T[]) {
  return [...records].sort((a, b) => b.insertedAt.localeCompare(a.insertedAt));
}

/**
 * Filesystem-backed CMS used for local development, demos, and the test suite.
 * Writes are serialised in-process and committed with a temp-file rename so a
 * crash cannot leave a half-written JSON document behind.
 */
export function createLocalCmsStore(options: { dataDir?: string } = {}): CmsStore {
  const dataDir = options.dataDir ?? process.env.RWM_DATA_DIR ?? DEFAULT_DATA_DIR;
  const postsFile = path.join(dataDir, 'cms-posts.json');
  const commentsFile = path.join(dataDir, 'cms-comments.json');

  let queue: Promise<unknown> = Promise.resolve();
  function serialise<T>(task: () => T | Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  }

  function readPosts(): CmsPost[] {
    return sortByInsertedAt(readArray<CmsPost>(postsFile));
  }

  function readComments(): StoredComment[] {
    return sortByInsertedAt(readArray<StoredComment>(commentsFile));
  }

  function withTitles(comments: StoredComment[]): CmsComment[] {
    const titles = new Map(readPosts().map((post) => [post.id, post.title]));
    return comments.map((comment) => ({
      ...comment,
      postTitle: titles.get(comment.postId) ?? 'Deleted article',
    }));
  }

  return {
    kind: 'local',

    async listPosts() {
      return readPosts();
    },

    async getPost(id) {
      return readPosts().find((post) => post.id === id) ?? null;
    },

    async getPostBySlug(slug) {
      return readPosts().find((post) => post.slug === slug) ?? null;
    },

    async createPost(input: CmsPostInput) {
      return serialise(() => {
        const posts = readPosts();
        if (posts.some((post) => post.slug.toLowerCase() === input.slug.toLowerCase())) {
          throw new CmsConflictError();
        }

        const now = new Date().toISOString();
        const post: CmsPost = {
          ...input,
          id: nextId(posts),
          likes: 0,
          publishedAt: input.status === 'published' ? now : null,
          insertedAt: now,
          updatedAt: now,
        };

        writeArrayAtomic(postsFile, [post, ...posts]);
        return post;
      });
    },

    async updatePost(id, input: CmsPostInput) {
      return serialise(() => {
        const posts = readPosts();
        const existing = posts.find((post) => post.id === id);
        if (!existing) throw new CmsNotFoundError('That article was not found.');

        if (posts.some((post) => post.id !== id && post.slug.toLowerCase() === input.slug.toLowerCase())) {
          throw new CmsConflictError();
        }

        const now = new Date().toISOString();
        const post: CmsPost = {
          ...existing,
          ...input,
          publishedAt:
            input.status === 'published' ? existing.publishedAt ?? now : null,
          updatedAt: now,
        };

        writeArrayAtomic(
          postsFile,
          posts.map((candidate) => (candidate.id === id ? post : candidate)),
        );
        return post;
      });
    },

    async deletePost(id) {
      return serialise(() => {
        const posts = readPosts();
        if (!posts.some((post) => post.id === id)) {
          throw new CmsNotFoundError('That article was not found.');
        }

        writeArrayAtomic(
          postsFile,
          posts.filter((post) => post.id !== id),
        );
        writeArrayAtomic(
          commentsFile,
          readComments().filter((comment) => comment.postId !== id),
        );
      });
    },

    async incrementLikes(id) {
      return serialise(() => {
        const posts = readPosts();
        const existing = posts.find((post) => post.id === id);
        if (!existing) throw new CmsNotFoundError('That article was not found.');

        const likes = existing.likes + 1;
        writeArrayAtomic(
          postsFile,
          posts.map((post) => (post.id === id ? { ...post, likes } : post)),
        );
        return likes;
      });
    },

    async listComments() {
      return withTitles(readComments());
    },

    async listCommentsForPost(postId) {
      // Newest first, matching the reader and the Supabase adapter.
      return withTitles(readComments().filter((comment) => comment.postId === postId));
    },

    async listCommentCounts() {
      const counts: Record<string, number> = {};
      for (const comment of readComments()) {
        counts[comment.postId] = (counts[comment.postId] ?? 0) + 1;
      }
      return counts;
    },

    async getComment(id) {
      const comment = readComments().find((candidate) => candidate.id === id);
      if (!comment) return null;
      return withTitles([comment])[0] ?? null;
    },

    async createComment(postId, input: CmsCommentInput) {
      return serialise(() => {
        const posts = readPosts();
        const post = posts.find((candidate) => candidate.id === postId);
        if (!post) throw new CmsNotFoundError('That article does not exist.');

        const comments = readComments();
        const comment: StoredComment = {
          ...input,
          id: nextId(comments),
          postId,
          insertedAt: new Date().toISOString(),
        };

        writeArrayAtomic(commentsFile, [comment, ...comments]);
        return { ...comment, postTitle: post.title };
      });
    },

    async deleteComment(id) {
      return serialise(() => {
        const comments = readComments();
        if (!comments.some((comment) => comment.id === id)) {
          throw new CmsNotFoundError('That comment was not found.');
        }
        writeArrayAtomic(
          commentsFile,
          comments.filter((comment) => comment.id !== id),
        );
      });
    },
  };
}
