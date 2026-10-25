'use client';

import React, { useState, useEffect, useMemo, Suspense, use } from 'react';
import { useRouter } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogHero from '@/components/BlogHero';
import FeaturedArticle from '@/components/FeaturedArticle';
import ArticleFeed from '@/components/ArticleFeed';
import AuthorSpotlight from '@/components/AuthorSpotlight';
import BlogFooter from '@/components/BlogFooter';
import { BlogPost, INITIAL_BLOG_POSTS } from '@/lib/blog-data';

function HomeContent({
  initialCategory = 'All',
  initialSearch = '',
}: {
  initialCategory?: string;
  initialSearch?: string;
}) {
  const router = useRouter();

  const [posts, setPosts] = useState<BlogPost[]>(INITIAL_BLOG_POSTS);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedFormat, setSelectedFormat] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);

  // Saved / Bookmarked Post IDs from localStorage
  const [savedPostIds, setSavedPostIds] = useState<string[]>(['post-1', 'post-2']);

  // Fetch articles from our database layer
  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          if (data.articles && data.articles.length > 0) {
            setPosts(data.articles);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch articles from database:', err);
      }
    }
    loadArticles();

    try {
      const stored = localStorage.getItem('rwm_saved_posts');
      if (stored) {
        setSavedPostIds(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('localStorage error:', e);
    }
  }, []);

  // Sync category & search with initial props if changed
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialCategory, initialSearch]);

  // Toggle bookmarking with localStorage persistence
  const handleToggleSave = (postId: string) => {
    setSavedPostIds((prev) => {
      const next = prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId];
      try {
        localStorage.setItem('rwm_saved_posts', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  };

  // Like reaction with API persistence
  const handleLikePost = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );
    try {
      await fetch(`/api/articles/${postId}`, { method: 'PATCH' });
    } catch (e) {
      console.warn('Like sync error:', e);
    }
  };

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Category filter
      if (selectedCategory !== 'All' && post.category !== selectedCategory) {
        return false;
      }

      // Format filter
      if (selectedFormat !== 'All' && post.format !== selectedFormat) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = post.title.toLowerCase().includes(q);
        const matchesSummary = post.summary.toLowerCase().includes(q);
        const matchesAuthor = post.author.name.toLowerCase().includes(q);
        const matchesTags = post.tags.some((t) => t.toLowerCase().includes(q));
        const matchesArtifact = post.reviewedArtifact
          ? post.reviewedArtifact.identifier.toLowerCase().includes(q) ||
            post.reviewedArtifact.title.toLowerCase().includes(q)
          : false;

        return matchesTitle || matchesSummary || matchesAuthor || matchesTags || matchesArtifact;
      }

      return true;
    });
  }, [posts, selectedCategory, selectedFormat, searchQuery]);

  // Lead featured post
  const featuredPost = useMemo(() => {
    return posts.find((p) => p.featured) || posts[0];
  }, [posts]);

  const handleClearFilters = () => {
    setSelectedCategory('All');
    setSelectedFormat('All');
    setSearchQuery('');
  };

  const handleSelectAuthor = (authorName: string) => {
    setSearchQuery(authorName);
    const el = document.getElementById('articles-feed');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col antialiased selection:bg-amber-900 selection:text-white">
      {/* Header with Navigation to Dedicated Pages */}
      <BlogHeader
        selectedCategory={selectedCategory}
        setSelectedCategory={(cat) => {
          setSelectedCategory(cat);
          const el = document.getElementById('articles-feed');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        savedCount={savedPostIds.length}
      />

      {/* Main Stream */}
      <main className="flex-1">
        {/* Hero Section */}
        <BlogHero
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedFormat={selectedFormat}
          setSelectedFormat={setSelectedFormat}
          totalArticles={posts.length}
        />

        {/* Featured Article Spotlight (links directly to /post/[slug]) */}
        {!searchQuery && selectedCategory === 'All' && selectedFormat === 'All' && featuredPost && (
          <FeaturedArticle
            post={featuredPost}
            isSaved={savedPostIds.includes(featuredPost.id)}
            onToggleSave={handleToggleSave}
          />
        )}

        {/* Primary Article Feed (links directly to /post/[slug]) */}
        <ArticleFeed
          posts={filteredPosts}
          savedPostIds={savedPostIds}
          onToggleSave={handleToggleSave}
          onLikePost={handleLikePost}
          selectedCategory={selectedCategory}
          selectedFormat={selectedFormat}
          searchQuery={searchQuery}
          onClearFilters={handleClearFilters}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            const el = document.getElementById('articles-feed');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Author / Contributor Spotlight */}
        <AuthorSpotlight
          onSelectAuthor={handleSelectAuthor}
        />
      </main>

      {/* Footer with Dedicated Page Links */}
      <BlogFooter
        onCategorySelect={(cat) => {
          setSelectedCategory(cat);
          setSelectedFormat('All');
          window.scrollTo({ top: 380, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

export default function Home(props: {
  searchParams?: Promise<{ category?: string; search?: string }>;
}) {
  const searchParams = props.searchParams ? use(props.searchParams) : undefined;
  const initialCategory = typeof searchParams?.category === 'string' ? searchParams.category : 'All';
  const initialSearch = typeof searchParams?.search === 'string' ? searchParams.search : '';

  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-stone-500">Loading catalog...</div>}>
      <HomeContent initialCategory={initialCategory} initialSearch={initialSearch} />
    </Suspense>
  );
}
