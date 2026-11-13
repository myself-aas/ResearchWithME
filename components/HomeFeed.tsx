'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogHero from '@/components/BlogHero';
import FeaturedArticle from '@/components/FeaturedArticle';
import ArticleFeed from '@/components/ArticleFeed';
import AuthorSpotlight from '@/components/AuthorSpotlight';
import BlogFooter from '@/components/BlogFooter';
import { Author, BlogPost, INITIAL_BLOG_POSTS, categoryToSlug } from '@/lib/blog-data';
import { useHydratePreferences, usePreferencesStore } from '@/lib/stores/preferences-store';
import Reveal from '@/components/motion/Reveal';

interface HomeFeedProps {
  initialCategory?: string;
  initialSearch?: string;
  /** Published contributor profiles, read server-side by app/page.tsx. */
  authors?: Author[];
  /**
   * Posts the server already resolved (Pages SSR loader). When absent the
   * feed starts from the bundled seed posts and fills in from /api/articles
   * on mount — the Next app's behaviour.
   */
  initialPosts?: BlogPost[];
}

export default function HomeFeed({
  initialCategory = 'All',
  initialSearch = '',
  authors = [],
  initialPosts,
}: HomeFeedProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const hydrated = useHydratePreferences();
  const storeSavedPostIds = usePreferencesStore((state) => state.savedPostIds);
  const storeLikedPostIds = usePreferencesStore((state) => state.likedPostIds);
  const toggleSavedPost = usePreferencesStore((state) => state.toggleSavedPost);
  const setPostLiked = usePreferencesStore((state) => state.setPostLiked);

  const [posts, setPosts] = useState<BlogPost[]>(initialPosts ?? INITIAL_BLOG_POSTS);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const feedRef = useRef<HTMLDivElement>(null);

  const savedPostIds = useMemo(
    () => (hydrated ? storeSavedPostIds : []),
    [hydrated, storeSavedPostIds],
  );
  const likedPostIds = useMemo(
    () => (hydrated ? storeLikedPostIds : []),
    [hydrated, storeLikedPostIds],
  );

  useEffect(() => {
    let active = true;
    async function loadArticles() {
      try {
        const res = await fetch('/api/articles', { headers: { accept: 'application/json' } });
        if (!res.ok) return;
        const data: { articles?: BlogPost[] } = await res.json();
        if (active && Array.isArray(data.articles) && data.articles.length > 0) {
          setPosts(data.articles);
        }
      } catch {
        // Bundled articles remain available when the API is unreachable.
      }
    }
    loadArticles();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedCategory(initialCategory);
    setSearchQuery(initialSearch);
  }, [initialCategory, initialSearch]);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (selectedCategory !== 'All' && post.category !== selectedCategory) return false;
      if (selectedFormat !== 'All' && post.format !== selectedFormat) return false;
      if (!query) return true;

      return [
        post.title,
        post.subtitle,
        post.summary,
        post.author.name,
        post.category,
        post.format,
        post.slug,
        ...post.tags,
        post.reviewedArtifact?.identifier ?? '',
        post.reviewedArtifact?.title ?? '',
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [posts, searchQuery, selectedCategory, selectedFormat]);

  const featuredPost = useMemo(() => posts.find((post) => post.featured) ?? posts[0], [posts]);
  const showFeatured =
    !searchQuery && selectedCategory === 'All' && selectedFormat === 'All' && Boolean(featuredPost);

  function scrollToFeed() {
    feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleToggleSave(postId: string) {
    toggleSavedPost(postId);
  }

  async function handleLikePost(postId: string) {
    if (likedPostIds.includes(postId)) return;
    setPostLiked(postId, true);
    setPosts((previous) =>
      previous.map((post) => (post.id === postId ? { ...post, likes: post.likes + 1 } : post)),
    );
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(postId)}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Like was not recorded');
    } catch {
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post,
        ),
      );
      setPostLiked(postId, false);
    }
  }

  function clearFilters() {
    setSelectedCategory('All');
    setSelectedFormat('All');
    setSearchQuery('');
    if (pathname.startsWith('/category/')) {
      router.push('/');
    }
    scrollToFeed();
  }

  function handleSelectCategoryInPlace(category: string) {
    setSelectedCategory(category);
    if (pathname.startsWith('/category/') && category === 'All') {
      router.push('/');
    }
  }

  function selectCategoryRoute(category: string) {
    if (category === 'All') {
      router.push('/');
    } else {
      router.push(`/category/${categoryToSlug(category)}`);
    }
    scrollToFeed();
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        savedCount={savedPostIds.length}
      />

      <main className="flex-1">
        <BlogHero
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedFormat={selectedFormat}
          setSelectedFormat={setSelectedFormat}
          selectedCategory={selectedCategory}
          setSelectedCategory={handleSelectCategoryInPlace}
          totalArticles={posts.length}
          totalWriters={authors.length}
        />

        {showFeatured && featuredPost && (
          <Reveal variant="mask" amount={0.08} margin="0px 0px -5% 0px">
            <FeaturedArticle
              post={featuredPost}
              isSaved={savedPostIds.includes(featuredPost.id)}
              onToggleSave={handleToggleSave}
            />
          </Reveal>
        )}

        <div ref={feedRef}>
          <ArticleFeed
            posts={filteredPosts}
            savedPostIds={savedPostIds}
            likedPostIds={likedPostIds}
            onToggleSave={handleToggleSave}
            onLikePost={handleLikePost}
            selectedCategory={selectedCategory}
            selectedFormat={selectedFormat}
            searchQuery={searchQuery}
            onClearFilters={clearFilters}
            onSelectCategory={selectCategoryRoute}
          />
        </div>

        {/* Below-the-fold specialist roster: revealed on intersection and
            skipped by the renderer until it is near the viewport
            (content-visibility, see globals.css). */}
        <div data-lazy-section>
          <Reveal variant="stage" amount={0.05}>
            <AuthorSpotlight authors={authors} />
          </Reveal>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
