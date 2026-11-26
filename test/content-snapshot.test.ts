import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAllPosts, getSearchIndex, loadPosts } from '@/lib/content/posts';
import { publishedPosts } from '@/lib/content/snapshot.generated';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('published content snapshot', () => {
  it('matches validated source posts exactly, without drafts', () => {
    expect(publishedPosts).toEqual(JSON.parse(JSON.stringify(loadPosts({ includeDrafts: false }))));
    expect(publishedPosts.every(post => !post.draft)).toBe(true);
  });

  it('serves production content and search when the build filesystem is absent', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const filesystemProbe = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    expect(getAllPosts()).toEqual(publishedPosts);
    expect(getSearchIndex().length).toBe(publishedPosts.length);
    expect(getSearchIndex().some(doc => doc.text.includes('Prithvi'))).toBe(true);
    expect(filesystemProbe).not.toHaveBeenCalled();
  });

  it('keeps production snapshot out of the client content-types module', () => {
    const source = fs.readFileSync('lib/content/types.ts', 'utf8');
    expect(source).not.toContain('snapshot.generated');
    expect(source).not.toContain("from './load'");
  });
});
