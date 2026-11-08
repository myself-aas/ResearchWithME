import { NextResponse } from 'next/server';

import { getPublicCmsStore } from '@/lib/cms/store';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSupabasePublicClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProfileRow {
  slug: string;
  display_name: string;
  bio: string;
  role: string;
  domain: string;
  institution: string;
  avatar_url: string;
  orcid: string;
  github: string;
  website: string;
  scholar: string;
  created_at: string;
}

/**
 * One published profile plus the articles attributed to it.
 *
 * Backed by `public.profiles` and the public CMS store. It used to read the
 * fabricated roster in lib/blog-data.ts, which has been deleted, so without this
 * the endpoint returned 404 for every author.
 *
 * As in app/api/authors/route.ts, `verifiedVia` is deliberately not set: the
 * profile's orcid and github columns are self-declared, and the authoritative
 * record in auth.users.identities is not readable anonymously.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: 'Author ID is required' }, { status: 400 });
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    const { data, error } = await getSupabasePublicClient()
      .from('profiles')
      .select(
        'slug, display_name, bio, role, domain, institution, avatar_url, orcid, github, website, scholar, created_at',
      )
      .eq('slug', id)
      .eq('published', true)
      .maybeSingle<ProfileRow>();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    const store = await getPublicCmsStore();
    const posts = await store.listPosts();
    const articles = posts
      .filter((post) => post.authorId === data.slug && post.status === 'published')
      .map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        subtitle: post.subtitle,
        summary: post.summary,
        category: post.category,
        coverImage: post.coverImage,
        readTime: post.readTime,
        likes: post.likes,
        publishedAt: post.publishedAt,
        reviewedArtifact: post.artifact,
      }));

    const commentCounts = await store.listCommentCounts();

    return NextResponse.json(
      {
        author: {
          id: data.slug,
          name: data.display_name,
          avatar: data.avatar_url,
          bio: data.bio,
          role: data.role,
          domain: data.domain,
          institution: data.institution || undefined,
          orcid: data.orcid || undefined,
          github: data.github || undefined,
          website: data.website || undefined,
          scholar: data.scholar || undefined,
          joinedDate: String(new Date(data.created_at).getUTCFullYear()),
        },
        articles,
        metrics: {
          totalArticles: articles.length,
          totalLikes: articles.reduce((total, article) => total + (article.likes ?? 0), 0),
          totalComments: articles.reduce(
            (total, article) => total + (commentCounts[article.id] ?? 0),
            0,
          ),
          domains: Array.from(new Set(articles.map((article) => article.category))),
          reviewedArtifactsCount: articles.filter((article) => article.reviewedArtifact).length,
        },
      },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' } },
    );
  } catch (err) {
    console.error('Failed to fetch author profile:', err);
    return NextResponse.json({ error: 'Internal server error fetching author' }, { status: 500 });
  }
}
