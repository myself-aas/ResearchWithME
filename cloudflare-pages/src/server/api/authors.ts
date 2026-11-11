import type { RequestContext } from '../context';
import { json, type ApiRoute, type ApiHandler } from './registry';
import { directoryFor } from '../directory';

const AUTHOR_CACHE = 'public, max-age=60, stale-while-revalidate=600';

const listAuthors: ApiHandler = async (ctx: RequestContext) => {
  try {
    const authors = await directoryFor(ctx).listPublishedAuthors();
    return json({ authors }, { headers: { 'cache-control': AUTHOR_CACHE } });
  } catch (error) {
    console.error('Failed to fetch authors:', error);
    return json({ error: 'Internal server error fetching authors' }, { status: 500 });
  }
};

const getAuthor: ApiHandler = async (ctx: RequestContext, params) => {
  try {
    const id = (params.id ?? '').trim().slice(0, 120);
    if (!id) return json({ error: 'Author ID is required' }, { status: 400 });

    let archive;
    try {
      archive = await directoryFor(ctx).getAuthorArchive(id);
    } catch (error) {
      // Lookup failures must surface as 5xx, never as a 404 a crawler would treat as "gone".
      console.error('Failed to fetch author profile:', error);
      return json({ error: 'Internal server error fetching author' }, { status: 500 });
    }
    if (!archive) return json({ error: 'Author not found' }, { status: 404 });

    return json(archive, { headers: { 'cache-control': AUTHOR_CACHE } });
  } catch (error) {
    console.error('Failed to fetch author profile:', error);
    return json({ error: 'Internal server error fetching author' }, { status: 500 });
  }
};

export const authorsRoutes: ApiRoute[] = [
  { path: '/api/authors', handlers: { GET: listAuthors } },
  { path: '/api/authors/:id', handlers: { GET: getAuthor } },
];
